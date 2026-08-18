'use client';

import { tokens } from '@/lib/theme-tokens';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { ProjectionPoint } from '../roi-model';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface RoiProjectionChartProps {
  points: ProjectionPoint[];
  compoundLabel: string;
  simpleLabel: string;
}

export function RoiProjectionChart({
  points,
  compoundLabel,
  simpleLabel,
}: RoiProjectionChartProps) {
  const { resolvedTheme } = useTheme();
  const color = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;

  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { top: 0, data: [compoundLabel, simpleLabel], textStyle: { fontSize: 12 } },
      grid: { top: 32, left: 8, right: 16, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: points.map(point => point.year),
        boundaryGap: false,
        axisLabel: { fontSize: 10, color: color.textSecondary },
        axisLine: { lineStyle: { color: color.border } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: color.textSecondary },
        splitLine: { lineStyle: { color: color.border } },
      },
      series: [
        {
          name: compoundLabel,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: points.map(point => Math.round(point.compound)),
          lineStyle: { color: color.catTransport, width: 2 },
          itemStyle: { color: color.catTransport },
        },
        {
          name: simpleLabel,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: points.map(point => Math.round(point.simple)),
          lineStyle: { color: color.catOther, width: 2, type: 'dashed' },
          itemStyle: { color: color.catOther },
        },
      ],
    }),
    [points, compoundLabel, simpleLabel, color],
  );

  return <ReactECharts option={option} style={{ height: 260, width: '100%' }} notMerge />;
}
