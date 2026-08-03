'use client';

import { Info } from '@/app/components/icons';
import type { DashboardCashFlowPoint, DashboardRange } from '@/app/hooks/useDashboard';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
        axisLabel: { color: 'var(--muted-foreground)', fontSize: 10, margin: 8 },
      },
      yAxis: { show: false },
      series: [
        {
          type: 'bar',
          data: chartData.map(d => d.income),
          itemStyle: { color: '#f97316', borderRadius: [4, 4, 0, 0] },
          barWidth: '35%',
        },
      ],
      tooltip: { show: false },
    };
  }, [data, range]);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: '1px solid var(--border-color)',
      }}
    >
      <div>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              color: 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            Income Analysis
            <Info size={14} color="var(--muted-foreground)" />
          </Box>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography
            sx={{
              fontSize: 32,
              fontWeight: 700,
              color: 'var(--foreground)',
              letterSpacing: '-0.02em',
            }}
          >
            {formatAmount(totalIncome)}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 6px',
                fontSize: 11,
                fontWeight: 700,
                ...(pct >= 0
                  ? { backgroundColor: 'var(--color-success-soft-bg)', color: '#16a34a' }
                  : { backgroundColor: 'var(--color-error-soft-bg)', color: 'var(--destructive)' }),
              }}
            >
              ⬈ {pct > 0 ? '+' : ''}
              {pct.toFixed(1)}%
            </span>
            <Typography sx={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 500 }}>
              VS This Month
            </Typography>
          </Box>
        </Box>
      </div>

      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <PeriodDropdown value={range} onChange={onRangeChange} />
        </Box>
        {option ? (
          <Box
            sx={{ height: 80, width: '100%', borderTop: '1px solid rgba(232,232,232,0.6)', pt: 1 }}
          >
            <ReactECharts option={option} style={{ height: '80px', width: '100%' }} />
          </Box>
        ) : (
          <Box sx={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No data</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
