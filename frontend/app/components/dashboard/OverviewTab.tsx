'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { FileUp } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '../ui/spinner';
import { ActionRequired } from './ActionRequired';
import { CashFlowMini } from './CashFlowMini';

interface OverviewTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
  effectivePeriod?: string | null;
}

export function OverviewTab({ data, formatAmount, range, isLoading, effectivePeriod }: OverviewTabProps) {
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
    data.cashFlow.length === 0 && mappedActions.length === 0 && data.snapshot.totalBalance === 0;

  const rangeLabel = range === '7d' ? '7d' : range === '90d' ? '90d' : '30d';

  const snapshotCards = [
    {
      key: 'totalBalance' as const,
      label: 'TOTAL BALANCE',
      colorClass: (v: number) => (v >= 0 ? 'text-[#2A364E]' : 'text-[#D13D56]'),
    },
    {
      key: 'income30d' as const,
      label: `INCOME (${rangeLabel})`.toUpperCase(),
      colorClass: () => 'text-[#0D9568]',
    },
    {
      key: 'expense30d' as const,
      label: `EXPENSE (${rangeLabel})`.toUpperCase(),
      colorClass: () => 'text-[#D13D56]',
    },
    {
      key: 'netFlow30d' as const,
      label: `NET FLOW (${rangeLabel})`.toUpperCase(),
      colorClass: (v: number) => (v >= 0 ? 'text-[#0D9568]' : 'text-[#D13D56]'),
    },
  ];

  if (hasNoData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-none bg-[#E8E4DC] border border-[#D1CCC4] mb-6">
          <FileUp className="h-10 w-10 text-[#7A869B]" />
        </div>
        <h2
          className="text-xl font-bold text-[#2A364E] mb-2"
          style={{ fontFamily: 'var(--font-dashboard-mono)' }}
        >
          Upload your first statement
        </h2>
        <p
          className="text-sm text-[#7A869B] max-w-md mb-8"
          style={{ fontFamily: 'var(--font-dashboard-sans)' }}
        >
          Start tracking your finances by uploading a bank statement. We&apos;ll parse it
          automatically and show your cash flow, categories, and insights.
        </p>
        <Link
          href="/statements?openExpenseDrawer=scan"
          className="inline-flex items-center gap-2 rounded-none bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-[#F5F3EF] transition-colors hover:bg-black"
          style={{ fontFamily: 'var(--font-dashboard-sans)' }}
        >
          <FileUp className="h-4 w-4" />
          Parse statement
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[30px] w-full pb-10">
      {effectivePeriod ? (
        <div
          className="border border-[#D1CCC4] bg-[#F5F3EF] px-4 py-3 text-[12px] text-[#555555]"
          style={{ fontFamily: 'var(--font-dashboard-sans)' }}
        >
          Showing latest available period: {effectivePeriod}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-[32px] xl:grid-cols-4">
        {snapshotCards.map(({ key, label, colorClass }) => {
          const value = data.snapshot[key];
          const textColor = colorClass(value);
          return (
            <Card
              key={key}
              className="border border-[#D1CCC4] bg-[#E8E4DC] shadow-none rounded-none h-[72px]"
            >
              <CardContent className="px-3 py-2 flex flex-col justify-between h-full">
                <span
                  className="text-[10px] font-semibold text-[#7A869B] uppercase tracking-[1px]"
                  style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                >
                  {label}
                </span>
                <span
                  className={`text-[30px] font-bold leading-none ${textColor} mt-1`}
                  style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                >
                  {isLoading ? (
                    <Spinner className="size-3" />
                  ) : (
                    <>
                      {value < 0 && key !== 'expense30d' ? '− ' : ''}
                      {formatAmount(Math.abs(value))}
                    </>
                  )}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-[36px] lg:grid-cols-[217px_1fr]">
        <Card className="border border-[#D1CCC4] bg-[#E8E4DC] shadow-none rounded-none h-[188px]">
          <CardContent className="p-3 flex flex-col h-full overflow-hidden">
            <h2
              className="text-[10px] font-semibold text-[#7A869B] uppercase tracking-[1px] mb-2"
              style={{ fontFamily: 'var(--font-dashboard-mono)' }}
            >
              ACTION REQUIRED
            </h2>
            <div className="flex-1 overflow-y-auto">
              <ActionRequired
                actions={mappedActions}
                title="Action Required"
                emptyLabel="No actions needed"
                isLoading={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#D1CCC4] bg-[#E8E4DC] shadow-none rounded-none h-[188px]">
          <CardContent className="p-3 h-full flex flex-col overflow-hidden">
            <h2
              className="text-[10px] font-semibold text-[#7A869B] uppercase tracking-[1px] mb-2"
              style={{ fontFamily: 'var(--font-dashboard-mono)' }}
            >
              CASH FLOW ({rangeLabel.toUpperCase()})
            </h2>
            <div className="bg-[#E9E4DC] flex-1 flex flex-col relative px-4 py-3 h-[146px]">
              <CashFlowMini
                data={data.cashFlow}
                title={`Cash Flow (${rangeLabel})`}
                emptyLabel="No cash flow data yet"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
