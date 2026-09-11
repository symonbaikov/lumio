'use client';

import { AnalyticsFlowToggle } from '@/app/(main)/statements/components/analytics/AnalyticsFlowToggle';
import { TopCategoriesFilterChipsRow } from '@/app/(main)/statements/components/top-categories/components/TopCategoriesFilterChipsRow';
import { TopCategoriesSearchRow } from '@/app/(main)/statements/components/top-categories/components/TopCategoriesSearchRow';
import type { useTopCategoriesViewModel } from '@/app/(main)/statements/components/top-categories/hooks/useTopCategoriesViewModel';
import type { TopCategoryFlowType } from '@/app/(main)/statements/components/top-categories.utils';

type Props = { vm: ReturnType<typeof useTopCategoriesViewModel> };

export function TopCategoriesPageHeader({ vm }: Props): React.JSX.Element {
  const { labels } = vm;
  return (
    <div
      style={{ marginBottom: 20, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--foreground)' }}>
            {labels.title}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>{labels.subtitle}</p>
        </div>
        <AnalyticsFlowToggle
          activeFlow={vm.activeFlowType}
          spendLabel={labels.tabSpenders}
          incomeLabel={labels.tabIncomeSenders}
          onFlowChange={flow => vm.setActiveFlowType(flow as TopCategoryFlowType)}
        />
      </div>
      <TopCategoriesSearchRow vm={vm} />
      <TopCategoriesFilterChipsRow vm={vm} />
    </div>
  );
}
