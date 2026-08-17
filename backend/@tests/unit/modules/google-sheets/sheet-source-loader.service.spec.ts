import type { GoogleSheet } from '@/entities';
import { GoogleSheetsApiService } from '@/modules/google-sheets/services/google-sheets-api.service';
import { SheetSourceLoaderService } from '@/modules/google-sheets/services/sheet-source-loader.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

function createRepoMock<T>() {
  return {
    findOne: jest.fn(),
    save: jest.fn(async (x: any) => x),
    create: jest.fn((x: any) => x),
  } as unknown as Repository<T> & Record<string, any>;
}

describe('SheetSourceLoaderService', () => {
  const googleSheetRepository = createRepoMock<GoogleSheet>();
  const googleSheetsApiService = {
    getValues: jest.fn(),
    getSpreadsheetInfo: jest.fn(),
  };

  let service: SheetSourceLoaderService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SheetSourceLoaderService(
      googleSheetRepository as any,
      googleSheetsApiService as unknown as GoogleSheetsApiService,
    );
  });

  describe('buildPublicExportUrl', () => {
    it('converts an /edit link to an xlsx export url', () => {
      expect(
        service.buildPublicExportUrl('https://docs.google.com/spreadsheets/d/ABC123/edit#gid=0'),
      ).toMatchObject({
        spreadsheetId: 'ABC123',
        url: expect.stringContaining('/export?format=xlsx'),
      });
    });

    it('rejects a non-Sheets url', () => {
      expect(() => service.buildPublicExportUrl('https://example.com/x')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('load', () => {
    it('resolves via the OAuth path when googleSheetId is provided', async () => {
      googleSheetRepository.findOne = jest.fn(async ({ where }: any) => {
        if (where?.id === 'gs1' && where?.workspaceId === 'ws1' && where?.isActive === true) {
          return {
            id: 'gs1',
            workspaceId: 'ws1',
            isActive: true,
            sheetId: 'sheet',
            worksheetName: 'Sheet1',
            accessToken: 'at',
            refreshToken: 'rt',
          };
        }
        return null;
      });

      googleSheetsApiService.getValues = jest.fn(async () => ({
        accessToken: 'at',
        range: "'Sheet1'!A1:B2",
        values: [
          ['name', 'amount'],
          ['Alice', '10'],
        ],
      }));

      const result = await service.load({
        googleSheetId: 'gs1',
        workspaceId: 'ws1',
      });

      expect(googleSheetsApiService.getValues).toHaveBeenCalledWith(
        'at',
        'rt',
        'sheet',
        "'Sheet1'",
        expect.any(Object),
      );
      expect(result).toMatchObject({
        spreadsheetId: 'sheet',
        worksheetName: 'Sheet1',
        effectiveRange: "'Sheet1'!A1:B2",
      });
    });

    it('throws NotFoundException when the connected sheet is missing', async () => {
      googleSheetRepository.findOne = jest.fn(async () => null);
      await expect(service.load({ googleSheetId: 'missing', workspaceId: 'ws1' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when neither googleSheetId nor sourceUrl is provided', async () => {
      await expect(service.load({ workspaceId: 'ws1' })).rejects.toThrow(BadRequestException);
    });
  });
});
