'use client';

import { SpendOverTimeContent } from '@/app/(main)/statements/components/spend-over-time/components/SpendOverTimeContent';
import { SpendOverTimeDrillDown } from '@/app/(main)/statements/components/spend-over-time/components/SpendOverTimeDrillDown';
import { SpendOverTimeEmptyState } from '@/app/(main)/statements/components/spend-over-time/components/SpendOverTimeEmptyState';
import { SpendOverTimeFiltersDrawer } from '@/app/(main)/statements/components/spend-over-time/components/SpendOverTimeFiltersDrawer';
import { SpendOverTimePageHeader } from '@/app/(main)/statements/components/spend-over-time/components/SpendOverTimePageHeader';
import {
  type SpendOverTimeViewModelReturn,
  useSpendOverTimeViewModel,
} from '@/app/(main)/statements/components/spend-over-time/hooks/useSpendOverTimeViewModel';
import Skeleton from '@mui/material/Skeleton';
import { useRouter } from 'next/navigation';

type VmProps = { vm: SpendOverTimeViewModelReturn };

type DrillLabels = {
  drillDown: string;
  close: string;
  noOperations: string;
  lastOperation: string;
  source: string;
  workspace: string;
  amount: string;
};

// eslint-disable-next-line max-params
function getStr(labels: Record<string, string>, key: string): string {
  return labels[key] || '';
}

function buildDrillLabels(labels: Record<string, string>): DrillLabels {
  return {
    drillDown: getStr(labels, 'drillDown'),
    close: getStr(labels, 'close'),
    noOperations: getStr(labels, 'noOperations'),
    lastOperation: getStr(labels, 'lastOperation'),
    source: getStr(labels, 'source'),
    workspace: getStr(labels, 'workspace'),
    amount: getStr(labels, 'amount'),
  };
}

function StatCardSkeleton(): React.JSX.Element {
  return (
    <div className="lumio-view-page__stat-card">
      <div className="lumio-view-page__stat-header">
        <Skeleton variant="text" width="50%" height={16} />
      </div>
      <Skeleton variant="text" width="40%" height={26} style={{ marginTop: 8 }} />
      <Skeleton variant="text" width="60%" height={14} style={{ marginTop: 4 }} />
    </div>
  );
}

function ChartCardSkeleton({
  height,
  wide,
}: {
  height: number;
  wide?: boolean;
}): React.JSX.Element {
  return (
    <div className={wide ? 'lumio-view-page__chart-card--wide' : 'lumio-view-page__chart-card'}>
      <div className="lumio-view-page__chart-header">
        <Skeleton variant="text" width={120} height={20} />
      </div>
      <Skeleton variant="rounded" width="100%" height={height} />
    </div>
  );
}

function SpendOverTimeLoading(): React.JSX.Element {
  return (
    <div className="lumio-view-page__content">
      <div className="lumio-view-page__stat-grid">
        {['primary', 'statements', 'receipts', 'operations', 'avg'].map(key => (
          <StatCardSkeleton key={key} />
        ))}
      </div>
      <div className="lumio-view-page__chart-grid-wrapper">
        <div className="lumio-view-page__chart-grid">
          <ChartCardSkeleton height={300} wide />
          <ChartCardSkeleton height={300} />
        </div>
        <ChartCardSkeleton height={320} />
      </div>
    </div>
  );
}

function SpendOverTimeEmptyWrapper({ vm }: VmProps): React.JSX.Element {
  const router = useRouter();
  return (
    <SpendOverTimeEmptyState
      titleLabel={vm.labels.emptyStateTitle ?? ''}
      descriptionLabel={vm.labels.emptyStateDescription ?? ''}
      uploadCtaLabel={vm.labels.emptyStateUploadCta ?? ''}
      resetCtaLabel={vm.labels.emptyStateResetCta ?? ''}
      onUpload={() => router.push('/statements')}
      onReset={() => vm.resetAllFilters()}
    />
  );
}

function SpendOverTimeBody({ vm }: VmProps): React.JSX.Element {
  if (vm.loading) {
    return <SpendOverTimeLoading />;
  }
  if (vm.flowFilteredRecords.length === 0) {
    return <SpendOverTimeEmptyWrapper vm={vm} />;
  }
  return <SpendOverTimeContent vm={vm} />;
}

export default function SpendOverTimeView(): React.JSX.Element {
  const vm = useSpendOverTimeViewModel();
  return (
    <div className="container-shared lumio-view-page">
      <SpendOverTimePageHeader vm={vm} />
      <div className="lumio-view-page__body">
        <SpendOverTimeBody vm={vm} />
      </div>
      <SpendOverTimeFiltersDrawer vm={vm} />
      {vm.selectedPoint ? (
        <SpendOverTimeDrillDown
          selectedPoint={vm.selectedPoint}
          drillDownRecords={vm.drillDownRecords}
          groupBy={vm.groupBy}
          onClose={() => vm.setSelectedPeriod(null)}
          currency={vm.workspaceCurrency}
          sourceLabels={vm.sourceLabels}
          labels={buildDrillLabels(vm.labels)}
        />
      ) : null}
    </div>
  );
}
