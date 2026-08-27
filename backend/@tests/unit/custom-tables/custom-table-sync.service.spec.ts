import { BadRequestException } from '@nestjs/common';
import { CustomTableRow } from '../../../src/entities/custom-table-row.entity';
import { CustomTableSyncService } from '../../../src/modules/custom-tables/custom-table-sync.service';

const createRepositoryMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(async (v: unknown) => v),
  update: jest.fn(),
  create: jest.fn((v?: unknown) => v),
  createQueryBuilder: jest.fn(),
});

const TABLE_ID = '11111111-1111-4111-8111-111111111111';

function buildService(options: { values?: unknown[][]; table?: Record<string, unknown> } = {}) {
  const tableRepository = createRepositoryMock();
  const columnRepository = createRepositoryMock();
  const rowRepository = createRepositoryMock();
  const googleSheetRepository = createRepositoryMock();

  tableRepository.findOne.mockResolvedValue(
    options.table ?? {
      id: TABLE_ID,
      syncEnabled: true,
      syncIntervalHours: 24,
      syncConfig: { googleSheetId: 'sheet-conn-1', worksheetName: 'Лист1' },
      lastSyncedAt: null,
    },
  );
  columnRepository.find.mockResolvedValue([
    { key: 'a', title: 'A', position: 0 },
    { key: 'b', title: 'B', position: 1 },
  ]);
  googleSheetRepository.findOne.mockResolvedValue({
    id: 'sheet-conn-1',
    sheetId: 'abc',
    accessToken: 'at',
    refreshToken: 'rt',
  });

  const googleSheetsApiService = {
    getValues: jest.fn().mockResolvedValue({
      values: options.values ?? [
        ['A', 'B'],
        ['1', '2'],
        ['3', '4'],
      ],
    }),
  };

  const manager = { delete: jest.fn(), insert: jest.fn() };
  const dataSource = {
    transaction: jest.fn(async (cb: (m: typeof manager) => Promise<void>) => cb(manager)),
  };

  const service = new CustomTableSyncService(
    tableRepository as never,
    columnRepository as never,
    rowRepository as never,
    googleSheetRepository as never,
    googleSheetsApiService as never,
    dataSource as never,
  );

  return { service, tableRepository, manager, dataSource, googleSheetsApiService };
}

describe('CustomTableSyncService', () => {
  it('replaces rows instead of appending, so a repeat run is idempotent', async () => {
    const { service, manager } = buildService();

    await service.syncTable(TABLE_ID);

    // Удаление перед вставкой — иначе каждый синк множил бы строки.
    expect(manager.delete).toHaveBeenCalledWith(CustomTableRow, { tableId: TABLE_ID });
    expect(manager.insert).toHaveBeenCalled();
  });

  it('replaces rows inside one transaction', async () => {
    const { service, dataSource } = buildService();

    await service.syncTable(TABLE_ID);

    // Без транзакции сбой на вставке оставил бы таблицу пустой.
    expect(dataSource.transaction).toHaveBeenCalled();
  });

  it('skips the header row', async () => {
    const { service, manager } = buildService({
      values: [
        ['A', 'B'],
        ['1', '2'],
      ],
    });

    const result = await service.syncTable(TABLE_ID);

    expect(result.rows).toBe(1);
    expect(manager.insert).toHaveBeenCalledWith(
      CustomTableRow,
      expect.arrayContaining([expect.objectContaining({ data: { a: '1', b: '2' } })]),
    );
  });

  it('refuses to sync a table without a configured source', async () => {
    const { service } = buildService({
      table: { id: TABLE_ID, syncConfig: null, syncEnabled: true },
    });

    await expect(service.syncTable(TABLE_ID)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to enable sync before a source is set', async () => {
    const { service, tableRepository } = buildService();
    tableRepository.createQueryBuilder.mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: TABLE_ID, syncConfig: null }),
    });

    await expect(
      service.updateSyncSettings('ws-1', TABLE_ID, { syncEnabled: true }),
    ).rejects.toThrow(/источник/);
  });

  it('selects only tables whose interval has elapsed', async () => {
    const { service, tableRepository } = buildService();
    const now = new Date('2026-03-01T12:00:00Z');
    tableRepository.find.mockResolvedValue([
      { id: 'never-synced', syncIntervalHours: 24, lastSyncedAt: null },
      { id: 'due', syncIntervalHours: 1, lastSyncedAt: new Date('2026-03-01T10:00:00Z') },
      { id: 'not-due', syncIntervalHours: 24, lastSyncedAt: new Date('2026-03-01T11:00:00Z') },
    ]);

    const due = await service.findDueTables(now);

    expect(due.map(t => t.id)).toEqual(['never-synced', 'due']);
  });

  it('records a failure without throwing so other tables keep syncing', async () => {
    const { service, tableRepository } = buildService();

    await service.recordSyncFailure(TABLE_ID, new Error('boom'));

    expect(tableRepository.update).toHaveBeenCalledWith(
      { id: TABLE_ID },
      expect.objectContaining({ lastSyncError: 'boom' }),
    );
  });
});
