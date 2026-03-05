'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet } from 'lucide-react';
import { Spinner } from '../ui/spinner';
import { ActionRequired } from './ActionRequired';
import { CashFlowMini } from './CashFlowMini';
import { RecentActivity } from './RecentActivity';
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

  const rangeLabel = range === '7d' ? '7d' : range === '90d' ? '90d' : '30d';

  const snapshotCards = [
    {
      key: 'totalBalance' as const,
      icon: Wallet,
      label: 'Total Balance',
      colorClass: (v: number) => (v >= 0 ? 'text-slate-900' : 'text-rose-600'),
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

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Action Required */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
          Action Required
        </h2>
        <ActionRequired
          actions={mappedActions}
          title="Action Required"
          emptyLabel="Everything looks good! No actions needed right now."
          isLoading={isLoading}
        />
      </section>

      {/* 2. Financial Snapshot — 4 KPI cards */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
          Financial Snapshot
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {snapshotCards.map(({ key, label, icon: Icon, colorClass }) => {
            const value = data.snapshot[key];
            const textColor = colorClass(value);

            return (
              <Card
                key={key}
                className="group border border-slate-100 bg-white shadow-sm ring-1 ring-black/5 rounded-[12px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(2,132,199,0.20)]"
              >
                <CardContent className="p-4 flex flex-col h-full justify-between gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 leading-tight">
                      {label}
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-100 group-hover:bg-sky-50 group-hover:text-sky-600 group-hover:ring-sky-100 transition-colors shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div>
                    <span
                      className={`text-xl font-bold font-ibm-plex-sans tracking-tight ${textColor}`}
                    >
                      {isLoading ? <Spinner className="size-4" /> : formatAmount(Math.abs(value))}
                    </span>
                    {value < 0 && key !== 'expense30d' ? (
                      <span className="ml-1 text-xs text-rose-400">-</span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 3. Cash Flow + Top Categories */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 h-[320px]">
          <CashFlowMini
            data={data.cashFlow}
            title={`Cash Flow (${rangeLabel})`}
            emptyLabel="No cash flow data available. Upload a bank statement to get started."
          />
        </div>
        <div className="lg:col-span-5 h-[320px]">
          {data.topCategories && data.topCategories.length > 0 ? (
            <TopCategoriesCard categories={data.topCategories} />
          ) : (
            <Card className="h-full border border-slate-100 bg-white shadow-sm rounded-[12px] flex items-center justify-center">
              <div className="text-center text-sm text-slate-400">
                <p className="font-medium">No spending categories yet</p>
                <p className="text-xs mt-1">Categorize transactions to see top spending areas</p>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* 4. Recent Activity */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
          Recent Activity
        </h2>
        <div className="h-[340px]">
          <RecentActivity
            activities={data.recentActivity}
            formatAmount={formatAmount}
            title="Recent Activity"
            emptyLabel="No recent updates."
          />
        </div>
      </section>
    </div>
  );
}
