'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import type { DashboardCashFlowPoint } from '@/app/hooks/useDashboard';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { cardShell } from './common';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface CashFlowMiniProps {
  data: DashboardCashFlowPoint[];
  title: string;
  emptyLabel: string;
  onUploadClick?: () => void;
}

export function CashFlowMini({ data, title, emptyLabel, onUploadClick }: CashFlowMiniProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) return null;

    const fmt = (v: number) =>
      new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.90)',
        borderColor: 'transparent',
        textStyle: { color: '#fff', fontSize: 12 },
        formatter: (params: Array<{ seriesName: string; value: number }>) =>
          params.map(p => `${p.seriesName}: ${fmt(p.value)}`).join('<br/>'),
      },
      legend: {
        data: ['Income', 'Expense'],
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        icon: 'roundRect',
        itemWidth: 12,
        itemHeight: 6,
      },
      grid: { top: 16, left: 8, right: 8, bottom: 36, containLabel: true },
      xAxis: {
        type: 'category',
        data: data.map(point => point.date),
        axisLabel: { fontSize: 10, color: '#94a3b8', rotate: data.length > 15 ? 45 : 0 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          name: 'Income',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: data.map(point => point.income),
          areaStyle: { color: 'rgba(34,197,94,0.08)' },
          lineStyle: { color: '#22c55e', width: 2 },
          itemStyle: { color: '#22c55e' },
        },
        {
          name: 'Expense',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: data.map(point => point.expense),
          areaStyle: { color: 'rgba(239,68,68,0.08)' },
          lineStyle: { color: '#ef4444', width: 2 },
          itemStyle: { color: '#ef4444' },
        },
      ],
    };
  }, [data]);

  return (
    <Card className={`${cardShell} h-full`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-[var(--ff-dashboard-card-foreground)]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!option ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-sm text-[var(--ff-dash-muted)]">
            <span>{emptyLabel}</span>
            {onUploadClick ? (
              <button
                type="button"
                onClick={onUploadClick}
                className="rounded-full bg-[var(--ff-dash-cta)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-110"
              >
                Upload statement
              </button>
            ) : null}
          </div>
        ) : (
          <ReactECharts style={{ height: 240 }} option={option} notMerge lazyUpdate />
        )}
      </CardContent>
    </Card>
  );
}
