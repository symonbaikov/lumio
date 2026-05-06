import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  NotificationCategory,
  NotificationSeverity,
  NotificationType,
} from '../../entities/notification.entity';
import { EntityType } from '../../entities/audit-event.entity';
import { Payable, PayableSource, PayableStatus } from '../../entities/payable.entity';
import { Statement } from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePagination } from '../../common/utils/pagination.util';
import { CreatePayableDto } from './dto/create-payable.dto';
import { ExportFormat, FilterPayablesDto, PayablesSortOption } from './dto/filter-payables.dto';
import { UpdatePayableDto } from './dto/update-payable.dto';
import { PayablesExportService } from './payables-export.service';

@Injectable()
export class PayablesService {
  private readonly logger = new Logger(PayablesService.name);

  constructor(
    @InjectRepository(Payable)
    private readonly payableRepository: Repository<Payable>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    private readonly notificationsService: NotificationsService,
    private readonly payablesExportService: PayablesExportService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreatePayableDto): Promise<Payable> {
    await this.assertLinkedEntitiesInWorkspace(
      workspaceId,
      dto.linkedTransactionId ?? null,
      dto.statementId ?? null,
    );

    const payable = this.payableRepository.create({
      workspaceId,
      createdById: userId,
      vendor: dto.vendor,
      amount: dto.amount,
      currency: dto.currency || 'KZT',
      dueDate: this.parseDate(dto.dueDate),
      status: dto.status || PayableStatus.TO_PAY,
      linkedTransactionId: dto.linkedTransactionId || null,
      source: dto.source || PayableSource.MANUAL,
      isRecurring: dto.isRecurring ?? false,
      comment: dto.comment || null,
      statementId: dto.statementId || null,
      paidAt: dto.status === PayableStatus.PAID ? new Date() : null,
      dueSoonNotifiedAt: null,
    });

    return this.payableRepository.save(payable);
  }

  async findAll(workspaceId: string, filters: FilterPayablesDto) {
    const { page, limit, skip } = normalizePagination(filters);
    const queryBuilder = this.applySorting(this.buildFilteredQuery(workspaceId, filters), filters)
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async findOne(id: string, workspaceId: string): Promise<Payable> {
    const payable = await this.payableRepository.findOne({
      where: {
        id,
        workspaceId,
        deletedAt: null,
      },
    });

    if (!payable) {
      throw new NotFoundException('Payable not found');
    }

    return payable;
  }

  async update(
    id: string,
    workspaceId: string,
    _userId: string,
    dto: UpdatePayableDto,
  ): Promise<Payable> {
    const payable = await this.findOne(id, workspaceId);
    await this.assertLinkedEntitiesInWorkspace(
      workspaceId,
      dto.linkedTransactionId === undefined ? undefined : (dto.linkedTransactionId ?? null),
      dto.statementId === undefined ? undefined : (dto.statementId ?? null),
    );
    Object.assign(payable, this.normalizeUpdateDto(dto, payable));
    return this.payableRepository.save(payable);
  }

  async markAsPaid(
    id: string,
    workspaceId: string,
    userId: string,
    payload: { linkedTransactionId?: string },
  ): Promise<Payable> {
    const payable = await this.findOne(id, workspaceId);
    await this.assertLinkedTransactionInWorkspace(workspaceId, payload.linkedTransactionId ?? null);
    payable.status = PayableStatus.PAID;
    payable.linkedTransactionId = payload.linkedTransactionId || payable.linkedTransactionId;
    payable.paidAt = payable.paidAt || new Date();

    const saved = await this.payableRepository.save(payable);

    try {
      await this.notificationsService.createForWorkspaceMembers({
        workspaceId,
        actorId: userId,
        type: NotificationType.PAYABLE_MARKED_PAID,
        category: NotificationCategory.WORKSPACE_ACTIVITY,
        severity: NotificationSeverity.INFO,
        messageKey: 'payable.marked_paid',
        messageParams: { vendor: saved.vendor },
        entityType: EntityType.PAYABLE,
        entityId: saved.id,
        meta: {
          payableId: saved.id,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send payable paid notification for ${saved.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return saved;
  }

  async archive(id: string, workspaceId: string, _userId: string): Promise<Payable> {
    const payable = await this.findOne(id, workspaceId);
    payable.status = PayableStatus.ARCHIVED;
    return this.payableRepository.save(payable);
  }

  async remove(id: string, workspaceId: string, _userId: string): Promise<void> {
    const payable = await this.findOne(id, workspaceId);
    await this.payableRepository.softRemove(payable);
  }

  async getSummary(workspaceId: string): Promise<{
    toPay: number;
    overdue: number;
    dueThisWeek: number;
    paidThisMonth: number;
    toPayCount: number;
    overdueCount: number;
  }> {
    const rows = await this.payableRepository.find({
      where: { workspaceId, deletedAt: IsNull() },
      select: {
        id: true,
        status: true,
        dueDate: true,
        amount: true,
        paidAt: true,
        updatedAt: true,
      },
    });

    const now = new Date();
    const startOfToday = this.startOfDay(now);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setUTCDate(endOfWeek.getUTCDate() + 6);
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    let toPay = 0;
    let overdue = 0;
    let dueThisWeek = 0;
    let paidThisMonth = 0;
    let toPayCount = 0;
    let overdueCount = 0;

    for (const row of rows) {
      const amount = Number(row.amount || 0);
      const dueDate = this.parseDate(row.dueDate);
      const paidAt = this.parseDate(row.paidAt ?? row.updatedAt);
      const effectiveOverdue =
        dueDate !== null &&
        dueDate < startOfToday &&
        ![PayableStatus.PAID, PayableStatus.ARCHIVED].includes(row.status);

      if (effectiveOverdue) {
        overdue += amount;
        overdueCount += 1;
      } else if (row.status === PayableStatus.TO_PAY || row.status === PayableStatus.SCHEDULED) {
        toPay += amount;
        toPayCount += 1;
        if (dueDate && dueDate >= startOfToday && dueDate <= endOfWeek) {
          dueThisWeek += amount;
        }
      }

      if (row.status === PayableStatus.PAID && paidAt && paidAt >= startOfMonth && paidAt <= endOfMonth) {
        paidThisMonth += amount;
      }
    }

    return {
      toPay,
      overdue,
      dueThisWeek,
      paidThisMonth,
      toPayCount,
      overdueCount,
    };
  }

  async getExportData(workspaceId: string, filters: FilterPayablesDto): Promise<Payable[]> {
    return this.applySorting(this.buildFilteredQuery(workspaceId, filters), filters).getMany();
  }

  private applySorting(
    queryBuilder: ReturnType<PayablesService['buildFilteredQuery']>,
    filters: FilterPayablesDto,
  ) {
    switch (filters.sort) {
      case PayablesSortOption.DUE_DATE_DESC:
        return queryBuilder.orderBy('payable.dueDate', 'DESC', 'NULLS LAST');
      case PayablesSortOption.AMOUNT_DESC:
        return queryBuilder.orderBy('payable.amount', 'DESC');
      case PayablesSortOption.VENDOR_ASC:
        return queryBuilder.orderBy('payable.vendor', 'ASC');
      case PayablesSortOption.DUE_DATE_ASC:
      default:
        return queryBuilder.orderBy('payable.dueDate', 'ASC', 'NULLS LAST');
    }
  }

  async exportData(
    workspaceId: string,
    filters: FilterPayablesDto,
  ): Promise<{ filePath: string; fileName: string; contentType: string }> {
    const data = await this.getExportData(workspaceId, filters);
    return this.payablesExportService.exportPayables(data, filters.format || ExportFormat.EXCEL);
  }

  isOverdue(payable: Pick<Payable, 'status' | 'dueDate'>): boolean {
    if (!payable.dueDate) {
      return false;
    }

    if ([PayableStatus.PAID, PayableStatus.ARCHIVED].includes(payable.status)) {
      return false;
    }

    return this.startOfDay(payable.dueDate) < this.startOfDay(new Date());
  }

  async findOverduePayables(): Promise<Payable[]> {
    return this.payableRepository
      .createQueryBuilder('payable')
      .where('payable.deletedAt IS NULL')
      .andWhere('payable.status IN (:...statuses)', {
        statuses: [PayableStatus.TO_PAY, PayableStatus.SCHEDULED],
      })
      .andWhere('payable.dueDate < :today', {
        today: this.startOfDay(new Date()),
      })
      .getMany();
  }

  async findDueSoonPayables(days = 7): Promise<Payable[]> {
    const today = this.startOfDay(new Date());
    const targetDate = new Date(today);
    targetDate.setUTCDate(targetDate.getUTCDate() + days);

    return this.payableRepository
      .createQueryBuilder('payable')
      .where('payable.deletedAt IS NULL')
      .andWhere('payable.status IN (:...statuses)', {
        statuses: [PayableStatus.TO_PAY, PayableStatus.SCHEDULED],
      })
      .andWhere('payable.dueSoonNotifiedAt IS NULL')
      .andWhere('payable.dueDate BETWEEN :from AND :to', {
        from: today,
        to: targetDate,
      })
      .getMany();
  }

  async markOverduePayables(): Promise<Payable[]> {
    const overduePayables = await this.findOverduePayables();
    const updated: Payable[] = [];

    for (const payable of overduePayables) {
      if (payable.status === PayableStatus.OVERDUE) {
        continue;
      }

      payable.status = PayableStatus.OVERDUE;
      updated.push(await this.payableRepository.save(payable));
    }

    return updated;
  }

  async markDueSoonNotified(id: string): Promise<void> {
    const payable = await this.payableRepository.findOne({ where: { id }, select: ['id', 'dueSoonNotifiedAt'] });
    if (!payable) {
      throw new NotFoundException('Payable not found');
    }

    payable.dueSoonNotifiedAt = new Date();
    await this.payableRepository.save(payable);
  }

  private buildFilteredQuery(workspaceId: string, filters: FilterPayablesDto) {
    const queryBuilder = this.payableRepository
      .createQueryBuilder('payable')
      .where('payable.workspaceId = :workspaceId', { workspaceId })
      .andWhere('payable.deletedAt IS NULL');

    if (!filters.includeArchived) {
      queryBuilder.andWhere('payable.status != :archivedStatus', {
        archivedStatus: PayableStatus.ARCHIVED,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('payable.status = :status', { status: filters.status });
    }

    if (filters.source) {
      queryBuilder.andWhere('payable.source = :source', { source: filters.source });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(payable.vendor) LIKE :search OR LOWER(COALESCE(payable.comment, \'\')) LIKE :search)',
        {
        search: `%${filters.search.toLowerCase()}%`,
        },
      );
    }

    if (filters.minAmount !== undefined) {
      queryBuilder.andWhere('payable.amount >= :minAmount', { minAmount: filters.minAmount });
    }

    if (filters.maxAmount !== undefined) {
      queryBuilder.andWhere('payable.amount <= :maxAmount', { maxAmount: filters.maxAmount });
    }

    const dueDateFrom = this.parseDate(filters.dueDateFrom);
    const dueDateTo = this.parseDate(filters.dueDateTo);
    if (dueDateFrom && dueDateTo) {
      queryBuilder.andWhere('payable.dueDate BETWEEN :dueDateFrom AND :dueDateTo', {
        dueDateFrom,
        dueDateTo,
      });
    } else if (dueDateFrom) {
      queryBuilder.andWhere('payable.dueDate >= :dueDateFrom', { dueDateFrom });
    } else if (dueDateTo) {
      queryBuilder.andWhere('payable.dueDate <= :dueDateTo', { dueDateTo });
    }

    return queryBuilder;
  }

  private normalizeUpdateDto(dto: UpdatePayableDto, current: Payable): Partial<Payable> {
    const nextStatus = dto.status ?? current.status;
    const willBePaid = nextStatus === PayableStatus.PAID;

    return {
      ...dto,
      dueDate: dto.dueDate !== undefined ? this.parseDate(dto.dueDate) : undefined,
      linkedTransactionId: dto.linkedTransactionId === undefined ? undefined : dto.linkedTransactionId,
      comment: dto.comment === undefined ? undefined : dto.comment,
      statementId: dto.statementId === undefined ? undefined : dto.statementId,
      paidAt: willBePaid ? current.paidAt || new Date() : null,
    };
  }

  private async assertLinkedEntitiesInWorkspace(
    workspaceId: string,
    linkedTransactionId?: string | null,
    statementId?: string | null,
  ): Promise<void> {
    if (linkedTransactionId !== undefined) {
      await this.assertLinkedTransactionInWorkspace(workspaceId, linkedTransactionId);
    }

    if (statementId !== undefined) {
      await this.assertStatementInWorkspace(workspaceId, statementId);
    }
  }

  private async assertLinkedTransactionInWorkspace(
    workspaceId: string,
    linkedTransactionId: string | null,
  ): Promise<void> {
    if (!linkedTransactionId) {
      return;
    }

    const transaction = await this.transactionRepository.findOne({
      where: { id: linkedTransactionId, workspaceId },
      select: ['id'],
    });

    if (!transaction) {
      throw new BadRequestException('Linked transaction not found in workspace');
    }
  }

  private async assertStatementInWorkspace(workspaceId: string, statementId: string | null): Promise<void> {
    if (!statementId) {
      return;
    }

    const statement = await this.statementRepository.findOne({
      where: { id: statementId, workspaceId },
      select: ['id'],
    });

    if (!statement) {
      throw new BadRequestException('Statement not found in workspace');
    }
  }

  private parseDate(value?: string | Date | null): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const normalized = value.length <= 10 ? `${value}T00:00:00.000Z` : value;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setUTCHours(0, 0, 0, 0);
    return copy;
  }
}
