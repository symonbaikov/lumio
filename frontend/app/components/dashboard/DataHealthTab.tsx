'use client';

import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';

interface DataHealthTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
}

export function DataHealthTab({ data, formatAmount, range, isLoading }: DataHealthTabProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <p className="text-slate-400 text-sm">Data Health tab — coming next</p>
    </div>
  );
}
