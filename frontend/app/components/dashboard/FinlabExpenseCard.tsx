'use client';

import type { DashboardCashFlowPoint, DashboardRange } from '@/app/hooks/useDashboard';
import { Info } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { PeriodDropdown } from './PeriodDropdown';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface FinlabExpenseCardProps {
  data: DashboardCashFlowPoint[];
  formatAmount: (value: number) => string;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}

export function FinlabExpenseCard({
  data,
  formatAmount,
  range,
  onRangeChange,
}: FinlabExpenseCardProps) {
  const totalExpense = data.reduce((sum, p) => sum + (p.expense ?? 0), 0);
  const mid = Math.floor(data.length / 2);
  const prevExpense = data.slice(0, mid).reduce((sum, p) => sum + (p.expense ?? 0), 0);
  const currExpense = data.slice(mid).reduce((sum, p) => sum + (p.expense ?? 0), 0);
  let pct = 0;
  if (prevExpense > 0) {
    pct = ((currExpense - prevExpense) / prevExpense) * 100;
  } else if (currExpense > 0) {
    pct = 100;
  }

  // Finlab usually uses red/rose for expenses, but the ref image uses a blue line chart for Expense Analysis.
  const option = useMemo(() => {
    if (!data.length) return null;
    const sliceMap: Record<DashboardRange, number> = {
      '7d': 7,
      '30d': 10,
      '90d': 12,
    };
    const chartData = data.slice(-sliceMap[range]);
    return {
      grid: { top: 10, right: 10, bottom: 20, left: 10 },
      xAxis: {
        type: 'category',
        data: chartData.map(() => ''),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
      },
      yAxis: { show: false },
      series: [
        {
          type: 'line',
          smooth: true,
          data: chartData.map(d => d.expense),
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 3, color: '#3b82f6' },
          symbol: 'circle',
          symbolSize: 6,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59,130,246,0.2)' },
                { offset: 1, color: 'rgba(59,130,246,0)' },
              ],
            },
          },
        },
      ],
      tooltip: { show: false },
    };
  }, [data, range]);

  return (
    <div className="bg-white rounded-none p-6 shadow-none h-full flex flex-col justify-between border border-[#E8E8E8]">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium text-sm">
            Expense Analysis
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-[32px] font-bold text-slate-900 tracking-tight">
            {formatAmount(totalExpense)}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${pct <= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}
            >
              ⬊ {pct > 0 ? '+' : ''}
              {pct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 font-medium">VS This Month</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-center mb-2">
          <PeriodDropdown value={range} onChange={onRangeChange} />
        </div>
        {option ? (
          <div className="h-[100px] w-full">
            <ReactECharts option={option} style={{ height: '100px', width: '100%' }} />
          </div>
        ) : (
          <div className="h-[100px] flex items-center justify-center text-xs text-slate-400">
            No data
          </div>
        )}
      </div>
    </div>
  );
}
