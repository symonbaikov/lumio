'use client';

import type { DashboardData } from '@/app/hooks/useDashboard';
import { Card, CardContent } from '../ui/card';

interface TopMerchantsCardProps {
  merchants: NonNullable<DashboardData['topMerchants']>;
  formatAmount: (value: number) => string;
}

export function TopMerchantsCard({ merchants, formatAmount }: TopMerchantsCardProps) {
  if (!merchants.length) {
    return (
      <Card className="h-full rounded-3xl border border-slate-100 bg-white shadow-sm">
        <CardContent className="flex h-full items-center justify-center text-sm text-slate-400">
          No merchants data
        </CardContent>
      </Card>
    );
  }

  const maxAmount = Math.max(...merchants.map(m => m.amount));

  return (
    <Card className="h-full rounded-3xl border border-slate-100 bg-white shadow-[0_18px_46px_-28px_rgba(2,132,199,0.45)]">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Top Merchants
            </p>
            <p className="mt-1 text-sm text-slate-500">Spending distribution</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">Last period</span>
        </div>

        <div className="space-y-4">
          {merchants.slice(0, 5).map(merchant => {
            const width = Math.max(6, Math.round((merchant.amount / maxAmount) * 100));
            return (
              <div key={merchant.name} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-100">
                      {merchant.name?.[0] ?? '•'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {merchant.name}
                      </p>
                      <p className="text-xs text-slate-500">{merchant.count} payments</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatAmount(merchant.amount)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#0284c7] transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
