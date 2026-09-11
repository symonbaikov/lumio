'use client';

import { useTheme } from 'next-themes';
import { useMemo } from 'react';
import { LazyECharts } from '@/app/components/ui/lazy-echarts';
import { tokens } from '@/lib/theme-tokens';
import type { NetWorthPoint } from '../hooks/useNetWorth';

interface NetWorthChartProps {
  points: NetWorthPoint[];
  /** Colours the line: growth reads as success, decline as danger. */
  positive: boolean;
}

export function NetWorthChart({ points, positive }: NetWorthChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const color = isDark ? tokens.dark.color : tokens.color;

  const option = useMemo(() => {
    const lineColor = positive ? color.success : color.danger;

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 16, left: 8, right: 16, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: points.map(point => point.date),
        boundaryGap: false,
        axisLabel: { fontSize: 10, color: color.textSecondary },
        axisLine: { lineStyle: { color: color.border } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { fontSize: 10, color: color.textSecondary },
        splitLine: { lineStyle: { color: color.border } },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: points.map(point => point.value),
          lineStyle: { color: lineColor, width: 2 },
          itemStyle: { color: lineColor },
          areaStyle: { color: lineColor, opacity: isDark ? 0.18 : 0.1 },
        },
      ],
    };
  }, [points, positive, color, isDark]);

  return <LazyECharts option={option} style={{ height: 280, width: '100%' }} notMerge />;
}
