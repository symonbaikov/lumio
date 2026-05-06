import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import {
  Subscription,
  SubscriptionFrequency,
  SubscriptionStatus,
} from '../../entities/subscription.entity';
import {
  NotificationCategory,
  NotificationSeverity,
  NotificationType,
} from '../../entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateSubscriptionDto } from './dto/create-subscription.dto';
import type { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateSubscriptionDto): Promise<Subscription> {
    const subscription = this.subscriptionRepository.create({
      workspaceId,
      createdById: userId,
      vendorName: dto.vendorName,
      amount: dto.amount,
      frequency: dto.frequency,
      currency: dto.currency ?? 'KZT',
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
    return this.subscriptionRepository.save(subscription);
  }

  async dismiss(id: string, workspaceId: string): Promise<void> {
    const subscription = await this.findOne(id, workspaceId);
    await this.subscriptionRepository.remove(subscription);
  }

  async getSummary(workspaceId: string): Promise<{
    totalMonthlyCost: number;
    activeCount: number;
    upcomingCount: number;
  }> {
    const active = await this.subscriptionRepository.find({
      where: { workspaceId, status: SubscriptionStatus.ACTIVE },
    });

    const totalMonthlyCost = active.reduce((sum, sub) => {
      return sum + this.normalizeToMonthly(Number(sub.amount), sub.frequency);
    }, 0);

    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const upcomingCount = await this.subscriptionRepository.count({
      where: {
        workspaceId,
        status: SubscriptionStatus.ACTIVE,
        nextChargeDate: LessThanOrEqual(weekAhead),
      },
    });

    return {
      totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
      activeCount: active.length,
      upcomingCount,
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
}
