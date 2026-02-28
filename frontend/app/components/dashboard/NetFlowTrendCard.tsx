'use client';

import type { DashboardCashFlowPoint } from '@/app/hooks/useDashboard';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Card, CardContent } from '../ui/card';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface NetFlowTrendCardProps {
  data: DashboardCashFlowPoint[];
  formatAmount: (value: number) => string;
}

function computeDelta(values: number[]) {
  if (values.length < 2) return 0;
  const mid = Math.floor(values.length / 2);
  const prev = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid || 0;
  const next = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid || 1);
  if (prev === 0) return next === 0 ? 0 : 100;
  return ((next - prev) / Math.abs(prev)) * 100;
}

export function NetFlowTrendCard({ data, formatAmount }: NetFlowTrendCardProps) {
  const netSeries = useMemo(() => data.map(point => point.income - point.expense), [data]);
  const latest = netSeries.at(-1) ?? 0;
  const delta = computeDelta(netSeries);

  const option = useMemo(() => {
    if (!data.length) return null;
    return {
      backgroundColor: 'transparent',
      grid: { top: 10, right: 10, bottom: 10, left: 0 },
      xAxis: { type: 'category', show: false, data: data.map(p => p.date) },
      yAxis: { type: 'value', show: false },
      tooltip: { show: false },
      series: [
        {
          type: 'line',
          smooth: 0.5,
          showSymbol: false,
          data: netSeries,
          lineStyle: {
            color: '#0284c7',
            width: 3,
            shadowColor: 'rgba(2,132,199,0.35)',
            shadowBlur: 10,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(2,132,199,0.18)' },
                { offset: 1, color: 'rgba(2,132,199,0.02)' },
              ],
            },
          },
        },
      ],
      animationDuration: 1200,
      animationEasing: 'cubicOut',
    };
  }, [data, netSeries]);

  return (
    <Card className="h-full rounded-3xl border border-slate-100 bg-white shadow-[0_18px_46px_-28px_rgba(2,132,199,0.45)]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Net Flow Trend
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`text-3xl font-bold font-ibm-plex-sans tracking-tight text-slate-900`}
              >
                {formatAmount(latest)}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                  delta >= 0
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : 'bg-rose-50 text-rose-700 ring-rose-200'
                }`}
              >
                {delta >= 0 ? '+' : ''}
                {delta.toFixed(1)}%
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Avg vs previous half-period</p>
          </div>
        </div>

        {option ? (
          <div className="mt-4">
            <ReactECharts
              style={{ height: 160, width: '100%' }}
              option={option}
              notMerge
              lazyUpdate
            />
          </div>
        ) : (
          <div className="mt-6 flex h-[160px] items-center justify-center text-sm text-slate-400">
            No data
          </div>
        )}
      </CardContent>
    </Card>
  );
}
