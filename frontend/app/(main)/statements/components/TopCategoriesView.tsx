'use client';

import { AnalyticsLeaderboardSkeleton } from '@/app/(main)/statements/components/analytics/AnalyticsLeaderboardSkeleton';
import { TopCategoriesContent } from '@/app/(main)/statements/components/top-categories/components/TopCategoriesContent';
import { TopCategoriesDrillDown } from '@/app/(main)/statements/components/top-categories/components/TopCategoriesDrillDown';
import { TopCategoriesFiltersDrawer } from '@/app/(main)/statements/components/top-categories/components/TopCategoriesFiltersDrawer';
import { TopCategoriesPageHeader } from '@/app/(main)/statements/components/top-categories/components/TopCategoriesPageHeader';
import {
  type TopCategoriesViewModelReturn,
  useTopCategoriesViewModel,
} from '@/app/(main)/statements/components/top-categories/hooks/useTopCategoriesViewModel';
import { tokens } from '@/lib/theme-tokens';

type VmProps = { vm: TopCategoriesViewModelReturn };

function TopCategoriesBody({ vm }: VmProps): React.JSX.Element {
  if (vm.loading) {
    return <AnalyticsLeaderboardSkeleton />;
  }
  if (vm.flowFilteredRecords.length === 0) {
    return (
      <div
        style={{
          border: '1px dashed var(--border-color)',
          background: 'var(--card-bg)',
          padding: 48,
          textAlign: 'center',
          fontSize: 14,
          color: 'var(--muted-foreground)',
          borderRadius: tokens.radius.lg,
        }}
      >
        {vm.labels.noData}
      </div>
    );
  }
  return <TopCategoriesContent vm={vm} />;
}

export default function TopCategoriesView(): React.JSX.Element {
  const vm = useTopCategoriesViewModel();
  return (
    <div className="container-shared lumio-view-page">
      <TopCategoriesPageHeader vm={vm} />
      <div className="lumio-view-page__body">
        <TopCategoriesBody vm={vm} />
      </div>
      <TopCategoriesFiltersDrawer vm={vm} />
      {vm.selectedRow ? (
        <TopCategoriesDrillDown
          selectedRow={vm.selectedRow}
          drillDownRecords={vm.drillDownRecords}
          onClose={() => vm.setSelectedRowId(null)}
          currency={vm.workspaceCurrency}
          sourceLabels={vm.sourceLabels}
          labels={vm.drillLabels}
        />
      ) : null}
    </div>
  );
}
