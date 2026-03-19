'use client';

import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { Info } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { PeriodDropdown } from './PeriodDropdown';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface FinlabExpenseCategoryCardProps {
  categories: NonNullable<DashboardData['topCategories']>;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}

const COLORS = ['#3b82f6', '#f97316', '#ef4444', '#10b981', '#8b5cf6'];

export function FinlabExpenseCategoryCard({
  categories,
  formatAmount,
  range,
  onRangeChange,
}: FinlabExpenseCategoryCardProps) {
  const total = useMemo(() => categories.reduce((sum, c) => sum + c.amount, 0) || 1, [categories]);

  const option = useMemo(() => {
    if (!categories.length) return null;

    return {
      tooltip: { show: false },
      series: [
        {
          type: 'pie',
          radius: ['60%', '80%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          itemStyle: { borderWidth: 4, borderColor: '#fff' },
          data: categories.map((cat, idx) => ({
            value: cat.amount,
            name: cat.name ?? 'Other',
            itemStyle: { color: COLORS[idx % COLORS.length] },
          })),
        },
      ],
      animationDuration: 1000,
    };
  }, [categories]);

  return (
    <div className="bg-white rounded-none p-6 shadow-none h-full border border-[#E8E8E8]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-slate-800 font-bold text-base">
          Expense Category
          <Info className="w-4 h-4 text-slate-400" />
        </div>
        <PeriodDropdown value={range} onChange={onRangeChange} />
      </div>

      {!categories.length ? (
        <div className="flex h-[160px] items-center justify-center text-sm text-slate-400">
          No data available
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
          <div className="relative w-[140px] h-[140px] shrink-0">
            {option && <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-slate-800">100%</span>
              <span className="text-[10px] text-slate-400 font-medium">Data Recorded</span>
            </div>
          </div>

          <div className="flex-1 space-y-3 min-w-0 pr-4 w-full">
            {categories.slice(0, 4).map((cat, idx) => {
              const pct = ((cat.amount / total) * 100).toFixed(1);
              return (
                <div
                  key={cat.id ?? cat.name ?? `cat-${idx}`}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-sm text-slate-600 font-medium truncate">
                      {cat.name ?? 'Other'} <span className="text-slate-400 text-xs">({pct}%)</span>
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                    {formatAmount(cat.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
