'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import type { DashboardFinancialSnapshot } from '@/app/hooks/useDashboard';
import { ArrowDownRight, ArrowUpRight, Banknote, Clock, TrendingUp, Wallet } from 'lucide-react';

interface FinancialSnapshotProps {
  snapshot: DashboardFinancialSnapshot;
  formatAmount: (value: number) => string;
  labels: {
    totalBalance: string;
    income: string;
    expense: string;
    netFlow: string;
    toPay: string;
    overdue: string;
  };
}

const cards = [
  { key: 'totalBalance', icon: Wallet, labelKey: 'totalBalance' },
  { key: 'income30d', icon: ArrowUpRight, labelKey: 'income' },
  { key: 'expense30d', icon: ArrowDownRight, labelKey: 'expense' },
  { key: 'netFlow30d', icon: TrendingUp, labelKey: 'netFlow' },
  { key: 'totalPayable', icon: Banknote, labelKey: 'toPay' },
  { key: 'totalOverdue', icon: Clock, labelKey: 'overdue' },
] as const;

export function FinancialSnapshot({ snapshot, formatAmount, labels }: FinancialSnapshotProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
      {cards.map(({ key, labelKey, icon: Icon }) => {
        const value = snapshot[key];

        return (
          <Card
            key={key}
            className="group border-0 bg-white shadow-[0_20px_50px_-30px_rgba(15,23,42,0.55)] ring-1 ring-slate-100/70 rounded-2xl"
          >
            <CardContent className="p-5 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <span>{labels[labelKey]}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-100 group-hover:bg-sky-50 group-hover:text-primary group-hover:ring-sky-100 transition-colors">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-bold font-ibm-plex-sans tracking-tight text-slate-900">
                    {formatAmount(value)}
                  </span>
                </div>
              </div>

              {key === 'netFlow30d' ? (
                <div className="mt-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                      value >= 0
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-rose-50 text-rose-700 ring-rose-200'
                    }`}
                  >
                    {value >= 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {value >= 0 ? 'Positive flow' : 'Negative flow'}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
