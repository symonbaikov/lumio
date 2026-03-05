'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { ArrowDownRight, ArrowUpRight, FileUp, TrendingUp, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '../ui/spinner';
import { ActionRequired } from './ActionRequired';
import { CashFlowMini } from './CashFlowMini';
import { TopCategoriesCard } from './TopCategoriesCard';

interface OverviewTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
}

export function OverviewTab({ data, formatAmount, range, isLoading }: OverviewTabProps) {
  const mappedActions = (data.actions || []).map(a => {
    let priority: 'critical' | 'warning' | 'info' | 'success' = 'info';
    if (a.type === 'payments_overdue') priority = 'critical';
    else if (
      a.type === 'statements_pending_review' ||
      a.type === 'receipts_pending_review' ||
      a.type === 'statements_pending_submit'
    )
      priority = 'warning';
    return { ...a, priority };
  });

  if (data.dataHealth?.parsingWarnings > 0) {
    mappedActions.push({
      type: 'parsing_warnings',
      count: data.dataHealth.parsingWarnings,
      label: 'Parsing issues found',
      href: '/statements?filter=has_errors',
      priority: 'warning' as const,
    });
  }

  const hasNoData =
    data.cashFlow.length === 0 &&
    mappedActions.length === 0 &&
    data.snapshot.totalBalance === 0;

  const rangeLabel = range === '7d' ? '7d' : range === '90d' ? '90d' : '30d';

  const snapshotCards = [
    {
      key: 'totalBalance' as const,
      icon: Wallet,
      label: 'Total Balance',
      colorClass: (v: number) => (v >= 0 ? 'text-slate-800' : 'text-rose-600'),
    },
    {
      key: 'income30d' as const,
      icon: ArrowUpRight,
      label: `Income (${rangeLabel})`,
      colorClass: () => 'text-emerald-600',
    },
    {
      key: 'expense30d' as const,
      icon: ArrowDownRight,
      label: `Expense (${rangeLabel})`,
      colorClass: () => 'text-rose-500',
    },
    {
      key: 'netFlow30d' as const,
      icon: TrendingUp,
      label: `Net Flow (${rangeLabel})`,
      colorClass: (v: number) => (v >= 0 ? 'text-emerald-600' : 'text-rose-600'),
    },
  ];

  if (hasNoData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-[12px] bg-sky-50 mb-6">
          <FileUp className="h-10 w-10 text-sky-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Upload your first statement
        </h2>
        <p className="text-sm text-slate-500 max-w-md mb-8">
          Start tracking your finances by uploading a bank statement.
          We&apos;ll parse it automatically and show your cash flow, categories, and insights.
        </p>
        <Link
          href="/statements/submit"
          className="inline-flex items-center gap-2 rounded-[12px] bg-[#0a66c2] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#004182]"
        >
          <FileUp className="h-4 w-4" />
          Parse statement
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Row 1: KPI strip — 4 cards in one row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {snapshotCards.map(({ key, label, icon: Icon, colorClass }) => {
          const value = data.snapshot[key];
          const textColor = colorClass(value);
          return (
            <Card
              key={key}
              className="border border-slate-100 bg-white shadow-none rounded-xl"
            >
              <CardContent className="px-4 py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
                    {label}
                  </span>
                  <Icon className="h-3 w-3 text-slate-300 shrink-0" />
                </div>
                <span className={`text-base font-semibold font-ibm-plex-sans tracking-tight ${textColor}`}>
                  {isLoading ? <Spinner className="size-3" /> : (
                    <>
                      {value < 0 && key !== 'expense30d' ? '−' : ''}
                      {formatAmount(Math.abs(value))}
                    </>
                  )}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Row 2: Actions (left) + Cash Flow (right) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">

        {/* Left column: Action Required */}
        <Card className="border border-slate-100 bg-white shadow-none rounded-xl">
          <CardContent className="px-4 py-3">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400 mb-3">
              Action Required
            </h2>
            <ActionRequired
              actions={mappedActions}
              title="Action Required"
              emptyLabel="No actions needed"
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Right column: Cash Flow */}
        <Card className="border border-slate-100 bg-white shadow-none rounded-xl">
          <CardContent className="px-4 py-3 h-[220px]">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400 mb-2">
              Cash Flow ({rangeLabel})
            </h2>
            <div className="h-[calc(100%-24px)]">
              <CashFlowMini
                data={data.cashFlow}
                title={`Cash Flow (${rangeLabel})`}
                emptyLabel="No cash flow data yet."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Spending Categories — full width */}
      {data.topCategories && data.topCategories.length > 0 ? (
        <Card className="border border-slate-100 bg-white shadow-none rounded-xl">
          <CardContent className="px-4 py-3 h-[260px]">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400 mb-2">
              Spending Categories
            </h2>
            <div className="h-[calc(100%-24px)]">
              <TopCategoriesCard categories={data.topCategories} />
            </div>
          </CardContent>
        </Card>
      ) : null}

    </div>
  );
}
