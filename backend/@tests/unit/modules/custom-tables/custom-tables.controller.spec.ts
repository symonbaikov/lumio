import { CustomTablesController } from '@/modules/custom-tables/custom-tables.controller';
import { BadRequestException } from '@nestjs/common';

describe('CustomTablesController', () => {
  it('previewGoogleSheets forwards workspaceId to import service', async () => {
    const customTablesService = {
      createTable: jest.fn(),
      listTables: jest.fn(),
    };
    const customTablesImportService = {
      previewGoogleSheets: jest.fn(async () => ({ ok: true })),
    };
    const importJobsService = {
      createGoogleSheetsJob: jest.fn(async () => ({ id: 'job-1' })),
    };
    const customTablesCache = {
      bumpList: jest.fn(),
      bumpTable: jest.fn(),
      bumpRows: jest.fn(),
      listKey: jest.fn(),
      rowsKey: jest.fn(),
      getOrSet: jest.fn(),
    };
    const controller = new CustomTablesController(
      customTablesService as any,
      customTablesImportService as any,
      importJobsService as any,
      customTablesCache as any,
    );

    const dto = { googleSheetId: 'gs1' } as any;
    const result = await controller.previewGoogleSheets({ id: 'u1' } as any, 'ws-1', dto);

    expect(customTablesImportService.previewGoogleSheets).toHaveBeenCalledWith('ws-1', dto);
    expect(result).toEqual({ ok: true });
  });

  it('commitGoogleSheets returns jobId', async () => {
    const customTablesService = {
      createTable: jest.fn(),
      listTables: jest.fn(),
    };
    const customTablesImportService = { previewGoogleSheets: jest.fn() };
    const importJobsService = {
      createGoogleSheetsJob: jest.fn(async () => ({ id: 'job-1' })),
    };
    const customTablesCache = {
      bumpList: jest.fn(),
      bumpTable: jest.fn(),
      bumpRows: jest.fn(),
      listKey: jest.fn(),
      rowsKey: jest.fn(),
      getOrSet: jest.fn(),
    };
    const controller = new CustomTablesController(
      customTablesService as any,
      customTablesImportService as any,
      importJobsService as any,
      customTablesCache as any,
    );

    const result = await controller.commitGoogleSheets({ id: 'u1' } as any, { any: true } as any);
    expect(result).toEqual({ jobId: 'job-1' });
  });

  it('listRows rejects invalid filters JSON', async () => {
    const controller = new CustomTablesController(
      { listRows: jest.fn() } as any,
      {} as any,
      {} as any,
      {
        rowsKey: jest.fn(),
        getOrSet: jest.fn(),
      } as any,
    );

    await expect(
      controller.listRows({ id: 'u1' } as any, 'ws-1', 't1', undefined, 10, '{bad'),
    ).rejects.toThrow(BadRequestException);
  });

  it('updateColumnStyle bumps the table cache', async () => {
    const customTablesService = {
      updateColumnStyle: jest.fn(async () => ({ columnKey: 'col_a', style: {} })),
    };
    const customTablesCache = { bumpTable: jest.fn(), bumpRows: jest.fn() };
    const controller = new CustomTablesController(
      customTablesService as any,
      {} as any,
      {} as any,
      customTablesCache as any,
    );

    const dto = { header: { backgroundColor: '#ff0000' } } as any;
    const result = await controller.updateColumnStyle({ id: 'u1' } as any, 'ws-1', 't1', 'c1', dto);

    expect(customTablesService.updateColumnStyle).toHaveBeenCalledWith('u1', 'ws-1', 't1', 'c1', dto);
    expect(customTablesCache.bumpTable).toHaveBeenCalledWith('ws-1', 't1');
    expect(result).toEqual({ columnKey: 'col_a', style: {} });
  });
});
