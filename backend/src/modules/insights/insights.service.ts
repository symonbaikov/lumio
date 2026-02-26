import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, type Repository } from 'typeorm';
import { Insight } from '../../entities/insight.entity';
import type { InsightCandidate } from './analyzers/analyzer.interface';
import { OperationalAnalyzer } from './analyzers/operational.analyzer';

type ListInsightsParams = {
  userId: string;
  workspaceId?: string;
  category?: string;
  limit?: number;
  offset?: number;
};

@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(Insight)
    private readonly insightRepository: Repository<Insight>,
    private readonly operationalAnalyzer: OperationalAnalyzer,
  ) {}

  async refreshOperational(userId: string, workspaceId: string | null = null) {
    const candidates = await this.operationalAnalyzer.analyze({
      userId,
      workspaceId,
    });

    let created = 0;
    let updated = 0;

    for (const candidate of candidates) {
      const wasCreated = await this.upsertCandidate(userId, workspaceId, candidate);
      if (wasCreated) {
        created += 1;
      } else {
        updated += 1;
      }
    }

    return {
      created,
      updated,
      total: candidates.length,
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

    if (params.workspaceId) {
      queryBuilder.andWhere('(insight.workspaceId = :workspaceId OR insight.workspaceId IS NULL)', {
        workspaceId: params.workspaceId,
      });
    }

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

  async getSummary(userId: string, workspaceId?: string) {
    const now = new Date();
    const queryBuilder = this.insightRepository
      .createQueryBuilder('insight')
      .select('insight.category', 'category')
      .addSelect('COUNT(insight.id)', 'count')
      .where('insight.userId = :userId', { userId })
      .andWhere('insight.isDismissed = false')
      .andWhere('(insight.expiresAt IS NULL OR insight.expiresAt > :now)', { now })
      .groupBy('insight.category');

    if (workspaceId) {
      queryBuilder.andWhere('(insight.workspaceId = :workspaceId OR insight.workspaceId IS NULL)', {
        workspaceId,
      });
    }

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

  async dismiss(userId: string, id: string) {
    const result = await this.insightRepository.update(
      {
        id,
        userId,
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

  async dismissAll(userId: string, category?: string) {
    const updateQuery = this.insightRepository
      .createQueryBuilder()
      .update(Insight)
      .set({ isDismissed: true })
      .where('user_id = :userId', { userId })
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

  private async upsertCandidate(
    userId: string,
    workspaceId: string | null,
    candidate: InsightCandidate,
  ): Promise<boolean> {
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
        title: candidate.title,
        message: candidate.message,
        data: candidate.data ?? null,
        actions: candidate.actions ? candidate.actions.map(action => ({ ...action })) : null,
        deduplicationKey: candidate.deduplicationKey,
        expiresAt: candidate.expiresAt ?? null,
      });

      await this.insightRepository.save(created);
      return true;
    }

    existing.workspaceId = workspaceId;
    existing.type = candidate.type;
    existing.category = candidate.category;
    existing.severity = candidate.severity;
    existing.title = candidate.title;
    existing.message = candidate.message;
    existing.data = candidate.data ?? null;
    existing.actions = candidate.actions ? candidate.actions.map(action => ({ ...action })) : null;
    existing.expiresAt = candidate.expiresAt ?? null;
    await this.insightRepository.save(existing);
    return false;
  }
}
