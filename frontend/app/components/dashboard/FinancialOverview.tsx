'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cardShell, subtleBadge } from './common';

export type FinancialKpi = {
  key: 'income' | 'expense' | 'netFlow' | 'unapprovedCash' | 'totalBalance';
  label: string;
  value: number;
  delta?: number; // percentage change vs previous period
};

interface FinancialOverviewProps {
  items: FinancialKpi[];
  periodLabel: string;
  formatAmount: (value: number) => string;
  emptyLabel: string;
}

const toneByKey: Record<FinancialKpi['key'], string> = {
  income: 'text-emerald-700 dark:text-emerald-200',
  expense: 'text-rose-700 dark:text-rose-200',
  netFlow: 'text-[var(--ff-dash-foreground)]',
  unapprovedCash: 'text-amber-700 dark:text-amber-100',
  totalBalance: 'text-[var(--ff-dash-foreground)]',
};

export function FinancialOverview({
  items,
  periodLabel,
  formatAmount,
  emptyLabel,
}: FinancialOverviewProps) {
  if (!items.length) {
    return (
      <Card className={cardShell}>
        <CardContent className="flex h-24 items-center justify-center text-sm text-[var(--ff-dash-muted)]">
          {emptyLabel}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${cardShell} bg-[var(--primary)] text-white shadow-md`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-white/90">Financial overview</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {items.map(item => {
          const delta = item.delta ?? null;
          const isPositive = delta != null && delta >= 0;
          const tone = toneByKey[item.key];

          return (
            <div
              key={item.key}
              className="flex flex-col gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-3 text-white"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-white/80">
                <span className="font-medium">{item.label}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold uppercase tracking-wide">
                  {periodLabel}
                </span>
              </div>
              <div className={`text-xl font-semibold leading-none ff-dashboard-mono ${tone}`}>
                {formatAmount(Math.abs(item.value))}
              </div>
              {delta != null ? (
                <span
                  className={`${subtleBadge} w-fit ${
                    isPositive
                      ? 'bg-emerald-50/90 text-emerald-800 ring-1 ring-inset ring-emerald-100'
                      : 'bg-rose-50/90 text-rose-700 ring-1 ring-inset ring-rose-100'
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {`${isPositive ? '+' : ''}${delta.toFixed(1)}% vs prev`}
                </span>
              ) : (
                <span className="text-xs text-white/70">No change data</span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
