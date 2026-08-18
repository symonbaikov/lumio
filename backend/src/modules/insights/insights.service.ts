import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, type Repository } from 'typeorm';
import { Insight } from '../../entities/insight.entity';
import { User } from '../../entities/user.entity';
import type { InsightCandidate } from './analyzers/analyzer.interface';
import { FinancialAnalyzer } from './analyzers/financial.analyzer';
import { OperationalAnalyzer } from './analyzers/operational.analyzer';
import { renderInsight } from './insight-translations';

type ListInsightsParams = {
  userId: string;
  workspaceId: string;
  category?: string;
  limit?: number;
  offset?: number;
};

@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(Insight)
    private readonly insightRepository: Repository<Insight>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly operationalAnalyzer: OperationalAnalyzer,
    private readonly financialAnalyzer: FinancialAnalyzer,
  ) {}

  /**
   * `newInsights` carries the rows that were actually *created* this run —
   * distinct from ones that already existed and just got their numbers
   * refreshed. Telegram's digest push (see TelegramScheduler) reads this to
   * notify once when a warning first appears rather than every time the
   * cron re-confirms it's still true.
   */
  async refresh(
    userId: string,
    workspaceId: string,
  ): Promise<{ created: number; updated: number; total: number; newInsights: Insight[] }> {
    const context = { userId, workspaceId };
    const [operational, financial] = await Promise.all([
      this.operationalAnalyzer.analyze(context),
      this.financialAnalyzer.analyze(context),
    ]);
    const candidates = [...operational, ...financial];

    // One refresh writes a handful of insights for the same recipient — read
    // the locale they are phrased in once, not once per insight.
    const locale = await this.resolveLocale(userId);

    let created = 0;
    let updated = 0;
    const newInsights: Insight[] = [];

    for (const candidate of candidates) {
      const result = await this.upsertCandidate(userId, workspaceId, candidate, locale);
      if (result.created) {
        created += 1;
        newInsights.push(result.insight);
      } else {
        updated += 1;
      }
    }

    return {
      created,
      updated,
      total: candidates.length,
      newInsights,
    };
  }

  async list(params: ListInsightsParams) {
    const limit = Number.isFinite(params.limit) ? (params.limit as number) : 30;
    const offset = Number.isFinite(params.offset) ? (params.offset as number) : 0;
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const normalizedOffset = Math.max(offset, 0);
    const now = new Date();

    const queryBuilder = this.insightRepository
      .createQueryBuilder('insight')
      .where('insight.userId = :userId', { userId: params.userId })
      .andWhere('insight.isDismissed = false')
      .andWhere('(insight.expiresAt IS NULL OR insight.expiresAt > :now)', { now })
      .orderBy('insight.createdAt', 'DESC')
      .take(normalizedLimit)
      .skip(normalizedOffset);

    queryBuilder.andWhere('insight.workspaceId = :workspaceId', {
      workspaceId: params.workspaceId,
    });

    if (params.category) {
      queryBuilder.andWhere('insight.category = :category', {
        category: params.category,
      });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      limit: normalizedLimit,
      offset: normalizedOffset,
    };
  }

  async getSummary(userId: string, workspaceId: string) {
    const now = new Date();
    const queryBuilder = this.insightRepository
      .createQueryBuilder('insight')
      .select('insight.category', 'category')
      .addSelect('COUNT(insight.id)', 'count')
      .where('insight.userId = :userId', { userId })
      .andWhere('insight.isDismissed = false')
      .andWhere('(insight.expiresAt IS NULL OR insight.expiresAt > :now)', { now })
      .groupBy('insight.category');

    queryBuilder.andWhere('insight.workspaceId = :workspaceId', { workspaceId });

    const rows = await queryBuilder.getRawMany<{ category: string; count: string }>();
    const byCategory = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.category] = Number.parseInt(row.count, 10) || 0;
      return acc;
    }, {});

    const total = Object.values(byCategory).reduce((sum, count) => sum + count, 0);
    return {
      total,
      byCategory,
    };
  }

  async dismiss(userId: string, workspaceId: string, id: string) {
    const result = await this.insightRepository.update(
      {
        id,
        userId,
        workspaceId,
        isDismissed: false,
      },
      {
        isDismissed: true,
      },
    );

    return {
      updated: result.affected ?? 0,
    };
  }

  async dismissAll(userId: string, workspaceId: string, category?: string) {
    const updateQuery = this.insightRepository
      .createQueryBuilder()
      .update(Insight)
      .set({ isDismissed: true })
      .where('user_id = :userId', { userId })
      .andWhere('workspace_id = :workspaceId', { workspaceId })
      .andWhere('is_dismissed = false');

    if (category) {
      updateQuery.andWhere('category = :category', { category });
    }

    const result = await updateQuery.execute();
    return {
      updated: result.affected ?? 0,
    };
  }

  async cleanupExpired() {
    const now = new Date();
    const result = await this.insightRepository.delete({
      expiresAt: LessThan(now),
      isDismissed: false,
    });

    return {
      deleted: result.affected ?? 0,
      checkedAt: now.toISOString(),
    };
  }

  /**
   * Stores an insight produced outside the server-side analyzers.
   *
   * The local model runs in the user's browser, so AI insights cannot be
   * generated by a scheduled analyzer — they arrive here instead, and reuse the
   * same deduplication so reopening the page does not pile up copies.
   */
  async saveExternal(
    userId: string,
    workspaceId: string,
    candidate: InsightCandidate,
  ): Promise<{ created: boolean }> {
    const result = await this.upsertCandidate(userId, workspaceId, candidate);
    return { created: result.created };
  }

  private async resolveLocale(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'locale'],
    });
    return user?.locale ?? 'ru';
  }

  /**
   * Resolves a candidate to the text stored on the row. Keyed candidates are
   * rendered in the recipient's locale, the same way NotificationsService does
   * it; the key and params are kept alongside so the client can re-render the
   * text if the user switches language later.
   */
  private async resolveText(userId: string, candidate: InsightCandidate, locale?: string) {
    if (!('messageKey' in candidate)) {
      return {
        title: candidate.title,
        message: candidate.message,
        messageKey: null,
        messageParams: null,
      };
    }

    const { title, message } = renderInsight(
      locale ?? (await this.resolveLocale(userId)),
      candidate.messageKey,
      candidate.messageParams,
    );

    return {
      title,
      message,
      messageKey: candidate.messageKey,
      messageParams: candidate.messageParams,
    };
  }

  private async upsertCandidate(
    userId: string,
    workspaceId: string | null,
    candidate: InsightCandidate,
    locale?: string,
  ): Promise<{ created: boolean; insight: Insight }> {
    const text = await this.resolveText(userId, candidate, locale);
    const existing = await this.insightRepository.findOne({
      where: {
        userId,
        deduplicationKey: candidate.deduplicationKey,
        isDismissed: false,
      },
    });

    if (!existing) {
      const created = this.insightRepository.create({
        userId,
        workspaceId,
        type: candidate.type,
        category: candidate.category,
        severity: candidate.severity,
        title: text.title,
        message: text.message,
        messageKey: text.messageKey,
        messageParams: text.messageParams,
        data: candidate.data ?? null,
        actions: candidate.actions ? candidate.actions.map(action => ({ ...action })) : null,
        deduplicationKey: candidate.deduplicationKey,
        expiresAt: candidate.expiresAt ?? null,
      });

      const saved = await this.insightRepository.save(created);
      return { created: true, insight: saved };
    }

    existing.workspaceId = workspaceId;
    existing.type = candidate.type;
    existing.category = candidate.category;
    existing.severity = candidate.severity;
    existing.title = text.title;
    existing.message = text.message;
    existing.messageKey = text.messageKey;
    existing.messageParams = text.messageParams;
    existing.data = candidate.data ?? null;
    existing.actions = candidate.actions ? candidate.actions.map(action => ({ ...action })) : null;
    existing.expiresAt = candidate.expiresAt ?? null;
    const saved = await this.insightRepository.save(existing);
    return { created: false, insight: saved };
  }
}
