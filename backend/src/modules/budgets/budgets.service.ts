import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { assertFound } from '../../common/utils/assert-found.util';
import { Budget } from '../../entities/budget.entity';
import { Goal } from '../../entities/goal.entity';
import {
  NotificationCategory,
  NotificationSeverity,
  NotificationType,
} from '../../entities/notification.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { clampToWindow, computePeriodRange, overlapsWindow } from './budget-period.util';
import type { CreateBudgetDto } from './dto/create-budget.dto';
import type { UpdateBudgetDto } from './dto/update-budget.dto';

export interface BudgetWithSpending extends Budget {
  spentAmount: number;
  percentUsed: number;
  /** Whether today falls inside the budget's window. Always true for open-ended ones. */
  isActive: boolean;
}

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateBudgetDto): Promise<Budget> {
    const goalId = dto.goalId ?? null;

    // Scoped by goal as well as category: the household grocery limit and the
    // "food during the move" limit are different intents over the same
    // category, and only a second *unattached* budget is still a duplicate.
    const existing = await this.budgetRepository.findOne({
      where: {
        workspaceId,
        categoryId: dto.categoryId,
        periodType: dto.periodType,
        goalId,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Budget for this category with period "${dto.periodType}" already exists`,
      );
    }

    assertWindowOrdered(dto.startsOn, dto.endsOn);
    await this.assertGoalInWorkspace(dto.goalId, workspaceId);

    const { start } = computePeriodRange(dto.periodType, new Date());

    const budget = this.budgetRepository.create({
      workspaceId,
      createdById: userId,
      name: dto.name,
      categoryId: dto.categoryId,
      limitAmount: dto.limitAmount,
      currency: dto.currency || 'KZT',
      periodType: dto.periodType,
      currentPeriodStart: start,
      goalId,
      startsOn: dto.startsOn ?? null,
      endsOn: dto.endsOn ?? null,
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
    assertWindowOrdered(
      dto.startsOn === undefined ? budget.startsOn : dto.startsOn,
      dto.endsOn === undefined ? budget.endsOn : dto.endsOn,
    );
    await this.assertGoalInWorkspace(dto.goalId, workspaceId);
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
      // A budget outside its window governs nothing right now, so it must not
      // warn: a project budget that ended in August should go quiet, not fire
      // every month afterwards on spending it no longer covers.
      const period = clampToWindow(computePeriodRange(budget.periodType, new Date()), budget);
      if (!period) {
        continue;
      }
      const { start, end } = period;
      const spentAmount = await this.computeSpending(workspaceId, budget.categoryId, start, end);
      const percentUsed =
        Number(budget.limitAmount) > 0 ? (spentAmount / Number(budget.limitAmount)) * 100 : 0;

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
      where: [{ alertAt80Sent: true }, { alertAt100Sent: true }],
    });

    const now = new Date();
    let resetCount = 0;

    for (const budget of budgets) {
      const { start } = computePeriodRange(budget.periodType, now);
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

  /**
   * A budget may only point at a goal of its own workspace. Nothing else in
   * this module cross-checks a foreign id, and `update` assigns the DTO blindly,
   * so without this a crafted `goalId` would link across tenants.
   *
   * Soft-deleted goals are excluded by TypeORM's default scope, so an archived
   * goal cannot be attached either.
   */
  private async assertGoalInWorkspace(
    goalId: string | null | undefined,
    workspaceId: string,
  ): Promise<void> {
    if (!goalId) {
      return;
    }
    const goal = await this.goalRepository.findOne({ where: { id: goalId, workspaceId } });
    assertFound(goal, 'Goal');
  }

  private async attachSpending(budget: Budget): Promise<BudgetWithSpending> {
    const now = new Date();
    // Clamped rather than skipped: a budget that started on the 10th reports
    // the part of the month it actually governs, and one whose window has
    // closed reports nothing instead of the whole month's spending against a
    // limit that no longer applies.
    const period = clampToWindow(computePeriodRange(budget.periodType, now), budget);
    const spentAmount = period
      ? await this.computeSpending(
          budget.workspaceId,
          budget.categoryId,
          period.start,
          period.end,
        )
      : 0;
    const limitAmount = Number(budget.limitAmount);
    const percentUsed = limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;

    return Object.assign(budget, {
      spentAmount: Math.round(spentAmount * 100) / 100,
      percentUsed: Math.round(percentUsed * 100) / 100,
      isActive: overlapsWindow({ start: now, end: now }, budget),
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
}

/**
 * A window that ends before it starts governs nothing, and the two dates are
 * set on different screens often enough that the mistake is easy to make.
 */
function assertWindowOrdered(startsOn: string | null | undefined, endsOn: string | null | undefined): void {
  if (startsOn && endsOn && startsOn > endsOn) {
    throw new BadRequestException('Budget "endsOn" must not be earlier than "startsOn"');
  }
}
