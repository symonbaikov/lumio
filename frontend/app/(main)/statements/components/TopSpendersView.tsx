'use client';

import { AnalyticsLeaderboardSkeleton } from '@/app/(main)/statements/components/analytics/AnalyticsLeaderboardSkeleton';
import { TopSpendersContent } from '@/app/(main)/statements/components/top-spenders/components/TopSpendersContent';
import { TopSpendersDrillDown } from '@/app/(main)/statements/components/top-spenders/components/TopSpendersDrillDown';
import { TopSpendersFiltersDrawer } from '@/app/(main)/statements/components/top-spenders/components/TopSpendersFiltersDrawer';
import { TopSpendersPageHeader } from '@/app/(main)/statements/components/top-spenders/components/TopSpendersPageHeader';
import { useTopSpendersViewModel } from '@/app/(main)/statements/components/top-spenders/hooks/useTopSpendersViewModel';
import type { TopSpendersViewModelReturn } from '@/app/(main)/statements/components/top-spenders/hooks/useTopSpendersViewModel';
import { tokens } from '@/lib/theme-tokens';

type VmProps = { vm: TopSpendersViewModelReturn };

function TopSpendersBody({ vm }: VmProps): React.JSX.Element {
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
  return <TopSpendersContent vm={vm} />;
}

export default function TopSpendersView(): React.JSX.Element {
  const vm = useTopSpendersViewModel();
  return (
    <div className="container-shared lumio-view-page">
      <TopSpendersPageHeader vm={vm} />
      <div className="lumio-view-page__body">
        <TopSpendersBody vm={vm} />
      </div>
      <TopSpendersFiltersDrawer vm={vm} />
      {vm.selectedRow ? (
        <TopSpendersDrillDown
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
