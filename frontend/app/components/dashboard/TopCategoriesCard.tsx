'use client';

import type { DashboardData } from '@/app/hooks/useDashboard';
import { useIntlayer } from '@/app/i18n';
import { categoryColorFor } from '@/app/lib/category-defaults';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { CategoryIconBadge } from './CategoryIconBadge';
import { ListRow } from './ui';

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
          radius: ['64%', '88%'],
          avoidLabelOverlap: false,
          itemStyle: { borderColor: isDark ? '#151C24' : '#ffffff', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
          },
          data: categories.map(cat => ({
            value: cat.amount,
            name: categoryDisplayName(cat, labels),
            itemStyle: { color: cat.isOther ? cat.color : categoryColorFor(cat.name, cat.color) },
          })),
        },
      ],
      animationDuration: 1400,
      animationEasing: 'cubicOut',
    };
  }, [categories, labels, isDark, formatAmount]);

  if (!option) {
    return <div className="lumio-dashboard__card-empty">{t.noCategoryData}</div>;
  }

  return (
    <div className="lumio-dashboard__categories">
      <div className="lumio-dashboard__donut">
        <ReactECharts
          style={{ height: '100%', width: '100%' }}
          option={option}
          notMerge
          lazyUpdate
        />
      </div>
      <div className="lumio-dashboard__list">
        {categories.map(cat => (
          <ListRow
            key={categoryKey(cat)}
            leading={
              <CategoryIconBadge
                name={cat.name}
                color={cat.color}
                icon={cat.icon}
                isOther={cat.isOther}
                size={32}
              />
            }
            primary={categoryDisplayName(cat, labels)}
            trailing={
              <>
                <span className="lumio-dashboard__muted">{cat.percent}%</span>
                <span>{formatAmount(cat.amount)}</span>
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}
