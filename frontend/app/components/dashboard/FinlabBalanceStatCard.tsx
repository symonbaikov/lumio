'use client';

import { Info } from '@/app/components/icons';
import type { DashboardCashFlowPoint, DashboardRange } from '@/app/hooks/useDashboard';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { PeriodDropdown } from './PeriodDropdown';

type ChartTooltipParam = {
  value: number;
};

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
        backgroundColor: 'var(--foreground)',
        borderWidth: 0,
        textStyle: { color: '#fff' },
        formatter: (params: ChartTooltipParam[]) => {
          let str = `<div style="font-weight:bold;margin-bottom:4px;">Total Balance</div>`;
          params.forEach(param => {
            str += `<div style="color:var(--border-color)">${formatAmount(param.value)}</div>`;
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
        axisLine: { show: true, lineStyle: { color: 'var(--muted)' } },
        axisTick: { show: false },
        axisLabel: { color: 'var(--muted-foreground)', fontSize: 11, margin: 12 },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: 'var(--border-color)',
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
            return `$${value}`;
          },
        },
        splitLine: {
          lineStyle: { type: 'dashed', color: 'var(--border-color)' },
        },
      },
      series: [
        {
          name: 'Income',
          type: 'bar',
          data: chartData.map(d => d.income),
          itemStyle: { color: 'var(--color-success-soft-border)' },
          barGap: '20%',
          barWidth: '25%',
        },
        {
          name: 'Expense',
          type: 'bar',
          data: chartData.map(d => d.expense),
          itemStyle: { color: tokens.color.success },
          barWidth: '25%',
        },
      ],
      animationDuration: 1000,
    };
  }, [data, formatAmount, range]);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border-color)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            color: 'var(--foreground)',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          Balance Statistics
          <Info size={16} color="var(--muted-foreground)" />
        </Box>
        <PeriodDropdown value={range} onChange={onRangeChange} />
      </Box>

      <Box sx={{ height: 160, width: '100%' }}>
        {option ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        ) : (
          <Box
            sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography sx={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
              No data available
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
