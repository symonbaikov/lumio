import { GoogleSheetsController } from '@/modules/google-sheets/google-sheets.controller';
import { BadRequestException } from '@nestjs/common';

describe('GoogleSheetsController', () => {
  it('toPublicSheet hides refreshToken and sets oauthConnected flag', async () => {
    const googleSheetsService = {
      getAuthUrl: jest.fn(() => 'https://auth'),
      getAuthStatus: jest.fn(async () => ({ connected: true, email: 'user@example.com' })),
      connectOAuthSession: jest.fn(async () => ({
        connected: true,
        email: 'user@example.com',
      })),
      getPickerToken: jest.fn(async () => ({
        accessToken: 'picker-token',
        apiKey: 'picker-api-key',
      })),
      listWorksheets: jest.fn(async () => [
        { title: 'Sheet1', index: 0, rowCount: 10, columnCount: 5 },
      ]),
      createConnectionFromPicker: jest.fn(async () => ({
        id: 'picker-1',
        sheetId: 'picked-id',
        sheetName: 'Picked sheet',
        worksheetName: 'Sheet1',
        isActive: true,
        refreshToken: 'real-token',
      })),
      connectWithOAuthCode: jest.fn(async () => ({
        id: '1',
        sheetId: 'sid',
        sheetName: 'S',
        worksheetName: 'W',
        isActive: true,
        refreshToken: 'real-token',
      })),
      findAll: jest.fn(async () => [
        {
          id: '1',
          refreshToken: 'placeholder-token',
          sheetId: 'sid',
          sheetName: 'S',
          worksheetName: 'W',
          isActive: true,
        },
      ]),
      findOne: jest.fn(async () => ({
        id: '1',
        refreshToken: 'real-token',
        sheetId: 'sid',
        sheetName: 'S',
        worksheetName: 'W',
        isActive: true,
      })),
      syncTransactions: jest.fn(async () => ({
        synced: 1,
        sheet: { lastSync: new Date() },
      })),
      remove: jest.fn(async () => undefined),
    };
    const controller = new GoogleSheetsController(googleSheetsService as any);

    expect(await controller.getAuthUrl('state')).toEqual({
      url: 'https://auth',
    });

    expect(await controller.getAuthStatus({ id: 'u1' } as any, 'ws1')).toEqual({
      connected: true,
      email: 'user@example.com',
    });

    expect(await controller.getPickerToken({ id: 'u1' } as any, 'ws1')).toEqual({
      accessToken: 'picker-token',
      apiKey: 'picker-api-key',
    });

    expect(await controller.listWorksheets('spreadsheet-1', { id: 'u1' } as any, 'ws1')).toEqual([
      { title: 'Sheet1', index: 0, rowCount: 10, columnCount: 5 },
    ]);

    const oauth = await controller.oauthCallback(
      { code: 'c', sheetId: 'sid', worksheetName: 'W', sheetName: 'S' } as any,
      { id: 'u1' } as any,
      'ws1',
    );
    expect(oauth.sheet.oauthConnected).toBe(true);

    const authOnly = await controller.oauthCallback(
      { code: 'c' } as any,
      { id: 'u1' } as any,
      'ws1',
    );
    expect(authOnly).toEqual({
      message: 'Google account connected',
      auth: { connected: true, email: 'user@example.com' },
    });

    const all = await controller.findAll({ id: 'u1' } as any, 'ws1');
    expect(all[0].oauthConnected).toBe(false);

    const one = await controller.findOne('1', { id: 'u1' } as any, 'ws1');
    expect(one.oauthConnected).toBe(true);

    const picked = await controller.connectWithPicker(
      {
        spreadsheetId: 'picked-id',
        sheetName: 'Picked sheet',
        worksheetName: 'Sheet1',
      } as any,
      { id: 'u1' } as any,
      'ws1',
    );
    expect(picked.sheet).toMatchObject({
      sheetId: 'picked-id',
      sheetName: 'Picked sheet',
      worksheetName: 'Sheet1',
      oauthConnected: true,
    });
  });

  it('connect endpoint is deprecated', async () => {
    const controller = new GoogleSheetsController({} as any);
    await expect(controller.connect({} as any, { id: 'u1' } as any, 'ws1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
