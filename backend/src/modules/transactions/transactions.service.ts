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
import { Statement, StatementStatus } from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { TransactionType } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { WorkspaceMember, WorkspaceRole } from '../../entities/workspace-member.entity';
import { AuditService } from '../audit/audit.service';
import { ClassificationService } from '../classification/services/classification.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import type { DataDeletedEvent } from '../notifications/events/notification-events';
import type { BulkUpdateItemDto } from './dto/bulk-update-transaction.dto';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
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

  private applyManualTransactionToStatement(
    statement: Statement,
    debit: number,
    credit: number,
  ): void {
    statement.totalTransactions = (statement.totalTransactions ?? 0) + 1;
    statement.totalDebit = Number(statement.totalDebit ?? 0) + debit;
    statement.totalCredit = Number(statement.totalCredit ?? 0) + credit;
    if (
      statement.status === StatementStatus.ERROR ||
      statement.status === StatementStatus.UPLOADED
    ) {
      statement.status = StatementStatus.COMPLETED;
      statement.errorMessage = null;
    }
  }

  async create(
    workspaceId: string,
    userId: string,
    createDto: CreateTransactionDto,
  ): Promise<Transaction> {
    await this.ensureCanEditStatements(userId);

    const debit = Number(createDto.debit) > 0 ? Number(createDto.debit) : 0;
    const credit = Number(createDto.credit) > 0 ? Number(createDto.credit) : 0;
    if (debit <= 0 && credit <= 0) {
      throw new BadRequestException('Укажите сумму расхода или дохода');
    }

    const statement = await this.statementRepository.findOne({
      where: { id: createDto.statementId, workspaceId },
    });
    if (!statement) {
      throw new NotFoundException('Statement not found');
    }

    const transactionType = credit > 0 ? TransactionType.INCOME : TransactionType.EXPENSE;

    const transaction = this.transactionRepository.create({
      workspaceId,
      statementId: statement.id,
      transactionDate: createDto.transactionDate,
      counterpartyName: createDto.counterpartyName,
      paymentPurpose: createDto.paymentPurpose,
      debit: debit > 0 ? debit : null,
      credit: credit > 0 ? credit : null,
      amount: debit > 0 ? debit : credit,
      currency: createDto.currency || statement.currency || 'KZT',
      transactionType,
      categoryId: createDto.categoryId ?? null,
      branchId: createDto.branchId ?? null,
      walletId: createDto.walletId ?? null,
      comments: createDto.comments ?? null,
      isVerified: true,
    });

    const saved = await this.transactionRepository.save(transaction);

    this.applyManualTransactionToStatement(statement, debit, credit);
    await this.statementRepository.save(statement);

    await this.invalidateReports(userId);

    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.TRANSACTION,
      entityId: saved.id,
      action: AuditAction.CREATE,
      diff: { before: null, after: saved },
      meta: { statementId: statement.id, source: 'manual' },
      isUndoable: true,
    });

    return saved;
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
