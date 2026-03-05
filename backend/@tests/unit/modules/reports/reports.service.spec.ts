import * as fs from 'fs';
import type { CustomTableColumn } from '@/entities';
import { CustomTableColumnType } from '@/entities/custom-table-column.entity';
import { AuditService } from '@/modules/audit/audit.service';
import { BadRequestException } from '@nestjs/common';
import { ReportsService } from '@/modules/reports/reports.service';

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
      createRepoMock() as any,
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
      createRepoMock() as any,
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

  it('getSpendOverTimeReport supports quarterly grouping', async () => {
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
        { period: '2025-Q1', income: '100', expense: '40', count: '2' },
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
      createRepoMock() as any,
    );

    const result = await (localService as any).getSpendOverTimeReport('u1', {
      groupBy: 'quarter',
      dateFrom: '2025-01-01',
      dateTo: '2025-06-30',
    });

    expect(result.points).toHaveLength(2);
    expect(result.points[0]).toEqual({
      period: '2025-Q1',
      label: 'Q1 2025',
      income: 100,
      expense: 40,
      net: 60,
      count: 2,
    });
    expect(result.points[1]).toEqual({
      period: '2025-Q2',
      label: 'Q2 2025',
      income: 0,
      expense: 0,
      net: 0,
      count: 0,
    });
  });

  it('getSpendOverTimeReport supports yearly grouping', async () => {
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
        { period: '2025', income: '250', expense: '150', count: '3' },
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
      createRepoMock() as any,
    );

    const result = await (localService as any).getSpendOverTimeReport('u1', {
      groupBy: 'year',
      dateFrom: '2025-01-01',
      dateTo: '2026-12-31',
    });

    expect(result.points).toHaveLength(2);
    expect(result.points[0]).toEqual({
      period: '2025',
      label: '2025',
      income: 250,
      expense: 150,
      net: 100,
      count: 3,
    });
    expect(result.points[1]).toEqual({
      period: '2026',
      label: '2026',
      income: 0,
      expense: 0,
      net: 0,
      count: 0,
    });
  });
});

describe('generateFromTemplate', () => {
  let mockTransactionRepository: any;
  let mockUserRepository: any;
  let mockReportHistoryRepo: any;
  let service: ReportsService;

  beforeEach(() => {
    mockTransactionRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    mockUserRepository = {
      findOne: jest.fn(),
    };
    mockReportHistoryRepo = {
      save: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
    };

    service = new ReportsService(
      mockTransactionRepository as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      createRepoMock() as any,
      mockUserRepository as any,
      { get: jest.fn(), set: jest.fn() } as any,
      { createEvent: jest.fn() } as AuditService,
      mockReportHistoryRepo as any,
    );
  });

  it('should throw for unknown template', async () => {
    mockUserRepository.findOne.mockResolvedValue({ id: 'user1', workspaceId: 'ws1' });
    await expect(
      service.generateFromTemplate('user1', {
        templateId: 'unknown',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        format: 'excel',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should generate P&L as excel', async () => {
    mockUserRepository.findOne.mockResolvedValue({ id: 'user1', workspaceId: 'ws1' });
    mockTransactionRepository.find.mockResolvedValue([
      {
        amount: 5000,
        transactionType: 'income',
        category: { name: 'Sales' },
        categoryId: 'cat1',
        isDuplicate: false,
      },
      {
        amount: 2000,
        transactionType: 'expense',
        category: { name: 'Rent' },
        categoryId: 'cat2',
        isDuplicate: false,
      },
    ]);
    const result = await service.generateFromTemplate('user1', {
      templateId: 'pnl',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
      format: 'excel',
    });
    expect(result).toHaveProperty('filePath');
    expect(result).toHaveProperty('fileName');
    expect(result.contentType).toContain('spreadsheet');
    // Clean up temp file
    if (result.filePath && fs.existsSync(result.filePath)) {
      fs.unlinkSync(result.filePath);
    }
  });

  it('should generate P&L as csv', async () => {
    mockUserRepository.findOne.mockResolvedValue({ id: 'user1', workspaceId: 'ws1' });
    mockTransactionRepository.find.mockResolvedValue([
      {
        amount: 3000,
        transactionType: 'income',
        category: { name: 'Services' },
        categoryId: 'cat3',
        isDuplicate: false,
      },
    ]);
    const result = await service.generateFromTemplate('user1', {
      templateId: 'pnl',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
      format: 'csv',
    });
    expect(result.contentType).toBe('text/csv');
    expect(result.fileName).toMatch(/\.csv$/);
    if (result.filePath && fs.existsSync(result.filePath)) {
      fs.unlinkSync(result.filePath);
    }
  });

  it('should throw BadRequestException when no workspace', async () => {
    mockUserRepository.findOne.mockResolvedValue({ id: 'user1', workspaceId: null });
    await expect(
      service.generateFromTemplate('user1', {
        templateId: 'pnl',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        format: 'excel',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException for pdf format', async () => {
    mockUserRepository.findOne.mockResolvedValue({ id: 'user1', workspaceId: 'ws1' });
    mockTransactionRepository.find.mockResolvedValue([]);
    await expect(
      service.generateFromTemplate('user1', {
        templateId: 'pnl',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        format: 'pdf',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
