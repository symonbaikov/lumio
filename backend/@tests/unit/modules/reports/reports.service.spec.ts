import type { CustomTableColumn } from '@/entities';
import { CustomTableColumnType } from '@/entities/custom-table-column.entity';
import { ReportsService } from '@/modules/reports/reports.service';
import { AuditService } from '@/modules/audit/audit.service';

function createRepoMock() {
  return {} as any;
}

describe('ReportsService (helpers)', () => {
  let service: ReportsService;

  beforeEach(() => {
    service = new ReportsService(
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      { get: jest.fn(), set: jest.fn() } as any,
      { createEvent: jest.fn() } as AuditService,
    );
  });

  it('parseNumber handles spaces and comma decimals', () => {
    const parseNumber = (service as any).parseNumber.bind(service) as (v: unknown) => number | null;
    expect(parseNumber(' 1 234,50 ')).toBe(1234.5);
    expect(parseNumber('not-a-number')).toBeNull();
    expect(parseNumber(null)).toBeNull();
  });

  it('parseDate supports YYYY-MM-DD and DD.MM.YYYY', () => {
    const parseDate = (service as any).parseDate.bind(service) as (v: unknown) => Date | null;
    expect(parseDate('2025-01-02')?.toISOString()).toContain('2025-01-02');
    expect(parseDate('2.1.2025')?.toISOString()).toContain('2025-01-02');
    expect(parseDate('bad')).toBeNull();
  });

  it('toDateKey normalizes date-ish inputs', () => {
    const toDateKey = (service as any).toDateKey.bind(service) as (v: unknown) => string;
    expect(toDateKey('2025-01-02T10:00:00.000Z')).toBe('2025-01-02');
    expect(toDateKey(new Date('2025-01-02T00:00:00.000Z'))).toBe('2025-01-02');
  });

  it('pickBestColumnKey chooses best match based on scorer', () => {
    const pickBestColumnKey = (service as any).pickBestColumnKey.bind(service) as (
      cols: CustomTableColumn[],
      scorer: (c: CustomTableColumn) => number,
    ) => string | null;
    const scoreAmount = (service as any).scoreAmountColumn.bind(service) as (
      c: CustomTableColumn,
    ) => number;

    const columns = [
      { key: 'a', title: 'Дата', type: CustomTableColumnType.DATE } as any,
      { key: 'b', title: 'Сумма', type: CustomTableColumnType.NUMBER } as any,
      { key: 'c', title: 'Год', type: CustomTableColumnType.NUMBER } as any,
    ] as CustomTableColumn[];

    expect(pickBestColumnKey(columns, scoreAmount)).toBe('b');
  });

  it('getSpendOverTimeReport fills empty periods', async () => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(async () => [
        { period: '2025-01-01', income: '100', expense: '0', count: '1' },
        { period: '2025-01-03', income: '0', expense: '20', count: '1' },
      ]),
    };
    const transactionRepository = {
      createQueryBuilder: jest.fn(() => qb),
    };
    const localService = new ReportsService(
      transactionRepository as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      { get: jest.fn(), set: jest.fn() } as any,
      { createEvent: jest.fn() } as AuditService,
    );

    const result = await (localService as any).getSpendOverTimeReport('u1', {
      groupBy: 'day',
      dateFrom: '2025-01-01',
      dateTo: '2025-01-03',
    });

    expect(result.points).toHaveLength(3);
    expect(result.points[1]).toEqual({
      period: '2025-01-02',
      label: '2025-01-02',
      income: 0,
      expense: 0,
      net: 0,
      count: 0,
    });
    expect(result.totals.income).toBe(100);
    expect(result.totals.expense).toBe(20);
    expect(result.totals.net).toBe(80);
    expect(result.totals.count).toBe(2);
    expect(result.totals.avgPerPeriod).toBeCloseTo(80 / 3, 5);
  });
});
