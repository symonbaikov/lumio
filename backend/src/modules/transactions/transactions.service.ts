import { randomUUID } from 'node:crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import type { Repository } from 'typeorm';
import { ActorType, AuditAction, EntityType } from '../../entities/audit-event.entity';
import { Statement } from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { TransactionType } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { WorkspaceMember, WorkspaceRole } from '../../entities/workspace-member.entity';
import { AuditService } from '../audit/audit.service';
import { ClassificationService } from '../classification/services/classification.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import type { DataDeletedEvent } from '../notifications/events/notification-events';
import type { BulkUpdateItemDto } from './dto/bulk-update-transaction.dto';
import type { SplitPartDto, SplitTransactionDto } from './dto/split-transaction.dto';
import type { UpdateTransactionDto } from './dto/update-transaction.dto';

export type TransactionWithConversion = Transaction & {
  convertedAmount?: number;
  conversionRate?: number;
  convertedCurrency?: string;
};

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Statement)
    private statementRepository: Repository<Statement>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly auditService: AuditService,
    private readonly classificationService: ClassificationService,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  private async resolveActorName(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['name', 'email'],
    });
    return user?.name || user?.email || 'User';
  }

  private async invalidateReports(userId: string): Promise<void> {
    const key = `reports:version:${userId}`;
    await this.cacheManager.set(key, Date.now().toString(), 0);
  }

  private async ensureCanEditStatements(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'workspaceId'],
    });
    const workspaceId = user?.workspaceId ?? null;
    if (!workspaceId) {
      return;
    }

    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
      select: ['role', 'permissions'],
    });

    if (!membership) {
      return;
    }
    if ([WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(membership.role)) {
      return;
    }

    if (membership.permissions?.canEditStatements === false) {
      throw new ForbiddenException('Недостаточно прав для редактирования выписок');
    }
  }

  async findAll(
    workspaceId: string,
    filters: {
      statementId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      type?: string;
      categoryId?: string;
      currency?: string;
      convertTo?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: TransactionWithConversion[]; total: number; page: number; limit: number }> {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.workspaceId = :workspaceId', { workspaceId })
      .leftJoinAndSelect('transaction.statement', 'statement')
      .andWhere('(transaction.statementId IS NULL OR statement.deletedAt IS NULL)')
      .leftJoinAndSelect('transaction.category', 'category')
      .leftJoinAndSelect('transaction.branch', 'branch')
      .leftJoinAndSelect('transaction.wallet', 'wallet');

    if (filters.statementId) {
      query.andWhere('transaction.statementId = :statementId', {
        statementId: filters.statementId,
      });
    }

    if (filters.dateFrom) {
      query.andWhere('transaction.transactionDate >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      query.andWhere('transaction.transactionDate <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    if (filters.type) {
      query.andWhere('transaction.transactionType = :type', { type: filters.type });
    }

    if (filters.categoryId) {
      query.andWhere('transaction.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters.currency) {
      query.andWhere('UPPER(transaction.currency) = :currency', {
        currency: filters.currency.toUpperCase(),
      });
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    query.orderBy('transaction.transactionDate', 'DESC').skip(skip).take(limit);

    const [rawData, total] = await query.getManyAndCount();

    if (!filters.convertTo) {
      return { data: rawData, total, page, limit };
    }

    const targetCurrency = filters.convertTo.toUpperCase();
    const items = rawData.map(tx => ({
      amount: Number(tx.amount) || Number(tx.debit) || Number(tx.credit) || 0,
      currency: tx.currency || 'KZT',
      date: tx.transactionDate,
    }));
    const conversions = await this.exchangeRatesService.bulkConvert(items, targetCurrency);

    const data: TransactionWithConversion[] = rawData.map((tx, i) => {
      const conv = conversions[i];
      return Object.assign(Object.create(Object.getPrototypeOf(tx)), tx, {
        convertedAmount: conv.converted,
        conversionRate: conv.rate,
        convertedCurrency: targetCurrency,
      });
    });

    return { data, total, page, limit };
  }

  async findOne(id: string, workspaceId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, workspaceId },
      relations: ['category', 'branch', 'wallet'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async update(
    id: string,
    workspaceId: string,
    userId: string,
    updateDto: UpdateTransactionDto,
    batchId?: string | null,
  ): Promise<Transaction> {
    await this.ensureCanEditStatements(userId);
    const transaction = await this.findOne(id, workspaceId);
    const before = { ...transaction };
    const previousCategoryId = transaction.categoryId;

    // Recalculate amount if debit/credit changed
    if (updateDto.debit !== undefined || updateDto.credit !== undefined) {
      const debit = updateDto.debit !== undefined ? updateDto.debit : transaction.debit;
      const credit = updateDto.credit !== undefined ? updateDto.credit : transaction.credit;
      updateDto.amount = debit || credit || 0;

      // Update transaction type
      if (debit && debit > 0) {
        updateDto.transactionType = TransactionType.EXPENSE;
      } else if (credit && credit > 0) {
        updateDto.transactionType = TransactionType.INCOME;
      }
    } else if (
      updateDto.amountForeign !== undefined &&
      updateDto.exchangeRate !== undefined &&
      updateDto.amount === undefined
    ) {
      const nativeAmount = Number(updateDto.amountForeign) * Number(updateDto.exchangeRate);
      updateDto.amount = nativeAmount;
    }

    Object.assign(transaction, updateDto);

    const saved = await this.transactionRepository.save(transaction);
    await this.invalidateReports(userId);

    // Audit: capture transaction update with before/after snapshot.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.TRANSACTION,
      entityId: saved.id,
      action: AuditAction.UPDATE,
      diff: { before, after: saved },
      meta: {
        updatedFields: Object.keys(updateDto),
      },
      batchId: batchId ?? null,
      isUndoable: true,
    });

    if (
      updateDto.categoryId !== undefined &&
      updateDto.categoryId !== null &&
      updateDto.categoryId !== previousCategoryId
    ) {
      try {
        await this.classificationService.learnFromCorrection(saved, updateDto.categoryId, userId);
      } catch (error) {
        console.error('[TransactionsService] Failed to learn from category correction:', error);
      }
    }

    return saved;
  }

  async bulkUpdate(
    workspaceId: string,
    userId: string,
    items: BulkUpdateItemDto[],
  ): Promise<Transaction[]> {
    await this.ensureCanEditStatements(userId);
    const updatedTransactions: Transaction[] = [];
    const batchId = items.length > 1 ? randomUUID() : null;

    for (const item of items) {
      try {
        const transaction = await this.update(item.id, workspaceId, userId, item.updates, batchId);
        updatedTransactions.push(transaction);
      } catch (error) {
        console.error(`Error updating transaction ${item.id}:`, error);
      }
    }

    if (updatedTransactions.length > 0) {
      await this.invalidateReports(userId);
    }

    return updatedTransactions;
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Builds the sibling template: every column a split part inherits verbatim from
   * the row it was split from. An allowlist, so a newly added column is inherited
   * only once someone decides it should be.
   *
   * Excluded on purpose: `id` and the createdAt/updatedAt timestamps; the loaded
   * relation objects (category, wallet, branch, ...), so saving a part never
   * cascades into them; the per-part money columns (amount/debit/credit/
   * amountForeign) and the split markers, which `split()` assigns itself;
   * `fingerprint`, which backfill recomputes from the post-split amount; and the
   * duplicate-flag columns, unreachable because a flagged row cannot be split.
   */
  private cloneForSplit(source: Transaction): Partial<Transaction> {
    return {
      workspaceId: source.workspaceId,
      statementId: source.statementId,
      transactionDate: source.transactionDate,
      documentNumber: source.documentNumber,
      counterpartyName: source.counterpartyName,
      counterpartyBin: source.counterpartyBin,
      counterpartyAccount: source.counterpartyAccount,
      counterpartyBank: source.counterpartyBank,
      currency: source.currency,
      exchangeRate: source.exchangeRate,
      paymentPurpose: source.paymentPurpose,
      categoryId: source.categoryId,
      taxRateId: source.taxRateId,
      branchId: source.branchId,
      walletId: source.walletId,
      article: source.article,
      activityType: source.activityType,
      vendorNormalized: source.vendorNormalized,
      categoryHint: source.categoryHint,
      transactionNature: source.transactionNature,
      taxDetected: source.taxDetected,
      enrichmentConfidence: source.enrichmentConfidence,
      transactionType: source.transactionType,
      comments: source.comments,
      isVerified: source.isVerified,
      importSessionId: source.importSessionId,
    };
  }

  /**
   * Guards that a transaction may be split, and returns its authoritative amount.
   *
   * Called twice: once outside the DB transaction as a cheap fast path, and again
   * on the locked row, which is the read the parts are actually derived from.
   */
  private assertSplittable(transaction: Transaction, dto: SplitTransactionDto): number {
    if (transaction.splitGroupId) {
      throw new BadRequestException('Transaction is already part of a split');
    }

    // A duplicate-flagged row is excluded from dashboards and reports. Splitting it
    // would produce siblings that default to isDuplicate=false, so the sibling
    // amounts would reappear in those totals. Refuse instead.
    if (transaction.isDuplicate) {
      throw new BadRequestException('Cannot split a transaction marked as a duplicate');
    }

    const total = Number(
      transaction.amount ?? transaction.debit ?? transaction.credit ?? Number.NaN,
    );
    if (!Number.isFinite(total) || total <= 0) {
      throw new BadRequestException('Cannot split a transaction without a positive amount');
    }

    const partsTotal = this.round2(dto.parts.reduce((sum, part) => sum + Number(part.amount), 0));
    // Round the drift too: |99.99 - 100| is 0.010000000000005 in binary floating
    // point, which would reject the very boundary the tolerance exists to accept.
    if (this.round2(Math.abs(partsTotal - total)) > 0.01) {
      throw new BadRequestException(`Split parts must sum to ${total}, received ${partsTotal}`);
    }

    return total;
  }

  /**
   * Divides a transaction's money across its parts.
   *
   * The requested amounts are rounded to cents and the LAST part absorbs the
   * residual, so the parts sum to `total` (and `foreignTotal`) exactly rather than
   * drifting by the cent the validation tolerance permits.
   */
  private allocateParts(
    total: number,
    foreignTotal: number | null,
    parts: SplitPartDto[],
  ): { amounts: number[]; foreignAmounts: (number | null)[] } {
    const amounts = parts.map(part => this.round2(Number(part.amount)));
    const lastIndex = amounts.length - 1;
    amounts[lastIndex] = this.round2(
      total - amounts.slice(0, lastIndex).reduce((sum, value) => sum + value, 0),
    );

    const foreignAmounts: (number | null)[] = amounts.map(amount =>
      foreignTotal === null ? null : this.round2((foreignTotal * amount) / total),
    );
    if (foreignTotal !== null) {
      foreignAmounts[lastIndex] = this.round2(
        foreignTotal -
          foreignAmounts.slice(0, lastIndex).reduce((sum, value) => sum + (value ?? 0), 0),
      );
    }

    return { amounts, foreignAmounts };
  }

  /**
   * Splits one transaction into N parts in place.
   *
   * The original row becomes part 0 and N-1 siblings are inserted; the parts sum
   * to the original amount, so balance/dashboard/reports/budgets aggregates need
   * no awareness of splits at all.
   */
  async split(
    id: string,
    workspaceId: string,
    userId: string,
    dto: SplitTransactionDto,
  ): Promise<Transaction[]> {
    await this.ensureCanEditStatements(userId);
    const original = await this.findOne(id, workspaceId);
    // Fast path only: reject an obviously invalid request before opening a DB
    // transaction and taking a row lock. The authoritative check is the one below.
    this.assertSplittable(original, dto);

    const before = { ...original };
    const splitGroupId = randomUUID();

    const saved = await this.transactionRepository.manager.transaction(async manager => {
      const repo = manager.getRepository(Transaction);

      // Re-read under a write lock: the fast-path check ran outside this
      // transaction, so a concurrent split — or an update() changing the amount or
      // the type — may have landed since. Everything below therefore derives from
      // `locked`, never from the stale `original`.
      const locked = await repo.findOne({
        where: { id, workspaceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) {
        throw new NotFoundException('Transaction not found');
      }

      const total = this.assertSplittable(locked, dto);
      const isExpense = locked.transactionType === TransactionType.EXPENSE;
      const rawForeign = locked.amountForeign ?? null;
      const { amounts, foreignAmounts } = this.allocateParts(
        total,
        rawForeign === null ? null : Number(rawForeign),
        dto.parts,
      );

      const template = this.cloneForSplit(locked);
      const rows: Transaction[] = [];

      for (const [index, part] of dto.parts.entries()) {
        const amount = amounts[index];
        const row = index === 0 ? locked : repo.create(template as Transaction);

        row.amount = amount;
        row.debit = isExpense ? amount : null;
        row.credit = isExpense ? null : amount;
        row.amountForeign = foreignAmounts[index];
        row.splitGroupId = splitGroupId;
        row.splitIndex = index;
        // Part 0 would otherwise keep a fingerprint hashed from the pre-split
        // amount. Null on every part so backfillFingerprints recomputes them all.
        row.fingerprint = null;

        // Per-part override, else keep what the row already inherited.
        row.categoryId = part.categoryId ?? row.categoryId;
        row.paymentPurpose = part.paymentPurpose ?? row.paymentPurpose;
        row.comments = part.comments ?? row.comments;

        rows.push(await repo.save(row));
      }

      return rows;
    });

    await this.invalidateReports(userId);

    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.TRANSACTION,
      entityId: id,
      action: AuditAction.UPDATE,
      diff: { before, after: saved },
      meta: { operation: 'split', splitGroupId, partCount: saved.length },
      isUndoable: false,
    });

    return saved;
  }

  async remove(id: string, workspaceId: string, userId: string): Promise<void> {
    await this.ensureCanEditStatements(userId);
    const transaction = await this.findOne(id, workspaceId);
    // Use delete for simplicity; entity already validated for ownership.

    await this.transactionRepository.delete(transaction.id);
    await this.invalidateReports(userId);

    // Audit: record deletion for potential rollback.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.TRANSACTION,
      entityId: transaction.id,
      action: AuditAction.DELETE,
      diff: { before: transaction, after: null },
      meta: {
        statementId: transaction.statementId,
      },
      isUndoable: true,
    });

    this.eventEmitter?.emit('data.deleted', {
      workspaceId,
      actorId: userId,
      actorName: await this.resolveActorName(userId),
      entityType: 'transaction',
      entityLabel: transaction.documentNumber || transaction.counterpartyName,
      count: 1,
    } satisfies DataDeletedEvent);
  }
}
