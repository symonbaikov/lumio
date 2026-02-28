'use client';

import type { DashboardCashFlowPoint } from '@/app/hooks/useDashboard';
import { Info } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface FinlabIncomeCardProps {
  data: DashboardCashFlowPoint[];
  formatAmount: (value: number) => string;
}

export function FinlabIncomeCard({ data, formatAmount }: FinlabIncomeCardProps) {
  const totalIncome = data.reduce((sum, p) => sum + p.income, 0);
  const mid = Math.floor(data.length / 2);
  const prevIncome = data.slice(0, mid).reduce((sum, p) => sum + p.income, 0);
  const currIncome = data.slice(mid).reduce((sum, p) => sum + p.income, 0);
  let pct = 0;
  if (prevIncome > 0) {
    pct = ((currIncome - prevIncome) / prevIncome) * 100;
  } else if (currIncome > 0) {
    pct = 100;
  }

  const option = useMemo(() => {
    if (!data.length) return null;
    return {
      grid: { top: 10, right: 0, bottom: 20, left: 0 },
      xAxis: {
        type: 'category',
        data: data.slice(-5).map(d => {
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
          data: data.slice(-5).map(d => d.income),
          itemStyle: { color: '#f97316', borderRadius: [2, 2, 0, 0] },
          barWidth: '35%',
        },
      ],
      tooltip: { show: false },
    };
  }, [data]);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] h-full flex flex-col justify-between border border-slate-100/50">
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
          <button className="text-xs text-slate-400 font-medium flex items-center gap-1">
            Monthly <span className="text-[10px]">▼</span>
          </button>
        </div>
        {option ? (
          <div className="h-[100px] w-full border-t border-slate-100/[0.6] pt-2">
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
