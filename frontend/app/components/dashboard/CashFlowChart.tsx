'use client';

import type { DashboardCashFlowPoint } from '@/app/hooks/useDashboard';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface CashFlowChartProps {
  data: DashboardCashFlowPoint[];
  emptyLabel: string;
}

export function CashFlowChart({ data, emptyLabel }: CashFlowChartProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) return null;

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: {
        top: 0,
        data: ['Income', 'Expense'],
        textStyle: { fontSize: 12 },
      },
      grid: {
        top: 32,
        left: 12,
        right: 12,
        bottom: 8,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: data.map(point => point.date),
        axisLabel: { fontSize: 10, rotate: data.length > 15 ? 45 : 0 },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { color: '#f0f2f4' } },
      },
      series: [
        {
          name: 'Income',
          type: 'line',
          smooth: true,
          data: data.map(point => point.income),
          areaStyle: { color: 'rgba(16, 185, 129, 0.12)' },
          lineStyle: { color: '#10b981', width: 2 },
          itemStyle: { color: '#10b981' },
        },
        {
          name: 'Expense',
          type: 'line',
          smooth: true,
          data: data.map(point => point.expense),
          areaStyle: { color: 'rgba(239, 68, 68, 0.1)' },
          lineStyle: { color: '#ef4444', width: 2 },
          itemStyle: { color: '#ef4444' },
        },
      ],
    };
  }, [data]);

  if (!option) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        {emptyLabel}
      </div>
    );
  }

  return <ReactECharts style={{ height: 280 }} option={option} notMerge lazyUpdate />;
}
