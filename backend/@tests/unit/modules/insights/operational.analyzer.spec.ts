import { InsightType } from '@/entities/insight.entity';
import { OperationalAnalyzer } from '@/modules/insights/analyzers/operational.analyzer';

function createCountQueryBuilder(count: number) {
  const builder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
  };

  return builder;
}

describe('OperationalAnalyzer', () => {
  const transactionRepository = {
    createQueryBuilder: jest.fn(),
  } as any;

  let analyzer: OperationalAnalyzer;

  beforeEach(() => {
    jest.clearAllMocks();
    analyzer = new OperationalAnalyzer(transactionRepository);
  });

  it('returns operational insight candidates when thresholds are exceeded', async () => {
    transactionRepository.createQueryBuilder
      .mockReturnValueOnce(createCountQueryBuilder(64))
      .mockReturnValueOnce(createCountQueryBuilder(12))
      .mockReturnValueOnce(createCountQueryBuilder(3));

    const results = await analyzer.analyze({
      userId: 'user-1',
      workspaceId: 'workspace-1',
    });

    expect(results).toHaveLength(3);
    expect(results.map(item => item.type)).toEqual([
      InsightType.UNAPPROVED_COUNT,
      InsightType.UNCATEGORIZED_COUNT,
      InsightType.DUPLICATE_DETECTED,
    ]);
    expect(results[0].message).toContain('64');
    expect(results[1].message).toContain('12');
    expect(results[2].message).toContain('3');
  });

  it('returns no candidates when counts do not pass thresholds', async () => {
    transactionRepository.createQueryBuilder
      .mockReturnValueOnce(createCountQueryBuilder(0))
      .mockReturnValueOnce(createCountQueryBuilder(5))
      .mockReturnValueOnce(createCountQueryBuilder(0));

    const results = await analyzer.analyze({
      userId: 'user-1',
      workspaceId: null,
    });

    expect(results).toHaveLength(0);
  });
});
