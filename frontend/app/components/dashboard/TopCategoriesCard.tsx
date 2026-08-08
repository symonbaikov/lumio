'use client';

import type { DashboardData } from '@/app/hooks/useDashboard';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface TopCategoriesCardProps {
  categories: NonNullable<DashboardData['topCategories']>;
}

export function TopCategoriesCard({ categories }: TopCategoriesCardProps) {
  const option = useMemo(() => {
    if (!categories.length) return null;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1a1a1a',
        textStyle: { color: '#F5F3EF', fontSize: 12 },
        borderRadius: 8,
        padding: [10, 12],
      },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'middle',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: {
          color: 'var(--muted-foreground)',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--font-dashboard-sans)',
        },
      },
      series: [
        {
          name: 'Categories',
          type: 'pie',
          radius: ['45%', '68%'],
          avoidLabelOverlap: false,
          itemStyle: { borderColor: '#F5F3EF', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
          },
          data: categories.map(cat => ({
            value: cat.amount,
            name: cat.name ?? 'Uncategorized',
          })),
        },
      ],
      color: ['#0584C7', '#0D9568', '#D13D56', '#F5A623', '#2A364E', '#7A869B'],
      animationDuration: 1400,
      animationEasing: 'cubicOut',
    };
  }, [categories]);

  if (!option) {
    return (
      <Box
        sx={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          color: 'var(--muted-foreground)',
          fontFamily: 'var(--font-dashboard-sans)',
        }}
      >
        No category data
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%', position: 'relative' }}>
      <ReactECharts style={{ height: '100%', width: '100%' }} option={option} notMerge lazyUpdate />
      <Box
        sx={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center', pb: 0.5, pr: '80px' }}>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-dashboard-mono)',
            }}
          >
            TOTAL
          </Typography>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--foreground)',
              fontFamily: 'var(--font-dashboard-sans)',
            }}
          >
            Categories
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
