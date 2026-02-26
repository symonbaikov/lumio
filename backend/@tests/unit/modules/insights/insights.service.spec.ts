import {
  type Insight,
  InsightCategory,
  InsightSeverity,
  InsightType,
} from '@/entities/insight.entity';
import type { InsightCandidate } from '@/modules/insights/analyzers/analyzer.interface';
import { InsightsService } from '@/modules/insights/insights.service';

function createRepoMock<T>() {
  return {
    findOne: jest.fn(),
    create: jest.fn((data: Partial<T>) => data as T),
    save: jest.fn(async (data: Partial<T>) => data as T),
  } as any;
}

describe('InsightsService', () => {
  const insightRepository = createRepoMock<Insight>();
  const operationalAnalyzer = {
    analyze: jest.fn(),
  } as any;

  let service: InsightsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InsightsService(insightRepository, operationalAnalyzer);
  });

  it('creates a new insight when there is no active insight with same deduplication key', async () => {
    const candidate: InsightCandidate = {
      type: InsightType.UNAPPROVED_COUNT,
      category: InsightCategory.OPERATIONAL,
      severity: InsightSeverity.WARN,
      title: 'Есть неподтвержденные операции',
      message: 'Есть 64 неподтвержденные операции',
      deduplicationKey: 'operational:unapproved:workspace-1',
      data: { count: 64 },
      actions: [],
    };

    operationalAnalyzer.analyze.mockResolvedValue([candidate]);
    insightRepository.findOne.mockResolvedValue(null);

    const result = await service.refreshOperational('user-1', 'workspace-1');

    expect(result).toEqual({ created: 1, updated: 0, total: 1 });
    expect(insightRepository.create).toHaveBeenCalledTimes(1);
    expect(insightRepository.save).toHaveBeenCalledTimes(1);
  });

  it('updates an existing active insight with same deduplication key', async () => {
    const candidate: InsightCandidate = {
      type: InsightType.UNCATEGORIZED_COUNT,
      category: InsightCategory.OPERATIONAL,
      severity: InsightSeverity.WARN,
      title: 'Есть транзакции без категории',
      message: 'Есть 12 транзакций без категории',
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

    const result = await service.refreshOperational('user-1', 'workspace-1');

    expect(result).toEqual({ created: 0, updated: 1, total: 1 });
    expect(insightRepository.create).not.toHaveBeenCalled();
    expect(insightRepository.save).toHaveBeenCalledTimes(1);
    expect(insightRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'insight-1',
        message: 'Есть 12 транзакций без категории',
      }),
    );
  });
});
