'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import Link from 'next/link';
import type { DashboardTopMerchant } from '@/app/hooks/useDashboard';

interface TopMerchantsCardProps {
  merchants: DashboardTopMerchant[];
  title: string;
  emptyLabel: string;
  formatAmount: (value: number) => string;
}

export function TopMerchantsCard({
  merchants,
  title,
  emptyLabel,
  formatAmount,
}: TopMerchantsCardProps) {
  const maxAmount = merchants[0]?.amount ?? 1;

  return (
    <Card className="border-gray-200/80 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {merchants.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-500">
            {emptyLabel}
          </div>
        ) : (
          <div className="space-y-3">
            {merchants.map((merchant, index) => (
              <Link
                key={`${merchant.name}-${index}`}
                href={`/statements?counterparty=${encodeURIComponent(merchant.name)}`}
                className="block group"
              >
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900 group-hover:text-primary truncate max-w-[60%]">
                    {merchant.name}
                  </span>
                  <span className="font-semibold text-gray-900 shrink-0">
                    {formatAmount(merchant.amount)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-rose-400 transition-all"
                    style={{ width: `${(merchant.amount / maxAmount) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
