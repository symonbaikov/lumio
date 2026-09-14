'use client';

import { useMemo } from 'react';
import type { DonutSlice } from '@/app/components/charts/CategoryDonut';
import { LazyCategoryDonut } from '@/app/components/charts/lazy-charts';
import type { DashboardData } from '@/app/hooks/useDashboard';
import { useIntlayer } from '@/app/i18n';
import { categoryColorFor } from '@/app/lib/category-defaults';
import { CategoryIconBadge } from './CategoryIconBadge';
import { ListRow } from './ui';

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
  const labels = useMemo(
    () => ({ uncategorized: t.uncategorized.value, other: t.other.value }),
    [t.uncategorized, t.other],
  );

  const slices = useMemo<DonutSlice[]>(
    () =>
      categories.map(cat => ({
        key: categoryKey(cat),
        name: categoryDisplayName(cat, labels),
        value: cat.amount,
        color: cat.isOther ? cat.color : categoryColorFor(cat.name, cat.color),
      })),
    [categories, labels],
  );

  if (!categories.length) {
    return <div className="lumio-dashboard__card-empty">{t.noCategoryData}</div>;
  }

  return (
    <div className="lumio-dashboard__categories">
      <div className="lumio-dashboard__donut">
        <LazyCategoryDonut slices={slices} formatAmount={formatAmount} />
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
