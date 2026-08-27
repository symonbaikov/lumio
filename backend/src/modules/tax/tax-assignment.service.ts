import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { fromMinor, toMinor } from '../../common/utils/money.util';
import { TaxRule, TaxRuleDirection } from '../../entities/tax-rule.entity';
import { TaxSource, TransactionType } from '../../entities/transaction.entity';
import { isEuCountry } from './eu-membership';
import { JurisdictionAdoptionService } from './jurisdiction-adoption.service';
import { computeTax } from './tax-calculation';
import { TaxRatesService } from './tax-rates.service';

/**
 * Operation kinds that are outside the scope of VAT everywhere we support.
 *
 * Moving your own money between accounts is not a supply, wages are not a
 * supply, loan principal is not a supply, and paying tax is not itself a
 * taxable transaction. Assessing tax on any of these would inflate a return
 * with amounts that were never taxable.
 *
 * These values come from the AI classifier, which is why they are a safety net
 * and not the only guard — see `resolve` for the rest.
 */
const NON_TAXABLE_NATURES: ReadonlySet<string> = new Set(['transfer', 'salary', 'loan', 'tax']);

export interface AssignmentInput {
  workspaceId: string;
  transactionDate: Date | string;
  /** Signed amount in minor units: negative for refunds and credit notes. */
  amountMinor: number;
  categoryId: string | null;
  transactionType: TransactionType;
  transactionNature: string | null;
  /** A rate the user chose explicitly, which always wins. */
  explicitTaxRateId?: string | null;
  /** ISO-3166-1 alpha-2 of the other party, when it is known. */
  counterpartyCountry?: string | null;
  /** Its presence is what makes the other party a business rather than a consumer. */
  counterpartyVatId?: string | null;
}

export interface Assignment {
  taxRateId: string | null;
  taxRuleId: string | null;
  taxSource: TaxSource | null;
  /** Major units, ready for the decimal columns. Null when nothing was assessed. */
  taxAmount: number | null;
  taxNetAmount: number | null;
  taxReverseCharge: boolean;
  /** What the tax would have been. Equal to taxAmount unless reverse-charged. */
  taxNotionalAmount: number | null;
}

const NOT_ASSESSED: Assignment = {
  taxRateId: null,
  taxRuleId: null,
  taxSource: null,
  taxAmount: null,
  taxNetAmount: null,
  taxReverseCharge: false,
  taxNotionalAmount: null,
};

/**
 * Decides which rate applies to a transaction, and computes the figures.
 *
 * The order is: an explicit choice, then a rule, then the workspace default.
 * Everything is resolved against the transaction's own date, never today —
 * resolving with today's date would retax a 2025 purchase at the 2026 rate the
 * moment the law changed.
 */
@Injectable()
export class TaxAssignmentService {
  private readonly logger = new Logger(TaxAssignmentService.name);

  constructor(
    @InjectRepository(TaxRule)
    private readonly taxRuleRepository: Repository<TaxRule>,
    private readonly taxRatesService: TaxRatesService,
    private readonly adoptionService: JurisdictionAdoptionService,
  ) {}

  /**
   * Whether the buyer, not the seller, accounts for the tax.
   *
   * All four conditions have to hold: both parties inside the EU, in different
   * member states, and the other party VAT-registered. A missing country or
   * VAT id therefore means "tax it normally" — the safe direction, since
   * charging tax that was not due is a correctable error, while omitting tax
   * that was due is an underpayment.
   */
  private async isReverseCharged(
    workspaceId: string,
    counterpartyCountry: string | null | undefined,
    counterpartyVatId: string | null | undefined,
  ): Promise<boolean> {
    if (!(counterpartyCountry && counterpartyVatId?.trim())) {
      return false;
    }

    const home = await this.adoptionService.getCurrentJurisdiction(workspaceId);
    if (!home?.isEu) {
      return false;
    }

    const other = counterpartyCountry.toUpperCase();
    // A domestic supply is charged normally however registered the buyer is.
    if (other === home.code.toUpperCase()) {
      return false;
    }

    return isEuCountry(other);
  }

  async resolve(input: AssignmentInput): Promise<Assignment> {
    const {
      workspaceId,
      transactionDate,
      amountMinor,
      categoryId,
      transactionType,
      transactionNature,
      explicitTaxRateId,
      counterpartyCountry,
      counterpartyVatId,
    } = input;

    // Decided once, before any branch: a hand-picked rate on a cross-border
    // B2B supply is still reverse-charged. The guard inside short-circuits on
    // a missing country or VAT id, so the extra lookup only happens when both
    // are present.
    const reverseCharged = await this.isReverseCharged(
      workspaceId,
      counterpartyCountry,
      counterpartyVatId,
    );

    // 1. An explicit choice is never second-guessed.
    if (explicitTaxRateId) {
      const rate = await this.taxRatesService
        .findOne(explicitTaxRateId, workspaceId)
        .catch(() => null);

      if (rate) {
        return this.assess(rate, null, TaxSource.MANUAL, amountMinor, reverseCharged);
      }
      // A rate that does not belong to this workspace is not a reason to fall
      // back to a different one and silently tax the row at the wrong rate.
      return NOT_ASSESSED;
    }

    // 2. Kinds of operation that are never a taxable supply.
    if (transactionNature && NON_TAXABLE_NATURES.has(transactionNature)) {
      return NOT_ASSESSED;
    }

    // 3. No category means the system does not know what this is. Applying the
    //    default rate here would quietly tax every unclassified transfer that
    //    the classifier failed to label.
    if (!categoryId) {
      return NOT_ASSESSED;
    }

    // 4. The best matching rule.
    const rule = await this.findMatchingRule(workspaceId, categoryId, transactionType);
    if (rule) {
      const rate = await this.taxRatesService.findByCodeForDate(
        workspaceId,
        rule.taxRateCode,
        transactionDate,
      );

      if (rate) {
        return this.assess(rate, rule.id, TaxSource.RULE, amountMinor, reverseCharged);
      }

      // The rule names a code with no version in force on this date. Better to
      // leave the row unassessed and visible than to substitute another rate.
      this.logger.warn(
        `Tax rule ${rule.id} names code '${rule.taxRateCode}', which has no version ` +
          `in force on ${String(transactionDate)} for workspace ${workspaceId}`,
      );
      return NOT_ASSESSED;
    }

    // 5. The workspace default for that date.
    const fallback = await this.taxRatesService.findDefaultForDate(workspaceId, transactionDate);
    if (fallback) {
      return this.assess(fallback, null, TaxSource.DEFAULT, amountMinor, reverseCharged);
    }

    return NOT_ASSESSED;
  }

  /**
   * Highest priority wins. A rule naming a category beats a catch-all at the
   * same priority, since it is the more specific statement of intent.
   */
  private async findMatchingRule(
    workspaceId: string,
    categoryId: string,
    transactionType: TransactionType,
  ): Promise<TaxRule | null> {
    const direction =
      transactionType === TransactionType.INCOME
        ? TaxRuleDirection.INCOME
        : TaxRuleDirection.EXPENSE;

    const rules = await this.taxRuleRepository.find({
      where: { workspaceId, isEnabled: true },
    });

    const matches = rules.filter(
      rule =>
        (rule.direction === TaxRuleDirection.BOTH || rule.direction === direction) &&
        (rule.categoryId === null || rule.categoryId === categoryId),
    );

    if (matches.length === 0) {
      return null;
    }

    matches.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      const aSpecific = a.categoryId === null ? 0 : 1;
      const bSpecific = b.categoryId === null ? 0 : 1;
      return bSpecific - aSpecific;
    });

    return matches[0];
  }

  private assess(
    rate: { id: string; rate: number | string; isInclusive: boolean; isReverseCharge: boolean },
    ruleId: string | null,
    source: TaxSource,
    amountMinor: number,
    autoReverseCharge = false,
  ): Assignment {
    // Either the rate is itself a reverse-charge rate, or the counterparty
    // makes this supply one.
    const isReverseCharge = rate.isReverseCharge || autoReverseCharge;

    const breakdown = computeTax({
      amountMinor,
      rate: Number(rate.rate),
      isInclusive: rate.isInclusive,
      isReverseCharge,
    });

    return {
      taxRateId: rate.id,
      taxRuleId: ruleId,
      taxSource: source,
      taxAmount: fromMinor(breakdown.taxMinor),
      taxNetAmount: fromMinor(breakdown.netMinor),
      taxReverseCharge: isReverseCharge,
      taxNotionalAmount: fromMinor(breakdown.notionalTaxMinor),
    };
  }
}

/** Convenience for callers holding a major-unit amount. */
export function amountToMinor(amount: number | string | null): number {
  return amount === null ? 0 : toMinor(amount);
}
