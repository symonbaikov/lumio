import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Budget, BudgetPeriodType } from '../../entities/budget.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import {
  NotificationCategory,
  NotificationSeverity,
  NotificationType,
} from '../../entities/notification.entity';
import { assertFound } from '../../common/utils/assert-found.util';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateBudgetDto } from './dto/create-budget.dto';
import type { UpdateBudgetDto } from './dto/update-budget.dto';

export interface BudgetWithSpending extends Budget {
  spentAmount: number;
  percentUsed: number;
}

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateBudgetDto): Promise<Budget> {
    const existing = await this.budgetRepository.findOne({
      where: {
        workspaceId,
        categoryId: dto.categoryId,
        periodType: dto.periodType,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Budget for this category with period "${dto.periodType}" already exists`,
      );
    }

    const { start } = this.computePeriodRange(dto.periodType, new Date());

    const budget = this.budgetRepository.create({
      workspaceId,
      createdById: userId,
      name: dto.name,
      categoryId: dto.categoryId,
      limitAmount: dto.limitAmount,
      currency: dto.currency || 'KZT',
      periodType: dto.periodType,
      currentPeriodStart: start,
    });

    return this.budgetRepository.save(budget);
  }

  async findAll(workspaceId: string): Promise<BudgetWithSpending[]> {
    const budgets = await this.budgetRepository.find({
      where: { workspaceId },
      relations: ['category'],
      order: { name: 'ASC' },
    });

    return Promise.all(budgets.map(budget => this.attachSpending(budget)));
  }

  async findOne(id: string, workspaceId: string): Promise<BudgetWithSpending> {
    const budget = await this.budgetRepository.findOne({
      where: { id, workspaceId },
      relations: ['category'],
    });
    assertFound(budget, 'Budget');
    return this.attachSpending(budget);
  }

  async update(id: string, workspaceId: string, dto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.budgetRepository.findOne({
      where: { id, workspaceId },
    });
    assertFound(budget, 'Budget');
    Object.assign(budget, dto);
    return this.budgetRepository.save(budget);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const budget = await this.budgetRepository.findOne({
      where: { id, workspaceId },
    });
    assertFound(budget, 'Budget');
    await this.budgetRepository.remove(budget);
  }

  async getTopBudgets(workspaceId: string, limit = 5): Promise<BudgetWithSpending[]> {
    const all = await this.findAll(workspaceId);
    return all.sort((a, b) => b.percentUsed - a.percentUsed).slice(0, limit);
  }

  async checkBudgetAlerts(workspaceId: string, categoryId?: string): Promise<void> {
    const where: Record<string, unknown> = { workspaceId };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const budgets = await this.budgetRepository.find({
      where: where as any,
      relations: ['category'],
    });

    for (const budget of budgets) {
      const { start, end } = this.computePeriodRange(budget.periodType, new Date());
      const spentAmount = await this.computeSpending(workspaceId, budget.categoryId, start, end);
      const percentUsed = Number(budget.limitAmount) > 0
        ? (spentAmount / Number(budget.limitAmount)) * 100
        : 0;

      if (percentUsed >= 100 && !budget.alertAt100Sent) {
        budget.alertAt100Sent = true;
        await this.budgetRepository.save(budget);
        await this.notificationsService.createForWorkspaceMembers({
          workspaceId,
          type: NotificationType.BUDGET_EXCEEDED,
          category: NotificationCategory.WORKSPACE_ACTIVITY,
          severity: NotificationSeverity.ERROR,
          messageKey: 'budget.exceeded',
          messageParams: { budgetName: budget.name, percentUsed: Math.round(percentUsed) },
          entityType: 'budget',
          entityId: budget.id,
          meta: {
            budgetId: budget.id,
            categoryName: budget.category?.name,
            limitAmount: budget.limitAmount,
            spentAmount,
            percentUsed: Math.round(percentUsed),
          },
        });
      } else if (percentUsed >= 80 && !budget.alertAt80Sent) {
        budget.alertAt80Sent = true;
        await this.budgetRepository.save(budget);
        await this.notificationsService.createForWorkspaceMembers({
          workspaceId,
          type: NotificationType.BUDGET_WARNING,
          category: NotificationCategory.WORKSPACE_ACTIVITY,
          severity: NotificationSeverity.WARN,
          messageKey: 'budget.warning',
          messageParams: { budgetName: budget.name, percentUsed: Math.round(percentUsed) },
          entityType: 'budget',
          entityId: budget.id,
          meta: {
            budgetId: budget.id,
            categoryName: budget.category?.name,
            limitAmount: budget.limitAmount,
            spentAmount,
            percentUsed: Math.round(percentUsed),
          },
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetPeriodAlertFlags(): Promise<void> {
    const budgets = await this.budgetRepository.find({
      where: [
        { alertAt80Sent: true },
        { alertAt100Sent: true },
      ],
    });

    const now = new Date();
    let resetCount = 0;

    for (const budget of budgets) {
      const { start } = this.computePeriodRange(budget.periodType, now);
      const currentStart = new Date(budget.currentPeriodStart);

      if (start.getTime() > currentStart.getTime()) {
        budget.currentPeriodStart = start;
        budget.alertAt80Sent = false;
        budget.alertAt100Sent = false;
        await this.budgetRepository.save(budget);
        resetCount++;
      }
    }

    if (resetCount > 0) {
      this.logger.log(`Reset alert flags for ${resetCount} budgets (new period)`);
    }
  }

  private async attachSpending(budget: Budget): Promise<BudgetWithSpending> {
    const { start, end } = this.computePeriodRange(budget.periodType, new Date());
    const spentAmount = await this.computeSpending(budget.workspaceId, budget.categoryId, start, end);
    const limitAmount = Number(budget.limitAmount);
    const percentUsed = limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;

    return Object.assign(budget, {
      spentAmount: Math.round(spentAmount * 100) / 100,
      percentUsed: Math.round(percentUsed * 100) / 100,
    });
  }

  private async computeSpending(
    workspaceId: string,
    categoryId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    const result = await this.transactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(ABS(t.amount)), 0)', 'total')
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.category_id = :categoryId', { categoryId })
      .andWhere('t.transaction_type = :type', { type: TransactionType.EXPENSE })
      .andWhere('t.transaction_date >= :start', { start })
      .andWhere('t.transaction_date <= :end', { end })
      .andWhere('t.is_duplicate = false')
      .getRawOne();

    return Number.parseFloat(result?.total ?? '0');
  }

  private computePeriodRange(periodType: BudgetPeriodType, date: Date): { start: Date; end: Date } {
    const d = new Date(date);

    switch (periodType) {
      case BudgetPeriodType.WEEKLY: {
        const day = d.getDay();
        const diff = day === 0 ? 6 : day - 1; // Monday = 0
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
        return { start, end };
      }
      case BudgetPeriodType.MONTHLY: {
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return { start, end };
      }
      case BudgetPeriodType.QUARTERLY: {
        const quarter = Math.floor(d.getMonth() / 3);
        const start = new Date(d.getFullYear(), quarter * 3, 1);
        const end = new Date(d.getFullYear(), quarter * 3 + 3, 0);
        return { start, end };
      }
      case BudgetPeriodType.ANNUAL: {
        const start = new Date(d.getFullYear(), 0, 1);
        const end = new Date(d.getFullYear(), 11, 31);
        return { start, end };
      }
    }
  }
}
