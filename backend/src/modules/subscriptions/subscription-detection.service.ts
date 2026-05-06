import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import {
  Subscription,
  SubscriptionFrequency,
  SubscriptionStatus,
} from '../../entities/subscription.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import {
  NotificationCategory,
  NotificationSeverity,
  NotificationType,
} from '../../entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubscriptionDetectionService {
  private readonly logger = new Logger(SubscriptionDetectionService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async runDetection(workspaceId: string): Promise<Subscription[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);

    const transactions = await this.transactionRepository
      .createQueryBuilder('t')
      .select([
        't.id',
        't.counterpartyName',
        't.vendorNormalized',
        't.amount',
        't.transactionDate',
        't.categoryId',
      ])
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.transaction_type = :type', { type: TransactionType.EXPENSE })
      .andWhere('t.is_duplicate = false')
      .andWhere('t.transaction_date >= :since', { since })
      .andWhere('t.counterparty_name IS NOT NULL')
      .orderBy('t.transaction_date', 'ASC')
      .getMany();

    const groups = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const key = (tx.vendorNormalized ?? tx.counterpartyName).toLowerCase().trim();
      if (!key) continue;
      const group = groups.get(key) ?? [];
      group.push(tx);
      groups.set(key, group);
    }

    const detected: Subscription[] = [];
    for (const [, txs] of groups) {
      if (txs.length < 2) continue;

      const result = this.analyzeGroup(txs);
      if (!result) continue;

      const existing = await this.subscriptionRepository.findOne({
        where: {
          workspaceId,
          vendorName: result.vendorName as string,
          frequency: result.frequency as SubscriptionFrequency,
        },
      });

      if (existing) {
        if (existing.status !== SubscriptionStatus.CANCELLED) {
          existing.lastChargeDate = result.lastChargeDate as Date;
          existing.nextChargeDate = result.nextChargeDate as Date;
          existing.detectionMeta = result.detectionMeta as Record<string, unknown>;
          await this.subscriptionRepository.save(existing);
        }
        continue;
      }

      const subscription = this.subscriptionRepository.create({
        workspaceId,
        vendorName: result.vendorName as string,
        vendorRaw: result.vendorRaw as string | null,
        amount: result.amount as number,
        currency: result.currency as string,
        frequency: result.frequency as SubscriptionFrequency,
        confidence: result.confidence as number,
        lastChargeDate: result.lastChargeDate as Date,
        nextChargeDate: result.nextChargeDate as Date,
        categoryId: result.categoryId as string | null,
        detectionMeta: result.detectionMeta as Record<string, unknown>,
        status: SubscriptionStatus.DETECTED,
      });
      const saved = await this.subscriptionRepository.save(subscription);
      detected.push(saved);
    }

    if (detected.length > 0) {
      this.logger.log(`Detected ${detected.length} new subscription(s) for workspace ${workspaceId}`);
      await this.notificationsService.createForWorkspaceMembers({
        workspaceId,
        type: NotificationType.SUBSCRIPTION_DETECTED,
        category: NotificationCategory.WORKSPACE_ACTIVITY,
        severity: NotificationSeverity.INFO,
        messageKey: 'subscription.detected',
        messageParams: { vendors: detected.map((s) => s.vendorName).join(', ') },
        entityType: 'subscription',
        entityId: detected[0].id,
        meta: { count: detected.length, vendors: detected.map((s) => s.vendorName) },
      });
    }

    return detected;
  }

  private analyzeGroup(txs: Transaction[]): Partial<Subscription> | null {
    const amounts = txs.map((t) => Math.abs(Number(t.amount)));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    if (avgAmount === 0) return null;

    const maxVariance = Math.max(...amounts.map((a) => Math.abs(a - avgAmount))) / avgAmount;
    if (maxVariance > 0.15) return null;

    const dates = txs.map((t) => new Date(t.transactionDate).getTime());
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    }
    if (intervals.length === 0) return null;

    const medianInterval = this.median(intervals);
    const frequency = this.detectFrequency(medianInterval);
    if (!frequency) return null;

    const intervalStddev = this.stddev(intervals);
    if (medianInterval > 0 && intervalStddev / medianInterval > 0.3) return null;

    const confidence = this.computeConfidence(
      txs.length,
      maxVariance,
      medianInterval > 0 ? intervalStddev / medianInterval : 1,
      !!txs[0].vendorNormalized,
    );

    const lastDate = new Date(txs[txs.length - 1].transactionDate);
    const nextChargeDate = this.addInterval(lastDate, frequency);

    return {
      vendorName: txs[0].vendorNormalized ?? txs[0].counterpartyName,
      vendorRaw: txs[0].counterpartyName,
      amount: Math.round(avgAmount * 100) / 100,
      currency: 'KZT',
      frequency,
      confidence,
      lastChargeDate: lastDate,
      nextChargeDate,
      categoryId: txs[txs.length - 1].categoryId,
      detectionMeta: {
        occurrenceCount: txs.length,
        amountVariance: Math.round(maxVariance * 100) / 100,
        medianIntervalDays: Math.round(medianInterval),
        transactionIds: txs.map((t) => t.id).slice(-5),
      },
    };
  }

  private detectFrequency(medianDays: number): SubscriptionFrequency | null {
    if (medianDays >= 5 && medianDays <= 9) return SubscriptionFrequency.WEEKLY;
    if (medianDays >= 25 && medianDays <= 35) return SubscriptionFrequency.MONTHLY;
    if (medianDays >= 80 && medianDays <= 100) return SubscriptionFrequency.QUARTERLY;
    if (medianDays >= 350 && medianDays <= 380) return SubscriptionFrequency.ANNUAL;
    return null;
  }

  private computeConfidence(
    count: number,
    amtVar: number,
    intVar: number,
    hasNormalized: boolean,
  ): number {
    let c = 0.5;
    if (count >= 3) c += 0.1;
    if (count >= 5) c += 0.1;
    if (amtVar < 0.05) c += 0.1;
    if (intVar < 0.15) c += 0.1;
    if (hasNormalized) c += 0.1;
    return Math.min(c, 1.0);
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

  private median(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private stddev(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length);
  }
}
