import type {
  Category,
  CustomTable,
  CustomTableCellStyle,
  CustomTableColumn,
  CustomTableColumnStyle,
  CustomTableRow,
  GoogleSheet,
} from '@/entities';
import { CustomTableColumnType } from '@/entities/custom-table-column.entity';
import { AuditService } from '@/modules/audit/audit.service';
import { CustomTablesImportService } from '@/modules/custom-tables/custom-tables-import.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

function createRepoMock<T>() {
  return {
    findOne: jest.fn(),
    save: jest.fn(async (x: any) => x),
    create: jest.fn((x: any) => x),
  } as unknown as Repository<T> & Record<string, any>;
}

describe('CustomTablesImportService', () => {
  const googleSheetRepository = createRepoMock<GoogleSheet>();
  const categoryRepository = createRepoMock<Category>();
  const customTableRepository = createRepoMock<CustomTable>();
  const customTableColumnRepository = createRepoMock<CustomTableColumn>();
  const customTableRowRepository = createRepoMock<CustomTableRow>();
  const customTableColumnStyleRepository = createRepoMock<CustomTableColumnStyle>();
  const customTableCellStyleRepository = createRepoMock<CustomTableCellStyle>();
  const auditService = {
    createEvent: jest.fn(),
    createBatchEvents: jest.fn(),
  } as unknown as AuditService;

  const googleSheetsApiService = {
    getValues: jest.fn(),
    getGridData: jest.fn(),
    getSpreadsheetInfo: jest.fn(),
  };

  let service: CustomTablesImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomTablesImportService(
      googleSheetRepository as any,
      categoryRepository as any,
      customTableRepository as any,
      customTableColumnRepository as any,
      customTableRowRepository as any,
      customTableColumnStyleRepository as any,
      customTableCellStyleRepository as any,
      googleSheetsApiService as any,
      auditService as any,
    );
  });

  it('previewGoogleSheets infers column types and builds usedRange', async () => {
    googleSheetRepository.findOne = jest.fn(async () => ({
      id: 'gs1',
      userId: 'u1',
      isActive: true,
      sheetId: 'sheet',
      worksheetName: 'Sheet1',
      accessToken: 'at',
      refreshToken: 'rt',
    }));

    googleSheetsApiService.getValues = jest.fn(
      async (_at: any, _rt: any, _sid: any, range: string) => ({
        accessToken: 'at',
        range: "'Sheet1'!A1:C3",
        values: [
          ['date', 'amount', 'flag'],
          ['2025-01-01', '1 234,50', 'yes'],
          ['2025-01-02', '10', 'no'],
        ],
      }),
    );
    googleSheetsApiService.getGridData = jest.fn(async () => {
      throw new Error('no grid');
    });

    const result = await service.previewGoogleSheets('u1', {
      googleSheetId: 'gs1',
      range: 'A1:C3',
      headerRowIndex: 0,
    } as any);

    expect(googleSheetsApiService.getValues).toHaveBeenCalledWith(
      'at',
      'rt',
      'sheet',
      "'Sheet1'!A1:C3",
      expect.any(Object),
    );

    expect(result.usedRange).toMatchObject({
      startRow: 1,
      startCol: 1,
      endRow: 3,
      endCol: 3,
      rowsCount: 3,
      colsCount: 3,
    });
    expect(result.columns).toHaveLength(3);
    expect(result.columns[0].suggestedType).toBe(CustomTableColumnType.DATE);
    expect(result.columns[1].suggestedType).toBe(CustomTableColumnType.NUMBER);
    expect(result.columns[2].suggestedType).toBe(CustomTableColumnType.BOOLEAN);
  });

  it('previewGoogleSheets throws for invalid A1 range from API', async () => {
    googleSheetRepository.findOne = jest.fn(async () => ({
      id: 'gs1',
      userId: 'u1',
      isActive: true,
      sheetId: 'sheet',
      worksheetName: 'Sheet1',
      accessToken: 'at',
      refreshToken: 'rt',
    }));

    googleSheetsApiService.getValues = jest.fn(async () => ({
      accessToken: 'at',
      range: 'not-a-range',
      values: [['x']],
    }));

    await expect(
      service.previewGoogleSheets('u1', { googleSheetId: 'gs1' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('previewGoogleSheets throws NotFoundException when sheet missing', async () => {
    googleSheetRepository.findOne = jest.fn(async () => null);
    await expect(
      service.previewGoogleSheets('u1', { googleSheetId: 'missing' } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
