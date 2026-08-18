import { BalanceAccountType, CapitalRole, RiskLevel } from '@/entities/balance-account.entity';
import { NetWorthService } from '@/modules/net-worth/net-worth.service';

const WORKSPACE_ID = 'workspace-1';

interface AccountSeed {
  id: string;
  code: string;
  name: string;
  accountType: BalanceAccountType;
  parentId?: string | null;
  position?: number;
  capitalRole?: CapitalRole | null;
  riskLevel?: RiskLevel | null;
}

interface SnapshotSeed {
  accountId: string;
  snapshotDate: string;
  amount: number;
}

/** The default chart of accounts, trimmed to what these tests care about. */
const ACCOUNTS: AccountSeed[] = [
  { id: 'a-noncurrent', code: 'ASSET_NON_CURRENT', name: 'Внеоборотные', accountType: BalanceAccountType.ASSET, position: 0 },
  { id: 'a-fixed', code: 'ASSET_FIXED', name: 'Основные средства', accountType: BalanceAccountType.ASSET, parentId: 'a-noncurrent' },
  { id: 'a-cash', code: 'ASSET_CASH', name: 'Деньги', accountType: BalanceAccountType.ASSET, position: 2 },
  { id: 'l-borrowed', code: 'LIABILITY_BORROWED', name: 'Ссудный капитал', accountType: BalanceAccountType.LIABILITY, position: 1 },
  { id: 'e-section', code: 'EQUITY_SECTION', name: 'Собственный капитал', accountType: BalanceAccountType.EQUITY, position: 0 },
  { id: 'e-authorized', code: 'EQUITY_AUTHORIZED', name: 'Уставный капитал', accountType: BalanceAccountType.EQUITY, parentId: 'e-section' },
];

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function createService(options: {
  accounts?: AccountSeed[];
  snapshots?: SnapshotSeed[];
  cashBalance?: number;
  walletCash?: { initialBalance: number; deltas: Array<{ date: string; credit: number; debit: number }> };
}) {
  const accounts = (options.accounts ?? ACCOUNTS).map(account => ({
    parentId: null,
    position: 0,
    nameEn: null,
    nameKk: null,
    capitalRole: null,
    riskLevel: null,
    workspaceId: WORKSPACE_ID,
    ...account,
  }));

  const snapshots = (options.snapshots ?? []).map(snapshot => ({ ...snapshot }));
  const hasWallets = options.walletCash !== undefined;

  const snapshotQueryBuilder: any = {
    select: jest.fn(() => snapshotQueryBuilder),
    where: jest.fn(() => snapshotQueryBuilder),
    andWhere: jest.fn(() => snapshotQueryBuilder),
    orderBy: jest.fn(() => snapshotQueryBuilder),
    addOrderBy: jest.fn(() => snapshotQueryBuilder),
    getMany: jest.fn(async () => snapshots),
    getRawOne: jest.fn(async () => ({ earliest: snapshots[0]?.snapshotDate ?? null })),
  };

  const transactionQueryBuilder: any = {
    select: jest.fn(() => transactionQueryBuilder),
    addSelect: jest.fn(() => transactionQueryBuilder),
    where: jest.fn(() => transactionQueryBuilder),
    andWhere: jest.fn(() => transactionQueryBuilder),
    groupBy: jest.fn(() => transactionQueryBuilder),
    orderBy: jest.fn(() => transactionQueryBuilder),
    addOrderBy: jest.fn(() => transactionQueryBuilder),
    getRawMany: jest.fn(async () =>
      (options.walletCash?.deltas ?? []).map(delta => ({
        date: delta.date,
        credit: String(delta.credit),
        debit: String(delta.debit),
      })),
    ),
    getRawOne: jest.fn(async () => ({ earliest: null })),
  };

  const statementQueryBuilder: any = {
    select: jest.fn(() => statementQueryBuilder),
    addSelect: jest.fn(() => statementQueryBuilder),
    where: jest.fn(() => statementQueryBuilder),
    andWhere: jest.fn(() => statementQueryBuilder),
    orderBy: jest.fn(() => statementQueryBuilder),
    addOrderBy: jest.fn(() => statementQueryBuilder),
    getRawMany: jest.fn(async () => []),
  };

  const balanceService = {
    seedDefaultAccounts: jest.fn(async () => undefined),
    getCashBalance: jest.fn(async () => options.cashBalance ?? 0),
  } as any;

  const service = new NetWorthService(
    { find: jest.fn(async () => accounts) } as any,
    { createQueryBuilder: jest.fn(() => snapshotQueryBuilder) } as any,
    {
      find: jest.fn(async () =>
        hasWallets ? [{ id: 'wallet-1', initialBalance: options.walletCash?.initialBalance ?? 0 }] : [],
      ),
    } as any,
    { createQueryBuilder: jest.fn(() => transactionQueryBuilder) } as any,
    { createQueryBuilder: jest.fn(() => statementQueryBuilder) } as any,
    { find: jest.fn(async () => [{ userId: 'user-1' }]) } as any,
    { findOne: jest.fn(async () => ({ currency: 'KZT' })) } as any,
    balanceService,
  );

  return { service, balanceService };
}

describe('NetWorthService', () => {
  it('reports assets minus liabilities, ignoring equity', async () => {
    const { service } = createService({
      snapshots: [
        { accountId: 'a-fixed', snapshotDate: daysAgo(200), amount: 1000 },
        { accountId: 'l-borrowed', snapshotDate: daysAgo(200), amount: 400 },
        { accountId: 'e-authorized', snapshotDate: daysAgo(200), amount: 900 },
      ],
      cashBalance: 200,
    });

    const result = await service.getNetWorth(WORKSPACE_ID, '90d');

    // 1000 fixed + 200 cash − 400 borrowed. Equity is the balancing side of
    // the sheet, not a debt, so it must not move the number.
    expect(result.current).toBe(800);
    expect(result.assetsTotal).toBe(1200);
    expect(result.liabilitiesTotal).toBe(400);
  });

  it('holds an account at its last entered value until the next one', async () => {
    const { service } = createService({
      snapshots: [
        { accountId: 'a-fixed', snapshotDate: daysAgo(80), amount: 500 },
        { accountId: 'a-fixed', snapshotDate: daysAgo(10), amount: 900 },
      ],
      cashBalance: 0,
    });

    const result = await service.getNetWorth(WORKSPACE_ID, '90d');
    const values = result.series.map(point => point.value);

    expect(values[0]).toBe(0); // before the first snapshot
    expect(values).toContain(500); // held between the two
    expect(values[values.length - 1]).toBe(900);
  });

  it('takes today’s cash from the balance sheet rather than recomputing it', async () => {
    const { service, balanceService } = createService({
      cashBalance: 777,
      walletCash: { initialBalance: 100, deltas: [] },
    });

    const result = await service.getNetWorth(WORKSPACE_ID, '30d');

    expect(balanceService.getCashBalance).toHaveBeenCalledWith(
      WORKSPACE_ID,
      result.series[result.series.length - 1].date,
    );
    expect(result.current).toBe(777);
  });

  it('builds the historical cash line from wallet movements', async () => {
    const { service } = createService({
      cashBalance: 0,
      walletCash: {
        initialBalance: 100,
        deltas: [{ date: daysAgo(60), credit: 50, debit: 20 }],
      },
    });

    const result = await service.getNetWorth(WORKSPACE_ID, '90d');
    const values = result.series.map(point => point.value);

    expect(values[0]).toBe(100); // opening balance only
    expect(values).toContain(130); // after +50 −20
  });

  it('reports the change across the window and its percentage', async () => {
    const { service } = createService({
      snapshots: [
        { accountId: 'a-fixed', snapshotDate: daysAgo(200), amount: 1000 },
        { accountId: 'a-fixed', snapshotDate: daysAgo(5), amount: 1500 },
      ],
      cashBalance: 0,
    });

    const result = await service.getNetWorth(WORKSPACE_ID, '90d');

    expect(result.previous).toBe(1000);
    expect(result.current).toBe(1500);
    expect(result.change).toBe(500);
    expect(result.changePercent).toBe(50);
  });

  it('omits the percentage when there is nothing to take a percentage of', async () => {
    const { service } = createService({
      snapshots: [{ accountId: 'a-fixed', snapshotDate: daysAgo(5), amount: 1500 }],
      cashBalance: 0,
    });

    const result = await service.getNetWorth(WORKSPACE_ID, '90d');

    expect(result.previous).toBe(0);
    expect(result.changePercent).toBeNull();
  });

  it('groups the allocation by top-level section and drops empty ones', async () => {
    const { service } = createService({
      snapshots: [{ accountId: 'a-fixed', snapshotDate: daysAgo(30), amount: 750 }],
      cashBalance: 250,
    });

    const result = await service.getNetWorth(WORKSPACE_ID, '90d');

    expect(result.breakdown).toEqual([
      { code: 'ASSET_NON_CURRENT', name: 'Внеоборотные', amount: 750, percent: 75 },
      { code: 'ASSET_CASH', name: 'Деньги', amount: 250, percent: 25 },
    ]);
  });

  it('treats cash as low risk regardless of what is stored against it', async () => {
    const { service } = createService({
      accounts: [
        {
          id: 'a-cash',
          code: 'ASSET_CASH',
          name: 'Деньги',
          accountType: BalanceAccountType.ASSET,
          riskLevel: RiskLevel.HIGH,
        },
      ],
      cashBalance: 500,
    });

    const result = await service.getNetWorth(WORKSPACE_ID, '90d');
    const cash = result.assetLines.find(line => line.code === 'ASSET_CASH');

    expect(cash?.riskLevel).toBe(RiskLevel.LOW);
    expect(cash?.isClassifiable).toBe(false);
    expect(result.riskyPercent).toBe(0);
  });

  it('measures the risky share against all assets, not just classified ones', async () => {
    const { service } = createService({
      accounts: [
        {
          id: 'a-fixed',
          code: 'ASSET_FIXED',
          name: 'Основные средства',
          accountType: BalanceAccountType.ASSET,
          riskLevel: RiskLevel.HIGH,
        },
        {
          id: 'a-other',
          code: 'ASSET_INVENTORY',
          name: 'Запасы',
          accountType: BalanceAccountType.ASSET,
        },
      ],
      snapshots: [
        { accountId: 'a-fixed', snapshotDate: daysAgo(30), amount: 300 },
        { accountId: 'a-other', snapshotDate: daysAgo(30), amount: 700 },
      ],
    });

    const result = await service.getNetWorth(WORKSPACE_ID, '90d');

    // 300 of 1000 is high risk; the unclassified 700 counts in the
    // denominator, so the share understates rather than invents risk.
    expect(result.riskyPercent).toBe(30);
    expect(result.byRisk).toEqual([
      { key: null, amount: 700, percent: 70 },
      { key: RiskLevel.HIGH, amount: 300, percent: 30 },
    ]);
  });

  it('groups assets by the role the user assigned them', async () => {
    const { service } = createService({
      accounts: [
        {
          id: 'a-fixed',
          code: 'ASSET_FIXED',
          name: 'Основные средства',
          accountType: BalanceAccountType.ASSET,
          capitalRole: CapitalRole.INCOME,
        },
        {
          id: 'a-other',
          code: 'ASSET_INVENTORY',
          name: 'Запасы',
          accountType: BalanceAccountType.ASSET,
          capitalRole: CapitalRole.DRAIN,
        },
      ],
      snapshots: [
        { accountId: 'a-fixed', snapshotDate: daysAgo(30), amount: 600 },
        { accountId: 'a-other', snapshotDate: daysAgo(30), amount: 400 },
      ],
    });

    const result = await service.getNetWorth(WORKSPACE_ID, '90d');

    expect(result.byRole).toEqual([
      { key: CapitalRole.INCOME, amount: 600, percent: 60 },
      { key: CapitalRole.DRAIN, amount: 400, percent: 40 },
    ]);
  });

  it('returns a flat zero series for a workspace with nothing in it', async () => {
    const { service } = createService({ cashBalance: 0 });

    const result = await service.getNetWorth(WORKSPACE_ID, 'all');

    expect(result.current).toBe(0);
    expect(result.breakdown).toEqual([]);
    expect(result.series.every(point => point.value === 0)).toBe(true);
  });
});
