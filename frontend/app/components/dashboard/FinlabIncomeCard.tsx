'use client';

import type { DashboardCashFlowPoint, DashboardRange } from '@/app/hooks/useDashboard';
import { Info } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { PeriodDropdown } from './PeriodDropdown';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface FinlabIncomeCardProps {
  data: DashboardCashFlowPoint[];
  formatAmount: (value: number) => string;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}

export function FinlabIncomeCard({
  data,
  formatAmount,
  range,
  onRangeChange,
}: FinlabIncomeCardProps) {
  const totalIncome = data.reduce((sum, p) => sum + (p.income ?? 0), 0);
  const mid = Math.floor(data.length / 2);
  const prevIncome = data.slice(0, mid).reduce((sum, p) => sum + (p.income ?? 0), 0);
  const currIncome = data.slice(mid).reduce((sum, p) => sum + (p.income ?? 0), 0);
  let pct = 0;
  if (prevIncome > 0) {
    pct = ((currIncome - prevIncome) / prevIncome) * 100;
  } else if (currIncome > 0) {
    pct = 100;
  }

  const option = useMemo(() => {
    if (!data.length) return null;
    const sliceMap: Record<DashboardRange, number> = {
      '7d': 7,
      '30d': 10,
      '90d': 12,
    };
    const chartData = data.slice(-sliceMap[range]);
    return {
      grid: { top: 10, right: 0, bottom: 20, left: 0 },
      xAxis: {
        type: 'category',
        data: chartData.map(d => {
          const date = new Date(d.date);
          return date.toLocaleDateString('en-US', { month: 'short' });
        }),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10, margin: 8 },
      },
      yAxis: { show: false },
      series: [
        {
          type: 'bar',
          data: chartData.map(d => d.income),
          itemStyle: { color: '#f97316', borderRadius: [2, 2, 0, 0] },
          barWidth: '35%',
        },
      ],
      tooltip: { show: false },
    };
  }, [data, range]);

  return (
    <div className="bg-white rounded-3xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] h-full flex flex-col justify-between border border-slate-100/50">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium text-sm">
            Income Analysis
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-[32px] font-bold text-slate-900 tracking-tight">
            {formatAmount(totalIncome)}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${pct >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}
            >
              ⬈ {pct > 0 ? '+' : ''}
              {pct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 font-medium">VS This Month</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-end mb-2">
          <PeriodDropdown value={range} onChange={onRangeChange} />
        </div>
        {option ? (
          <div className="h-[80px] w-full border-t border-slate-100/[0.6] pt-2">
            <ReactECharts option={option} style={{ height: '80px', width: '100%' }} />
          </div>
        ) : (
          <div className="h-[80px] flex items-center justify-center text-xs text-slate-400">
            No data
          </div>
        )}
      </div>
    </div>
  );
}
