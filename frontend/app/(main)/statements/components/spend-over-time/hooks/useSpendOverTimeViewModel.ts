import {
  buildSpendOverTimeLabels,
  createTx,
} from '@/app/(main)/statements/components/spend-over-time/helpers/buildSpendOverTimeLabels';
import {
  type SpendOverTimeDataReturn,
  useSpendOverTimeData,
} from '@/app/(main)/statements/components/spend-over-time/hooks/useSpendOverTimeData';
import {
  type AnalyticsFilterOptionLabels,
  buildAnalyticsFilterLabels,
  buildAnalyticsFilterOptions,
} from '@/app/(main)/statements/helpers/analytics-filter-labels';
import {
  DEFAULT_SPEND_OVER_TIME_GROUP_BY,
  DEFAULT_SPEND_OVER_TIME_VIEW,
  type UseSpendOverTimeStateReturn,
  useSpendOverTimeState,
} from '@/app/(main)/statements/hooks/useSpendOverTimeState';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import { resolveCurrencyCode } from '@/app/lib/analytics-common';
import { useTheme } from 'next-themes';
import { useMemo, useState } from 'react';

type WorkspaceLike = { id: string; name?: string | null };
type SortKey = 'amount' | 'average' | 'operations';
type SourceLabels = {
  sourceBank: string;
  sourceReceipt: string;
  sourceGmailInbox: string;
  sourceCrypto: string;
};

const STORAGE_KEY = 'lumio-spend-over-time-filters-v3';

export type SpendOverTimeViewModelReturn = UseSpendOverTimeStateReturn &
  SpendOverTimeDataReturn & {
    labels: Record<string, string>;
    filterOptions: ReturnType<typeof buildAnalyticsFilterOptions>;
    filterOptionLabels: AnalyticsFilterOptionLabels;
    workspaces: WorkspaceLike[];
    workspaceCurrency: string;
    resolvedTheme: string | undefined;
    sourceLabels: SourceLabels;
    sortKey: SortKey;
    setSortKey: (key: SortKey) => void;
    searchInput: string;
    setSearchInput: (v: string) => void;
    selectedPeriod: string | null;
    setSelectedPeriod: (v: string | null) => void;
    groupByOptions: { value: string; label: string }[];
    viewOptions: { value: string; label: string }[];
    defaultGroupBy: string;
    defaultView: string;
  };

export const useSpendOverTimeViewModel = (): SpendOverTimeViewModelReturn => {
  const { user } = useAuth();
  const { currentWorkspace, workspaces } = useWorkspace();
  const { resolvedTheme } = useTheme();
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);
  const state = useSpendOverTimeState(STORAGE_KEY);
  const [sortKey, setSortKey] = useState<SortKey>('amount');
  const [searchInput, setSearchInput] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const t = useIntlayer('statementsPage');
  const tx = useMemo(() => createTx(t), [t]);
  const labels = useMemo(() => buildSpendOverTimeLabels(tx), [tx]);
  const filterOptionLabels = useMemo(() => buildAnalyticsFilterLabels(tx), [tx]);
  const filterOptions = useMemo(
    () => buildAnalyticsFilterOptions(filterOptionLabels),
    [filterOptionLabels],
  );
  const data = useSpendOverTimeData({
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
  });
  const sourceLabels = useMemo(
    () => ({
      sourceBank: labels.sourceBank,
      sourceReceipt: labels.sourceReceipt,
      sourceGmailInbox: labels.sourceGmailInbox,
      sourceCrypto: labels.sourceCrypto,
    }),
    [labels],
  );
  const groupByOptions = useMemo(
    () => [
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
      { value: 'quarter', label: 'Quarter' },
      { value: 'year', label: 'Year' },
    ],
    [],
  );
  const viewOptions = useMemo(
    () => [
      { value: 'calendar', label: 'Calendar' },
      { value: 'line', label: 'Line' },
      { value: 'bar', label: 'Bar' },
      { value: 'stacked', label: 'Stacked' },
    ],
    [],
  );
  return {
    ...state,
    ...data,
    labels,
    filterOptions,
    filterOptionLabels,
    workspaces,
    workspaceCurrency,
    resolvedTheme,
    sourceLabels,
    sortKey,
    setSortKey,
    searchInput,
    setSearchInput,
    selectedPeriod,
    setSelectedPeriod,
    groupByOptions,
    viewOptions,
    defaultGroupBy: DEFAULT_SPEND_OVER_TIME_GROUP_BY,
    defaultView: DEFAULT_SPEND_OVER_TIME_VIEW,
  };
};
