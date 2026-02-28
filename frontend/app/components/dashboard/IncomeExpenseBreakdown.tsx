'use client';

import type { DashboardCashFlowPoint } from '@/app/hooks/useDashboard';
import { Banknote, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface IncomeExpenseBreakdownProps {
  data: DashboardCashFlowPoint[];
  formatAmount: (value: number) => string;
}

export function IncomeExpenseBreakdown({ data, formatAmount }: IncomeExpenseBreakdownProps) {
  const totalIncome = data.reduce((sum, p) => sum + p.income, 0);
  const totalExpense = data.reduce((sum, p) => sum + p.expense, 0);
  const total = totalIncome + totalExpense || 1;

  const incomePct = Math.round((totalIncome / total) * 100);
  const expensePct = 100 - incomePct;
  const net = totalIncome - totalExpense;

  return (
    <Card className="h-full rounded-3xl border border-slate-100 bg-white shadow-[0_18px_46px_-28px_rgba(2,132,199,0.45)]">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Income vs Expense
            </p>
            <p className="mt-1 text-sm text-slate-500">Breakdown for selected period</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-100">
            <Banknote className="h-4 w-4" />
            Ratio
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-primary ring-1 ring-sky-100">
                <TrendingUp className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-primary">Income</p>
                <p className="text-base font-semibold text-slate-900">
                  {formatAmount(totalIncome)}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-primary">{incomePct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${incomePct}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                <TrendingDown className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-600">Expense</p>
                <p className="text-base font-semibold text-slate-900">
                  {formatAmount(totalExpense)}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-600">{expensePct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-100">
            <div
              className="h-full rounded-full bg-slate-400 transition-all"
              style={{ width: `${expensePct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
          <div className="text-sm font-semibold text-slate-600">Net Flow</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-lg font-bold font-ibm-plex-sans text-slate-900`}>
              {formatAmount(net)}
            </span>
            <span className="text-xs text-slate-500">(Income - Expense)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
