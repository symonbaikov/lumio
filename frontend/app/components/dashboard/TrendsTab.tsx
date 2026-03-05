'use client';

import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { useDashboardTrends } from '@/app/hooks/useDashboard';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { cardShell } from '@/app/components/dashboard/common';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface TrendsTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
}

const DAY_OPTIONS: { label: string; value: number }[] = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

export function TrendsTab({ formatAmount }: TrendsTabProps) {
  const [days, setDays] = useState<number>(30);
  const { data: trendsData, loading, error } = useDashboardTrends(days);

  const dailyTrendOption = useMemo(() => {
    if (!trendsData?.dailyTrend?.length) return null;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['Income', 'Expense'] },
      grid: { left: 40, right: 16, top: 40, bottom: 24 },
      xAxis: { type: 'category', data: trendsData.dailyTrend.map(p => p.date) },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Income',
          type: 'line',
          smooth: true,
          data: trendsData.dailyTrend.map(p => p.income),
          areaStyle: { color: 'rgba(14,165,233,0.12)' },
          lineStyle: { color: '#0EA5E9' },
          itemStyle: { color: '#0EA5E9' },
        },
        {
          name: 'Expense',
          type: 'line',
          smooth: true,
          data: trendsData.dailyTrend.map(p => p.expense),
          areaStyle: { color: 'rgba(239,68,68,0.08)' },
          lineStyle: { color: '#DC2626' },
          itemStyle: { color: '#DC2626' },
        },
      ],
    };
  }, [trendsData]);

  const rosePieOption = useMemo(() => {
    if (!trendsData?.categories?.length) return null;
    const top10 = trendsData.categories.slice(0, 10);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: { top: 'bottom' },
      series: [
        {
          name: 'Expense categories',
          type: 'pie',
          radius: ['20%', '60%'],
          roseType: 'radius',
          data: top10.map(c => ({ name: c.name, value: Number(c.amount.toFixed(2)) })),
        },
      ],
    };
  }, [trendsData]);

  const horizontalBarOption = useMemo(() => {
    if (!trendsData?.counterparties?.length) return null;
    const top10 = trendsData.counterparties.slice(0, 10);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 120, right: 24, top: 16, bottom: 16 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: top10.map(c => c.name) },
      series: [
        {
          type: 'bar',
          data: top10.map(c => Number(c.amount.toFixed(2))),
          itemStyle: { color: '#0EA5E9', borderRadius: [0, 4, 4, 0] },
        },
      ],
    };
  }, [trendsData]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Row 1: Day selector */}
      <div className="flex items-center gap-2">
        {DAY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDays(opt.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              days === opt.value
                ? 'bg-sky-500 text-white border-sky-500'
                : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-rose-500">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !trendsData && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-400">No trend data available for this period.</p>
        </div>
      )}

      {/* Data views */}
      {!loading && !error && trendsData && (
        <>
          {/* Row 2: Source KPI strip */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
              Data Sources
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Statements card */}
              <div className={`${cardShell} p-4 flex flex-col gap-2`}>
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Statements
                </span>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Income</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatAmount(trendsData.sources.statements.income)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Expense</span>
                    <span className="text-sm font-bold text-rose-500">
                      {formatAmount(trendsData.sources.statements.expense)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-1 mt-1">
                    <span className="text-xs text-slate-400">Rows</span>
                    <span className="text-xs font-semibold text-slate-600">
                      {trendsData.sources.statements.rows.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary card — Net */}
              <div className={`${cardShell} p-4 flex flex-col gap-2`}>
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Net Flow
                </span>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Net</span>
                    <span
                      className={`text-sm font-bold ${
                        trendsData.sources.statements.income -
                          trendsData.sources.statements.expense >=
                        0
                          ? 'text-emerald-600'
                          : 'text-rose-500'
                      }`}
                    >
                      {formatAmount(
                        Math.abs(
                          trendsData.sources.statements.income -
                            trendsData.sources.statements.expense,
                        ),
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Categories</span>
                    <span className="text-xs font-semibold text-slate-600">
                      {trendsData.categories.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-1 mt-1">
                    <span className="text-xs text-slate-400">Counterparties</span>
                    <span className="text-xs font-semibold text-slate-600">
                      {trendsData.counterparties.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Period card */}
              <div className={`${cardShell} p-4 flex flex-col gap-2`}>
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Period
                </span>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Days</span>
                    <span className="text-sm font-bold text-slate-700">{days}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Data points</span>
                    <span className="text-xs font-semibold text-slate-600">
                      {trendsData.dailyTrend.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-1 mt-1">
                    <span className="text-xs text-slate-400">Top category</span>
                    <span className="text-xs font-semibold text-slate-600 truncate max-w-[100px]">
                      {trendsData.categories[0]?.name ?? '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Row 3: Daily trend (2/3) + Expense pie (1/3) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className={`lg:col-span-8 ${cardShell} p-4`}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Daily Trend
              </h3>
              {dailyTrendOption ? (
                <ReactECharts
                  option={dailyTrendOption}
                  style={{ height: 280 }}
                  notMerge
                  lazyUpdate
                />
              ) : (
                <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
                  No daily trend data
                </div>
              )}
            </div>

            <div className={`lg:col-span-4 ${cardShell} p-4`}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Expense Categories
              </h3>
              {rosePieOption ? (
                <ReactECharts
                  option={rosePieOption}
                  style={{ height: 280 }}
                  notMerge
                  lazyUpdate
                />
              ) : (
                <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
                  No category data
                </div>
              )}
            </div>
          </section>

          {/* Row 4: Income by counterparty (full width) */}
          <section>
            <div className={`${cardShell} p-4`}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Income by Counterparty (Top 10)
              </h3>
              {horizontalBarOption ? (
                <ReactECharts
                  option={horizontalBarOption}
                  style={{ height: 320 }}
                  notMerge
                  lazyUpdate
                />
              ) : (
                <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
                  No counterparty data
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
