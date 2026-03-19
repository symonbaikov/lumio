'use client';

import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { useDashboardTrends } from '@/app/hooks/useDashboard';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface TrendsTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
}

const DAY_OPTIONS: { label: string; value: number }[] = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
];

export function TrendsTab({ formatAmount }: TrendsTabProps) {
  const [days, setDays] = useState<number>(30);
  const { data: trendsData, loading, error } = useDashboardTrends(days);

  const dailyTrendOption = useMemo(() => {
    if (!trendsData?.dailyTrend?.length) return null;
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1a1a1a',
        borderColor: 'transparent',
        textStyle: { color: '#F5F3EF', fontSize: 12 },
      },
      legend: {
        data: ['Income', 'Expense'],
        top: 0,
        right: 0,
        textStyle: { color: '#555555', fontSize: 11, fontFamily: 'var(--font-dashboard-sans)' },
        icon: 'rect',
        itemWidth: 12,
        itemHeight: 6,
      },
      grid: { left: 40, right: 0, top: 40, bottom: 24 },
      xAxis: {
        type: 'category',
        data: trendsData.dailyTrend.map(p => p.date),
        axisLabel: { color: '#555555', fontSize: 10, fontFamily: 'var(--font-dashboard-sans)' },
        axisLine: { lineStyle: { color: '#D1CCC4' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#555555', fontSize: 10, fontFamily: 'var(--font-dashboard-sans)' },
        splitLine: { lineStyle: { color: '#D1CCC4' } },
      },
      series: [
        {
          name: 'Income',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: trendsData.dailyTrend.map(p => p.income),
          areaStyle: { color: 'rgba(26,26,26,0.05)' },
          lineStyle: { color: '#1a1a1a', width: 2 },
          itemStyle: { color: '#1a1a1a' },
        },
        {
          name: 'Expense',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: trendsData.dailyTrend.map(p => p.expense),
          areaStyle: { color: 'rgba(209,61,86,0.08)' },
          lineStyle: { color: '#D13D56', width: 2 },
          itemStyle: { color: '#D13D56' },
        },
      ],
    };
  }, [trendsData]);

  const rosePieOption = useMemo(() => {
    if (!trendsData?.categories?.length) return null;
    const top10 = trendsData.categories.slice(0, 10);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1a1a1a',
        borderColor: 'transparent',
        textStyle: { color: '#F5F3EF', fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#555555', fontSize: 11, fontFamily: 'var(--font-dashboard-sans)' },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          name: 'Expense categories',
          type: 'pie',
          radius: ['20%', '60%'],
          center: ['50%', '45%'],
          roseType: 'radius',
          label: { show: false },
          data: top10.map(c => ({ name: c.name, value: Number(c.amount.toFixed(2)) })),
        },
      ],
    };
  }, [trendsData]);

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="flex items-center justify-between">
        <h1
          className="text-[30px] font-bold text-[#1a1a1a]"
          style={{ fontFamily: 'var(--font-dashboard-mono)' }}
        >
          TRENDS DASHBOARD
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {DAY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDays(opt.value)}
            className={`px-3 py-1.5 rounded-none text-[11px] font-semibold tracking-[1px] transition-colors ${
              days === opt.value
                ? 'bg-[#1a1a1a] text-[#F5F3EF]'
                : 'bg-[#E8E4DC] text-[#555555] hover:bg-[#D1CCC4]'
            }`}
            style={{ fontFamily: 'var(--font-dashboard-mono)' }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1a1a1a] border-t-transparent" />
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center py-12">
          <p
            className="text-[13px] text-[#D13D56]"
            style={{ fontFamily: 'var(--font-dashboard-sans)' }}
          >
            {error}
          </p>
        </div>
      )}

      {!loading && !error && !trendsData && (
        <div className="flex items-center justify-center py-12">
          <p
            className="text-[13px] text-[#888888]"
            style={{ fontFamily: 'var(--font-dashboard-sans)' }}
          >
            No trend data available for this period.
          </p>
        </div>
      )}

      {!loading && !error && trendsData && (
        <>
          <section className="flex flex-col gap-3 mt-4">
            <h2
              className="text-[12px] font-bold tracking-[1px] text-[#555555] uppercase"
              style={{ fontFamily: 'var(--font-dashboard-mono)' }}
            >
              DATA SOURCES
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="bg-[#E8E4DC] p-6 flex flex-col gap-3 rounded-none">
                <h3
                  className="text-[18px] font-bold text-[#1a1a1a]"
                  style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                >
                  STATEMENTS
                </h3>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[14px] text-[#555555]"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      Income
                    </span>
                    <span
                      className="text-[14px] text-[#555555]"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      {formatAmount(trendsData.sources.statements.income)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[14px] text-[#555555]"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      Expense
                    </span>
                    <span
                      className="text-[14px] text-[#555555]"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      {formatAmount(trendsData.sources.statements.expense)}
                    </span>
                  </div>
                </div>
                <div className="mt-auto pt-2">
                  <span
                    className="text-[11px] font-semibold text-[#4A7C59] tracking-[1px] uppercase"
                    style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                  >
                    SYNCED
                  </span>
                </div>
              </div>

              <div className="bg-[#E8E4DC] p-6 flex flex-col gap-3 rounded-none">
                <h3
                  className="text-[18px] font-bold text-[#1a1a1a]"
                  style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                >
                  NET FLOW
                </h3>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[14px] text-[#555555]"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      Net
                    </span>
                    <span
                      className="text-[14px] text-[#555555]"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
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
                    <span
                      className="text-[14px] text-[#555555]"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      Categories
                    </span>
                    <span
                      className="text-[14px] text-[#555555]"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      {trendsData.categories.length}
                    </span>
                  </div>
                </div>
                <div className="mt-auto pt-2">
                  <span
                    className="text-[11px] font-semibold text-[#0584C7] tracking-[1px] uppercase"
                    style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                  >
                    ACTIVE
                  </span>
                </div>
              </div>

              <div className="bg-[#E8E4DC] p-6 flex flex-col gap-3 rounded-none">
                <h3
                  className="text-[18px] font-bold text-[#1a1a1a]"
                  style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                >
                  COUNTERPARTIES
                </h3>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[14px] text-[#555555]"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      Total Found
                    </span>
                    <span
                      className="text-[14px] text-[#555555]"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      {trendsData.counterparties.length}
                    </span>
                  </div>
                </div>
                <div className="mt-auto pt-2">
                  <span
                    className="text-[11px] font-semibold text-[#888888] tracking-[1px] uppercase"
                    style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                  >
                    READY
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start mt-4">
            <div className="lg:col-span-8 bg-[#E8E4DC] p-6 flex flex-col gap-3 rounded-none h-full">
              <h3
                className="text-[18px] font-bold text-[#1a1a1a] uppercase"
                style={{ fontFamily: 'var(--font-dashboard-mono)' }}
              >
                SPEND TREND
              </h3>
              {dailyTrendOption ? (
                <div className="flex-1 min-h-[280px]">
                  <ReactECharts
                    option={dailyTrendOption}
                    style={{ height: '100%', width: '100%' }}
                    notMerge
                    lazyUpdate
                  />
                </div>
              ) : (
                <div
                  className="flex h-[280px] items-center justify-center text-[13px] text-[#888888]"
                  style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                >
                  No trend data available for selected range
                </div>
              )}
            </div>

            <div className="lg:col-span-4 bg-[#E8E4DC] p-6 flex flex-col gap-3 rounded-none h-full">
              <h3
                className="text-[18px] font-bold text-[#1a1a1a] uppercase"
                style={{ fontFamily: 'var(--font-dashboard-mono)' }}
              >
                CATEGORY BREAKDOWN
              </h3>
              {rosePieOption ? (
                <div className="flex-1 min-h-[280px]">
                  <ReactECharts
                    option={rosePieOption}
                    style={{ height: '100%', width: '100%' }}
                    notMerge
                    lazyUpdate
                  />
                </div>
              ) : (
                <div
                  className="flex h-[280px] items-center justify-center text-[13px] text-[#888888]"
                  style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                >
                  No categorized transactions to visualize
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
