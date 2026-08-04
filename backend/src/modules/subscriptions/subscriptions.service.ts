import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { SubscriptionCharge, SubscriptionChargeMatchStatus } from '../../entities/subscription-charge.entity';
import {
  Subscription,
  SubscriptionFrequency,
  SubscriptionRiskStatus,
  SubscriptionReviewStatus,
  SubscriptionStatus,
} from '../../entities/subscription.entity';
import { SubscriptionDecision, SubscriptionDecisionType } from '../../entities/subscription-decision.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Workspace } from '../../entities/workspace.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import {
  NotificationCategory,
  NotificationSeverity,
  NotificationType,
} from '../../entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateSubscriptionDto } from './dto/create-subscription.dto';
import type { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import type { RecordSubscriptionDecisionDto } from './dto/record-subscription-decision.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(SubscriptionDecision)
    private readonly decisionRepository: Repository<SubscriptionDecision>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(SubscriptionCharge)
    private readonly chargeRepository: Repository<SubscriptionCharge>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateSubscriptionDto): Promise<Subscription> {
    const subscription = this.subscriptionRepository.create({
      workspaceId,
      createdById: userId,
      vendorName: dto.vendorName,
      amount: dto.amount,
      frequency: dto.frequency,
      currency: dto.currency ?? 'USD',
      categoryId: dto.categoryId ?? null,
      nextChargeDate: dto.nextChargeDate ? new Date(dto.nextChargeDate) : null,
      status: SubscriptionStatus.ACTIVE,
    });
    return this.subscriptionRepository.save(subscription);
  }

  async findAll(workspaceId: string, status?: SubscriptionStatus): Promise<Subscription[]> {
    const where: Record<string, unknown> = { workspaceId };
    if (status) where.status = status;
    return this.subscriptionRepository.find({
      where,
      relations: ['category'],
      order: { status: 'ASC', nextChargeDate: 'ASC' },
    });
  }

  async findOne(id: string, workspaceId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id, workspaceId },
      relations: ['category'],
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  async getDetails(id: string, workspaceId: string) {
    const subscription = await this.findOne(id, workspaceId);
    const [charges, decisions] = await Promise.all([
      this.chargeRepository.find({
        where: { workspaceId, subscriptionId: id },
        relations: ['transaction'],
        order: { chargeDate: 'DESC' },
      }),
      this.decisionRepository.find({
        where: { workspaceId, subscriptionId: id },
        order: { createdAt: 'DESC' },
      }),
    ]);
    return { subscription, charges, decisions };
  }

  async update(id: string, workspaceId: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.findOne(id, workspaceId);
    if (dto.vendorName !== undefined) subscription.vendorName = dto.vendorName;
    if (dto.amount !== undefined) subscription.amount = dto.amount;
    if (dto.frequency !== undefined) subscription.frequency = dto.frequency;
    if (dto.status !== undefined) subscription.status = dto.status;
    if (dto.currency !== undefined) subscription.currency = dto.currency;
    if (dto.categoryId !== undefined) subscription.categoryId = dto.categoryId;
    if (dto.nextChargeDate !== undefined) subscription.nextChargeDate = new Date(dto.nextChargeDate);
    return this.subscriptionRepository.save(subscription);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const subscription = await this.findOne(id, workspaceId);
    subscription.status = SubscriptionStatus.CANCELLED;
    await this.subscriptionRepository.save(subscription);
  }

  async confirm(id: string, workspaceId: string): Promise<Subscription> {
    const subscription = await this.findOne(id, workspaceId);
    subscription.status = SubscriptionStatus.ACTIVE;
    const saved = await this.subscriptionRepository.save(subscription);
    await this.recordDetectedCharges(saved);
    return saved;
  }

  async dismiss(id: string, workspaceId: string): Promise<void> {
    const subscription = await this.findOne(id, workspaceId);
    await this.subscriptionRepository.remove(subscription);
  }

  async assignOwner(id: string, workspaceId: string, ownerId: string, actorId: string): Promise<Subscription> {
    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId: ownerId },
    });
    if (!membership) {
      throw new BadRequestException('Subscription owner must be a workspace member');
    }

    const subscription = await this.findOne(id, workspaceId);
    subscription.ownerId = ownerId;
    const saved = await this.subscriptionRepository.save(subscription);
    await this.decisionRepository.save(
      this.decisionRepository.create({
        workspaceId,
        subscriptionId: id,
        actorId,
        ownerId,
        decision: SubscriptionDecisionType.OWNER_ASSIGNED,
      }),
    );
    return saved;
  }

  async recordDecision(
    id: string,
    workspaceId: string,
    actorId: string,
    dto: RecordSubscriptionDecisionDto,
  ): Promise<Subscription> {
    const subscription = await this.findOne(id, workspaceId);
    if (dto.decision === SubscriptionDecisionType.KEEP) {
      subscription.reviewStatus = SubscriptionReviewStatus.CURRENT;
      subscription.reviewAt = dto.reviewAt ? new Date(dto.reviewAt) : subscription.reviewAt;
    }
    if (dto.decision === SubscriptionDecisionType.REVIEW) {
      subscription.reviewStatus = SubscriptionReviewStatus.NEEDS_REVIEW;
      subscription.reviewAt = dto.reviewAt ? new Date(dto.reviewAt) : subscription.reviewAt;
    }
    if (dto.decision === SubscriptionDecisionType.CANCELLED) {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancellationReason = dto.note ?? null;
      subscription.realizedAnnualSavings = dto.realizedAnnualSavings ?? 0;
    }
    if (dto.decision === SubscriptionDecisionType.PRICE_REDUCED) {
      subscription.realizedAnnualSavings = dto.realizedAnnualSavings ?? 0;
      subscription.reviewStatus = SubscriptionReviewStatus.CURRENT;
    }

    const saved = await this.subscriptionRepository.save(subscription);
    await this.decisionRepository.save(
      this.decisionRepository.create({
        workspaceId,
        subscriptionId: id,
        actorId,
        decision: dto.decision,
        note: dto.note ?? null,
        savingsAmount: dto.realizedAnnualSavings ?? null,
      }),
    );
    return saved;
  }

  async getSummary(workspaceId: string): Promise<{
    totalMonthlyCost: number;
    activeCount: number;
    upcomingCount: number;
    upcoming30DaysCount: number;
    priceChangeCount: number;
    overdueReviewCount: number;
    realizedAnnualSavings: number;
  }> {
    const active = await this.subscriptionRepository.find({
      where: { workspaceId, status: SubscriptionStatus.ACTIVE },
    });

    const workspace = await this.workspaceRepository.findOne({ where: { id: workspaceId } });
    const workspaceCurrency = workspace?.currency?.toUpperCase();
    const normalizedMonthlyCosts = await Promise.all(active.map(async sub => {
      const amount = this.normalizeToMonthly(Number(sub.amount), sub.frequency);
      if (!workspaceCurrency || sub.currency.toUpperCase() === workspaceCurrency) return amount;
      const converted = await this.exchangeRatesService.convert(amount, sub.currency, workspaceCurrency, new Date());
      return converted.converted;
    }));
    const totalMonthlyCost = normalizedMonthlyCosts.reduce((sum, amount) => sum + amount, 0);

    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);
    const monthAhead = new Date(now);
    monthAhead.setDate(monthAhead.getDate() + 30);

    const upcomingCount = await this.subscriptionRepository.count({
      where: {
        workspaceId,
        status: SubscriptionStatus.ACTIVE,
        nextChargeDate: LessThanOrEqual(weekAhead),
      },
    });

    const upcoming30DaysCount = active.filter(sub => {
      const chargeDate = sub.nextChargeDate ? new Date(sub.nextChargeDate) : null;
      return chargeDate !== null && chargeDate >= now && chargeDate <= monthAhead;
    }).length;

    const priceChangeCount = active.filter(sub => sub.riskStatus === 'price_changed').length;
    const overdueReviewCount = active.filter(sub => sub.reviewAt && new Date(sub.reviewAt) < now).length;
    const realizedAnnualSavings = active.reduce(
      (sum, sub) => sum + Number(sub.realizedAnnualSavings ?? 0),
      0,
    );

    return {
      totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
      activeCount: active.length,
      upcomingCount,
      upcoming30DaysCount,
      priceChangeCount,
      overdueReviewCount,
      realizedAnnualSavings: Math.round(realizedAnnualSavings * 100) / 100,
    };
  }

  async getUpcoming(workspaceId: string, days = 7): Promise<Subscription[]> {
    const until = new Date();
    until.setDate(until.getDate() + days);

    return this.subscriptionRepository.find({
      where: {
        workspaceId,
        status: SubscriptionStatus.ACTIVE,
        nextChargeDate: LessThanOrEqual(until),
      },
      relations: ['category'],
      order: { nextChargeDate: 'ASC' },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async checkUpcomingCharges(): Promise<void> {
    const threeDaysAhead = new Date();
    threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        nextChargeDate: LessThanOrEqual(threeDaysAhead),
      },
    });

    const byWorkspace = new Map<string, Subscription[]>();
    for (const sub of upcoming) {
      if (!sub.nextChargeDate || new Date(sub.nextChargeDate) < today) continue;
      const list = byWorkspace.get(sub.workspaceId) ?? [];
      list.push(sub);
      byWorkspace.set(sub.workspaceId, list);
    }

    for (const [workspaceId, subs] of byWorkspace) {
      await this.notificationsService.createForWorkspaceMembers({
        workspaceId,
        type: NotificationType.SUBSCRIPTION_UPCOMING,
        category: NotificationCategory.WORKSPACE_ACTIVITY,
        severity: NotificationSeverity.INFO,
        messageKey: 'subscription.upcoming',
        messageParams: { details: subs.map((s) => `${s.vendorName} (${s.amount} ${s.currency})`).join(', ') },
        entityType: 'subscription',
        entityId: subs[0].id,
        meta: { subscriptions: subs.map((s) => ({ id: s.id, vendor: s.vendorName, amount: s.amount })) },
      });
    }

    this.logger.log(`Checked upcoming charges: ${upcoming.length} subscription(s) due within 3 days`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async updatePastDueNextDates(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastDue = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        nextChargeDate: LessThanOrEqual(today),
      },
    });

    for (const sub of pastDue) {
      sub.lastChargeDate = sub.nextChargeDate;
      sub.nextChargeDate = this.addInterval(new Date(sub.nextChargeDate!), sub.frequency);
      sub.riskStatus = SubscriptionRiskStatus.MISSING_CHARGE;
      await this.subscriptionRepository.save(sub);
    }

    if (pastDue.length > 0) {
      this.logger.log(`Updated nextChargeDate for ${pastDue.length} past-due subscription(s)`);
    }
  }

  private normalizeToMonthly(amount: number, frequency: SubscriptionFrequency): number {
    switch (frequency) {
      case SubscriptionFrequency.WEEKLY:
        return amount * 4.33;
      case SubscriptionFrequency.MONTHLY:
        return amount;
      case SubscriptionFrequency.QUARTERLY:
        return amount / 3;
      case SubscriptionFrequency.ANNUAL:
        return amount / 12;
    }
  }

  private addInterval(date: Date, frequency: SubscriptionFrequency): Date {
    const d = new Date(date);
    switch (frequency) {
      case SubscriptionFrequency.WEEKLY:
        d.setDate(d.getDate() + 7);
        break;
      case SubscriptionFrequency.MONTHLY:
        d.setMonth(d.getMonth() + 1);
        break;
      case SubscriptionFrequency.QUARTERLY:
        d.setMonth(d.getMonth() + 3);
        break;
      case SubscriptionFrequency.ANNUAL:
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    return d;
  }

  private async recordDetectedCharges(subscription: Subscription): Promise<void> {
    const transactionIds = subscription.detectionMeta?.transactionIds;
    if (!Array.isArray(transactionIds) || transactionIds.some(id => typeof id !== 'string')) return;

    const transactions = await this.transactionRepository.find({
      where: { workspaceId: subscription.workspaceId, id: In(transactionIds) },
    });
    for (const transaction of transactions) {
      const existing = await this.chargeRepository.findOne({ where: { transactionId: transaction.id } });
      if (existing) continue;
      const amount = Math.abs(Number(transaction.amount));
      const variance = subscription.amount ? Math.abs(amount - Number(subscription.amount)) / Number(subscription.amount) : 0;
      const matchStatus = variance > 0.05
        ? SubscriptionChargeMatchStatus.PRICE_CHANGED
        : SubscriptionChargeMatchStatus.MATCHED;
      await this.chargeRepository.save(this.chargeRepository.create({
        workspaceId: subscription.workspaceId,
        subscriptionId: subscription.id,
        transactionId: transaction.id,
        amount,
        currency: transaction.currency,
        chargeDate: transaction.transactionDate,
        expectedAmount: subscription.amount,
        expectedDate: subscription.nextChargeDate,
        matchStatus,
      }));
      if (matchStatus === SubscriptionChargeMatchStatus.PRICE_CHANGED) {
        subscription.riskStatus = SubscriptionRiskStatus.PRICE_CHANGED;
        await this.subscriptionRepository.save(subscription);
      }
    }
  }
}
