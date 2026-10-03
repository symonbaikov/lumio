'use client';

import { AnalyticsLeaderboardSkeleton } from '@/app/(main)/statements/components/analytics/AnalyticsLeaderboardSkeleton';
import { TopMerchantsContent } from '@/app/(main)/statements/components/top-merchants/components/TopMerchantsContent';
import { TopMerchantsDrillDown } from '@/app/(main)/statements/components/top-merchants/components/TopMerchantsDrillDown';
import { TopMerchantsFiltersDrawer } from '@/app/(main)/statements/components/top-merchants/components/TopMerchantsFiltersDrawer';
import { TopMerchantsPageHeader } from '@/app/(main)/statements/components/top-merchants/components/TopMerchantsPageHeader';
import {
  type TopMerchantsViewModelReturn,
  useTopMerchantsViewModel,
} from '@/app/(main)/statements/components/top-merchants/hooks/useTopMerchantsViewModel';
import { useAttentionFocus } from '@/app/hooks/useAttentionFocus';
import { tokens } from '@/lib/theme-tokens';

type VmProps = { vm: TopMerchantsViewModelReturn; focusId: string | null };

function TopMerchantsBody({ vm, focusId }: VmProps): React.JSX.Element {
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
  return <TopMerchantsContent vm={vm} focusId={focusId} />;
}

export default function TopMerchantsView(): React.JSX.Element {
  const vm = useTopMerchantsViewModel();
  // Stoic advice about a habit links at one merchant's row (insight-href.ts).
  const focusId = useAttentionFocus();
  return (
    <div className="container-shared lumio-view-page">
      <TopMerchantsPageHeader vm={vm} />
      <div className="lumio-view-page__body">
        <TopMerchantsBody vm={vm} focusId={focusId} />
      </div>
      <TopMerchantsFiltersDrawer vm={vm} />
      {vm.selectedRow ? (
        <TopMerchantsDrillDown
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
