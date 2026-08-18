import {
  type Insight,
  InsightCategory,
  InsightSeverity,
  InsightType,
} from '@/entities/insight.entity';
import type { User } from '@/entities/user.entity';
import type { InsightCandidate } from '@/modules/insights/analyzers/analyzer.interface';
import { InsightsService } from '@/modules/insights/insights.service';

function createRepoMock<T>() {
  return {
    findOne: jest.fn(),
    create: jest.fn((data: Partial<T>) => data as T),
    save: jest.fn(async (data: Partial<T>) => data as T),
    createQueryBuilder: jest.fn(),
    update: jest.fn(async () => ({ affected: 1 })),
  } as any;
}

function createQueryBuilderMock() {
  const qb: any = {
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    take: jest.fn(() => qb),
    skip: jest.fn(() => qb),
    select: jest.fn(() => qb),
    addSelect: jest.fn(() => qb),
    groupBy: jest.fn(() => qb),
    update: jest.fn(() => qb),
    set: jest.fn(() => qb),
    execute: jest.fn(async () => ({ affected: 1 })),
    getManyAndCount: jest.fn(async () => [[], 0]),
    getRawMany: jest.fn(async () => []),
  };
  return qb;
}

describe('InsightsService', () => {
  const insightRepository = createRepoMock<Insight>();
  const userRepository = createRepoMock<User>();
  const operationalAnalyzer = {
    analyze: jest.fn(),
  } as any;
  const financialAnalyzer = {
    analyze: jest.fn(async () => []),
  } as any;

  let service: InsightsService;

  beforeEach(() => {
    jest.clearAllMocks();
    financialAnalyzer.analyze.mockResolvedValue([]);
    userRepository.findOne.mockResolvedValue({ id: 'user-1', locale: 'ru' });
    service = new InsightsService(
      insightRepository,
      userRepository,
      operationalAnalyzer,
      financialAnalyzer,
    );
  });

  it('creates a new insight when there is no active insight with same deduplication key', async () => {
    const candidate: InsightCandidate = {
      type: InsightType.UNAPPROVED_COUNT,
      category: InsightCategory.OPERATIONAL,
      severity: InsightSeverity.WARN,
      messageKey: 'operational.unapproved',
      messageParams: { count: 64 },
      deduplicationKey: 'operational:unapproved:workspace-1',
      data: { count: 64 },
      actions: [],
    };

    operationalAnalyzer.analyze.mockResolvedValue([candidate]);
    insightRepository.findOne.mockResolvedValue(null);

    const result = await service.refresh('user-1', 'workspace-1');

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.total).toBe(1);
    expect(result.newInsights).toHaveLength(1);
    expect(result.newInsights[0]).toMatchObject({
      deduplicationKey: 'operational:unapproved:workspace-1',
    });
    expect(insightRepository.create).toHaveBeenCalledTimes(1);
    expect(insightRepository.save).toHaveBeenCalledTimes(1);
  });

  it('renders keyed text in the recipient locale and keeps the key for re-rendering', async () => {
    const candidate: InsightCandidate = {
      type: InsightType.UNAPPROVED_COUNT,
      category: InsightCategory.OPERATIONAL,
      severity: InsightSeverity.WARN,
      messageKey: 'operational.unapproved',
      messageParams: { count: 64 },
      deduplicationKey: 'operational:unapproved:workspace-1',
    };

    operationalAnalyzer.analyze.mockResolvedValue([candidate]);
    insightRepository.findOne.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue({ id: 'user-1', locale: 'en' });

    await service.refresh('user-1', 'workspace-1');

    expect(insightRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Unapproved transactions',
        message: '64 transactions are waiting for approval',
        messageKey: 'operational.unapproved',
        messageParams: { count: 64 },
      }),
    );
  });

  it('stores literal text as-is, without a key, for insights written by the model', async () => {
    insightRepository.findOne.mockResolvedValue(null);

    await service.saveExternal('user-1', 'workspace-1', {
      type: InsightType.AI_SUMMARY,
      category: InsightCategory.TREND,
      severity: InsightSeverity.INFO,
      title: 'Итоги месяца',
      message: 'Расходы выросли на 12%',
      deduplicationKey: 'ai.summary:2026-08',
    });

    expect(insightRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Итоги месяца',
        message: 'Расходы выросли на 12%',
        messageKey: null,
        messageParams: null,
      }),
    );
  });

  it('merges candidates from every analyzer', async () => {
    operationalAnalyzer.analyze.mockResolvedValue([
      {
        type: InsightType.UNAPPROVED_COUNT,
        category: InsightCategory.OPERATIONAL,
        severity: InsightSeverity.WARN,
        messageKey: 'operational.unapproved',
        messageParams: { count: 3 },
        deduplicationKey: 'operational:unapproved:workspace-1',
      },
    ]);
    financialAnalyzer.analyze.mockResolvedValue([
      {
        type: InsightType.SAVINGS_RATE_TREND,
        category: InsightCategory.TREND,
        severity: InsightSeverity.WARN,
        messageKey: 'trend.savings_rate_down',
        messageParams: { rate: 12, diff: 9 },
        deduplicationKey: 'financial:savings_rate:workspace-1:2026-08',
      },
    ]);
    insightRepository.findOne.mockResolvedValue(null);

    const result = await service.refresh('user-1', 'workspace-1');

    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.total).toBe(2);
    expect(result.newInsights).toHaveLength(2);
  });

  it('updates an existing active insight with same deduplication key', async () => {
    const candidate: InsightCandidate = {
      type: InsightType.UNCATEGORIZED_COUNT,
      category: InsightCategory.OPERATIONAL,
      severity: InsightSeverity.WARN,
      messageKey: 'operational.uncategorized',
      messageParams: { count: 12 },
      deduplicationKey: 'operational:uncategorized:workspace-1',
      data: { count: 12 },
      actions: [],
    };

    operationalAnalyzer.analyze.mockResolvedValue([candidate]);
    insightRepository.findOne.mockResolvedValue({
      id: 'insight-1',
      deduplicationKey: candidate.deduplicationKey,
      isDismissed: false,
    } as Insight);

    const result = await service.refresh('user-1', 'workspace-1');

    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.total).toBe(1);
    expect(result.newInsights).toHaveLength(0);
    expect(insightRepository.create).not.toHaveBeenCalled();
    expect(insightRepository.save).toHaveBeenCalledTimes(1);
    expect(insightRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'insight-1',
        message: 'Есть 12 транзакций без категории',
      }),
    );
  });

  it('requires workspaceId in list and summary filtering', async () => {
    const listQb = createQueryBuilderMock();
    const summaryQb = createQueryBuilderMock();
    insightRepository.createQueryBuilder.mockReturnValueOnce(listQb).mockReturnValueOnce(summaryQb);

    await service.list({ userId: 'user-1', workspaceId: 'workspace-1' });
    await service.getSummary('user-1', 'workspace-1');

    expect(listQb.andWhere).toHaveBeenCalledWith('insight.workspaceId = :workspaceId', {
      workspaceId: 'workspace-1',
    });
    expect(summaryQb.andWhere).toHaveBeenCalledWith('insight.workspaceId = :workspaceId', {
      workspaceId: 'workspace-1',
    });
  });
});
