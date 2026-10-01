import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, type Repository } from 'typeorm';
import { readProcessingSettings } from '../../common/utils/workspace-processing.util';
import { Receipt, ReceiptStatus } from '../../entities/receipt.entity';
import { Subscription, SubscriptionStatus } from '../../entities/subscription.entity';
import { Transaction, TransactionCategorySource } from '../../entities/transaction.entity';
import { Workspace } from '../../entities/workspace.entity';
import { CrossStatementDeduplicationService } from '../transactions/services/cross-statement-deduplication.service';
import { TransactionsService } from '../transactions/transactions.service';
import {
  DuplicateDecision,
  ReviewInboxKind,
  type ReviewInboxQueryDto,
} from './dto/review-inbox.dto';

export interface ReviewInboxCounts {
  transaction: number;
  receipt: number;
  duplicate: number;
  subscription: number;
  total: number;
}

export type ReviewInboxItem =
  | {
      kind: 'transaction';
      id: string;
      date: string;
      counterpartyName: string;
      paymentPurpose: string;
      amount: number;
      currency: string;
      transactionType: string;
      categoryId: string | null;
      categoryName: string | null;
      categorySource: string | null;
      categoryReason: string | null;
      statementId: string | null;
    }
  | {
      kind: 'receipt';
      id: string;
      date: string | null;
      vendor: string | null;
      amount: number | null;
      currency: string | null;
      issues: string[];
    }
  | {
      kind: 'duplicate';
      id: string;
      date: string;
      counterpartyName: string;
      amount: number;
      currency: string;
      duplicateOfId: string | null;
      confidence: number | null;
      matchType: string | null;
    }
  | {
      kind: 'subscription';
      id: string;
      vendorName: string;
      amount: number;
      currency: string;
      frequency: string;
      confidence: number | null;
      nextChargeDate: string | null;
    };

export interface ReviewInboxPage {
  kind: ReviewInboxKind;
  counts: ReviewInboxCounts;
  items: ReviewInboxItem[];
  total: number;
  page: number;
  limit: number;
}

const DEFAULT_LIMIT = 50;

/**
 * One queue of everything that needs a human decision, read from the rows
 * that already exist: nothing is copied into a separate table, so an item
 * leaves the queue the moment the underlying row is resolved — by this
 * module, by the statements pages, or by an import that fixes it.
 */
@Injectable()
export class ReviewInboxService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly transactionsService: TransactionsService,
    private readonly deduplicationService: CrossStatementDeduplicationService,
  ) {}

  /**
   * Which category sources still need a look. "Uncategorised" always does;
   * the model's picks do unless the workspace chose to trust them.
   */
  private async reviewableSources(workspaceId: string): Promise<TransactionCategorySource[]> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      select: ['id', 'settings'],
    });
    const { autoApproveAiPicks } = readProcessingSettings(workspace);
    return autoApproveAiPicks
      ? [TransactionCategorySource.DEFAULT]
      : [TransactionCategorySource.DEFAULT, TransactionCategorySource.AI];
  }

  private transactionsQuery(workspaceId: string, sources: TransactionCategorySource[]) {
    return this.transactionRepository
      .createQueryBuilder('t')
      .leftJoin('t.statement', 's')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.isDuplicate = false')
      .andWhere('t.isVerified = false')
      .andWhere('t.transferPairId IS NULL')
      .andWhere('(t.statementId IS NULL OR s.deletedAt IS NULL)')
      .andWhere('(t.categoryId IS NULL OR t.categorySource IN (:...sources))', { sources });
  }

  private duplicatesQuery(workspaceId: string) {
    return this.transactionRepository
      .createQueryBuilder('t')
      .leftJoin('t.statement', 's')
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.isDuplicate = true')
      .andWhere('t.isVerified = false')
      .andWhere("(t.duplicateMatchType IS NULL OR t.duplicateMatchType != 'manual')")
      .andWhere('(t.statementId IS NULL OR s.deletedAt IS NULL)');
  }

  private applyDateRange<T extends { andWhere: (sql: string, params?: object) => T }>(
    query: T,
    filters: Pick<ReviewInboxQueryDto, 'from' | 'to'>,
  ): T {
    let result = query;
    if (filters.from) {
      result = result.andWhere('t.transactionDate >= :from', { from: filters.from });
    }
    if (filters.to) {
      result = result.andWhere('t.transactionDate <= :to', { to: filters.to });
    }
    return result;
  }

  async counts(workspaceId: string): Promise<ReviewInboxCounts> {
    const sources = await this.reviewableSources(workspaceId);
    const [transaction, duplicate, receipt, subscription] = await Promise.all([
      this.transactionsQuery(workspaceId, sources).getCount(),
      this.duplicatesQuery(workspaceId).getCount(),
      this.receiptRepository.count({
        where: { workspaceId, status: ReceiptStatus.NEEDS_REVIEW, isDuplicate: false },
      }),
      this.subscriptionRepository.count({
        where: { workspaceId, status: SubscriptionStatus.DETECTED },
      }),
    ]);
    return {
      transaction,
      receipt,
      duplicate,
      subscription,
      total: transaction + receipt + duplicate + subscription,
    };
  }

  async list(workspaceId: string, filters: ReviewInboxQueryDto): Promise<ReviewInboxPage> {
    const kind = filters.kind ?? ReviewInboxKind.TRANSACTION;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    const counts = await this.counts(workspaceId);

    let items: ReviewInboxItem[] = [];
    let total = 0;

    if (kind === ReviewInboxKind.TRANSACTION) {
      const sources = await this.reviewableSources(workspaceId);
      const [rows, count] = await this.applyDateRange(
        this.transactionsQuery(workspaceId, sources),
        filters,
      )
        .orderBy('t.transactionDate', 'DESC')
        .addOrderBy('t.id', 'ASC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();
      total = count;
      items = rows.map(row => ({
        kind: 'transaction',
        id: row.id,
        date: toDateString(row.transactionDate),
        counterpartyName: row.counterpartyName,
        paymentPurpose: row.paymentPurpose,
        amount: absAmount(row),
        currency: row.currency,
        transactionType: row.transactionType,
        categoryId: row.categoryId,
        categoryName: row.category?.name ?? null,
        categorySource: row.categorySource,
        categoryReason: row.categoryReason,
        statementId: row.statementId,
      }));
    } else if (kind === ReviewInboxKind.DUPLICATE) {
      const [rows, count] = await this.applyDateRange(this.duplicatesQuery(workspaceId), filters)
        .orderBy('t.transactionDate', 'DESC')
        .addOrderBy('t.id', 'ASC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();
      total = count;
      items = rows.map(row => ({
        kind: 'duplicate',
        id: row.id,
        date: toDateString(row.transactionDate),
        counterpartyName: row.counterpartyName,
        amount: absAmount(row),
        currency: row.currency,
        duplicateOfId: row.duplicateOfId,
        confidence: row.duplicateConfidence === null ? null : Number(row.duplicateConfidence),
        matchType: row.duplicateMatchType,
      }));
    } else if (kind === ReviewInboxKind.RECEIPT) {
      const dateWhere =
        filters.from && filters.to
          ? { createdAt: Between(new Date(filters.from), endOfDay(filters.to)) }
          : filters.from
            ? { createdAt: MoreThanOrEqual(new Date(filters.from)) }
            : filters.to
              ? { createdAt: LessThanOrEqual(endOfDay(filters.to)) }
              : {};
      const [rows, count] = await this.receiptRepository.findAndCount({
        where: { workspaceId, status: ReceiptStatus.NEEDS_REVIEW, isDuplicate: false, ...dateWhere },
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });
      total = count;
      items = rows.map(row => ({
        kind: 'receipt',
        id: row.id,
        date: row.parsedData?.date ?? null,
        vendor: row.parsedData?.vendor ?? null,
        amount: typeof row.parsedData?.amount === 'number' ? row.parsedData.amount : null,
        currency: row.parsedData?.currency ?? null,
        issues: receiptIssues(row),
      }));
    } else {
      const [rows, count] = await this.subscriptionRepository.findAndCount({
        where: { workspaceId, status: SubscriptionStatus.DETECTED },
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });
      total = count;
      items = rows.map(row => ({
        kind: 'subscription',
        id: row.id,
        vendorName: row.vendorName,
        amount: Number(row.amount),
        currency: row.currency,
        frequency: row.frequency,
        confidence: row.confidence === null ? null : Number(row.confidence),
        nextChargeDate: row.nextChargeDate ? toDateString(row.nextChargeDate) : null,
      }));
    }

    return { kind, counts, items, total, page, limit };
  }

  /**
   * Marks the rows reviewed, with a category when one is given. Goes through
   * the ordinary update so the pick is recorded as manual, learned from, and
   * audited like any other edit.
   */
  async approveTransactions(
    workspaceId: string,
    userId: string,
    ids: string[],
    categoryId?: string,
  ): Promise<{ approved: number }> {
    const updates = { isVerified: true, ...(categoryId ? { categoryId } : {}) };
    const updated = await this.transactionsService.bulkUpdate(
      workspaceId,
      userId,
      ids.map(id => ({ id, updates })),
    );
    return { approved: updated.length };
  }

  async resolveDuplicate(
    workspaceId: string,
    id: string,
    decision: DuplicateDecision,
  ): Promise<{ id: string; isDuplicate: boolean }> {
    const row = await this.transactionRepository.findOne({
      where: { id, workspaceId, isDuplicate: true, duplicateOfId: Not(IsNull()) },
    });
    if (!row) {
      throw new NotFoundException('Suspected duplicate not found');
    }
    if (decision === DuplicateDecision.KEEP) {
      await this.deduplicationService.unmarkDuplicate(id, workspaceId);
      return { id, isDuplicate: false };
    }
    // A confirmed duplicate stays flagged and excluded; "reviewed" just stops the asking.
    await this.transactionRepository.update({ id, workspaceId }, { isVerified: true });
    return { id, isDuplicate: true };
  }
}

function absAmount(row: Transaction): number {
  return Math.abs(Number(row.amount) || Number(row.debit) || Number(row.credit) || 0);
}

function toDateString(value: Date | string): string {
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

function endOfDay(date: string): Date {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function receiptIssues(receipt: Receipt): string[] {
  const issues = [...(receipt.parsedData?.validationIssues ?? [])];
  if (typeof receipt.parsedData?.amount !== 'number') issues.push('missing_amount');
  if (!receipt.parsedData?.date) issues.push('missing_date');
  if (receipt.metadata?.potentialDuplicates?.length) issues.push('potential_duplicate');
  return issues;
}
