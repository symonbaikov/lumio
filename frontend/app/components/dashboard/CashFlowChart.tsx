'use client';

import type { DashboardCashFlowPoint } from '@/app/hooks/useDashboard';
import { tokens } from '@/lib/theme-tokens';
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
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
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
          lineStyle: { color: tokens.color.success, width: 2 },
          itemStyle: { color: tokens.color.success },
        },
        {
          name: 'Expense',
          type: 'line',
          smooth: true,
          data: data.map(point => point.expense),
          areaStyle: { color: 'rgba(239, 68, 68, 0.1)' },
          lineStyle: { color: 'var(--destructive)', width: 2 },
          itemStyle: { color: 'var(--destructive)' },
        },
      ],
    };
  }, [data]);

  if (!option) {
    return (
      <div
        style={{
          display: 'flex',
          height: 256,
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          color: 'var(--muted-foreground)',
        }}
      >
        {emptyLabel}
      </div>
    );
  }

  return <ReactECharts style={{ height: 280 }} option={option} notMerge lazyUpdate />;
}
