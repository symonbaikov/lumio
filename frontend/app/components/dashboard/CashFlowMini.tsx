'use client';

import type { DashboardCashFlowPoint } from '@/app/hooks/useDashboard';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface CashFlowMiniProps {
  data: DashboardCashFlowPoint[];
  emptyLabel: string;
  incomeLabel: string;
  expenseLabel: string;
  onUploadClick?: () => void;
}

export function CashFlowMini({
  data,
  emptyLabel,
  incomeLabel,
  expenseLabel,
  onUploadClick,
}: CashFlowMiniProps) {
  const { resolvedTheme } = useTheme();
  const option = useMemo(() => {
    if (!data || data.length === 0) return null;

    const isDark = resolvedTheme === 'dark';
    const tooltipBackground = isDark ? '#151C24' : '#1a1a1a';
    const tooltipText = isDark ? '#E2E8F0' : '#F5F3EF';
    const mutedText = isDark ? '#8899AA' : 'var(--muted-foreground)';
    const gridLine = isDark ? '#2A3442' : '#E8E4DC';
    const axisLine = isDark ? '#2A3442' : '#D1CCC4';
    const incomeLine = isDark ? '#34D399' : '#0D9568';
    const expenseLine = '#D13D56';
    const showPointSymbols = data.length <= 2;

    const fmt = (v: number) =>
      new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipBackground,
        borderColor: 'transparent',
        textStyle: { color: tooltipText, fontSize: 12 },
        formatter: (params: Array<{ seriesName: string; value: number }>) =>
          params.map(p => `${p.seriesName}: ${fmt(p.value)}`).join('<br/>'),
      },
      legend: {
        data: [incomeLabel, expenseLabel],
        top: 0,
        right: 0,
        textStyle: { color: mutedText, fontSize: 11, fontFamily: 'var(--font-dashboard-sans)' },
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
          color: mutedText,
          fontFamily: 'var(--font-dashboard-sans)',
          rotate: data.length > 15 ? 45 : 0,
        },
        axisLine: { lineStyle: { color: axisLine } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          show: false,
          fontSize: 10,
          color: mutedText,
          fontFamily: 'var(--font-dashboard-sans)',
        },
        splitLine: { lineStyle: { color: gridLine } },
      },
      series: [
        {
          name: incomeLabel,
          type: 'line',
          smooth: true,
          symbol: showPointSymbols ? 'circle' : 'none',
          symbolSize: showPointSymbols ? 7 : 0,
          showSymbol: showPointSymbols,
          data: data.map(point => point.income),
          areaStyle: { color: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(13,149,104,0.08)' },
          lineStyle: { color: incomeLine, width: 2 },
          itemStyle: { color: incomeLine },
        },
        {
          name: expenseLabel,
          type: 'line',
          smooth: true,
          symbol: showPointSymbols ? 'circle' : 'none',
          symbolSize: showPointSymbols ? 7 : 0,
          showSymbol: showPointSymbols,
          data: data.map(point => point.expense),
          areaStyle: { color: 'rgba(209,61,86,0.08)' },
          lineStyle: { color: expenseLine, width: 2 },
          itemStyle: { color: expenseLine },
        },
      ],
    };
  }, [data, resolvedTheme, incomeLabel, expenseLabel]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {!option ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span
            style={{
              fontSize: 18,
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-dashboard-sans)',
            }}
          >
            {emptyLabel}
          </span>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {/* Pinned to the box so ECharts measures a definite size, not its 100px default. */}
          <ReactECharts
            style={{ position: 'absolute', inset: 0 }}
            option={option}
            notMerge
            lazyUpdate
          />
        </div>
      )}
    </div>
  );
}
