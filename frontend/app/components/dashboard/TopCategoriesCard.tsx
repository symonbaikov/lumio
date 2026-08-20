'use client';

import type { DashboardData } from '@/app/hooks/useDashboard';
import { useIntlayer } from '@/app/i18n';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { CategoryIconBadge } from './CategoryIconBadge';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type TopCategory = NonNullable<DashboardData['topCategories']>[number];

interface TopCategoriesCardProps {
  categories: NonNullable<DashboardData['topCategories']>;
  formatAmount: (value: number) => string;
}

function categoryDisplayName(
  cat: TopCategory,
  labels: { uncategorized: string; other: string },
): string {
  if (cat.isOther) {
    return labels.other;
  }
  return cat.name ?? labels.uncategorized;
}

function categoryKey(cat: TopCategory): string {
  if (cat.isOther) {
    return '__other__';
  }
  return cat.id ?? '__uncategorized__';
}

export function TopCategoriesCard({ categories, formatAmount }: TopCategoriesCardProps) {
  const t = useIntlayer('topCategoriesCard');
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const labels = useMemo(
    () => ({ uncategorized: t.uncategorized.value, other: t.other.value }),
    [t.uncategorized, t.other],
  );

  const option = useMemo(() => {
    if (!categories.length) {
      return null;
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? '#151C24' : '#1a1a1a',
        textStyle: { color: isDark ? '#E2E8F0' : '#F5F3EF', fontSize: 12 },
        borderRadius: 8,
        padding: [10, 12],
        formatter: (params: { name: string; value: number; percent: number }) =>
          `${params.name}: ${formatAmount(params.value)} (${params.percent}%)`,
      },
      series: [
        {
          name: 'Categories',
          type: 'pie',
          radius: ['62%', '85%'],
          avoidLabelOverlap: false,
          itemStyle: { borderColor: isDark ? '#151C24' : '#ffffff', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
          },
          data: categories.map(cat => ({
            value: cat.amount,
            name: categoryDisplayName(cat, labels),
            itemStyle: { color: cat.color },
          })),
        },
      ],
      animationDuration: 1400,
      animationEasing: 'cubicOut',
    };
  }, [categories, labels, isDark, formatAmount]);

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
        {t.noCategoryData}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%', gap: 2 }}>
      <Box sx={{ flex: '0 0 140px', minWidth: 0, height: '100%' }}>
        <ReactECharts
          style={{ height: '100%', width: '100%' }}
          option={option}
          notMerge
          lazyUpdate
        />
      </Box>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          overflowY: 'auto',
        }}
      >
        {categories.map(cat => (
          <Box key={categoryKey(cat)} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIconBadge color={cat.color} icon={cat.icon} isOther={cat.isOther} />
            <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
              {categoryDisplayName(cat, labels)}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>
              {cat.percent}%
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, flexShrink: 0, minWidth: 90, textAlign: 'right' }}
            >
              {formatAmount(cat.amount)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
