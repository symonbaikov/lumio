'use client';

import type { DashboardCashFlowPoint, DashboardRange } from '@/app/hooks/useDashboard';
import { Info } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { PeriodDropdown } from './PeriodDropdown';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface FinlabBalanceStatCardProps {
  data: DashboardCashFlowPoint[];
  formatAmount: (value: number) => string;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}

export function FinlabBalanceStatCard({
  data,
  formatAmount,
  range,
  onRangeChange,
}: FinlabBalanceStatCardProps) {
  const option = useMemo(() => {
    if (!data.length) return null;
    const sliceMap: Record<DashboardRange, number> = {
      '7d': 7,
      '30d': 12,
      '90d': 13,
    };
    const chartData = data.slice(-sliceMap[range]);

    return {
      grid: { top: 30, right: 10, bottom: 20, left: 40 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#1e293b',
        borderWidth: 0,
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          let str = `<div style="font-weight:bold;margin-bottom:4px;">Total Balance</div>`;
          params.forEach((param: any) => {
            str += `<div style="color:#e2e8f0">${formatAmount(param.value)}</div>`;
          });
          return str;
        },
      },
      xAxis: {
        type: 'category',
        data: chartData.map(d => {
          const date = new Date(d.date);
          return date.toLocaleDateString('en-US', { month: 'short' });
        }),
        axisLine: { show: true, lineStyle: { color: '#f1f5f9' } },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11, margin: 12 },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#cbd5e1',
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
            return `$${value}`;
          },
        },
        splitLine: {
          lineStyle: { type: 'dashed', color: '#f8fafc' },
        },
      },
      series: [
        {
          name: 'Income',
          type: 'bar',
          data: chartData.map(d => d.income),
          itemStyle: { color: '#a7f3d0' },
          barGap: '20%',
          barWidth: '25%',
        },
        {
          name: 'Expense',
          type: 'bar',
          data: chartData.map(d => d.expense),
          itemStyle: { color: '#10b981' },
          barWidth: '25%',
        },
      ],
      animationDuration: 1000,
    };
  }, [data, formatAmount, range]);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] h-full flex flex-col border border-slate-100/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5 text-slate-800 font-bold text-base">
          Balance Statistics
          <Info className="w-4 h-4 text-slate-400" />
        </div>
        <PeriodDropdown value={range} onChange={onRangeChange} />
      </div>

      <div className="h-[160px] w-full">
        {option ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
