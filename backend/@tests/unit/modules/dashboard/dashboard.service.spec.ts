import { ActorType, AuditAction, EntityType } from '../../../../src/entities/audit-event.entity';
import { StatementStatus } from '../../../../src/entities/statement.entity';
import { TransactionType } from '../../../../src/entities/transaction.entity';
import { WorkspaceRole } from '../../../../src/entities/workspace-member.entity';
import { DashboardService } from '../../../../src/modules/dashboard/dashboard.service';
import { In, IsNull } from 'typeorm';

const createRepoMock = () =>
  ({
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  }) as any;

const createQueryBuilderMock = (result: unknown) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  setParameter: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue(result),
  getRawMany: jest.fn().mockResolvedValue(result),
  getCount: jest.fn().mockResolvedValue(result),
  getMany: jest.fn().mockResolvedValue(result),
});

const createExpectedWindow = (days: number, targetDate: string | Date) => {
  const endDate = new Date(targetDate);
  endDate.setHours(23, 59, 59, 999);

  const since = new Date(endDate);
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  return { since, endDate };
};

const formatDateOnly = (date: Date) => date.toISOString().slice(0, 10);

describe('DashboardService', () => {
  let service: DashboardService;
  const transactionRepo = createRepoMock();
  const statementRepo = createRepoMock();
  const payableRepo = createRepoMock();
  const walletRepo = createRepoMock();
  const receiptRepo = createRepoMock();
  const memberRepo = createRepoMock();
  const workspaceRepo = createRepoMock();
  const auditRepo = createRepoMock();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(
      transactionRepo,
      statementRepo,
      payableRepo,
      receiptRepo,
      memberRepo,
      workspaceRepo,
      auditRepo,
    );
  });

  it('getDashboard returns correct shape with topMerchants and topCategories', async () => {
    const snapshot = {
      totalBalance: 1000,
      income30d: 200,
      expense30d: 50,
      netFlow30d: 150,
      totalPayable: 75,
      totalOverdue: 10,
      currency: 'USD',
    };
    const actions = [{ type: 'statements_pending_review', count: 2, label: '2', href: '/x' }];
    const cashFlow = [{ date: '2026-02-01', income: 100, expense: 40 }];
    const topMerchants = [{ name: 'Kaspi', amount: 50000, count: 10 }];
    const topCategories = [{ id: 'cat-1', name: 'Utilities', amount: 30000, count: 5 }];
    const recentActivity = [
      {
        id: 'a1',
        type: 'statement_upload',
        title: 'Statement',
        description: null,
        amount: null,
        timestamp: new Date('2026-02-01T10:00:00Z').toISOString(),
        href: '/statements/a1',
      },
    ];
    const dataHealth = {
      uncategorizedTransactions: 0,
      statementsWithErrors: 0,
      statementsPendingReview: 0,
      unapprovedCash: 0,
      lastUploadDate: null,
      parsingWarnings: 0,
    };

    jest.spyOn(service as any, 'getSnapshot').mockResolvedValue(snapshot);
    jest.spyOn(service as any, 'getActions').mockResolvedValue(actions);
    jest.spyOn(service as any, 'getCashFlow').mockResolvedValue(cashFlow);
    jest.spyOn(service as any, 'getTopMerchants').mockResolvedValue(topMerchants);
    jest.spyOn(service as any, 'getTopCategories').mockResolvedValue(topCategories);
    jest.spyOn(service as any, 'getRecentActivity').mockResolvedValue(recentActivity);
    jest.spyOn(service as any, 'getMemberRole').mockResolvedValue('admin');
    jest.spyOn(service as any, 'getDataHealth').mockResolvedValue(dataHealth);

    const result = await service.getDashboard('user-1', 'ws-1', '30d');

    expect(result).toEqual({
      snapshot,
      actions,
      cashFlow,
      topMerchants,
      topCategories,
      recentActivity,
      role: 'admin',
      range: '30d',
      dataHealth,
    });
    expect((service as any).getSnapshot).toHaveBeenCalledWith(
      'ws-1',
      expect.any(Date),
      expect.any(Date),
    );
    expect((service as any).getTopMerchants).toHaveBeenCalledWith(
      'ws-1',
      expect.any(Date),
      expect.any(Date),
    );
    expect((service as any).getTopCategories).toHaveBeenCalledWith(
      'ws-1',
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('getDashboard uses 7-day window for range=7d', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-19T12:00:00Z'));

    jest.spyOn(service as any, 'getSnapshot').mockResolvedValue({} as any);
    jest.spyOn(service as any, 'getActions').mockResolvedValue([]);
    jest.spyOn(service as any, 'getCashFlow').mockResolvedValue([]);
    jest.spyOn(service as any, 'getTopMerchants').mockResolvedValue([]);
    jest.spyOn(service as any, 'getTopCategories').mockResolvedValue([]);
    jest.spyOn(service as any, 'getRecentActivity').mockResolvedValue([]);
    jest.spyOn(service as any, 'getMemberRole').mockResolvedValue('member');
    jest.spyOn(service as any, 'getDataHealth').mockResolvedValue({} as any);

    await service.getDashboard('user-1', 'ws-1', '7d');

    const snapshotCall = (service as any).getSnapshot.mock.calls[0];
    const expectedWindow = createExpectedWindow(7, '2026-03-19T12:00:00Z');
    expect(snapshotCall[1]).toEqual(expectedWindow.since);
    expect(snapshotCall[2]).toEqual(expectedWindow.endDate);

    jest.useRealTimers();
  });

  it('getDashboard uses 90-day window for range=90d', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-19T12:00:00Z'));

    jest.spyOn(service as any, 'getSnapshot').mockResolvedValue({} as any);
    jest.spyOn(service as any, 'getActions').mockResolvedValue([]);
    jest.spyOn(service as any, 'getCashFlow').mockResolvedValue([]);
    jest.spyOn(service as any, 'getTopMerchants').mockResolvedValue([]);
    jest.spyOn(service as any, 'getTopCategories').mockResolvedValue([]);
    jest.spyOn(service as any, 'getRecentActivity').mockResolvedValue([]);
    jest.spyOn(service as any, 'getMemberRole').mockResolvedValue('member');
    jest.spyOn(service as any, 'getDataHealth').mockResolvedValue({} as any);

    await service.getDashboard('user-1', 'ws-1', '90d');

    const snapshotCall = (service as any).getSnapshot.mock.calls[0];
    const expectedWindow = createExpectedWindow(90, '2026-03-19T12:00:00Z');
    expect(snapshotCall[1]).toEqual(expectedWindow.since);
    expect(snapshotCall[2]).toEqual(expectedWindow.endDate);

    jest.useRealTimers();
  });

  it('getDashboard auto-shifts to the latest transaction window when current window is empty', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-19T12:00:00Z'));

    const emptySnapshot = {
      totalBalance: 1000,
      income30d: 0,
      expense30d: 0,
      netFlow30d: 0,
      totalPayable: 75,
      totalOverdue: 10,
      unapprovedCash: 0,
      currency: 'USD',
    };
    const shiftedSnapshot = {
      ...emptySnapshot,
      income30d: 200,
      expense30d: 50,
      netFlow30d: 150,
    };
    const latestTransactionDate = new Date('2026-02-10T08:30:00Z');
    const cashFlow = [{ date: '2026-02-10', income: 200, expense: 50 }];
    const topMerchants = [{ name: 'Kaspi', amount: 50000, count: 10 }];
    const topCategories = [{ id: 'cat-1', name: 'Utilities', amount: 30000, count: 5 }];
    const recentActivity: any[] = [];
    const dataHealth = {
      uncategorizedTransactions: 0,
      statementsWithErrors: 0,
      statementsPendingReview: 0,
      unapprovedCash: 0,
      lastUploadDate: null,
      parsingWarnings: 0,
    };

    jest.spyOn(service as any, 'getSnapshot').mockResolvedValueOnce(emptySnapshot).mockResolvedValueOnce(shiftedSnapshot);
    jest.spyOn(service as any, 'getLatestTransactionDate').mockResolvedValue(latestTransactionDate);
    jest.spyOn(service as any, 'getActions').mockResolvedValue([]);
    jest.spyOn(service as any, 'getCashFlow').mockResolvedValue(cashFlow);
    jest.spyOn(service as any, 'getTopMerchants').mockResolvedValue(topMerchants);
    jest.spyOn(service as any, 'getTopCategories').mockResolvedValue(topCategories);
    jest.spyOn(service as any, 'getRecentActivity').mockResolvedValue(recentActivity);
    jest.spyOn(service as any, 'getMemberRole').mockResolvedValue('admin');
    jest.spyOn(service as any, 'getDataHealth').mockResolvedValue(dataHealth);

    const result = await service.getDashboard('user-1', 'ws-1', '30d');

    const requestedWindow = createExpectedWindow(30, '2026-03-19T12:00:00Z');
    const adjustedWindow = createExpectedWindow(30, latestTransactionDate);

    expect((service as any).getSnapshot).toHaveBeenNthCalledWith(
      1,
      'ws-1',
      requestedWindow.since,
      requestedWindow.endDate,
    );
    expect((service as any).getLatestTransactionDate).toHaveBeenCalledWith('ws-1');
    expect((service as any).getSnapshot).toHaveBeenNthCalledWith(
      2,
      'ws-1',
      adjustedWindow.since,
      adjustedWindow.endDate,
    );
    expect((service as any).getCashFlow).toHaveBeenCalledWith(
      'ws-1',
      adjustedWindow.since,
      adjustedWindow.endDate,
      30,
    );
    expect((service as any).getTopMerchants).toHaveBeenCalledWith(
      'ws-1',
      adjustedWindow.since,
      adjustedWindow.endDate,
    );
    expect((service as any).getTopCategories).toHaveBeenCalledWith(
      'ws-1',
      adjustedWindow.since,
      adjustedWindow.endDate,
    );
    expect(result).toMatchObject({
      snapshot: shiftedSnapshot,
      cashFlow,
      topMerchants,
      topCategories,
      effectiveEndDate: formatDateOnly(adjustedWindow.endDate),
      effectiveSince: formatDateOnly(adjustedWindow.since),
    });

    jest.useRealTimers();
  });

  it('getDashboard does not auto-shift when explicit end date is provided', async () => {
    const emptySnapshot = {
      totalBalance: 1000,
      income30d: 0,
      expense30d: 0,
      netFlow30d: 0,
      totalPayable: 75,
      totalOverdue: 10,
      unapprovedCash: 0,
      currency: 'USD',
    };

    jest.spyOn(service as any, 'getSnapshot').mockResolvedValue(emptySnapshot);
    jest.spyOn(service as any, 'getLatestTransactionDate').mockResolvedValue(new Date('2026-02-10T08:30:00Z'));
    jest.spyOn(service as any, 'getActions').mockResolvedValue([]);
    jest.spyOn(service as any, 'getCashFlow').mockResolvedValue([]);
    jest.spyOn(service as any, 'getTopMerchants').mockResolvedValue([]);
    jest.spyOn(service as any, 'getTopCategories').mockResolvedValue([]);
    jest.spyOn(service as any, 'getRecentActivity').mockResolvedValue([]);
    jest.spyOn(service as any, 'getMemberRole').mockResolvedValue('admin');
    jest.spyOn(service as any, 'getDataHealth').mockResolvedValue({} as any);

    const result = await service.getDashboard('user-1', 'ws-1', '30d', '2026-03-01');

    expect((service as any).getSnapshot).toHaveBeenCalledTimes(1);
    expect((service as any).getLatestTransactionDate).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('effectiveEndDate');
    expect(result).not.toHaveProperty('effectiveSince');
  });

  it('getSnapshot calculates totals correctly from transactions, not wallets', async () => {
    // txResult (period income/expense) then balanceResult (all-time balance)
    const txQb = createQueryBuilderMock({ income: '1200', expense: '200', unapprovedCash: '0' });
    const balanceQb = createQueryBuilderMock({ totalBalance: '1500.5' });
    const payableQb = createQueryBuilderMock({ totalPayable: '300', totalOverdue: '50' });

    transactionRepo.createQueryBuilder
      .mockReturnValueOnce(txQb)
      .mockReturnValueOnce(balanceQb);
    payableRepo.createQueryBuilder.mockReturnValue(payableQb);
    workspaceRepo.findOne.mockResolvedValue({ currency: 'USD' });

    const result = await (service as any).getSnapshot('ws-1', new Date('2026-02-01'), new Date('2026-03-01'));

    expect(result).toEqual({
      totalBalance: 1500.5,
      income30d: 1200,
      expense30d: 200,
      netFlow30d: 1000,
      totalPayable: 300,
      totalOverdue: 50,
      unapprovedCash: 0,
      currency: 'USD',
    });
    // walletRepo should NOT be used for balance computation
    expect(walletRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('getSnapshot excludes error and processing statements from period totals', async () => {
    const txQb = createQueryBuilderMock({ income: '1200', expense: '200', unapprovedCash: '0' });
    const balanceQb = createQueryBuilderMock({ totalBalance: '1500.5' });
    const payableQb = createQueryBuilderMock({ totalPayable: '300', totalOverdue: '50' });

    transactionRepo.createQueryBuilder.mockReturnValueOnce(txQb).mockReturnValueOnce(balanceQb);
    payableRepo.createQueryBuilder.mockReturnValue(payableQb);
    workspaceRepo.findOne.mockResolvedValue({ currency: 'USD' });

    await (service as any).getSnapshot('ws-1', new Date('2026-02-01'), new Date('2026-03-01'));

    expect(txQb.andWhere).toHaveBeenCalledWith('s.status NOT IN (:...excludedStatuses)', {
      excludedStatuses: [StatementStatus.ERROR, StatementStatus.PROCESSING],
    });
  });

  it('getSnapshot excludes duplicate transactions from period totals and total balance', async () => {
    const txQb = createQueryBuilderMock({ income: '1200', expense: '200', unapprovedCash: '0' });
    const balanceQb = createQueryBuilderMock({ totalBalance: '1500.5' });
    const payableQb = createQueryBuilderMock({ totalPayable: '300', totalOverdue: '50' });

    transactionRepo.createQueryBuilder.mockReturnValueOnce(txQb).mockReturnValueOnce(balanceQb);
    payableRepo.createQueryBuilder.mockReturnValue(payableQb);
    workspaceRepo.findOne.mockResolvedValue({ currency: 'USD' });

    await (service as any).getSnapshot('ws-1', new Date('2026-02-01'), new Date('2026-03-01'));

    expect(txQb.andWhere).toHaveBeenCalledWith('t.isDuplicate = false');
    expect(balanceQb.andWhere).toHaveBeenCalledWith('t.isDuplicate = false');
  });

  it('getActions returns only non-zero action items', async () => {
    statementRepo.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    payableRepo.count.mockResolvedValueOnce(0);
    const uncategorizedQb = createQueryBuilderMock(3);
    transactionRepo.createQueryBuilder.mockReturnValue(uncategorizedQb);
    receiptRepo.count.mockResolvedValueOnce(1);

    const result = await (service as any).getActions('user-1', 'ws-1');

    const types = result.map((item: any) => item.type);
    expect(types).toEqual([
      'statements_pending_review',
      'transactions_uncategorized',
      'receipts_pending_review',
    ]);
    expect(result).toHaveLength(3);
  });

  it('getCashFlow groups by date for 30d range', async () => {
    const rows = [
      { date: '2026-02-01', income: '100', expense: '50' },
      { date: '2026-02-02', income: '0', expense: '25' },
    ];
    const cashFlowQb = createQueryBuilderMock(rows);
    transactionRepo.createQueryBuilder.mockReturnValue(cashFlowQb);

    const result = await (service as any).getCashFlow(
      'ws-1',
      new Date('2026-02-01'),
      new Date('2026-03-01'),
      30,
    );

    expect(result).toEqual([
      { date: '2026-02-01', income: 100, expense: 50 },
      { date: '2026-02-02', income: 0, expense: 25 },
    ]);
    expect(cashFlowQb.andWhere).toHaveBeenCalledWith('s.status NOT IN (:...excludedStatuses)', {
      excludedStatuses: [StatementStatus.ERROR, StatementStatus.PROCESSING],
    });
    expect(cashFlowQb.andWhere).toHaveBeenCalledWith('t.isDuplicate = false');
  });

  it('getCashFlow groups by week for 90d range', async () => {
    const rows = [
      { date: '2026-05', income: '500', expense: '200' },
      { date: '2026-06', income: '300', expense: '100' },
    ];
    const cashFlowQb = createQueryBuilderMock(rows);
    transactionRepo.createQueryBuilder.mockReturnValue(cashFlowQb);

    const result = await (service as any).getCashFlow(
      'ws-1',
      new Date('2025-11-01'),
      new Date('2026-02-01'),
      90,
    );

    // Verify the query builder was called (weekly grouping used IYYY-IW format)
    expect(cashFlowQb.select).toHaveBeenCalledWith(
      "TO_CHAR(t.transactionDate, 'IYYY-IW')",
      'date',
    );
    expect(result).toHaveLength(2);
  });

  it('getTopMerchants returns top 5 expense merchants sorted by amount', async () => {
    const rows = [
      { name: 'Kaspi', amount: '50000', count: '10' },
      { name: 'Halyk', amount: '30000', count: '5' },
    ];
    const qb = createQueryBuilderMock(rows);
    transactionRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await (service as any).getTopMerchants(
      'ws-1',
      new Date('2026-02-01'),
      new Date('2026-03-01'),
    );

    expect(result).toEqual([
      { name: 'Kaspi', amount: 50000, count: 10 },
      { name: 'Halyk', amount: 30000, count: 5 },
    ]);
    expect(qb.limit).toHaveBeenCalledWith(5);
    expect(qb.andWhere).toHaveBeenCalledWith('s.status NOT IN (:...excludedStatuses)', {
      excludedStatuses: [StatementStatus.ERROR, StatementStatus.PROCESSING],
    });
    expect(qb.andWhere).toHaveBeenCalledWith('t.isDuplicate = false');
  });

  it('getTopCategories returns top 5 categories sorted by amount', async () => {
    const rows = [
      { id: 'cat-1', name: 'Utilities', amount: '40000', count: '8' },
      { id: null, name: 'Uncategorized', amount: '15000', count: '3' },
    ];
    const qb = createQueryBuilderMock(rows);
    transactionRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await (service as any).getTopCategories(
      'ws-1',
      new Date('2026-02-01'),
      new Date('2026-03-01'),
    );

    expect(result).toEqual([
      { id: 'cat-1', name: 'Utilities', amount: 40000, count: 8 },
      { id: null, name: 'Uncategorized', amount: 15000, count: 3 },
    ]);
    expect(qb.limit).toHaveBeenCalledWith(5);
    expect(qb.andWhere).toHaveBeenCalledWith('s.status NOT IN (:...excludedStatuses)', {
      excludedStatuses: [StatementStatus.ERROR, StatementStatus.PROCESSING],
    });
    expect(qb.andWhere).toHaveBeenCalledWith('t.isDuplicate = false');
  });

  it('getLatestTransactionDate returns the latest valid transaction date', async () => {
    const latestTransactionDate = new Date('2026-02-10T08:30:00Z');
    const qb = createQueryBuilderMock({ latestTransactionDate });
    transactionRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await (service as any).getLatestTransactionDate('ws-1');

    expect(result).toEqual(latestTransactionDate);
    expect(qb.andWhere).toHaveBeenCalledWith('s.deletedAt IS NULL');
    expect(qb.andWhere).toHaveBeenCalledWith('s.status NOT IN (:...excludedStatuses)', {
      excludedStatuses: [StatementStatus.ERROR, StatementStatus.PROCESSING],
    });
  });

  it('getRecentActivity uses AuditEvent when available', async () => {
    const auditEvents = [
      {
        id: 'evt-1',
        entityType: EntityType.STATEMENT,
        entityId: 'stmt-1',
        action: AuditAction.CREATE,
        actorLabel: 'John',
        actorType: ActorType.USER,
        meta: { fileName: 'Feb_2026.pdf' },
        createdAt: new Date('2026-02-10T10:00:00Z'),
      },
      {
        id: 'evt-2',
        entityType: EntityType.TRANSACTION,
        entityId: 'tx-1',
        action: AuditAction.UPDATE,
        actorLabel: 'System',
        actorType: ActorType.SYSTEM,
        meta: { counterpartyName: 'Kaspi', amount: -5000 },
        createdAt: new Date('2026-02-09T08:00:00Z'),
      },
    ];

    auditRepo.find.mockResolvedValue(auditEvents);

    const result = await (service as any).getRecentActivity('ws-1');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'evt-1',
      type: 'statement_upload',
      title: 'Feb_2026.pdf',
      href: '/statements/stmt-1/view',
    });
    expect(result[1]).toMatchObject({
      id: 'evt-2',
      type: 'transaction',
      title: 'Kaspi',
    });
  });

  it('getRecentActivity falls back to statements+transactions when no audit events', async () => {
    auditRepo.find.mockResolvedValue([]);

    statementRepo.find.mockResolvedValue([
      {
        id: 's1',
        fileName: 'Feb statement',
        status: StatementStatus.UPLOADED,
        totalTransactions: 3,
        createdAt: new Date('2026-02-05T09:00:00Z'),
      },
    ]);

    const recentTx = [
      {
        id: 't1',
        counterpartyName: 'Acme',
        debit: 50,
        credit: null,
        transactionType: TransactionType.EXPENSE,
        updatedAt: new Date('2026-02-03T10:00:00Z'),
        category: { name: 'Office' },
      },
    ];
    const txQb = createQueryBuilderMock(recentTx);
    transactionRepo.createQueryBuilder.mockReturnValue(txQb);

    const result = await (service as any).getRecentActivity('ws-1');

    expect(result.length).toBeGreaterThan(0);
    const ids = result.map((a: any) => a.id);
    expect(ids).toContain('s1');
    expect(ids).toContain('t1');
  });

  it('getMemberRole returns correct role', async () => {
    memberRepo.findOne.mockResolvedValue({ role: WorkspaceRole.ADMIN });
    const adminRole = await (service as any).getMemberRole('user-1', 'ws-1');
    expect(adminRole).toBe('admin');

    memberRepo.findOne.mockResolvedValue(null);
    const defaultRole = await (service as any).getMemberRole('user-1', 'ws-1');
    expect(defaultRole).toBe('member');
  });

  it('getTrends auto-shifts to the latest transaction window when current window has no rows', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-19T12:00:00Z'));

    jest.spyOn(service as any, 'getLatestTransactionDate').mockResolvedValue(new Date('2026-02-10T08:30:00Z'));

    transactionRepo.createQueryBuilder
      .mockReturnValueOnce(createQueryBuilderMock([]))
      .mockReturnValueOnce(createQueryBuilderMock([]))
      .mockReturnValueOnce(createQueryBuilderMock([]))
      .mockReturnValueOnce(createQueryBuilderMock({ income: '0', expense: '0', rows: '0' }))
      .mockReturnValueOnce(createQueryBuilderMock([{ date: '2026-02-10', income: '100', expense: '40' }]))
      .mockReturnValueOnce(createQueryBuilderMock([{ name: 'Utilities', amount: '40', count: '1' }]))
      .mockReturnValueOnce(createQueryBuilderMock([{ name: 'Client A', amount: '100', count: '1' }]))
      .mockReturnValueOnce(createQueryBuilderMock({ income: '100', expense: '40', rows: '2' }));

    const result = await service.getTrends('ws-1', 30);
    const adjustedWindow = createExpectedWindow(30, '2026-02-10T08:30:00Z');

    expect((service as any).getLatestTransactionDate).toHaveBeenCalledWith('ws-1');
    expect(result).toEqual({
      dailyTrend: [{ date: '2026-02-10', income: 100, expense: 40 }],
      categories: [{ name: 'Utilities', amount: 40, count: 1 }],
      counterparties: [{ name: 'Client A', amount: 100, count: 1 }],
      sources: {
        statements: {
          income: 100,
          expense: 40,
          rows: 2,
        },
      },
      effectiveEndDate: formatDateOnly(adjustedWindow.endDate),
      effectiveSince: formatDateOnly(adjustedWindow.since),
    });

    jest.useRealTimers();
  });

  it('getTrendData excludes duplicate transactions from all aggregate queries', async () => {
    const dailyQb = createQueryBuilderMock([]);
    const categoryQb = createQueryBuilderMock([]);
    const counterpartyQb = createQueryBuilderMock([]);
    const sourceQb = createQueryBuilderMock({ income: '0', expense: '0', rows: '0' });

    transactionRepo.createQueryBuilder
      .mockReturnValueOnce(dailyQb)
      .mockReturnValueOnce(categoryQb)
      .mockReturnValueOnce(counterpartyQb)
      .mockReturnValueOnce(sourceQb);

    await (service as any).getTrendData('ws-1', new Date('2026-02-01'), new Date('2026-03-01'), 30);

    expect(dailyQb.andWhere).toHaveBeenCalledWith('t.isDuplicate = false');
    expect(categoryQb.andWhere).toHaveBeenCalledWith('t.isDuplicate = false');
    expect(counterpartyQb.andWhere).toHaveBeenCalledWith('t.isDuplicate = false');
    expect(sourceQb.andWhere).toHaveBeenCalledWith('t.isDuplicate = false');
  });

  it('getDataHealth counts pending review and parsing warnings from actual statement conditions', async () => {
    const warningsQb = createQueryBuilderMock(4);

    transactionRepo.createQueryBuilder
      .mockReturnValueOnce(createQueryBuilderMock(2))
      .mockReturnValueOnce(createQueryBuilderMock({ unapprovedCash: '0' }));
    statementRepo.count.mockResolvedValueOnce(1).mockResolvedValueOnce(3);
    statementRepo.findOne.mockResolvedValue({ createdAt: new Date('2026-03-17T00:00:00Z') });
    statementRepo.createQueryBuilder.mockReturnValue(warningsQb);

    const result = await (service as any).getDataHealth('ws-1');

    expect(result).toMatchObject({
      uncategorizedTransactions: 2,
      statementsWithErrors: 1,
      statementsPendingReview: 3,
      parsingWarnings: 4,
    });
    expect(statementRepo.count).toHaveBeenNthCalledWith(2, {
      where: {
        workspaceId: 'ws-1',
        status: In([StatementStatus.UPLOADED, StatementStatus.PROCESSING, StatementStatus.ERROR]),
        deletedAt: IsNull(),
      },
    });
    expect(warningsQb.andWhere).toHaveBeenCalledWith(
      "jsonb_array_length(COALESCE(s.parsing_details->'warnings', '[]'::jsonb)) > 0",
    );
  });
});
