import { DashboardService } from '../../../../src/modules/dashboard/dashboard.service';
import { AuditAction, ActorType, EntityType } from '../../../../src/entities/audit-event.entity';
import { StatementStatus } from '../../../../src/entities/statement.entity';
import { TransactionType } from '../../../../src/entities/transaction.entity';
import { WorkspaceRole } from '../../../../src/entities/workspace-member.entity';

const createRepoMock = () => ({
  count: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
} as any);

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
      walletRepo,
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

    jest.spyOn(service as any, 'getSnapshot').mockResolvedValue(snapshot);
    jest.spyOn(service as any, 'getActions').mockResolvedValue(actions);
    jest.spyOn(service as any, 'getCashFlow').mockResolvedValue(cashFlow);
    jest.spyOn(service as any, 'getTopMerchants').mockResolvedValue(topMerchants);
    jest.spyOn(service as any, 'getTopCategories').mockResolvedValue(topCategories);
    jest.spyOn(service as any, 'getRecentActivity').mockResolvedValue(recentActivity);
    jest.spyOn(service as any, 'getMemberRole').mockResolvedValue('admin');

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
    });
    expect((service as any).getSnapshot).toHaveBeenCalledWith('ws-1', expect.any(Date));
    expect((service as any).getTopMerchants).toHaveBeenCalledWith('ws-1', expect.any(Date));
    expect((service as any).getTopCategories).toHaveBeenCalledWith('ws-1', expect.any(Date));
  });

  it('getDashboard uses 7-day window for range=7d', async () => {
    jest.spyOn(service as any, 'getSnapshot').mockResolvedValue({} as any);
    jest.spyOn(service as any, 'getActions').mockResolvedValue([]);
    jest.spyOn(service as any, 'getCashFlow').mockResolvedValue([]);
    jest.spyOn(service as any, 'getTopMerchants').mockResolvedValue([]);
    jest.spyOn(service as any, 'getTopCategories').mockResolvedValue([]);
    jest.spyOn(service as any, 'getRecentActivity').mockResolvedValue([]);
    jest.spyOn(service as any, 'getMemberRole').mockResolvedValue('member');

    const beforeCall = new Date();
    await service.getDashboard('user-1', 'ws-1', '7d');

    const snapshotCall = (service as any).getSnapshot.mock.calls[0];
    const since: Date = snapshotCall[1];
    const diffDays = Math.round((beforeCall.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it('getDashboard uses 90-day window for range=90d', async () => {
    jest.spyOn(service as any, 'getSnapshot').mockResolvedValue({} as any);
    jest.spyOn(service as any, 'getActions').mockResolvedValue([]);
    jest.spyOn(service as any, 'getCashFlow').mockResolvedValue([]);
    jest.spyOn(service as any, 'getTopMerchants').mockResolvedValue([]);
    jest.spyOn(service as any, 'getTopCategories').mockResolvedValue([]);
    jest.spyOn(service as any, 'getRecentActivity').mockResolvedValue([]);
    jest.spyOn(service as any, 'getMemberRole').mockResolvedValue('member');

    const beforeCall = new Date();
    await service.getDashboard('user-1', 'ws-1', '90d');

    const snapshotCall = (service as any).getSnapshot.mock.calls[0];
    const since: Date = snapshotCall[1];
    const diffDays = Math.round((beforeCall.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);
  });

  it('getSnapshot calculates totals correctly', async () => {
    const walletQb = createQueryBuilderMock({ totalBalance: '1500.5' });
    const txQb = createQueryBuilderMock({ income: '1200', expense: '200' });
    const payableQb = createQueryBuilderMock({ totalPayable: '300', totalOverdue: '50' });

    walletRepo.createQueryBuilder.mockReturnValue(walletQb);
    transactionRepo.createQueryBuilder.mockReturnValue(txQb);
    payableRepo.createQueryBuilder.mockReturnValue(payableQb);
    workspaceRepo.findOne.mockResolvedValue({ currency: 'USD' });

    const result = await (service as any).getSnapshot('ws-1', new Date('2026-02-01'));

    expect(result).toEqual({
      totalBalance: 1500.5,
      income30d: 1200,
      expense30d: 200,
      netFlow30d: 1000,
      totalPayable: 300,
      totalOverdue: 50,
      currency: 'USD',
    });
  });

  it('getActions returns only non-zero action items', async () => {
    statementRepo.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);
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

    const result = await (service as any).getCashFlow('ws-1', new Date('2026-02-01'), 30);

    expect(result).toEqual([
      { date: '2026-02-01', income: 100, expense: 50 },
      { date: '2026-02-02', income: 0, expense: 25 },
    ]);
  });

  it('getCashFlow groups by week for 90d range', async () => {
    const rows = [
      { date: '2026-05', income: '500', expense: '200' },
      { date: '2026-06', income: '300', expense: '100' },
    ];
    const cashFlowQb = createQueryBuilderMock(rows);
    transactionRepo.createQueryBuilder.mockReturnValue(cashFlowQb);

    const result = await (service as any).getCashFlow('ws-1', new Date('2025-11-01'), 90);

    // Verify the query builder was called (weekly grouping used IYYY-IW format)
    expect(cashFlowQb.select).toHaveBeenCalledWith(
      expect.stringContaining('IYYY-IW'),
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

    const result = await (service as any).getTopMerchants('ws-1', new Date('2026-02-01'));

    expect(result).toEqual([
      { name: 'Kaspi', amount: 50000, count: 10 },
      { name: 'Halyk', amount: 30000, count: 5 },
    ]);
    expect(qb.limit).toHaveBeenCalledWith(5);
  });

  it('getTopCategories returns top 5 categories sorted by amount', async () => {
    const rows = [
      { id: 'cat-1', name: 'Utilities', amount: '40000', count: '8' },
      { id: null, name: 'Uncategorized', amount: '15000', count: '3' },
    ];
    const qb = createQueryBuilderMock(rows);
    transactionRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await (service as any).getTopCategories('ws-1', new Date('2026-02-01'));

    expect(result).toEqual([
      { id: 'cat-1', name: 'Utilities', amount: 40000, count: 8 },
      { id: null, name: 'Uncategorized', amount: 15000, count: 3 },
    ]);
    expect(qb.limit).toHaveBeenCalledWith(5);
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
});
