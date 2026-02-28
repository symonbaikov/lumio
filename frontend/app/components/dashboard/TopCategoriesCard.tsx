'use client';

import type { DashboardData } from '@/app/hooks/useDashboard';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Card, CardContent } from '../ui/card';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface TopCategoriesCardProps {
  categories: NonNullable<DashboardData['topCategories']>;
}

export function TopCategoriesCard({ categories }: TopCategoriesCardProps) {
  const option = useMemo(() => {
    if (!categories.length) return null;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15,23,42,0.95)',
        textStyle: { color: '#fff', fontSize: 12 },
        borderRadius: 12,
        padding: [10, 12],
      },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'middle',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#475569', fontSize: 12, fontWeight: 600 },
      },
      series: [
        {
          name: 'Categories',
          type: 'pie',
          radius: ['45%', '68%'],
          avoidLabelOverlap: false,
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
          },
          data: categories.map(cat => ({
            value: cat.amount,
            name: cat.name ?? 'Uncategorized',
          })),
        },
      ],
      color: ['#0284c7', '#0ea5e9', '#38bdf8', '#22c55e', '#f59e0b', '#8b5cf6'],
      animationDuration: 1400,
      animationEasing: 'cubicOut',
    };
  }, [categories]);

  return (
    <Card className="h-full rounded-3xl border border-slate-100 bg-white shadow-[0_18px_46px_-28px_rgba(2,132,199,0.45)]">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Top Categories
            </p>
            <p className="mt-1 text-sm text-slate-500">Share of spend</p>
          </div>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
            Donut
          </span>
        </div>

        {option ? (
          <div className="relative">
            <ReactECharts
              style={{ height: 260, width: '100%' }}
              option={option}
              notMerge
              lazyUpdate
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Total
                </p>
                <p className="mt-1 text-lg font-bold text-slate-800">Categories</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
            No data
          </div>
        )}
      </CardContent>
    </Card>
  );
}
