'use client';

import type { DashboardData } from '@/app/hooks/useDashboard';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

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
        backgroundColor: '#1a1a1a',
        textStyle: { color: '#F5F3EF', fontSize: 12 },
        borderRadius: 0,
        padding: [10, 12],
      },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'middle',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: {
          color: '#555555',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--font-dashboard-sans)',
        },
      },
      series: [
        {
          name: 'Categories',
          type: 'pie',
          radius: ['45%', '68%'],
          avoidLabelOverlap: false,
          itemStyle: { borderColor: '#F5F3EF', borderWidth: 2 },
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
      color: ['#0584C7', '#0D9568', '#D13D56', '#F5A623', '#2A364E', '#7A869B'],
      animationDuration: 1400,
      animationEasing: 'cubicOut',
    };
  }, [categories]);

  if (!option) {
    return (
      <div
        className="flex h-full w-full items-center justify-center text-[13px] text-[#888888]"
        style={{ fontFamily: 'var(--font-dashboard-sans)' }}
      >
        No category data
      </div>
    );
  }

  return (
    <div className="flex h-full w-full relative">
      <ReactECharts style={{ height: '100%', width: '100%' }} option={option} notMerge lazyUpdate />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center pb-2 pr-[80px]">
          <p
            className="text-[10px] font-semibold uppercase tracking-[2px] text-[#7A869B]"
            style={{ fontFamily: 'var(--font-dashboard-mono)' }}
          >
            TOTAL
          </p>
          <p
            className="text-[14px] font-bold text-[#1a1a1a]"
            style={{ fontFamily: 'var(--font-dashboard-sans)' }}
          >
            Categories
          </p>
        </div>
      </div>
    </div>
  );
}
