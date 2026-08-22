import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Not, Repository } from 'typeorm';
import { fromMinor, roundHalfAwayFromZero, toMinor } from '../../common/utils/money.util';
import {
  TaxReturn,
  type TaxReturnSnapshotLine,
  TaxReturnStatus,
} from '../../entities/tax-return.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { JurisdictionAdoptionService } from './jurisdiction-adoption.service';
import { toDateOnly } from './jurisdictions.service';

export interface ReturnTotals {
  outputTax: number;
  inputTax: number;
  netPayable: number;
  currency: string;
  lines: TaxReturnSnapshotLine[];
}

/**
 * Builds and files a period's tax return.
 *
 * A draft is recomputed from the transactions every time it is read, so it
 * always reflects the current data. Filing freezes the figures, writes a
 * line-by-line snapshot and locks the transactions behind it.
 *
 * Reverse-charge rows currently contribute zero to both sides. That leaves
 * `netPayable` correct — the two entries cancel by definition — but understates
 * the gross output and input figures. Reporting them properly needs the
 * notional amount persisted, which lands with the reverse-charge phase.
 */
@Injectable()
export class TaxReturnsService {
  private readonly logger = new Logger(TaxReturnsService.name);

  constructor(
    @InjectRepository(TaxReturn)
    private readonly returnRepository: Repository<TaxReturn>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly adoptionService: JurisdictionAdoptionService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  /**
   * Totals for a period, in the jurisdiction's currency.
   *
   * Every transaction is converted at the rate for its own date. Converting at
   * today's rate would make a filed return drift with the market, and would
   * give a different answer each time it was opened.
   */
  async computeTotals(
    workspaceId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<ReturnTotals> {
    const jurisdiction = await this.adoptionService.getCurrentJurisdiction(workspaceId);
    if (!jurisdiction) {
      throw new BadRequestException(
        'This workspace has no tax jurisdiction. Pick a country before building a return.',
      );
    }

    const transactions = await this.transactionRepository.find({
      where: {
        workspaceId,
        transactionDate: Between(new Date(periodStart), new Date(periodEnd)),
        taxAmount: Not(null as never),
      },
      order: { transactionDate: 'ASC' },
    });

    const currency = jurisdiction.currency;
    let outputMinor = 0;
    let inputMinor = 0;
    const lines: TaxReturnSnapshotLine[] = [];

    for (const transaction of transactions) {
      // Under reverse charge nothing was charged, so the figure the return
      // reports is the notional one — on both sides, where the two entries
      // cancel and leave the net unchanged.
      const isReverseCharge = transaction.taxReverseCharge === true;
      const taxAmount = isReverseCharge
        ? Number(transaction.taxNotionalAmount ?? 0)
        : Number(transaction.taxAmount ?? 0);

      if (!Number.isFinite(taxAmount) || taxAmount === 0) {
        continue;
      }

      const from = (transaction.currency || currency).toUpperCase();
      const rate =
        from === currency
          ? 1
          : await this.exchangeRatesService.getRate(
              from,
              currency,
              new Date(transaction.transactionDate),
            );

      // Rounded once, on the converted figure, so the line and the total agree.
      const convertedMinor = roundHalfAwayFromZero(toMinor(taxAmount) * rate);
      const isOutput = transaction.transactionType === TransactionType.INCOME;

      if (isReverseCharge) {
        outputMinor += convertedMinor;
        inputMinor += convertedMinor;
      } else if (isOutput) {
        outputMinor += convertedMinor;
      } else {
        inputMinor += convertedMinor;
      }

      lines.push({
        transactionId: transaction.id,
        date: toDateOnly(transaction.transactionDate),
        counterparty: transaction.counterpartyName,
        direction: isReverseCharge ? 'reverse_charge' : isOutput ? 'output' : 'input',
        currency: from,
        taxAmount,
        netAmount: Number(transaction.taxNetAmount ?? 0),
        exchangeRate: rate,
        taxAmountConverted: fromMinor(convertedMinor),
      });
    }

    return {
      outputTax: fromMinor(outputMinor),
      inputTax: fromMinor(inputMinor),
      netPayable: fromMinor(outputMinor - inputMinor),
      currency,
      lines,
    };
  }

  async findAll(workspaceId: string): Promise<TaxReturn[]> {
    return this.returnRepository.find({
      where: { workspaceId },
      order: { periodStart: 'DESC' },
    });
  }

  /**
   * The return for a period, recomputed when it is still a draft.
   *
   * A filed return is returned exactly as it was submitted: recomputing it
   * would show figures that differ from the ones sent to the tax authority.
   */
  async getForPeriod(
    workspaceId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<TaxReturn> {
    if (periodEnd < periodStart) {
      throw new BadRequestException('Period end must not be before period start');
    }

    const existing = await this.returnRepository.findOne({
      where: { workspaceId, periodStart, periodEnd },
    });

    if (existing?.status === TaxReturnStatus.FILED) {
      return existing;
    }

    const totals = await this.computeTotals(workspaceId, periodStart, periodEnd);
    const jurisdiction = await this.adoptionService.getCurrentJurisdiction(workspaceId);

    const draft = this.returnRepository.create({
      ...(existing ?? {}),
      workspaceId,
      // biome-ignore lint/style/noNonNullAssertion: computeTotals already threw if absent.
      jurisdictionId: jurisdiction!.id,
      periodStart,
      periodEnd,
      status: TaxReturnStatus.DRAFT,
      outputTax: totals.outputTax,
      inputTax: totals.inputTax,
      netPayable: totals.netPayable,
      currency: totals.currency,
      filedAt: null,
      snapshot: null,
    });

    return this.returnRepository.save(draft);
  }

  /**
   * Files a period.
   *
   * Everything happens in one database transaction: the snapshot and the row
   * locks must land together, or a crash between them would leave a return
   * claiming to be filed over transactions that are still editable.
   */
  async file(workspaceId: string, periodStart: string, periodEnd: string): Promise<TaxReturn> {
    const existing = await this.returnRepository.findOne({
      where: { workspaceId, periodStart, periodEnd },
    });

    if (existing?.status === TaxReturnStatus.FILED) {
      throw new ConflictException('This period has already been filed');
    }

    const totals = await this.computeTotals(workspaceId, periodStart, periodEnd);
    const jurisdiction = await this.adoptionService.getCurrentJurisdiction(workspaceId);

    return this.returnRepository.manager.transaction(async manager => {
      const saved = await manager.save(TaxReturn, {
        ...(existing ?? {}),
        workspaceId,
        // biome-ignore lint/style/noNonNullAssertion: computeTotals already threw if absent.
        jurisdictionId: jurisdiction!.id,
        periodStart,
        periodEnd,
        status: TaxReturnStatus.FILED,
        outputTax: totals.outputTax,
        inputTax: totals.inputTax,
        netPayable: totals.netPayable,
        currency: totals.currency,
        filedAt: new Date(),
        snapshot: totals.lines,
      });

      const transactionIds = totals.lines.map(line => line.transactionId);
      if (transactionIds.length > 0) {
        await manager
          .createQueryBuilder()
          .update(Transaction)
          .set({ taxLocked: true })
          .whereInIds(transactionIds)
          .execute();
      }

      this.logger.log(
        `Filed ${periodStart}..${periodEnd} for workspace ${workspaceId}: ` +
          `${totals.netPayable} ${totals.currency} over ${transactionIds.length} transactions`,
      );

      return saved;
    });
  }

  /**
   * Reopens a filed period.
   *
   * Kept deliberately explicit rather than allowing a silent recompute: it
   * unlocks the transactions and discards the record of what was submitted, so
   * it should be a decision, not a side effect of editing something.
   */
  async reopen(workspaceId: string, periodStart: string, periodEnd: string): Promise<TaxReturn> {
    const existing = await this.returnRepository.findOne({
      where: { workspaceId, periodStart, periodEnd },
    });

    if (!existing || existing.status !== TaxReturnStatus.FILED) {
      throw new BadRequestException('This period is not filed');
    }

    const lockedIds = (existing.snapshot ?? []).map(line => line.transactionId);

    return this.returnRepository.manager.transaction(async manager => {
      if (lockedIds.length > 0) {
        await manager
          .createQueryBuilder()
          .update(Transaction)
          .set({ taxLocked: false })
          .whereInIds(lockedIds)
          .execute();
      }

      return manager.save(TaxReturn, {
        ...existing,
        status: TaxReturnStatus.DRAFT,
        filedAt: null,
        snapshot: null,
      });
    });
  }
}
