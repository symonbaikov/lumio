import { GoogleSheetsService } from '@/modules/google-sheets/google-sheets.service';

function createRepoMock<T>() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(async (data: Partial<T>) => data as T),
    create: jest.fn((data: Partial<T>) => data as T),
  } as any;
}

describe('GoogleSheetsService', () => {
  const googleSheetRepository = createRepoMock<any>();
  const transactionRepository = createRepoMock<any>();
  const categoryRepository = createRepoMock<any>();
  const branchRepository = createRepoMock<any>();
  const walletRepository = createRepoMock<any>();
  const credentialRepository = createRepoMock<any>();

  const googleSheetsApiService = {
    exchangeCodeForTokens: jest.fn(),
    getSpreadsheetInfo: jest.fn(),
    getUserInfo: jest.fn(),
    listWorksheets: jest.fn(),
    verifyAccess: jest.fn(),
    refreshAccessToken: jest.fn(),
    appendTransactions: jest.fn(),
  };

  let service: GoogleSheetsService;
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'NEXT_PUBLIC_GOOGLE_API_KEY') return 'picker-api-key';
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GoogleSheetsService(
      googleSheetRepository,
      transactionRepository,
      categoryRepository,
      branchRepository,
      walletRepository,
      credentialRepository,
      configService as any,
      googleSheetsApiService as any,
    );
  });

  it('getAuthStatus returns disconnected when reusable credentials are missing', async () => {
    credentialRepository.findOne = jest.fn(async () => null);

    await expect(service.getAuthStatus({ id: 'u1' } as any, 'ws1')).resolves.toEqual({
      connected: false,
      email: null,
    });
  });

  it('connectOAuthSession stores reusable credentials without creating sheet connection', async () => {
    credentialRepository.findOne = jest.fn(async () => null);
    googleSheetsApiService.exchangeCodeForTokens.mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    });
    googleSheetsApiService.getUserInfo.mockResolvedValue({ email: 'picker@example.com' });

    const result = await service.connectOAuthSession({ id: 'u1' } as any, 'ws1', 'code-1');

    expect(result).toEqual({
      connected: true,
      email: 'picker@example.com',
    });
    expect(googleSheetRepository.create).not.toHaveBeenCalled();
    expect(credentialRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        workspaceId: 'ws1',
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        email: 'picker@example.com',
      }),
    );
  });

  it('listWorksheets returns worksheet metadata using reusable credentials', async () => {
    credentialRepository.findOne = jest.fn(async () => ({
      userId: 'u1',
      workspaceId: 'ws1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    }));
    googleSheetsApiService.listWorksheets.mockResolvedValue([
      { title: 'Main', index: 0, rowCount: 15, columnCount: 7 },
    ]);

    await expect(
      service.listWorksheets({ id: 'u1' } as any, 'ws1', 'spreadsheet-1'),
    ).resolves.toEqual([{ title: 'Main', index: 0, rowCount: 15, columnCount: 7 }]);
  });

  it('getPickerToken returns a valid access token using reusable credentials', async () => {
    credentialRepository.findOne = jest.fn(async () => ({
      userId: 'u1',
      workspaceId: 'ws1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    }));
    googleSheetsApiService.verifyAccess.mockResolvedValue(true);

    await expect(service.getPickerToken({ id: 'u1' } as any, 'ws1')).resolves.toEqual({
      accessToken: 'access-1',
      apiKey: 'picker-api-key',
    });
  });

  it('getPickerToken falls back to Google Drive public api key when sheets key is absent', async () => {
    credentialRepository.findOne = jest.fn(async () => ({
      userId: 'u1',
      workspaceId: 'ws1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    }));

    configService.get = jest.fn((key: string) => {
      if (key === 'NEXT_PUBLIC_GOOGLE_API_KEY') return '';
      if (key === 'NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY') return 'drive-api-key';
      return undefined;
    });

    await expect(service.getPickerToken({ id: 'u1' } as any, 'ws1')).resolves.toEqual({
      accessToken: 'access-1',
      apiKey: 'drive-api-key',
    });
  });

  it('createConnectionFromPicker uses stored OAuth credentials and spreadsheet metadata', async () => {
    credentialRepository.findOne = jest.fn(async () => ({
      userId: 'u1',
      workspaceId: 'ws1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      email: 'picker@example.com',
    }));
    googleSheetsApiService.getSpreadsheetInfo.mockResolvedValue({
      title: 'Imported sheet',
      firstWorksheet: 'Sheet1',
    });

    const result = await service.createConnectionFromPicker({ id: 'u1' } as any, 'ws1', {
      spreadsheetId: 'spreadsheet-1',
      worksheetName: 'Sheet1',
    } as any);

    expect(result).toMatchObject({
      sheetId: 'spreadsheet-1',
      sheetName: 'Imported sheet',
      worksheetName: 'Sheet1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    });
    expect(googleSheetRepository.save).toHaveBeenCalled();
  });
});
