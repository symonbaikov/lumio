import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { In, IsNull, type Repository } from 'typeorm';
import { AuditEvent, EntityType } from '../../entities/audit-event.entity';
import { Payable, PayableStatus } from '../../entities/payable.entity';
import { Receipt, ReceiptStatus } from '../../entities/receipt.entity';
import { Statement, StatementStatus } from '../../entities/statement.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { Workspace } from '../../entities/workspace.entity';
import type {
  DashboardActionItem,
  DashboardCashFlowPoint,
  DashboardDataHealth,
  DashboardFinancialSnapshot,
  DashboardRecentActivity,
  DashboardResponse,
  DashboardTopCategory,
  DashboardTopMerchant,
} from './interfaces/dashboard-response.interface';
import type { DashboardTrendsResponse } from './interfaces/dashboard-trends.interface';

type RawTrendAmountRow = { currency: string; income: string; expense: string };
type RawTrendCategoryRow = { name: string; currency: string; amount: string; count: string };
type RawTrendCounterpartyRow = { name: string; currency: string; amount: string; count: string };

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Statement)
    private readonly statementRepo: Repository<Statement>,
    @InjectRepository(Payable)
    private readonly payableRepo: Repository<Payable>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async getDashboard(
    userId: string,
    workspaceId: string,
    range: '7d' | '30d' | '90d' = '30d',
    endDateParam?: string,
  ): Promise<DashboardResponse> {
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

    const requestedWindow = this.getWindowBounds(
      days,
      endDateParam ? new Date(endDateParam) : new Date(),
    );

    const [initialSnapshot, actions, recentActivity, memberRole, dataHealth] = await Promise.all([
      this.getSnapshot(workspaceId, requestedWindow.since, requestedWindow.endDate),
      this.getActions(userId, workspaceId),
      this.getRecentActivity(workspaceId),
      this.getMemberRole(userId, workspaceId),
      this.getDataHealth(workspaceId),
    ]);

    let snapshot = initialSnapshot;
    let effectiveWindow = requestedWindow;
    let autoShifted = false;

    if (!endDateParam && snapshot.income30d === 0 && snapshot.expense30d === 0) {
      const latestTransactionDate = await this.getLatestTransactionDate(workspaceId);

      if (latestTransactionDate) {
        effectiveWindow = this.getWindowBounds(days, latestTransactionDate);
        snapshot = await this.getSnapshot(
          workspaceId,
          effectiveWindow.since,
          effectiveWindow.endDate,
        );
        autoShifted = true;
      }
    }

    const [cashFlow, topMerchants, topCategories] = await Promise.all([
      this.getCashFlow(workspaceId, effectiveWindow.since, effectiveWindow.endDate, days),
      this.getTopMerchants(workspaceId, effectiveWindow.since, effectiveWindow.endDate),
      this.getTopCategories(workspaceId, effectiveWindow.since, effectiveWindow.endDate),
    ]);

    const response: DashboardResponse = {
      snapshot,
      actions,
      cashFlow,
      topMerchants,
      topCategories,
      recentActivity,
      role: memberRole,
      range,
      dataHealth,
    };

    if (autoShifted) {
      response.effectiveEndDate = this.formatDateOnly(effectiveWindow.endDate);
      response.effectiveSince = this.formatDateOnly(effectiveWindow.since);
    }

    return response;
  }

  private async getSnapshot(
    workspaceId: string,
    since: Date,
    endDate: Date,
  ): Promise<DashboardFinancialSnapshot> {
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      select: ['currency'],
    });
    const targetCurrency = this.normalizeCurrency(workspace?.currency);

    // Group income/expense by currency so we can convert each group
    const txQuery = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoin('t.statement', 's');
    this.applyWorkspaceStatementFilters(txQuery, workspaceId, true);

    const txRows = await txQuery
      .select([
        't.currency AS currency',
        'COALESCE(SUM(CASE WHEN t.transactionType = :income THEN t.credit ELSE 0 END), 0) AS income',
        'COALESCE(SUM(CASE WHEN t.transactionType = :expense THEN t.debit ELSE 0 END), 0) AS expense',
        'COALESCE(SUM(CASE WHEN s.status IN (:...unapprovedStatuses) THEN (CASE WHEN t.transactionType = :income THEN t.credit ELSE -t.debit END) ELSE 0 END), 0) AS "unapprovedCash"',
      ])
      .andWhere('t.transactionDate BETWEEN :since AND :endDate', { since, endDate })
      .setParameter('income', TransactionType.INCOME)
      .setParameter('expense', TransactionType.EXPENSE)
      .setParameter('unapprovedStatuses', [
        StatementStatus.UPLOADED,
        StatementStatus.PARSED,
        StatementStatus.VALIDATED,
      ])
      .groupBy('t.currency')
      .getRawMany<{ currency: string; income: string; expense: string; unapprovedCash: string }>();

    let income = 0;
    let expense = 0;
    let unapprovedCash = 0;
    for (const row of txRows) {
      income += await this.convertDashboardAmount(row.income, row.currency, targetCurrency);
      expense += await this.convertDashboardAmount(row.expense, row.currency, targetCurrency);
      unapprovedCash += await this.convertDashboardAmount(row.unapprovedCash, row.currency, targetCurrency);
    }

    // All-time balance grouped by currency
    const balanceQuery = this.transactionRepo.createQueryBuilder('t').leftJoin('t.statement', 's');
    this.applyWorkspaceStatementFilters(balanceQuery, workspaceId, true);

    const balanceRows = await balanceQuery
      .select([
        't.currency AS currency',
        `COALESCE(SUM(CASE WHEN t.transactionType = :balIncome THEN t.credit WHEN t.transactionType = :balExpense THEN -t.debit ELSE 0 END), 0) AS "balance"`,
      ])
      .setParameter('balIncome', TransactionType.INCOME)
      .setParameter('balExpense', TransactionType.EXPENSE)
      .groupBy('t.currency')
      .getRawMany<{ currency: string; balance: string }>();

    let totalBalance = 0;
    for (const row of balanceRows) {
      totalBalance += await this.convertDashboardAmount(row.balance, row.currency, targetCurrency);
    }

    const payableRows = await this.payableRepo
      .createQueryBuilder('p')
      .select([
        'p.currency AS currency',
        'COALESCE(SUM(CASE WHEN p.status IN (:...payStatuses) THEN p.amount ELSE 0 END), 0) AS "totalPayable"',
        'COALESCE(SUM(CASE WHEN p.status = :overdue THEN p.amount ELSE 0 END), 0) AS "totalOverdue"',
      ])
      .where('p.workspaceId = :workspaceId', { workspaceId })
      .andWhere('p.deletedAt IS NULL')
      .setParameter('payStatuses', [PayableStatus.TO_PAY, PayableStatus.SCHEDULED])
      .setParameter('overdue', PayableStatus.OVERDUE)
      .groupBy('p.currency')
      .getRawMany<{ currency: string; totalPayable: string; totalOverdue: string }>();

    let totalPayable = 0;
    let totalOverdue = 0;
    for (const row of payableRows) {
      totalPayable += await this.convertDashboardAmount(row.totalPayable, row.currency, targetCurrency);
      totalOverdue += await this.convertDashboardAmount(row.totalOverdue, row.currency, targetCurrency);
    }

    return {
      totalBalance,
      income30d: income,
      expense30d: expense,
      netFlow30d: income - expense,
      totalPayable,
      totalOverdue,
      unapprovedCash,
      currency: targetCurrency,
    };
  }

  private normalizeCurrency(currency: string | null | undefined): string {
    const normalized = String(currency || '').trim().toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) ? normalized : 'KZT';
  }

  private async convertDashboardAmount(
    amount: string | number | null | undefined,
    sourceCurrency: string | null | undefined,
    targetCurrency: string,
  ): Promise<number> {
    const value = typeof amount === 'number' ? amount : Number.parseFloat(amount ?? '');
    if (!Number.isFinite(value) || value === 0) {
      return 0;
    }
    const source = this.normalizeCurrency(sourceCurrency);
    if (source === targetCurrency) {
      return value;
    }
    const rate = await this.exchangeRatesService.getRate(source, targetCurrency);
    return value * rate;
  }

  private async getWorkspaceCurrency(workspaceId: string): Promise<string> {
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      select: ['currency'],
    });
    return this.normalizeCurrency(workspace?.currency);
  }

  private async getActions(userId: string, workspaceId: string): Promise<DashboardActionItem[]> {
    const actions: DashboardActionItem[] = [];

    const pendingSubmit = await this.statementRepo.count({
      where: {
        workspaceId,
        status: StatementStatus.UPLOADED,
        deletedAt: IsNull(),
      },
    });

    if (pendingSubmit > 0) {
      actions.push({
        type: 'statements_pending_submit',
        count: pendingSubmit,
        label: `${pendingSubmit} statement${pendingSubmit > 1 ? 's' : ''} pending submit`,
        href: '/statements/submit',
      });
    }

    const pendingReview = await this.statementRepo.count({
      where: {
        workspaceId,
        status: In([StatementStatus.PARSED, StatementStatus.VALIDATED]),
        deletedAt: IsNull(),
      },
    });

    if (pendingReview > 0) {
      actions.push({
        type: 'statements_pending_review',
        count: pendingReview,
        label: `${pendingReview} statement${pendingReview > 1 ? 's' : ''} need review`,
        href: '/statements/approve',
      });
    }

    const overduePayments = await this.payableRepo.count({
      where: {
        workspaceId,
        status: PayableStatus.OVERDUE,
        deletedAt: IsNull(),
      },
    });

    if (overduePayments > 0) {
      actions.push({
        type: 'payments_overdue',
        count: overduePayments,
        label: `${overduePayments} payment${overduePayments > 1 ? 's' : ''} overdue`,
        href: '/statements/pay?status=overdue',
      });
    }

    const uncategorized = await this.transactionRepo
      .createQueryBuilder('t')
      .leftJoin('t.statement', 's');
    this.applyWorkspaceStatementFilters(uncategorized, workspaceId, true);
    const uncategorizedCount = await uncategorized
      .andWhere('t.categoryId IS NULL')
      .getCount();

    if (uncategorizedCount > 0) {
      actions.push({
        type: 'transactions_uncategorized',
        count: uncategorizedCount,
        label: `${uncategorizedCount} transaction${uncategorizedCount > 1 ? 's' : ''} uncategorized`,
        href: '/statements?missingCategory=true',
      });
    }

    const pendingReceipts = await this.receiptRepo.count({
      where: {
        workspaceId,
        status: In([ReceiptStatus.NEW, ReceiptStatus.NEEDS_REVIEW]),
        isDuplicate: false,
      },
    });

    if (pendingReceipts > 0) {
      actions.push({
        type: 'receipts_pending_review',
        count: pendingReceipts,
        label: `${pendingReceipts} receipt${pendingReceipts > 1 ? 's' : ''} need review`,
        href: '/statements/submit',
      });
    }

    return actions;
  }

  private async getCashFlow(
    workspaceId: string,
    since: Date,
    endDate: Date,
    days: number,
  ): Promise<DashboardCashFlowPoint[]> {
    const groupFormat = this.getTransactionGroupFormat(days);
    const targetCurrency = await this.getWorkspaceCurrency(workspaceId);

    const query = this.transactionRepo.createQueryBuilder('t').leftJoin('t.statement', 's');

    this.applyActiveStatementTransactionFilters(query, workspaceId, since, endDate);

    const result = await query
      .select(`TO_CHAR(t.transactionDate, ${groupFormat})`, 'date')
      .addSelect('t.currency', 'currency')
      .addSelect(
        'COALESCE(SUM(CASE WHEN t.transactionType = :income THEN t.credit ELSE 0 END), 0)',
        'income',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN t.transactionType = :expense THEN t.debit ELSE 0 END), 0)',
        'expense',
      )
      .groupBy(`TO_CHAR(t.transactionDate, ${groupFormat})`)
      .addGroupBy('t.currency')
      .orderBy(`TO_CHAR(t.transactionDate, ${groupFormat})`, 'ASC')
      .setParameter('income', TransactionType.INCOME)
      .setParameter('expense', TransactionType.EXPENSE)
      .getRawMany<{ date: string; currency: string; income: string; expense: string }>();

    const points = new Map<string, DashboardCashFlowPoint>();
    for (const row of result) {
      const point = points.get(row.date) ?? { date: row.date, income: 0, expense: 0 };
      point.income += await this.convertDashboardAmount(row.income, row.currency, targetCurrency);
      point.expense += await this.convertDashboardAmount(row.expense, row.currency, targetCurrency);
      points.set(row.date, point);
    }

    return this.fillCashFlowBuckets(Array.from(points.values()), since, endDate, days);
  }

  private async getTopMerchants(
    workspaceId: string,
    since: Date,
    endDate: Date,
  ): Promise<DashboardTopMerchant[]> {
    const targetCurrency = await this.getWorkspaceCurrency(workspaceId);
    const query = this.transactionRepo.createQueryBuilder('t').leftJoin('t.statement', 's');

    this.applyActiveStatementTransactionFilters(query, workspaceId, since, endDate);

    const result = await query
      .select('t.counterpartyName', 'name')
      .addSelect('t.currency', 'currency')
      .addSelect('COALESCE(SUM(t.debit), 0)', 'amount')
      .addSelect('COUNT(t.id)', 'count')
      .andWhere('t.transactionType = :expense', { expense: TransactionType.EXPENSE })
      .andWhere('t.counterpartyName IS NOT NULL')
      .andWhere("t.counterpartyName != ''")
      .groupBy('t.counterpartyName')
      .addGroupBy('t.currency')
      .orderBy('amount', 'DESC')
      .getRawMany<{ name: string; currency: string; amount: string; count: string }>();

    const rows = new Map<string, DashboardTopMerchant>();
    for (const row of result) {
      const key = row.name;
      const existing = rows.get(key) ?? { name: key, amount: 0, count: 0 };
      existing.amount += await this.convertDashboardAmount(row.amount, row.currency, targetCurrency);
      existing.count += Number.parseInt(row.count, 10) || 0;
      rows.set(key, existing);
    }

    return Array.from(rows.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }

  private async getTopCategories(
    workspaceId: string,
    since: Date,
    endDate: Date,
  ): Promise<DashboardTopCategory[]> {
    const targetCurrency = await this.getWorkspaceCurrency(workspaceId);
    const query = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoin('t.statement', 's')
      .leftJoin('t.category', 'c');

    this.applyActiveStatementTransactionFilters(query, workspaceId, since, endDate);

    const result = await query
      .select('c.id', 'id')
      .addSelect("COALESCE(c.name, 'Uncategorized')", 'name')
      .addSelect('t.currency', 'currency')
      .addSelect('COALESCE(SUM(t.debit), 0)', 'amount')
      .addSelect('COUNT(t.id)', 'count')
      .andWhere('t.transactionType = :expense', { expense: TransactionType.EXPENSE })
      .groupBy('c.id')
      .addGroupBy('c.name')
      .addGroupBy('t.currency')
      .orderBy('amount', 'DESC')
      .getRawMany<{ id: string | null; name: string; currency: string; amount: string; count: string }>();

    const rows = new Map<string, DashboardTopCategory>();
    for (const row of result) {
      const key = row.id || row.name;
      const existing = rows.get(key) ?? { id: row.id || null, name: row.name, amount: 0, count: 0 };
      existing.amount += await this.convertDashboardAmount(row.amount, row.currency, targetCurrency);
      existing.count += Number.parseInt(row.count, 10) || 0;
      rows.set(key, existing);
    }

    return Array.from(rows.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }

  private async getRecentActivity(workspaceId: string): Promise<DashboardRecentActivity[]> {
    const auditEvents = await this.auditRepo.find({
      where: {
        workspaceId,
        entityType: In([
          EntityType.STATEMENT,
          EntityType.TRANSACTION,
          EntityType.PAYABLE,
          EntityType.CATEGORY,
        ]),
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Fallback to statement/transaction query if no audit events yet
    if (auditEvents.length === 0) {
      return this.getRecentActivityFallback(workspaceId);
    }

    return auditEvents.map(event => {
      let type: DashboardRecentActivity['type'] = 'transaction';
      let href = '/statements';

      if (event.entityType === EntityType.STATEMENT) {
        type = 'statement_upload';
        href = `/statements/${event.entityId}/view`;
      } else if (event.entityType === EntityType.PAYABLE) {
        type = 'payment';
        href = '/statements/pay';
      } else if (event.entityType === EntityType.CATEGORY) {
        type = 'categorization';
        href = '/statements';
      }

      const meta = event.meta as Record<string, unknown> | null;

      return {
        id: event.id,
        entityId: event.entityId,
        type,
        title:
          (meta?.fileName as string) ||
          (meta?.counterpartyName as string) ||
          (meta?.name as string) ||
          event.entityId,
        description: `${event.action} · ${event.actorLabel}`,
        amount: (meta?.amount as number) ?? null,
        timestamp: event.createdAt.toISOString(),
        href,
      };
    });
  }

  private async getRecentActivityFallback(workspaceId: string): Promise<DashboardRecentActivity[]> {
    const recentStatements = await this.statementRepo.find({
      where: { workspaceId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 3,
      select: ['id', 'fileName', 'status', 'totalTransactions', 'createdAt'],
    });

    const recentTransactions = await this.transactionRepo
      .createQueryBuilder('t')
      .leftJoin('t.statement', 's')
      .leftJoinAndSelect('t.category', 'c')
      .select([
        't.id',
        't.counterpartyName',
        't.debit',
        't.credit',
        't.transactionType',
        't.updatedAt',
        'c.id',
        'c.name',
      ])
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('(s.id IS NULL OR s.deletedAt IS NULL)')
      .andWhere('t.isDuplicate = false')
      .andWhere('(s.id IS NULL OR s.status NOT IN (:...excludedStatuses))', {
        excludedStatuses: [StatementStatus.ERROR, StatementStatus.PROCESSING],
      })
      .orderBy('t.updatedAt', 'DESC')
      .take(5)
      .getMany();

    const activities: DashboardRecentActivity[] = [];

    for (const stmt of recentStatements) {
      activities.push({
        id: stmt.id,
        entityId: stmt.id,
        type: 'statement_upload',
        title: stmt.fileName,
        description: `${stmt.totalTransactions} transactions · ${stmt.status}`,
        amount: null,
        timestamp: stmt.createdAt.toISOString(),
        href: `/statements/${stmt.id}/view`,
      });
    }

    for (const tx of recentTransactions) {
      const credit = Number(tx.credit ?? 0);
      const debit = Number(tx.debit ?? 0);
      const amount = tx.transactionType === TransactionType.INCOME ? credit : -debit;

      activities.push({
        id: tx.id,
        type: tx.category ? 'categorization' : 'transaction',
        title: tx.counterpartyName || 'Unknown',
        description: tx.category?.name || null,
        amount,
        timestamp: tx.updatedAt.toISOString(),
        href: '/statements',
      });
    }

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }

  private async getMemberRole(
    userId: string,
    workspaceId: string,
  ): Promise<'owner' | 'admin' | 'member' | 'viewer'> {
    const member = await this.memberRepo.findOne({
      where: { userId, workspaceId },
      select: ['role'],
    });

    return (member?.role as 'owner' | 'admin' | 'member' | 'viewer') || 'member';
  }

  private async getDataHealth(workspaceId: string): Promise<DashboardDataHealth> {
    const targetCurrency = await this.getWorkspaceCurrency(workspaceId);
    const [
      uncategorizedTransactions,
      statementsWithErrors,
      statementsPendingReview,
      statementsPendingSubmit,
      receiptsPendingReview,
      parsingWarnings,
      latestStatement,
      unapprovedCashResult,
    ] = await Promise.all([
      // uncategorized transactions (non-duplicate)
      this.countUncategorizedTransactions(workspaceId),
      // statements with errors
      this.statementRepo.count({
        where: { workspaceId, status: StatementStatus.ERROR, deletedAt: IsNull() },
      }),
      // statements pending review: parsed or validated
      this.statementRepo.count({
        where: {
          workspaceId,
          status: In([StatementStatus.PARSED, StatementStatus.VALIDATED]),
          deletedAt: IsNull(),
        },
      }),
      // statements pending submit: uploaded but not submitted yet
      this.statementRepo.count({
        where: {
          workspaceId,
          status: StatementStatus.UPLOADED,
          deletedAt: IsNull(),
        },
      }),
      // receipts pending review
      this.receiptRepo.count({
        where: {
          workspaceId,
          status: In([ReceiptStatus.NEW, ReceiptStatus.NEEDS_REVIEW]),
          isDuplicate: false,
        },
      }),
      // parsing warnings: actual warnings captured in parsing details
      this.statementRepo
        .createQueryBuilder('s')
        .where('s.workspaceId = :workspaceId', { workspaceId })
        .andWhere('s.deletedAt IS NULL')
        .andWhere("jsonb_array_length(COALESCE(s.parsing_details->'warnings', '[]'::jsonb)) > 0")
        .getCount(),
      // latest statement upload date
      this.statementRepo.findOne({
        where: { workspaceId, deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
        select: ['createdAt'],
      }),
      // unapproved cash
      this.transactionRepo
        .createQueryBuilder('t')
        .innerJoin('t.statement', 's')
        .select(
          't.currency',
          'currency',
        )
        .addSelect(
          'COALESCE(SUM(CASE WHEN t.transactionType = :income THEN t.credit ELSE -t.debit END), 0)',
          'unapprovedCash',
        )
        .where('s.workspaceId = :workspaceId', { workspaceId })
        .andWhere('s.status IN (:...unapprovedStatuses)', {
          unapprovedStatuses: [
            StatementStatus.UPLOADED,
            StatementStatus.PARSED,
            StatementStatus.VALIDATED,
          ],
        })
        .andWhere('s.deletedAt IS NULL')
        .andWhere('t.isDuplicate = false')
        .setParameter('income', TransactionType.INCOME)
        .groupBy('t.currency')
        .getRawMany<{ currency: string; unapprovedCash: string }>(),
    ]);

    const unapprovedCashRows = Array.isArray(unapprovedCashResult)
      ? unapprovedCashResult
      : unapprovedCashResult
        ? [unapprovedCashResult]
        : [];
    let unapprovedCash = 0;
    for (const row of unapprovedCashRows) {
      unapprovedCash += await this.convertDashboardAmount(
        row.unapprovedCash,
        row.currency,
        targetCurrency,
      );
    }

    return {
      uncategorizedTransactions,
      statementsWithErrors,
      statementsPendingReview,
      statementsPendingSubmit,
      receiptsPendingReview,
      unapprovedCash,
      lastUploadDate: latestStatement?.createdAt?.toISOString() ?? null,
      parsingWarnings,
    };
  }

  async getTrends(workspaceId: string, days = 30): Promise<DashboardTrendsResponse> {
    const targetCurrency = await this.getWorkspaceCurrency(workspaceId);
    const requestedWindow = this.getWindowBounds(days, new Date());
    let effectiveWindow = requestedWindow;
    let trendData = await this.getTrendData(
      workspaceId,
      requestedWindow.since,
      requestedWindow.endDate,
      days,
      targetCurrency,
    );
    let autoShifted = false;

    if (trendData.dailyRows.length === 0) {
      const latestTransactionDate = await this.getLatestTransactionDate(workspaceId);

      if (latestTransactionDate) {
        effectiveWindow = this.getWindowBounds(days, latestTransactionDate);
        trendData = await this.getTrendData(
          workspaceId,
          effectiveWindow.since,
          effectiveWindow.endDate,
          days,
          targetCurrency,
        );
        autoShifted = true;
      }
    }

    const response: DashboardTrendsResponse = {
      dailyTrend: this.fillCashFlowBuckets(
        trendData.dailyRows,
        effectiveWindow.since,
        effectiveWindow.endDate,
        days,
      ),
      categories: trendData.categoryRows,
      counterparties: trendData.counterpartyRows,
      sources: {
        statements: trendData.sourceRows,
      },
    };

    if (autoShifted) {
      response.effectiveEndDate = this.formatDateOnly(effectiveWindow.endDate);
      response.effectiveSince = this.formatDateOnly(effectiveWindow.since);
    }

    return response;
  }

  private getWindowBounds(days: number, targetDate: Date): { since: Date; endDate: Date } {
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const since = new Date(endDate);
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    return { since, endDate };
  }

  private async getLatestTransactionDate(workspaceId: string): Promise<Date | null> {
    const query = this.transactionRepo.createQueryBuilder('t').leftJoin('t.statement', 's');
    this.applyWorkspaceStatementFilters(query, workspaceId, true);

    const result = await query
      .select('MAX(t.transactionDate)', 'latestTransactionDate')
      .getRawOne<{ latestTransactionDate: Date | string | null }>();

    return result?.latestTransactionDate ? new Date(result.latestTransactionDate) : null;
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private async countUncategorizedTransactions(workspaceId: string): Promise<number> {
    const query = this.transactionRepo.createQueryBuilder('t').leftJoin('t.statement', 's');
    this.applyWorkspaceStatementFilters(query, workspaceId, true);
    return query.andWhere('t.categoryId IS NULL').getCount();
  }

  private async getTrendData(
    workspaceId: string,
    since: Date,
    endDate: Date,
    days: number,
    targetCurrency: string,
  ) {
    const groupFormat = this.getTransactionGroupFormat(days);

    const [rawDailyRows, rawCategoryRows, rawCounterpartyRows, rawSourceRows] = await Promise.all([
      this.createTrendBaseQuery(workspaceId, since, endDate)
        .select(`TO_CHAR(t.transactionDate, ${groupFormat})`, 'date')
        .addSelect('t.currency', 'currency')
        .addSelect(
          'COALESCE(SUM(CASE WHEN t.transactionType = :income THEN t.credit ELSE 0 END), 0)',
          'income',
        )
        .addSelect(
          'COALESCE(SUM(CASE WHEN t.transactionType = :expense THEN t.debit ELSE 0 END), 0)',
          'expense',
        )
        .groupBy(`TO_CHAR(t.transactionDate, ${groupFormat})`)
        .addGroupBy('t.currency')
        .orderBy(`TO_CHAR(t.transactionDate, ${groupFormat})`, 'ASC')
        .setParameter('income', TransactionType.INCOME)
        .setParameter('expense', TransactionType.EXPENSE)
        .getRawMany<{ date: string } & RawTrendAmountRow>(),
      this.createTrendBaseQuery(workspaceId, since, endDate)
        .leftJoin('t.category', 'c')
        .select("COALESCE(c.name, 'Uncategorized')", 'name')
        .addSelect('t.currency', 'currency')
        .addSelect('COALESCE(SUM(t.debit), 0)', 'amount')
        .addSelect('COUNT(t.id)', 'count')
        .andWhere('t.transactionType = :expense', { expense: TransactionType.EXPENSE })
        .groupBy('c.name')
        .addGroupBy('t.currency')
        .orderBy('amount', 'DESC')
        .limit(10)
        .getRawMany<RawTrendCategoryRow>(),
      this.createTrendBaseQuery(workspaceId, since, endDate)
        .select('t.counterpartyName', 'name')
        .addSelect('t.currency', 'currency')
        .addSelect('COALESCE(SUM(t.credit), 0)', 'amount')
        .addSelect('COUNT(t.id)', 'count')
        .andWhere('t.transactionType = :income', { income: TransactionType.INCOME })
        .andWhere('t.counterpartyName IS NOT NULL')
        .andWhere("t.counterpartyName != ''")
        .groupBy('t.counterpartyName')
        .addGroupBy('t.currency')
        .orderBy('amount', 'DESC')
        .limit(10)
        .getRawMany<RawTrendCounterpartyRow>(),
      this.createTrendBaseQuery(workspaceId, since, endDate)
        .select('t.currency', 'currency')
        .addSelect(
          'COALESCE(SUM(CASE WHEN t.transactionType = :income THEN t.credit ELSE 0 END), 0)',
          'income',
        )
        .addSelect(
          'COALESCE(SUM(CASE WHEN t.transactionType = :expense THEN t.debit ELSE 0 END), 0)',
          'expense',
        )
        .addSelect('COUNT(DISTINCT t.id)', 'rows')
        .setParameter('income', TransactionType.INCOME)
        .setParameter('expense', TransactionType.EXPENSE)
        .groupBy('t.currency')
        .getRawMany<RawTrendAmountRow & { rows: string }>(),
    ]);

    const dailyRows = await this.convertDailyTrendRows(rawDailyRows, targetCurrency);
    const categoryRows = await this.convertNamedAmountRows(rawCategoryRows, targetCurrency);
    const counterpartyRows = await this.convertNamedAmountRows(rawCounterpartyRows, targetCurrency);
    const sourceRows = await this.convertSourceRows(
      Array.isArray(rawSourceRows) ? rawSourceRows : rawSourceRows ? [rawSourceRows] : [],
      targetCurrency,
    );

    return { dailyRows, categoryRows, counterpartyRows, sourceRows };
  }

  private async convertDailyTrendRows(
    rows: Array<{ date: string } & RawTrendAmountRow>,
    targetCurrency: string,
  ): Promise<DashboardCashFlowPoint[]> {
    const points = new Map<string, DashboardCashFlowPoint>();
    for (const row of rows) {
      const point = points.get(row.date) ?? { date: row.date, income: 0, expense: 0 };
      point.income += await this.convertDashboardAmount(row.income, row.currency, targetCurrency);
      point.expense += await this.convertDashboardAmount(row.expense, row.currency, targetCurrency);
      points.set(row.date, point);
    }
    return Array.from(points.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private async convertNamedAmountRows(
    rows: Array<RawTrendCategoryRow | RawTrendCounterpartyRow>,
    targetCurrency: string,
  ): Promise<Array<{ name: string; amount: number; count: number }>> {
    const grouped = new Map<string, { name: string; amount: number; count: number }>();
    for (const row of rows) {
      const existing = grouped.get(row.name) ?? { name: row.name, amount: 0, count: 0 };
      existing.amount += await this.convertDashboardAmount(row.amount, row.currency, targetCurrency);
      existing.count += Number.parseInt(row.count, 10) || 0;
      grouped.set(row.name, existing);
    }
    return Array.from(grouped.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }

  private async convertSourceRows(
    rows: Array<RawTrendAmountRow & { rows: string }>,
    targetCurrency: string,
  ): Promise<{ income: number; expense: number; rows: number }> {
    const totals = { income: 0, expense: 0, rows: 0 };
    for (const row of rows) {
      totals.income += await this.convertDashboardAmount(row.income, row.currency, targetCurrency);
      totals.expense += await this.convertDashboardAmount(row.expense, row.currency, targetCurrency);
      totals.rows += Number.parseInt(row.rows, 10) || 0;
    }
    return totals;
  }

  private fillCashFlowBuckets(
    rows: DashboardCashFlowPoint[],
    since: Date,
    endDate: Date,
    days: number,
  ): DashboardCashFlowPoint[] {
    const points = new Map(rows.map(row => [row.date, { ...row }]));
    const cursor = new Date(since);

    while (cursor <= endDate) {
      const key = this.formatTransactionBucket(cursor, days);
      if (!points.has(key)) {
        points.set(key, { date: key, income: 0, expense: 0 });
      }
      cursor.setDate(cursor.getDate() + (days >= 90 ? 7 : 1));
    }

    return Array.from(points.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private createTrendBaseQuery(workspaceId: string, since: Date, endDate: Date) {
    const query = this.transactionRepo.createQueryBuilder('t').leftJoin('t.statement', 's');
    this.applyActiveStatementTransactionFilters(query, workspaceId, since, endDate);
    return query;
  }

  private getTransactionGroupFormat(days: number): string {
    return days >= 90 ? "'IYYY-IW'" : "'YYYY-MM-DD'";
  }

  private formatTransactionBucket(date: Date, days: number): string {
    if (days < 90) {
      return this.formatDateOnly(date);
    }
    return `${this.getISOWeekYear(date)}-${String(this.getISOWeek(date)).padStart(2, '0')}`;
  }

  private getISOWeekYear(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return d.getUTCFullYear();
  }

  private getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private applyActiveStatementTransactionFilters(
    query: {
      where: (sql: string, params?: object) => unknown;
      andWhere: (sql: string, params?: object) => unknown;
    },
    workspaceId: string,
    since: Date,
    endDate: Date,
  ) {
    this.applyWorkspaceStatementFilters(query, workspaceId, true);
    query.andWhere('t.transactionDate BETWEEN :since AND :endDate', { since, endDate });
  }

  private applyWorkspaceStatementFilters(
    query: {
      where: (sql: string, params?: object) => unknown;
      andWhere: (sql: string, params?: object) => unknown;
    },
    workspaceId: string,
    excludeDuplicates: boolean,
  ) {
    query.where('t.workspaceId = :workspaceId', { workspaceId });
    query.andWhere('(s.id IS NULL OR s.workspaceId = :workspaceId)', { workspaceId });
    query.andWhere('(s.id IS NULL OR s.deletedAt IS NULL)');
    if (excludeDuplicates) {
      query.andWhere('t.isDuplicate = false');
    }
    query.andWhere('(s.id IS NULL OR s.status NOT IN (:...excludedStatuses))', {
      excludedStatuses: [StatementStatus.ERROR, StatementStatus.PROCESSING],
    });
  }

}
