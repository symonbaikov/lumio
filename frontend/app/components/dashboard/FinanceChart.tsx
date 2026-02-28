'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import type { DashboardCashFlowPoint } from '@/app/hooks/useDashboard';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface FinanceChartProps {
  data: DashboardCashFlowPoint[];
  title?: string;
}

export function FinanceChart({ data, title }: FinanceChartProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) return null;

    const netFlow = data.map(point => point.income - point.expense);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        textStyle: {
          color: '#ffffff',
          fontSize: 13,
          fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
        },
        padding: [16, 20],
        borderRadius: 16,
        extraCssText:
          'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1); backdrop-filter: blur(12px);',
        axisPointer: {
          type: 'line',
          lineStyle: { color: 'rgba(245, 158, 11, 0.3)', width: 2, type: 'dashed' },
        },
      },
      legend: {
        data: ['Income', 'Expenses', 'Net Flow'],
        top: 0,
        right: 12,
        icon: 'circle',
        itemGap: 32,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: {
          color: '#64748b',
          fontSize: 14,
          fontWeight: 500,
          fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
        },
      },
      grid: {
        top: 60,
        left: 0,
        right: 0,
        bottom: 0,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: data.map(point => {
          const d = new Date(point.date);
          return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
        }),
        boundaryGap: false,
        axisLabel: {
          fontSize: 13,
          color: '#94a3b8',
          margin: 20,
          fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
          fontWeight: 500,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 13,
          color: '#94a3b8',
          fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
          fontWeight: 500,
          formatter: (value: number) => {
            if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
            if (value <= -1000) return `${(value / 1000).toFixed(0)}k`;
            return value;
          },
        },
        splitLine: {
          lineStyle: { color: 'rgba(226, 232, 240, 0.6)', type: 'dashed' },
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: 'Income',
          type: 'line',
          smooth: 0.5,
          showSymbol: false,
          symbolSize: 8,
          data: data.map(point => point.income),
          lineStyle: {
            color: '#10b981',
            width: 3,
            shadowColor: 'rgba(16, 185, 129, 0.3)',
            shadowBlur: 10,
            shadowOffsetY: 5,
          },
          itemStyle: {
            color: '#10b981',
            borderColor: '#ffffff',
            borderWidth: 3,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.25)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.0)' },
              ],
            },
          },
        },
        {
          name: 'Expenses',
          type: 'line',
          smooth: 0.5,
          showSymbol: false,
          symbolSize: 8,
          data: data.map(point => point.expense),
          lineStyle: {
            color: '#f59e0b',
            width: 3,
            shadowColor: 'rgba(245, 158, 11, 0.3)',
            shadowBlur: 10,
            shadowOffsetY: 5,
          },
          itemStyle: {
            color: '#f59e0b',
            borderColor: '#ffffff',
            borderWidth: 3,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245, 158, 11, 0.25)' },
                { offset: 1, color: 'rgba(245, 158, 11, 0.0)' },
              ],
            },
          },
        },
        {
          name: 'Net Flow',
          type: 'line',
          smooth: 0.5,
          showSymbol: false,
          symbolSize: 8,
          data: netFlow,
          lineStyle: {
            color: '#0284c7',
            width: 3,
            shadowColor: 'rgba(2, 132, 199, 0.35)',
            shadowBlur: 12,
            shadowOffsetY: 6,
          },
          itemStyle: {
            color: '#0284c7',
            borderColor: '#ffffff',
            borderWidth: 3,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(2, 132, 199, 0.18)' },
                { offset: 1, color: 'rgba(2, 132, 199, 0.0)' },
              ],
            },
          },
          z: 3,
        },
      ],
      animationDuration: 2000,
      animationEasing: 'cubicOut',
      animationDelay: 200,
    };
  }, [data]);

  return (
    <Card className="border-0 shadow-[0_28px_60px_-34px_rgba(2,132,199,0.55)] rounded-[28px] bg-white overflow-hidden text-left relative z-10 w-full mb-6">
      <CardContent className="p-8 pb-6">
        <div className="mb-8 flex items-center justify-between">
          <h3 className="text-[13px] font-[700] uppercase tracking-[0.24em] text-slate-500">
            {title || 'Cash Flow Overview'}
          </h3>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
            Live chart
          </span>
        </div>
        {!option ? (
          <div className="flex h-[420px] flex-col items-center justify-center gap-3 text-sm text-gray-400">
            <span>No data available for this period.</span>
          </div>
        ) : (
          <div className="w-full relative">
            <ReactECharts
              style={{ height: 420, width: '100%' }}
              option={option}
              notMerge
              lazyUpdate
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
