import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository, type SelectQueryBuilder } from 'typeorm';
import { InsightCategory, InsightSeverity, InsightType, Transaction } from '../../../entities';
import type { AnalysisContext, InsightAnalyzer, InsightCandidate } from './analyzer.interface';

const UNCATEGORIZED_CATEGORY_NAMES = ['Uncategorized', 'Без категории'];

@Injectable()
export class OperationalAnalyzer implements InsightAnalyzer {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async analyze(context: AnalysisContext): Promise<InsightCandidate[]> {
    const [unapprovedCount, uncategorizedCount, duplicateCount] = await Promise.all([
      this.countUnapproved(context),
      this.countUncategorized(context),
      this.countDuplicates(context),
    ]);

    const candidates: InsightCandidate[] = [];

    if (unapprovedCount > 0) {
      candidates.push({
        type: InsightType.UNAPPROVED_COUNT,
        category: InsightCategory.OPERATIONAL,
        severity: InsightSeverity.WARN,
        title: 'Есть неподтвержденные операции',
        message: `Есть ${unapprovedCount} неподтвержденных операций`,
        deduplicationKey: this.makeDeduplicationKey('unapproved', context.workspaceId),
        data: { count: unapprovedCount },
        actions: [
          {
            type: 'GO_TO_UNAPPROVED',
            label: 'Проверить',
            payload: {
              workspaceId: context.workspaceId,
            },
          },
        ],
        expiresAt: this.makeExpiryDate(2),
      });
    }

    if (uncategorizedCount > 5) {
      candidates.push({
        type: InsightType.UNCATEGORIZED_COUNT,
        category: InsightCategory.OPERATIONAL,
        severity: InsightSeverity.WARN,
        title: 'Есть транзакции без категории',
        message: `Есть ${uncategorizedCount} транзакций без категории`,
        deduplicationKey: this.makeDeduplicationKey('uncategorized', context.workspaceId),
        data: { count: uncategorizedCount },
        actions: [
          {
            type: 'GO_TO_UNAPPROVED',
            label: 'Разобрать',
            payload: {
              workspaceId: context.workspaceId,
            },
          },
        ],
        expiresAt: this.makeExpiryDate(2),
      });
    }

    if (duplicateCount > 0) {
      candidates.push({
        type: InsightType.DUPLICATE_DETECTED,
        category: InsightCategory.OPERATIONAL,
        severity: InsightSeverity.WARN,
        title: 'Найдены возможные дубликаты',
        message: `Обнаружено ${duplicateCount} потенциальных дубликатов`,
        deduplicationKey: this.makeDeduplicationKey('duplicates', context.workspaceId),
        data: { count: duplicateCount },
        actions: [
          {
            type: 'GO_TO_UNAPPROVED',
            label: 'Открыть',
            payload: {
              workspaceId: context.workspaceId,
            },
          },
        ],
        expiresAt: this.makeExpiryDate(2),
      });
    }

    return candidates;
  }

  private applyBaseScope(
    queryBuilder: SelectQueryBuilder<Transaction>,
    context: AnalysisContext,
  ): SelectQueryBuilder<Transaction> {
    queryBuilder
      .innerJoin('transaction.statement', 'statement')
      .where('statement.userId = :userId', { userId: context.userId });

    if (context.workspaceId) {
      queryBuilder.andWhere('transaction.workspaceId = :workspaceId', {
        workspaceId: context.workspaceId,
      });
    }

    return queryBuilder;
  }

  private async countUnapproved(context: AnalysisContext): Promise<number> {
    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction');
    this.applyBaseScope(queryBuilder, context).andWhere('transaction.isVerified = false');
    return queryBuilder.getCount();
  }

  private async countUncategorized(context: AnalysisContext): Promise<number> {
    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction');
    this.applyBaseScope(queryBuilder, context)
      .leftJoin('transaction.category', 'category')
      .andWhere(
        '(transaction.categoryId IS NULL OR category.name IN (:...uncategorizedCategoryNames))',
        {
          uncategorizedCategoryNames: UNCATEGORIZED_CATEGORY_NAMES,
        },
      );
    return queryBuilder.getCount();
  }

  private async countDuplicates(context: AnalysisContext): Promise<number> {
    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction');
    this.applyBaseScope(queryBuilder, context)
      .andWhere('transaction.isDuplicate = true')
      .andWhere('transaction.duplicateOfId IS NOT NULL');
    return queryBuilder.getCount();
  }

  private makeDeduplicationKey(kind: string, workspaceId: string | null): string {
    return `operational:${kind}:${workspaceId ?? 'global'}`;
  }

  private makeExpiryDate(hours: number): Date {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);
    return expiresAt;
  }
}
