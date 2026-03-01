'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import type { DashboardData } from '@/app/hooks/useDashboard';
import { ArrowDownRight, ArrowUpRight, CircleAlert, Clock, TrendingUp, Wallet } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { ActionRequired } from './ActionRequired';
import { CashFlowMini } from './CashFlowMini';
import { RecentActivity } from './RecentActivity';

interface OverviewTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
}

export function OverviewTab({ data, formatAmount }: OverviewTabProps) {
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

  const snapshotCards = [
    { key: 'income30d', icon: ArrowUpRight, label: 'Income (30d)' },
    { key: 'expense30d', icon: ArrowDownRight, label: 'Expense (30d)' },
    { key: 'netFlow30d', icon: TrendingUp, label: 'Net flow' },
    { key: 'unapprovedCash', icon: CircleAlert, label: 'Unapproved cash' },
  ] as const;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Action Required */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.1em] text-slate-400">
          Action Required
        </h2>
        <div>
          <ActionRequired
            actions={mappedActions}
            title="Action Required"
            emptyLabel="Everything looks good! No actions needed right now."
          />
        </div>
      </section>

      {/* 2. Financial Snapshot */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.1em] text-slate-400">
          Financial Snapshot
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {snapshotCards.map(({ key, label, icon: Icon }) => {
            const value = data.snapshot[key];
            const isNegative = value < 0;

            return (
              <Card
                key={key}
                className="group border border-slate-100 bg-white shadow-sm ring-1 ring-black/5 rounded-[20px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(2,132,199,0.20)]"
              >
                <CardContent className="p-5 flex flex-col h-full justify-between gap-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                      {label}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-100 group-hover:bg-sky-50 group-hover:text-sky-600 group-hover:ring-sky-100 transition-colors">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold font-ibm-plex-sans tracking-tight text-slate-900">
                      {key === 'unapprovedCash' && isNegative ? '-' : ''}
                      {formatAmount(Math.abs(value))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 3 & 4. Mini cash flow chart & Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-6 h-[350px]">
          <CashFlowMini
            data={data.cashFlow}
            title="Cash Flow"
            emptyLabel="No cash flow data available."
          />
        </div>
        <div className="lg:col-span-6 h-[350px]">
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
