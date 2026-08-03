'use client';

import { TopSpendersLeaderboard } from '@/app/(main)/statements/components/top-spenders/components/TopSpendersLeaderboard';
import { TopSpendersStatCards } from '@/app/(main)/statements/components/top-spenders/components/TopSpendersStatCards';
import type { useTopSpendersViewModel } from '@/app/(main)/statements/components/top-spenders/hooks/useTopSpendersViewModel';

type Props = { vm: ReturnType<typeof useTopSpendersViewModel> };

function TopSpendersLeaderboardSection({ vm }: Props): React.JSX.Element {
  const isIncomeView = vm.activeFlowType === 'income';
  const { labels, workspaceCurrency } = vm;
  const sourceLabels = {
    sourceBank: labels.sourceBank,
    sourceReceipt: labels.sourceReceipt,
    sourceGmailInbox: labels.sourceGmailInbox,
  };
  const columnLabels = {
    company: labels.company,
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
    <TopSpendersLeaderboard
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

export function TopSpendersContent({ vm }: Props): React.JSX.Element {
  const isIncomeView = vm.activeFlowType === 'income';
  const { labels, workspaceCurrency } = vm;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      <TopSpendersStatCards
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
      <TopSpendersLeaderboardSection vm={vm} />
    </div>
  );
}
