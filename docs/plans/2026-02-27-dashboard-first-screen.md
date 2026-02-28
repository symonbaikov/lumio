# Dashboard as First Screen — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the changelog home page (`/`) with a financial Dashboard that answers "What's happening with my money right now?" — the first thing a user sees after login.

**Architecture:** New `GET /dashboard` backend endpoint aggregates data from existing services (reports, statements, transactions, payables, insights) into a single response. Frontend renders this via dedicated Dashboard components using ECharts, Lucide icons, and the existing card/layout patterns. Role-based sections are toggled via `usePermissions`. The old changelog page moves to `/changelog`.

**Tech Stack:** NestJS (controller + service), TypeORM queries, Next.js App Router page, ECharts, Tailwind CSS, Lucide React, existing `apiClient` + `useAuth` + `usePermissions` hooks.

---

## Phase 1: Backend — Dashboard Aggregate Endpoint

### Task 1: Create Dashboard module scaffold

**Files:**
- Create: `backend/src/modules/dashboard/dashboard.module.ts`
- Create: `backend/src/modules/dashboard/dashboard.controller.ts`
- Create: `backend/src/modules/dashboard/dashboard.service.ts`
- Create: `backend/src/modules/dashboard/interfaces/dashboard-response.interface.ts`
- Modify: `backend/src/app.module.ts` (register DashboardModule)

**Step 1: Define the response interface**

```typescript
// backend/src/modules/dashboard/interfaces/dashboard-response.interface.ts

export interface DashboardFinancialSnapshot {
  totalBalance: number;           // sum of all wallet balances
  income30d: number;              // income last 30 days
  expense30d: number;             // expense last 30 days
  netFlow30d: number;             // income - expense
  totalPayable: number;           // sum of payables with status to_pay or scheduled
  totalOverdue: number;           // sum of payables with status overdue
  currency: string;               // workspace currency
}

export interface DashboardActionItem {
  type: 'statements_pending_submit' | 'statements_pending_review' | 'payments_overdue' | 'transactions_uncategorized' | 'receipts_pending_review';
  count: number;
  label: string;
  href: string;                   // frontend route to resolve this action
}

export interface DashboardCashFlowPoint {
  date: string;                   // YYYY-MM-DD
  income: number;
  expense: number;
}

export interface DashboardRecentActivity {
  id: string;
  type: 'statement_upload' | 'payment' | 'categorization' | 'transaction';
  title: string;
  description: string | null;
  amount: number | null;
  timestamp: string;              // ISO datetime
  href: string;                   // frontend link
}

export interface DashboardResponse {
  snapshot: DashboardFinancialSnapshot;
  actions: DashboardActionItem[];
  cashFlow: DashboardCashFlowPoint[];
  recentActivity: DashboardRecentActivity[];
  role: 'owner' | 'admin' | 'member' | 'viewer';
}
```

**Step 2: Create the service**

```typescript
// backend/src/modules/dashboard/dashboard.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not, MoreThanOrEqual, Between } from 'typeorm';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { Statement, StatementStatus } from '../../entities/statement.entity';
import { Payable, PayableStatus } from '../../entities/payable.entity';
import { Wallet } from '../../entities/wallet.entity';
import { Receipt } from '../../entities/receipt.entity';
import { User } from '../../entities/user.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import type {
  DashboardResponse,
  DashboardFinancialSnapshot,
  DashboardActionItem,
  DashboardCashFlowPoint,
  DashboardRecentActivity,
} from './interfaces/dashboard-response.interface';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Statement)
    private readonly statementRepo: Repository<Statement>,
    @InjectRepository(Payable)
    private readonly payableRepo: Repository<Payable>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
  ) {}

  async getDashboard(userId: string, workspaceId: string): Promise<DashboardResponse> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Run all queries in parallel
    const [
      snapshot,
      actions,
      cashFlow,
      recentActivity,
      memberRole,
    ] = await Promise.all([
      this.getSnapshot(workspaceId, thirtyDaysAgo),
      this.getActions(userId, workspaceId),
      this.getCashFlow(workspaceId, thirtyDaysAgo),
      this.getRecentActivity(workspaceId),
      this.getMemberRole(userId, workspaceId),
    ]);

    return {
      snapshot,
      actions,
      cashFlow,
      recentActivity,
      role: memberRole,
    };
  }

  private async getSnapshot(
    workspaceId: string,
    since: Date,
  ): Promise<DashboardFinancialSnapshot> {
    // 1. Total wallet balances
    const walletResult = await this.walletRepo
      .createQueryBuilder('w')
      .select('COALESCE(SUM(w.initialBalance), 0)', 'totalBalance')
      .where('w.userId IN (SELECT wm.user_id FROM workspace_members wm WHERE wm.workspace_id = :workspaceId)', { workspaceId })
      .andWhere('w.isActive = true')
      .getRawOne();

    // 2. Income/expense from transactions in last 30d
    const txResult = await this.transactionRepo
      .createQueryBuilder('t')
      .innerJoin('t.statement', 's')
      .select([
        'COALESCE(SUM(CASE WHEN t.transactionType = :income THEN t.credit ELSE 0 END), 0) AS income',
        'COALESCE(SUM(CASE WHEN t.transactionType = :expense THEN t.debit ELSE 0 END), 0) AS expense',
      ])
      .where('s.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.transactionDate >= :since', { since })
      .andWhere('s.deletedAt IS NULL')
      .setParameter('income', TransactionType.INCOME)
      .setParameter('expense', TransactionType.EXPENSE)
      .getRawOne();

    // 3. Payable totals
    const payableResult = await this.payableRepo
      .createQueryBuilder('p')
      .select([
        'COALESCE(SUM(CASE WHEN p.status IN (:...payStatuses) THEN p.amount ELSE 0 END), 0) AS "totalPayable"',
        'COALESCE(SUM(CASE WHEN p.status = :overdue THEN p.amount ELSE 0 END), 0) AS "totalOverdue"',
      ])
      .where('p.workspaceId = :workspaceId', { workspaceId })
      .andWhere('p.deletedAt IS NULL')
      .setParameter('payStatuses', [PayableStatus.TO_PAY, PayableStatus.SCHEDULED])
      .setParameter('overdue', PayableStatus.OVERDUE)
      .getRawOne();

    const income = parseFloat(txResult?.income) || 0;
    const expense = parseFloat(txResult?.expense) || 0;

    return {
      totalBalance: parseFloat(walletResult?.totalBalance) || 0,
      income30d: income,
      expense30d: expense,
      netFlow30d: income - expense,
      totalPayable: parseFloat(payableResult?.totalPayable) || 0,
      totalOverdue: parseFloat(payableResult?.totalOverdue) || 0,
      currency: 'KZT', // Will be resolved from workspace
    };
  }

  private async getActions(
    userId: string,
    workspaceId: string,
  ): Promise<DashboardActionItem[]> {
    const actions: DashboardActionItem[] = [];

    // 1. Statements pending submit (status = uploaded)
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

    // 2. Statements pending review (status = parsed or validated)
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

    // 3. Overdue payments
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
        href: '/statements/pay',
      });
    }

    // 4. Uncategorized transactions
    const uncategorized = await this.transactionRepo
      .createQueryBuilder('t')
      .innerJoin('t.statement', 's')
      .where('s.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.categoryId IS NULL')
      .andWhere('s.deletedAt IS NULL')
      .getCount();
    if (uncategorized > 0) {
      actions.push({
        type: 'transactions_uncategorized',
        count: uncategorized,
        label: `${uncategorized} transaction${uncategorized > 1 ? 's' : ''} uncategorized`,
        href: '/statements',
      });
    }

    // 5. Receipts pending review
    const pendingReceipts = await this.receiptRepo.count({
      where: {
        workspaceId,
        status: In(['new', 'needs_review']),
      },
    });
    if (pendingReceipts > 0) {
      actions.push({
        type: 'receipts_pending_review',
        count: pendingReceipts,
        label: `${pendingReceipts} receipt${pendingReceipts > 1 ? 's' : ''} need review`,
        href: '/receipts',
      });
    }

    return actions;
  }

  private async getCashFlow(
    workspaceId: string,
    since: Date,
  ): Promise<DashboardCashFlowPoint[]> {
    const result = await this.transactionRepo
      .createQueryBuilder('t')
      .innerJoin('t.statement', 's')
      .select("TO_CHAR(t.transactionDate, 'YYYY-MM-DD')", 'date')
      .addSelect(
        'COALESCE(SUM(CASE WHEN t.transactionType = :income THEN t.credit ELSE 0 END), 0)',
        'income',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN t.transactionType = :expense THEN t.debit ELSE 0 END), 0)',
        'expense',
      )
      .where('s.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.transactionDate >= :since', { since })
      .andWhere('s.deletedAt IS NULL')
      .groupBy("TO_CHAR(t.transactionDate, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(t.transactionDate, 'YYYY-MM-DD')", 'ASC')
      .setParameter('income', TransactionType.INCOME)
      .setParameter('expense', TransactionType.EXPENSE)
      .getRawMany();

    return result.map((r) => ({
      date: r.date,
      income: parseFloat(r.income) || 0,
      expense: parseFloat(r.expense) || 0,
    }));
  }

  private async getRecentActivity(
    workspaceId: string,
  ): Promise<DashboardRecentActivity[]> {
    // Get recent statements (uploads)
    const recentStatements = await this.statementRepo.find({
      where: { workspaceId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 3,
      select: ['id', 'fileName', 'status', 'totalTransactions', 'createdAt', 'bankName'],
    });

    // Get recent transactions
    const recentTransactions = await this.transactionRepo
      .createQueryBuilder('t')
      .innerJoin('t.statement', 's')
      .leftJoin('t.category', 'c')
      .select([
        't.id',
        't.counterpartyName',
        't.debit',
        't.credit',
        't.transactionType',
        't.transactionDate',
        't.updatedAt',
        'c.name',
      ])
      .where('s.workspaceId = :workspaceId', { workspaceId })
      .andWhere('s.deletedAt IS NULL')
      .orderBy('t.updatedAt', 'DESC')
      .take(5)
      .getMany();

    const activities: DashboardRecentActivity[] = [];

    // Map statements to activity items
    for (const stmt of recentStatements) {
      activities.push({
        id: stmt.id,
        type: 'statement_upload',
        title: stmt.fileName,
        description: `${stmt.totalTransactions} transactions · ${stmt.status}`,
        amount: null,
        timestamp: stmt.createdAt.toISOString(),
        href: `/statements/${stmt.id}/view`,
      });
    }

    // Map transactions to activity items
    for (const tx of recentTransactions) {
      const amount = tx.transactionType === TransactionType.INCOME
        ? parseFloat(String(tx.credit))
        : -parseFloat(String(tx.debit));

      activities.push({
        id: tx.id,
        type: tx.category ? 'categorization' : 'transaction',
        title: tx.counterpartyName || 'Unknown',
        description: tx.category?.name || null,
        amount,
        timestamp: tx.updatedAt.toISOString(),
        href: `/statements`,
      });
    }

    // Sort by timestamp descending and take top 8
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
    return (member?.role as any) || 'member';
  }
}
```

**Step 3: Create the controller**

```typescript
// backend/src/modules/dashboard/dashboard.controller.ts

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@CurrentUser() user: User) {
    return this.dashboardService.getDashboard(user.id, user.workspaceId);
  }
}
```

**Step 4: Create the module**

```typescript
// backend/src/modules/dashboard/dashboard.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../../entities/transaction.entity';
import { Statement } from '../../entities/statement.entity';
import { Payable } from '../../entities/payable.entity';
import { Wallet } from '../../entities/wallet.entity';
import { Receipt } from '../../entities/receipt.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      Statement,
      Payable,
      Wallet,
      Receipt,
      WorkspaceMember,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
```

**Step 5: Register in app.module.ts**

Add `DashboardModule` to the imports array in `backend/src/app.module.ts`.

**Step 6: Run backend and verify**

```bash
cd backend && npm run start:dev
```

Verify: `GET /api/v1/dashboard` returns the expected JSON shape.

**Step 7: Commit**

```bash
git add backend/src/modules/dashboard/
git commit -m "feat(dashboard): add dashboard aggregate endpoint"
```

---

## Phase 2: Frontend — Dashboard Page & Components

### Task 2: Move changelog to `/changelog` route

**Files:**
- Create: `frontend/app/(main)/changelog/page.tsx` (move current `app/page.tsx` content here)
- Modify: `frontend/app/page.tsx` (replace with dashboard redirect/content)

**Step 1: Create `/changelog` page**

Move the entire content of `frontend/app/page.tsx` to `frontend/app/(main)/changelog/page.tsx`. This preserves the changelog page at a new URL.

**Step 2: Commit**

```bash
git commit -m "refactor: move changelog page from / to /changelog"
```

---

### Task 3: Create Dashboard API hook

**Files:**
- Create: `frontend/app/hooks/useDashboard.ts`

**Step 1: Write the hook**

```typescript
// frontend/app/hooks/useDashboard.ts

import { useCallback, useEffect, useState } from 'react';
import apiClient from '../lib/api';

export interface DashboardFinancialSnapshot {
  totalBalance: number;
  income30d: number;
  expense30d: number;
  netFlow30d: number;
  totalPayable: number;
  totalOverdue: number;
  currency: string;
}

export interface DashboardActionItem {
  type: string;
  count: number;
  label: string;
  href: string;
}

export interface DashboardCashFlowPoint {
  date: string;
  income: number;
  expense: number;
}

export interface DashboardRecentActivity {
  id: string;
  type: 'statement_upload' | 'payment' | 'categorization' | 'transaction';
  title: string;
  description: string | null;
  amount: number | null;
  timestamp: string;
  href: string;
}

export interface DashboardData {
  snapshot: DashboardFinancialSnapshot;
  actions: DashboardActionItem[];
  cashFlow: DashboardCashFlowPoint[];
  recentActivity: DashboardRecentActivity[];
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.get('/dashboard');
      const payload = resp.data?.data || resp.data;
      setData(payload);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
```

**Step 2: Commit**

```bash
git commit -m "feat(dashboard): add useDashboard data fetching hook"
```

---

### Task 4: Create Dashboard components

**Files:**
- Create: `frontend/app/components/dashboard/FinancialSnapshot.tsx`
- Create: `frontend/app/components/dashboard/ActionRequired.tsx`
- Create: `frontend/app/components/dashboard/CashFlowChart.tsx`
- Create: `frontend/app/components/dashboard/RecentActivity.tsx`
- Create: `frontend/app/components/dashboard/QuickActions.tsx`

**Step 1: FinancialSnapshot component**

The top cards showing financial summary. 6 cards in a grid.

```typescript
// frontend/app/components/dashboard/FinancialSnapshot.tsx

'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Clock,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { DashboardFinancialSnapshot } from '../../hooks/useDashboard';

interface Props {
  snapshot: DashboardFinancialSnapshot;
  formatAmount: (value: number) => string;
}

const cards = [
  { key: 'totalBalance', label: 'Total Balance', icon: Wallet, accentClass: 'text-primary' },
  { key: 'income30d', label: 'Income (30d)', icon: ArrowUpRight, accentClass: 'text-emerald-600' },
  { key: 'expense30d', label: 'Expense (30d)', icon: ArrowDownRight, accentClass: 'text-red-600' },
  { key: 'netFlow30d', label: 'Net Flow', icon: TrendingUp, accentClass: 'dynamic' },
  { key: 'totalPayable', label: 'To Pay', icon: Banknote, accentClass: 'text-amber-600' },
  { key: 'totalOverdue', label: 'Overdue', icon: Clock, accentClass: 'text-red-600' },
] as const;

export function FinancialSnapshot({ snapshot, formatAmount }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map(({ key, label, icon: Icon, accentClass }) => {
        const value = snapshot[key];
        const colorClass =
          accentClass === 'dynamic'
            ? value >= 0 ? 'text-emerald-600' : 'text-red-600'
            : accentClass;

        return (
          <div
            key={key}
            className="rounded-lg border border-[#e0e0e0] bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[#666666]">
                {label}
              </span>
              <Icon className={`h-4 w-4 ${colorClass}`} strokeWidth={2} />
            </div>
            <div className={`mt-2 text-xl font-bold tracking-tight ${colorClass}`}>
              {formatAmount(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: ActionRequired component**

Shows action items that need attention. High-urgency block.

```typescript
// frontend/app/components/dashboard/ActionRequired.tsx

'use client';

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Receipt,
  Tag,
} from 'lucide-react';
import Link from 'next/link';
import type { DashboardActionItem } from '../../hooks/useDashboard';

const iconMap: Record<string, React.ElementType> = {
  statements_pending_submit: FileText,
  statements_pending_review: CheckCircle2,
  payments_overdue: AlertTriangle,
  transactions_uncategorized: Tag,
  receipts_pending_review: Receipt,
};

const colorMap: Record<string, string> = {
  statements_pending_submit: 'text-amber-600 bg-amber-50 border-amber-200',
  statements_pending_review: 'text-blue-600 bg-blue-50 border-blue-200',
  payments_overdue: 'text-red-600 bg-red-50 border-red-200',
  transactions_uncategorized: 'text-purple-600 bg-purple-50 border-purple-200',
  receipts_pending_review: 'text-teal-600 bg-teal-50 border-teal-200',
};

interface Props {
  actions: DashboardActionItem[];
}

export function ActionRequired({ actions }: Props) {
  if (actions.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2} />
          <span className="text-sm font-semibold text-emerald-800">
            All clear — no actions required
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#e0e0e0] bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-[#191919]">Action Required</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const Icon = iconMap[action.type] || FileText;
          const colors = colorMap[action.type] || 'text-gray-600 bg-gray-50 border-gray-200';

          return (
            <Link
              key={action.type}
              href={action.href}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm ${colors}`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/60">
                <Icon className="h-4.5 w-4.5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold leading-none">{action.count}</div>
                <div className="mt-0.5 truncate text-xs font-medium">{action.label}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 3: CashFlowChart component**

Simple ECharts line chart for last 30 days income/expense.

```typescript
// frontend/app/components/dashboard/CashFlowChart.tsx

'use client';

import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { DashboardCashFlowPoint } from '../../hooks/useDashboard';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface Props {
  data: DashboardCashFlowPoint[];
}

export function CashFlowChart({ data }: Props) {
  const { resolvedTheme } = useTheme();

  const option = useMemo(() => {
    if (!data || data.length === 0) return null;

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: {
        top: 0,
        data: ['Income', 'Expense'],
        textStyle: { fontSize: 12 },
      },
      grid: {
        top: 36,
        left: 12,
        right: 12,
        bottom: 12,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: data.map((p) => p.date),
        axisLabel: { fontSize: 10, rotate: data.length > 15 ? 45 : 0 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          name: 'Income',
          type: 'line',
          smooth: true,
          data: data.map((p) => p.income),
          areaStyle: { color: 'rgba(16,185,129,0.1)' },
          lineStyle: { color: '#10B981', width: 2 },
          itemStyle: { color: '#10B981' },
        },
        {
          name: 'Expense',
          type: 'line',
          smooth: true,
          data: data.map((p) => p.expense),
          areaStyle: { color: 'rgba(239,68,68,0.08)' },
          lineStyle: { color: '#EF4444', width: 2 },
          itemStyle: { color: '#EF4444' },
        },
      ],
    };
  }, [data]);

  if (!option) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[#666666]">
        No cash flow data for the last 30 days
      </div>
    );
  }

  return (
    <ReactECharts
      style={{ height: 300 }}
      option={option}
      notMerge
      lazyUpdate
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
    />
  );
}
```

**Step 4: RecentActivity component**

```typescript
// frontend/app/components/dashboard/RecentActivity.tsx

'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  FileUp,
  Receipt,
  Tag,
} from 'lucide-react';
import Link from 'next/link';
import type { DashboardRecentActivity } from '../../hooks/useDashboard';

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  statement_upload: { icon: FileUp, color: 'text-blue-600 bg-blue-50' },
  payment: { icon: Receipt, color: 'text-amber-600 bg-amber-50' },
  categorization: { icon: Tag, color: 'text-purple-600 bg-purple-50' },
  transaction: { icon: Receipt, color: 'text-gray-600 bg-gray-50' },
};

interface Props {
  activities: DashboardRecentActivity[];
  formatAmount: (value: number) => string;
}

export function RecentActivity({ activities, formatAmount }: Props) {
  if (activities.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-[#666666]">
        No recent activity
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {activities.map((activity) => {
        const config = typeConfig[activity.type] || typeConfig.transaction;
        const Icon = config.icon;

        return (
          <Link
            key={activity.id}
            href={activity.href}
            className="flex items-center gap-3 py-3 transition-colors hover:bg-gray-50 rounded px-2 -mx-2"
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.color}`}>
              <Icon className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#191919]">
                {activity.title}
              </p>
              <p className="truncate text-xs text-[#666666]">
                {activity.description || activity.type.replace(/_/g, ' ')} ·{' '}
                {new Date(activity.timestamp).toLocaleDateString()}
              </p>
            </div>
            {activity.amount != null && (
              <div className="flex items-center gap-1 shrink-0">
                {activity.amount >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    activity.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatAmount(Math.abs(activity.amount))}
                </span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
```

**Step 5: QuickActions component**

```typescript
// frontend/app/components/dashboard/QuickActions.tsx

'use client';

import {
  FileUp,
  PenLine,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

const actions = [
  {
    label: 'Upload Document',
    href: '/statements/submit',
    icon: FileUp,
  },
  {
    label: 'Create Payment',
    href: '/statements/pay',
    icon: Plus,
  },
  {
    label: 'Add Expense',
    href: '/data-entry',
    icon: PenLine,
  },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="inline-flex items-center gap-2 rounded-full border border-[#0a66c2] bg-white px-4 py-2 text-sm font-semibold text-[#0a66c2] transition-colors hover:bg-[rgba(10,102,194,0.1)]"
        >
          <action.icon className="h-4 w-4" strokeWidth={2} />
          {action.label}
        </Link>
      ))}
    </div>
  );
}
```

**Step 6: Commit**

```bash
git commit -m "feat(dashboard): add Dashboard UI components"
```

---

### Task 5: Create the Dashboard page

**Files:**
- Modify: `frontend/app/page.tsx` (replace with Dashboard)

**Step 1: Write the Dashboard page**

```typescript
// frontend/app/page.tsx

'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intlayer';
import { useAuth } from './hooks/useAuth';
import { useWorkspace } from './contexts/WorkspaceContext';
import { useDashboard } from './hooks/useDashboard';
import { useIsMobile } from './hooks/useIsMobile';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { FinancialSnapshot } from './components/dashboard/FinancialSnapshot';
import { ActionRequired } from './components/dashboard/ActionRequired';
import { CashFlowChart } from './components/dashboard/CashFlowChart';
import { RecentActivity } from './components/dashboard/RecentActivity';
import { QuickActions } from './components/dashboard/QuickActions';
import { RefreshCcw } from 'lucide-react';
import { useEffect } from 'react';

const resolveLocale = (locale: string) => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

const resolveCurrencyCode = (currency: string | null | undefined) => {
  const normalized = String(currency || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : 'KZT';
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { locale } = useLocale();
  const isMobile = useIsMobile();
  const { data, loading, error, refresh } = useDashboard();

  const needsOnboarding = user?.onboardingCompletedAt == null;
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);

  const formatAmount = useCallback(
    (value: number) =>
      new Intl.NumberFormat(resolveLocale(locale), {
        style: 'currency',
        currency: workspaceCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value),
    [locale, workspaceCurrency],
  );

  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (needsOnboarding) { router.replace('/onboarding'); return; }
    if (!currentWorkspace) { router.replace('/workspaces'); }
  }, [authLoading, currentWorkspace, needsOnboarding, router, user, workspaceLoading]);

  const {
    handlers: pullToRefreshHandlers,
    pullDistance,
    isRefreshing: pullRefreshing,
    isReadyToRefresh,
  } = usePullToRefresh({
    enabled: isMobile,
    onRefresh: refresh,
  });

  const isRedirecting = authLoading || workspaceLoading || !user || needsOnboarding || !currentWorkspace;

  if (isRedirecting) {
    return (
      <div className="flex min-h-[calc(100vh-var(--global-nav-height,0px))] items-center justify-center bg-[#f3f2ef]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#e0e0e0] border-t-[#0a66c2]" />
      </div>
    );
  }

  return (
    <main
      className="min-h-[calc(100vh-var(--global-nav-height,0px))] bg-[#f3f2ef]"
      {...pullToRefreshHandlers}
    >
      <div className="container-shared px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8 space-y-5">
        {/* Pull to refresh indicator */}
        {isMobile && (pullDistance > 0 || pullRefreshing) && (
          <div className="pointer-events-none flex justify-center">
            <div className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-[#666666] shadow-sm transition-colors ${
              isReadyToRefresh || pullRefreshing ? 'border-[#0a66c2]/40 text-[#0a66c2]' : 'border-[#e0e0e0]'
            }`}>
              <RefreshCcw className={`h-3.5 w-3.5 ${pullRefreshing ? 'animate-spin' : ''}`} />
              <span>
                {pullRefreshing ? 'Refreshing...' : isReadyToRefresh ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#191919]">Dashboard</h1>
            <p className="mt-0.5 text-sm text-[#666666]">
              {currentWorkspace?.name || 'Workspace'} · Last 30 days
            </p>
          </div>
          <QuickActions />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <span>{error}</span>
            <button onClick={refresh} className="ml-auto text-red-600 hover:text-red-800">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg border border-[#e0e0e0] bg-white" />
              ))}
            </div>
            <div className="h-16 animate-pulse rounded-lg border border-[#e0e0e0] bg-white" />
            <div className="h-80 animate-pulse rounded-lg border border-[#e0e0e0] bg-white" />
          </div>
        )}

        {/* Dashboard content */}
        {data && (
          <>
            {/* 1. Financial Snapshot */}
            <FinancialSnapshot snapshot={data.snapshot} formatAmount={formatAmount} />

            {/* 2. Action Required */}
            <ActionRequired actions={data.actions} />

            {/* 3. Cash Flow + Recent Activity */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Cash Flow Chart */}
              <div className="lg:col-span-2 rounded-lg border border-[#e0e0e0] bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#191919]">Cash Flow</h3>
                  <span className="text-xs text-[#666666]">Last 30 days</span>
                </div>
                <CashFlowChart data={data.cashFlow} />
              </div>

              {/* Recent Activity */}
              <div className="rounded-lg border border-[#e0e0e0] bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#191919]">Recent Activity</h3>
                  <span className="text-xs text-[#666666]">Latest</span>
                </div>
                <RecentActivity activities={data.recentActivity} formatAmount={formatAmount} />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git commit -m "feat(dashboard): replace home page with financial dashboard"
```

---

### Task 6: Add Dashboard to navigation

**Files:**
- Modify: `frontend/app/components/Navigation.tsx`

**Step 1:** Add a "Dashboard" nav item as the first item that links to `/`. Ensure it appears before "Statements" in the navigation list.

**Step 2: Commit**

```bash
git commit -m "feat(dashboard): add Dashboard link to navigation"
```

---

## Phase 3: Role-Based Views

### Task 7: Add role-based section visibility

**Files:**
- Modify: `frontend/app/page.tsx` (add conditional rendering by `data.role`)

**Step 1:** Add conditional sections based on `data.role`:

| Role | Sections visible |
|------|-----------------|
| `owner` / `admin` | All sections: snapshot, actions, cash flow, recent activity, quick actions |
| `member` | Snapshot (read-only), actions (submit/categorize only), recent activity, quick actions (upload, add expense) |
| `viewer` | Snapshot (read-only), cash flow, recent activity (no quick actions) |

Implementation: wrap each section in a role check:

```tsx
{/* Owner/Admin only: full action block */}
{(data.role === 'owner' || data.role === 'admin') && (
  <ActionRequired actions={data.actions} />
)}

{/* Member: only show submit/categorize actions */}
{data.role === 'member' && (
  <ActionRequired
    actions={data.actions.filter(a =>
      ['statements_pending_submit', 'transactions_uncategorized'].includes(a.type)
    )}
  />
)}

{/* No actions for viewer */}
```

**Step 2: Commit**

```bash
git commit -m "feat(dashboard): add role-based section visibility"
```

---

## Phase 4: i18n & Polish

### Task 8: Add intlayer translations for Dashboard

**Files:**
- Create: `frontend/app/page.content.ts` (or appropriate intlayer content file for dashboard)
- Modify: Dashboard components to use translation tokens instead of hardcoded strings

**Step 1:** Create content definition with `en`, `ru`, `kk` translations for:
- "Dashboard", "Last 30 days", "Total Balance", "Income (30d)", "Expense (30d)", "Net Flow", "To Pay", "Overdue", "Action Required", "All clear", "Cash Flow", "Recent Activity", "Upload Document", "Create Payment", "Add Expense", "No cash flow data", "No recent activity"

**Step 2: Commit**

```bash
git commit -m "feat(dashboard): add i18n translations"
```

---

### Task 9: Empty state & onboarding

**Files:**
- Modify: `frontend/app/page.tsx`

**Step 1:** When all snapshot values are zero (fresh workspace), show an empty state with:
- Welcome message
- Three quick action cards: "Upload your first statement", "Connect Gmail", "Add manual expense"
- Links to `/statements/submit`, `/integrations/gmail`, `/data-entry`

**Step 2: Commit**

```bash
git commit -m "feat(dashboard): add empty state for fresh workspaces"
```

---

## Phase 5: Testing

### Task 10: Backend unit tests

**Files:**
- Create: `backend/@tests/unit/modules/dashboard/dashboard.service.spec.ts`

**Step 1:** Write tests for:
- `getDashboard()` returns correct shape
- `getSnapshot()` calculates totals correctly
- `getActions()` returns only non-zero action items
- `getCashFlow()` groups by date correctly
- `getRecentActivity()` merges and sorts correctly
- `getMemberRole()` returns correct role

**Step 2: Run tests**

```bash
cd backend && npm run test -- --testPathPattern="dashboard"
```

**Step 3: Commit**

```bash
git commit -m "test(dashboard): add unit tests for dashboard service"
```

---

### Task 11: Frontend component tests

**Files:**
- Create: `frontend/app/components/dashboard/__tests__/FinancialSnapshot.test.tsx`
- Create: `frontend/app/components/dashboard/__tests__/ActionRequired.test.tsx`

**Step 1:** Write tests for:
- `FinancialSnapshot` renders 6 cards with correct values
- `ActionRequired` renders action items with links
- `ActionRequired` shows "All clear" when empty

**Step 2: Run tests**

```bash
cd frontend && npm run test
```

**Step 3: Commit**

```bash
git commit -m "test(dashboard): add frontend component tests"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1 | Backend: Dashboard module with aggregate endpoint |
| 2 | 2-6 | Frontend: Dashboard page + 5 components + navigation |
| 3 | 7 | Role-based section visibility |
| 4 | 8-9 | i18n translations + empty state |
| 5 | 10-11 | Backend + frontend tests |

**Key API dependencies (already exist):**
- `GET /reports/statements/summary` — financial totals (reused logic)
- Payable entity — overdue/pending payments
- Statement entity — pending submit/review counts
- Transaction entity — uncategorized counts
- Wallet entity — balance totals
- Receipt entity — pending review counts
- Insights system — operational insights (complementary)

**Key files to modify:**
- `frontend/app/page.tsx` — replace changelog with Dashboard
- `frontend/app/components/Navigation.tsx` — add Dashboard nav item
- `backend/src/app.module.ts` — register DashboardModule

**Key files to create:**
- `backend/src/modules/dashboard/` — module, controller, service, interfaces
- `frontend/app/components/dashboard/` — 5 components
- `frontend/app/hooks/useDashboard.ts` — data fetching hook
- `frontend/app/(main)/changelog/page.tsx` — relocated changelog
