import { PassThrough } from 'stream';
import { ExportFormat } from '@/modules/reports/dto/export-report.dto';
import { ReportsController } from '@/modules/reports/reports.controller';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    createReadStream: jest.fn(),
    unlinkSync: jest.fn(),
  };
});

describe('ReportsController', () => {
  it('getDailyReport resolves latest when date=latest', async () => {
    const reportsService = {
      getStatementsSummary: jest.fn(),
      getCustomTablesSummary: jest.fn(),
      getLatestTransactionDate: jest.fn(async () => '2025-01-02'),
      generateDailyReport: jest.fn(async () => ({ day: 'ok' })),
      getLatestTransactionPeriod: jest.fn(async () => ({
        year: 2025,
        month: 1,
      })),
      generateMonthlyReport: jest.fn(),
      generateCustomReport: jest.fn(),
      exportReport: jest.fn(),
    };
    const controller = new ReportsController(reportsService as any);

    const result = await controller.getDailyReport({ id: 'u1' } as any, 'latest');

    expect(result).toEqual({ day: 'ok' });
    expect(reportsService.generateDailyReport).toHaveBeenCalledWith('u1', '2025-01-02');
  });

  it('exportReport sets headers and schedules cleanup', async () => {
    const fs = await import('fs');
    const stream = new PassThrough();
    (fs.createReadStream as any).mockReturnValue(stream);

    const reportsService = {
      getStatementsSummary: jest.fn(),
      getCustomTablesSummary: jest.fn(),
      getLatestTransactionDate: jest.fn(),
      generateDailyReport: jest.fn(async () => ({ day: 'ok' })),
      getLatestTransactionPeriod: jest.fn(async () => ({
        year: 2025,
        month: 1,
      })),
      generateMonthlyReport: jest.fn(),
      generateCustomReport: jest.fn(async () => ({ ok: true })),
      exportReport: jest.fn(async () => ({
        filePath: '/tmp/report.csv',
        fileName: 'r.csv',
      })),
    };
    const res = new PassThrough() as any;
    res.setHeader = jest.fn();
    const controller = new ReportsController(reportsService as any);

    await controller.exportReport({ id: 'u1' } as any, { format: ExportFormat.CSV } as any, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(fs.createReadStream).toHaveBeenCalledWith('/tmp/report.csv');

    stream.emit('end');
    expect(fs.unlinkSync as any).toHaveBeenCalledWith('/tmp/report.csv');
  });

  it('getTopCategories delegates to reports service', async () => {
    const reportsService = {
      getStatementsSummary: jest.fn(),
      getCustomTablesSummary: jest.fn(),
      getLatestTransactionDate: jest.fn(),
      generateDailyReport: jest.fn(),
      getLatestTransactionPeriod: jest.fn(),
      generateMonthlyReport: jest.fn(),
      generateCustomReport: jest.fn(),
      exportReport: jest.fn(),
      getTopCategoriesReport: jest.fn(async () => ({ categories: [] })),
    };
    const controller = new ReportsController(reportsService as any);

    const result = await controller.getTopCategories({ id: 'u-1' } as any, {
      limit: 5,
      type: 'expense',
    } as any);

    expect(result).toEqual({ categories: [] });
    expect(reportsService.getTopCategoriesReport).toHaveBeenCalledWith('u-1', {
      limit: 5,
      type: 'expense',
    });
  });

  it('getSpendOverTime delegates to reports service', async () => {
    const reportsService = {
      getStatementsSummary: jest.fn(),
      getCustomTablesSummary: jest.fn(),
      getLatestTransactionDate: jest.fn(),
      generateDailyReport: jest.fn(),
      getLatestTransactionPeriod: jest.fn(),
      generateMonthlyReport: jest.fn(),
      generateCustomReport: jest.fn(),
      exportReport: jest.fn(),
      getTopCategoriesReport: jest.fn(),
      getSpendOverTimeReport: jest.fn(async () => ({ points: [] })),
    };
    const controller = new ReportsController(reportsService as any);

    const result = await (controller as any).getSpendOverTimeReport({ id: 'u-9' } as any, {
      groupBy: 'day',
      dateFrom: '2025-01-01',
      dateTo: '2025-01-03',
    });

    expect(result).toEqual({ points: [] });
    expect(reportsService.getSpendOverTimeReport).toHaveBeenCalledWith('u-9', {
      groupBy: 'day',
      dateFrom: '2025-01-01',
      dateTo: '2025-01-03',
    });
  });

});
