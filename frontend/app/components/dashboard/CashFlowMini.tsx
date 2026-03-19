'use client';

import type { DashboardCashFlowPoint } from '@/app/hooks/useDashboard';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

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
        backgroundColor: '#1a1a1a',
        borderColor: 'transparent',
        textStyle: { color: '#F5F3EF', fontSize: 12 },
        formatter: (params: Array<{ seriesName: string; value: number }>) =>
          params.map(p => `${p.seriesName}: ${fmt(p.value)}`).join('<br/>'),
      },
      legend: {
        data: ['Income', 'Expense'],
        top: 0,
        right: 0,
        textStyle: { color: '#7A869B', fontSize: 11, fontFamily: 'var(--font-dashboard-sans)' },
        icon: 'rect',
        itemWidth: 12,
        itemHeight: 6,
      },
      grid: { top: 32, left: 0, right: 0, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category',
        data: data.map(point => point.date),
        axisLabel: {
          fontSize: 10,
          color: '#7A869B',
          fontFamily: 'var(--font-dashboard-sans)',
          rotate: data.length > 15 ? 45 : 0,
        },
        axisLine: { lineStyle: { color: '#D1CCC4' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#7A869B', fontFamily: 'var(--font-dashboard-sans)' },
        splitLine: { lineStyle: { color: '#E8E4DC' } },
      },
      series: [
        {
          name: 'Income',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: data.map(point => point.income),
          areaStyle: { color: 'rgba(13,149,104,0.08)' },
          lineStyle: { color: '#0D9568', width: 2 },
          itemStyle: { color: '#0D9568' },
        },
        {
          name: 'Expense',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: data.map(point => point.expense),
          areaStyle: { color: 'rgba(209,61,86,0.08)' },
          lineStyle: { color: '#D13D56', width: 2 },
          itemStyle: { color: '#D13D56' },
        },
      ],
    };
  }, [data]);

  return (
    <div className="flex flex-col w-full h-full relative">
      <h3
        className="text-[28px] font-semibold text-[#2A364E] absolute top-[-6px] left-0 z-10"
        style={{ fontFamily: 'var(--font-dashboard-mono)' }}
      >
        {title}
      </h3>

      {!option ? (
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-[18px] text-[#B0B7C5]"
            style={{ fontFamily: 'var(--font-dashboard-sans)' }}
          >
            {emptyLabel}
          </span>
        </div>
      ) : (
        <div className="flex-1 w-full mt-8">
          <ReactECharts
            style={{ height: '100%', width: '100%' }}
            option={option}
            notMerge
            lazyUpdate
          />
        </div>
      )}
    </div>
  );
}
