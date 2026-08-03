'use client';

import { TopMerchantsLeaderboard } from '@/app/(main)/statements/components/top-merchants/components/TopMerchantsLeaderboard';
import { TopMerchantsStatCards } from '@/app/(main)/statements/components/top-merchants/components/TopMerchantsStatCards';
import type { useTopMerchantsViewModel } from '@/app/(main)/statements/components/top-merchants/hooks/useTopMerchantsViewModel';

type Props = { vm: ReturnType<typeof useTopMerchantsViewModel> };

function TopMerchantsLeaderboardSection({ vm }: Props): React.JSX.Element {
  const isIncomeView = vm.activeFlowType === 'income';
  const { labels, workspaceCurrency } = vm;
  const sourceLabels = {
    sourceBank: labels.sourceBank,
    sourceReceipt: labels.sourceReceipt,
    sourceGmailInbox: labels.sourceGmailInbox,
  };
  const columnLabels = {
    merchant: labels.merchant,
    source: labels.source,
    operations: labels.operations,
    average: labels.average,
    amount: labels.amount,
    lastOperation: labels.lastOperation,
  };
  const sortLabels = {
    sortByAmount: labels.sortByAmount,
    sortByAverage: labels.sortByAverage,
    sortByOperations: labels.sortByOperations,
  };
  return (
    <TopMerchantsLeaderboard
      rows={vm.sortedAggregatedRows}
      sortKey={vm.sortKey}
      onSortChange={vm.setSortKey}
      onRowClick={vm.setSelectedRowId}
      title={isIncomeView ? labels.incomeLeaderboard : labels.leaderboard}
      currency={workspaceCurrency}
      sourceLabels={sourceLabels}
      sortLabels={sortLabels}
      columnLabels={columnLabels}
      emptyLabel={labels.comparisonNoData}
    />
  );
}

export function TopMerchantsContent({ vm }: Props): React.JSX.Element {
  const isIncomeView = vm.activeFlowType === 'income';
  const { labels, workspaceCurrency } = vm;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      <TopMerchantsStatCards
        totals={vm.totals}
        comparison={vm.comparison}
        isIncomeView={isIncomeView}
        primaryMetricLabel={isIncomeView ? labels.totalIncome : labels.totalSpend}
        statementsLabel={labels.statementsSpend}
        receiptsLabel={labels.receiptsSpend}
        operationsLabel={labels.totalOperations}
        currency={workspaceCurrency}
        noDataLabel={labels.comparisonNoData}
        vsPreviousPeriodLabel={labels.vsPreviousPeriod}
      />
      <TopMerchantsLeaderboardSection vm={vm} />
    </div>
  );
}
