'use client';

import type { CategorySortKey } from '@/app/(main)/statements/components/top-categories.utils';
import { TopCategoriesLeaderboard } from '@/app/(main)/statements/components/top-categories/components/TopCategoriesLeaderboard';
import { TopCategoriesStatCards } from '@/app/(main)/statements/components/top-categories/components/TopCategoriesStatCards';
import type { useTopCategoriesViewModel } from '@/app/(main)/statements/components/top-categories/hooks/useTopCategoriesViewModel';

type Props = { vm: ReturnType<typeof useTopCategoriesViewModel> };

function TopCategoriesLeaderboardSection({ vm }: Props): React.JSX.Element {
  const isIncomeView = vm.activeFlowType === 'income';
  const { labels, workspaceCurrency } = vm;
  const sourceLabels = {
    sourceBank: labels.sourceBank,
    sourceReceipt: labels.sourceReceipt,
    sourceGmailInbox: labels.sourceGmailInbox,
  };
  const columnLabels = {
    category: labels.category,
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
    <TopCategoriesLeaderboard
      rows={vm.sortedAggregatedRows}
      sortKey={vm.sortKey as CategorySortKey}
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

export function TopCategoriesContent({ vm }: Props): React.JSX.Element {
  const isIncomeView = vm.activeFlowType === 'income';
  const { labels, workspaceCurrency } = vm;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      <TopCategoriesStatCards
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
      <TopCategoriesLeaderboardSection vm={vm} />
    </div>
  );
}
