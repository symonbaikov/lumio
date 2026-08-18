import { BalanceAccountSubType, BalanceAccountType, type BalanceSnapshot } from '@/entities';
import { DEFAULT_BALANCE_ACCOUNTS } from '@/modules/balance/balance-default-accounts';
import { BalanceService } from '@/modules/balance/balance.service';
import { BadRequestException } from '@nestjs/common';

function createRepoMock() {
  return {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((input: unknown) => input),
    save: jest.fn(async (input: unknown) => input),
    createQueryBuilder: jest.fn(),
  } as any;
}

describe('BalanceService', () => {
  let service: BalanceService;
  const balanceAccountRepository = createRepoMock();
  const balanceSnapshotRepository = createRepoMock();
  const walletRepository = createRepoMock();
  const transactionRepository = createRepoMock();
  const statementRepository = createRepoMock();
  const workspaceMemberRepository = createRepoMock();
  const workspaceRepository = createRepoMock();
  const auditService = { createEvent: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    workspaceRepository.findOne.mockResolvedValue({ currency: 'KZT' });

    service = new BalanceService(
      balanceAccountRepository,
      balanceSnapshotRepository,
      walletRepository,
      transactionRepository,
      statementRepository,
      workspaceMemberRepository,
      workspaceRepository,
      auditService,
    );
  });

  it('seeds default accounts when workspace has none', async () => {
    balanceAccountRepository.count.mockResolvedValue(0);
    balanceAccountRepository.save.mockImplementation(async (input: any) => ({
      ...input,
      id: `acc-${input.code}`,
    }));

    await service.seedDefaultAccounts('ws-1');

    expect(balanceAccountRepository.save).toHaveBeenCalledTimes(DEFAULT_BALANCE_ACCOUNTS.length);
    const savedCodes = balanceAccountRepository.save.mock.calls.map((call: any[]) => call[0].code);
    expect(savedCodes).toEqual(DEFAULT_BALANCE_ACCOUNTS.map(account => account.code));
  });

  it('calculates totals from manual and auto-computed lines', async () => {
    balanceAccountRepository.count.mockResolvedValue(3);
    balanceAccountRepository.find.mockResolvedValue([
      {
        id: 'asset-root',
        code: 'ASSET_NON_CURRENT',
        name: 'Assets section',
        accountType: BalanceAccountType.ASSET,
        subType: BalanceAccountSubType.NON_CURRENT_ASSET,
        isEditable: false,
        isAutoComputed: false,
        isExpandable: false,
        position: 0,
        parentId: null,
        createdAt: new Date(),
      },
      {
        id: 'asset-fixed',
        code: 'ASSET_FIXED',
        name: 'Fixed',
        accountType: BalanceAccountType.ASSET,
        subType: BalanceAccountSubType.NON_CURRENT_ASSET,
        isEditable: true,
        isAutoComputed: false,
        isExpandable: false,
        position: 0,
        parentId: 'asset-root',
        createdAt: new Date(),
      },
      {
        id: 'asset-cash',
        code: 'ASSET_CASH',
        name: 'Cash',
        accountType: BalanceAccountType.ASSET,
        subType: BalanceAccountSubType.CASH,
        isEditable: false,
        isAutoComputed: true,
        isExpandable: false,
        position: 1,
        parentId: null,
        createdAt: new Date(),
      },
      {
        id: 'equity-root',
        code: 'EQUITY_SECTION',
        name: 'Equity',
        accountType: BalanceAccountType.EQUITY,
        subType: BalanceAccountSubType.EQUITY,
        isEditable: false,
        isAutoComputed: false,
        isExpandable: false,
        position: 0,
        parentId: null,
        createdAt: new Date(),
      },
      {
        id: 'equity-retained',
        code: 'EQUITY_RETAINED_EARNINGS',
        name: 'Retained earnings',
        accountType: BalanceAccountType.EQUITY,
        subType: BalanceAccountSubType.EQUITY,
        isEditable: false,
        isAutoComputed: true,
        isExpandable: false,
        position: 0,
        parentId: 'equity-root',
        createdAt: new Date(),
      },
    ]);

    jest
      .spyOn(service as any, 'getLatestSnapshotMap')
      .mockResolvedValue(new Map([['asset-fixed', { amount: 100 } as BalanceSnapshot]]));
    jest.spyOn(service as any, 'getAutoComputedCashBalance').mockResolvedValue(300);
    jest.spyOn(service as any, 'getRetainedEarnings').mockResolvedValue(400);

    const result = await service.getBalanceSheet('ws-1', '2026-02-15');

    expect(result.assets.total).toBe(400);
    expect(result.liabilities.total).toBe(400);
    expect(result.isBalanced).toBe(true);
    expect(result.difference).toBe(0);
  });

  it('returns localized account names for requested locale', async () => {
    balanceAccountRepository.count.mockResolvedValue(1);
    balanceAccountRepository.find.mockResolvedValue([
      {
        id: 'asset-cash',
        code: 'ASSET_CASH',
        name: 'III. Деньги',
        nameEn: 'III. Cash',
        nameKk: 'III. Ақша',
        accountType: BalanceAccountType.ASSET,
        subType: BalanceAccountSubType.CASH,
        isEditable: false,
        isAutoComputed: true,
        isExpandable: false,
        position: 0,
        parentId: null,
        createdAt: new Date(),
      },
    ]);

    jest.spyOn(service as any, 'getLatestSnapshotMap').mockResolvedValue(new Map());
    jest.spyOn(service as any, 'getAutoComputedCashBalance').mockResolvedValue(1000);
    jest.spyOn(service as any, 'getRetainedEarnings').mockResolvedValue(0);

    const resultEn = await service.getBalanceSheet('ws-1', '2026-04-02', 'en');
    expect(resultEn.assets.sections[0].name).toBe('III. Cash');

    const resultKk = await service.getBalanceSheet('ws-1', '2026-04-02', 'kk');
    expect(resultKk.assets.sections[0].name).toBe('III. Ақша');

    const resultRu = await service.getBalanceSheet('ws-1', '2026-04-02', 'ru');
    expect(resultRu.assets.sections[0].name).toBe('III. Деньги');
  });

  it('uses localized labels in excel export', async () => {
    balanceAccountRepository.count.mockResolvedValue(1);
    balanceAccountRepository.find.mockResolvedValue([
      {
        id: 'asset-cash',
        code: 'ASSET_CASH',
        name: 'III. Деньги',
        nameEn: 'III. Cash',
        nameKk: 'III. Ақша',
        accountType: BalanceAccountType.ASSET,
        subType: BalanceAccountSubType.CASH,
        isEditable: false,
        isAutoComputed: true,
        isExpandable: false,
        position: 0,
        parentId: null,
        createdAt: new Date(),
      },
    ]);

    jest.spyOn(service as any, 'getLatestSnapshotMap').mockResolvedValue(new Map());
    jest.spyOn(service as any, 'getAutoComputedCashBalance').mockResolvedValue(1000);
    jest.spyOn(service as any, 'getRetainedEarnings').mockResolvedValue(0);

    const payload = await service.exportBalanceSheet(
      'ws-1',
      { format: 'excel', date: '2026-04-02', locale: 'en' } as any,
      'en',
    );

    const workbook = require('xlsx').read(payload.buffer, { type: 'buffer' });
    const rows = require('xlsx').utils.sheet_to_json(workbook.Sheets.Balance, { header: 1 });

    expect(rows[0][0]).toBe('Balance sheet as of 2026-04-02');
    expect(rows[2][0]).toContain('Assets');
    expect(rows[2][2]).toContain('Liabilities');
    expect(rows[rows.length - 2][0]).toBe('Total');
    expect(rows[rows.length - 1][0]).toBe('Difference');
  });

  it('rejects updates for non-editable accounts', async () => {
    balanceAccountRepository.findOne.mockResolvedValue({
      id: 'account-id',
      workspaceId: 'ws-1',
      isEditable: false,
      code: 'ASSET_CASH',
    });

    await expect(
      service.updateSnapshot('user-1', 'ws-1', {
        accountId: 'account-id',
        amount: 123.45,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('upserts editable snapshot and writes audit event', async () => {
    balanceAccountRepository.findOne.mockResolvedValue({
      id: 'asset-fixed',
      workspaceId: 'ws-1',
      isEditable: true,
      code: 'ASSET_FIXED',
    });
    balanceSnapshotRepository.findOne.mockResolvedValue(null);

    await service.updateSnapshot('user-1', 'ws-1', {
      accountId: 'asset-fixed',
      amount: 500,
      date: '2026-02-15',
      currency: 'KZT',
    });

    expect(balanceSnapshotRepository.save).toHaveBeenCalled();
    expect(auditService.createEvent).toHaveBeenCalled();
  });
});
