import { useMemo } from 'react';
import {
  type SpendOverTimeAggregationReturn,
  useSpendOverTimeAggregation,
} from '@/app/(main)/statements/components/spend-over-time/hooks/useSpendOverTimeAggregation';
import {
  type SpendFromOption,
  useSpendOverTimeRecords,
} from '@/app/(main)/statements/components/spend-over-time/hooks/useSpendOverTimeRecords';
import {
  buildSpendOverTimeSelectedPoint,
  filterSpendOverTimeDrillDownRecords,
  isSpendOverTimeDayPeriod,
  type SpendOverTimePoint,
  type SpendOverTimeRecord,
} from '@/app/(main)/statements/components/spend-over-time.utils';
import { useAnalyticsData } from '@/app/(main)/statements/hooks/useAnalyticsData';
import type { UseSpendOverTimeStateReturn } from '@/app/(main)/statements/hooks/useSpendOverTimeState';

type WorkspaceLike = { id: string; name?: string | null };

type Params = {
  user: unknown;
  currentWorkspace: WorkspaceLike | null | undefined;
  workspaces: WorkspaceLike[];
  workspaceCurrency: string;
  resolvedTheme: string | undefined;
  labels: Record<string, string>;
  state: UseSpendOverTimeStateReturn;
  sortKey: 'amount' | 'average' | 'operations';
  selectedPeriod: string | null;
  searchInput: string;
};

export type SpendOverTimeDataReturn = SpendOverTimeAggregationReturn & {
  loading: boolean;
  flowFilteredRecords: SpendOverTimeRecord[];
  fromOptions: SpendFromOption[];
  currencyOptions: string[];
  drillDownRecords: SpendOverTimeRecord[];
  selectedPoint: SpendOverTimePoint | null;
};

export const useSpendOverTimeData = ({
  user,
  currentWorkspace,
  workspaces,
  workspaceCurrency,
  resolvedTheme,
  labels,
  state,
  sortKey,
  selectedPeriod,
  searchInput,
}: Params): SpendOverTimeDataReturn => {
  const {
    statements: rawStatements,
    transactions: rawTransactions,
    gmailReceipts,
    loading,
  } = useAnalyticsData({
    user,
    currentWorkspace,
    workspaces,
    workspaceFilter: state.workspaceFilter,
    currentWorkspaceLabel: labels.currentWorkspace,
    includeTransactions: true,
    errorToastMessage: labels.loadError,
  });
  const statements = rawStatements as unknown[];
  const transactions = rawTransactions as unknown[];
  const { flowFilteredRecords, flowRecordsWithoutDateFilter, fromOptions, currencyOptions } =
    useSpendOverTimeRecords({
      statements: statements as Parameters<typeof useSpendOverTimeRecords>[0]['statements'],
      transactions: transactions as Parameters<typeof useSpendOverTimeRecords>[0]['transactions'],
      gmailReceipts,
      workspaceCurrency,
      appliedFilters: state.appliedFilters,
      searchInput,
      activeFlowType: state.activeFlowType,
    });
  const { report, rows, comparison, trendChart, sourceChart, periodsChart } =
    useSpendOverTimeAggregation({
      flowFilteredRecords,
      flowRecordsWithoutDateFilter,
      activeFlowType: state.activeFlowType,
      groupBy: state.groupBy,
      viewType: state.viewType,
      sortKey,
      workspaceCurrency,
      resolvedTheme,
      totalIncomeLabel: labels.totalIncome,
      totalSpendLabel: labels.totalSpend,
      statementsAmountLabel: labels.statementsAmount,
      receiptsAmountLabel: labels.receiptsAmount,
    });
  const drillDownGroupBy =
    state.viewType === 'calendar' && isSpendOverTimeDayPeriod(selectedPeriod)
      ? 'day'
      : state.groupBy;
  const drillDownRecords = useMemo(
    () =>
      selectedPeriod
        ? filterSpendOverTimeDrillDownRecords(selectedPeriod, drillDownGroupBy, flowFilteredRecords)
        : [],
    [selectedPeriod, drillDownGroupBy, flowFilteredRecords],
  );
  const selectedPoint = useMemo(
    () =>
      report.points.find(p => p.period === selectedPeriod) ??
      buildSpendOverTimeSelectedPoint(selectedPeriod, drillDownRecords),
    [report.points, selectedPeriod, drillDownRecords],
  );
  return {
    loading,
    flowFilteredRecords,
    fromOptions,
    currencyOptions,
    report,
    rows,
    comparison,
    trendChart,
    sourceChart,
    periodsChart,
    drillDownRecords,
    selectedPoint,
  };
};
