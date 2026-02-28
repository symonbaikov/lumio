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

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 16, left: 8, right: 8, bottom: 12, containLabel: true },
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
          name: 'Net',
          type: 'line',
          smooth: true,
          data: data.map(point => point.income - point.expense),
          areaStyle: { color: 'rgba(139, 92, 246, 0.12)' },
          lineStyle: { color: '#8b5cf6', width: 2 },
          itemStyle: { color: '#8b5cf6' },
        },
      ],
    };
  }, [data]);

  return (
    <Card className={cardShell}>
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
          <ReactECharts style={{ height: 200 }} option={option} notMerge lazyUpdate />
        )}
      </CardContent>
    </Card>
  );
}
