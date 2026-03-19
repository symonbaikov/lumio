'use client';

import { DateFilterDropdown } from '@/app/(main)/statements/components/filters/DateFilterDropdown';
import { FiltersDrawer } from '@/app/(main)/statements/components/filters/FiltersDrawer';
import { FromFilterDropdown } from '@/app/(main)/statements/components/filters/FromFilterDropdown';
import { GroupByFilterDropdown } from '@/app/(main)/statements/components/filters/GroupByFilterDropdown';
import { StatusFilterDropdown } from '@/app/(main)/statements/components/filters/StatusFilterDropdown';
import { ViewFilterDropdown } from '@/app/(main)/statements/components/filters/ViewFilterDropdown';
import {
  DEFAULT_STATEMENT_FILTERS,
  type StatementFilterItem,
  type StatementFilters,
  applyStatementsFilters,
  resetSingleStatementFilter,
} from '@/app/(main)/statements/components/filters/statement-filters';
import {
  type SpendOverTimeFlowType,
  type SpendOverTimeGroupBy,
  type SpendOverTimeRecord,
  buildSpendOverTimeReport,
  dedupeSpendOverTimeReceiptRecords,
  resolveSpendOverTimeFlow,
} from '@/app/(main)/statements/components/spend-over-time.utils';
import {
  buildPreviousPeriodRange,
  getComparisonDelta,
  resolveSourceChannel,
} from '@/app/(main)/statements/components/top-merchants.utils';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';
import {
  ArrowDown,
  ArrowUp,
  ChartPie,
  ChevronDown,
  Landmark,
  Mail,
  Receipt,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type StatementMeta = {
  id: string;
  status?: string;
  createdAt?: string | null;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  bankName?: string | null;
  fileType?: string | null;
  currency?: string | null;
  exported?: boolean | null;
  paid?: boolean | null;
  workspaceId?: string;
  workspaceName?: string;
  parsingDetails?: {
    metadataExtracted?: {
      currency?: string;
      headerDisplay?: {
        currencyDisplay?: string;
      };
    };
  } | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
};

type Transaction = {
  id: string;
  statementId?: string | null;
  counterpartyName?: string | null;
  transactionDate?: string | null;
  debit?: number | string | null;
  credit?: number | string | null;
  amount?: number | string | null;
  currency?: string | null;
  paymentPurpose?: string | null;
  transactionType?: 'income' | 'expense' | null;
  createdAt?: string | null;
  workspaceId?: string;
  workspaceName?: string;
};

type GmailReceipt = {
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  status: string;
  transactionId?: string | null;
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
    transactionType?: 'income' | 'expense' | 'transfer' | 'unknown';
  };
  workspaceId?: string;
  workspaceName?: string;
};

type ViewTypeValue = 'line' | 'bar' | 'stacked';
type SortKey = 'amount' | 'average' | 'operations';

type StoredState = {
  filters: StatementFilters;
  groupBy: SpendOverTimeGroupBy;
  viewType: ViewTypeValue;
  workspaceFilter: 'current' | 'all' | string;
  activeFlowType: SpendOverTimeFlowType;
};

const STORAGE_KEY = 'lumio-spend-over-time-filters-v2';
const DEFAULT_GROUP_BY: SpendOverTimeGroupBy = 'month';
const DEFAULT_VIEW: ViewTypeValue = 'line';
const DEFAULT_FLOW: SpendOverTimeFlowType = 'expense';

const resolveCurrencyCode = (currency: string | null | undefined, fallback = 'KZT') => {
  const normalized = String(currency || '')
    .trim()
    .toUpperCase();

  if (/^[A-Z]{3}$/.test(normalized)) {
    return normalized;
  }

  return fallback;
};

const resolveLocale = (locale?: string) => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

const formatMoney = (value: number, currency: string, locale = 'ru') =>
  new Intl.NumberFormat(resolveLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const toDateOnly = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const getTransactionDate = (transaction: Transaction, statement?: StatementMeta) => {
  return (
    transaction.transactionDate ||
    statement?.statementDateTo ||
    statement?.statementDateFrom ||
    statement?.createdAt ||
    transaction.createdAt ||
    ''
  );
};

const getTransactionCurrency = (
  transaction: Transaction,
  statement: StatementMeta | undefined,
  fallbackCurrency: string,
) => {
  return (
    transaction.currency ||
    statement?.currency ||
    statement?.parsingDetails?.metadataExtracted?.currency ||
    statement?.parsingDetails?.metadataExtracted?.headerDisplay?.currencyDisplay ||
    fallbackCurrency
  );
};

const getRecordDate = (record: { dateValue?: string; createdAt?: string | null }) => {
  return toDateOnly(record.dateValue || record.createdAt || null);
};

const loadStoredState = (): StoredState => {
  if (typeof window === 'undefined') {
    return {
      filters: DEFAULT_STATEMENT_FILTERS,
      groupBy: DEFAULT_GROUP_BY,
      viewType: DEFAULT_VIEW,
      workspaceFilter: 'current',
      activeFlowType: DEFAULT_FLOW,
    };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      filters: DEFAULT_STATEMENT_FILTERS,
      groupBy: DEFAULT_GROUP_BY,
      viewType: DEFAULT_VIEW,
      workspaceFilter: 'current',
      activeFlowType: DEFAULT_FLOW,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      filters: {
        ...DEFAULT_STATEMENT_FILTERS,
        ...parsed.filters,
      },
      groupBy: parsed.groupBy || DEFAULT_GROUP_BY,
      viewType: parsed.viewType || DEFAULT_VIEW,
      workspaceFilter: parsed.workspaceFilter || 'current',
      activeFlowType: parsed.activeFlowType || DEFAULT_FLOW,
    };
  } catch {
    return {
      filters: DEFAULT_STATEMENT_FILTERS,
      groupBy: DEFAULT_GROUP_BY,
      viewType: DEFAULT_VIEW,
      workspaceFilter: 'current',
      activeFlowType: DEFAULT_FLOW,
    };
  }
};

const saveStoredState = (state: StoredState) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const getSourceLabel = (
  channel: SpendOverTimeRecord['sourceChannel'],
  labels: {
    sourceBank: string;
    sourceReceipt: string;
    sourceGmailInbox: string;
  },
) => {
  if (channel === 'gmail') return labels.sourceGmailInbox;
  if (channel === 'receipt') return labels.sourceReceipt;
  return labels.sourceBank;
};

const matchesPeriod = (date: Date, period: string, groupBy: SpendOverTimeGroupBy) => {
  if (groupBy === 'day') {
    return date.toISOString().split('T')[0] === period;
  }

  if (groupBy === 'week') {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + diff);
    const normalized = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
      .toISOString()
      .split('T')[0];
    return normalized === period;
  }

  if (groupBy === 'month') {
    const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
    return key === period;
  }

  if (groupBy === 'quarter') {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `${date.getFullYear()}-Q${quarter}` === period;
  }

  return `${date.getFullYear()}` === period;
};

export default function SpendOverTimeView() {
  const t = useIntlayer('statementsPage');
  const router = useRouter();
  const { user } = useAuth();
  const { currentWorkspace, workspaces } = useWorkspace();
  const { resolvedTheme } = useTheme();
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);
  const initial = useMemo(() => loadStoredState(), []);

  const [loading, setLoading] = useState(true);
  const [statements, setStatements] = useState<StatementMeta[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [gmailReceipts, setGmailReceipts] = useState<GmailReceipt[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState<'current' | 'all' | string>(
    initial.workspaceFilter,
  );
  const [activeFlowType, setActiveFlowType] = useState<SpendOverTimeFlowType>(
    initial.activeFlowType,
  );
  const [sortKey, setSortKey] = useState<SortKey>('amount');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  const [draftFilters, setDraftFilters] = useState<StatementFilters>(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState<StatementFilters>(initial.filters);
  const [draftGroupBy, setDraftGroupBy] = useState<SpendOverTimeGroupBy>(initial.groupBy);
  const [groupBy, setGroupBy] = useState<SpendOverTimeGroupBy>(initial.groupBy);
  const [draftViewType, setDraftViewType] = useState<ViewTypeValue>(initial.viewType);
  const [viewType, setViewType] = useState<ViewTypeValue>(initial.viewType);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [groupByDropdownOpen, setGroupByDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [filtersDrawerScreen, setFiltersDrawerScreen] = useState('root');

  const resolveLabel = (value: any, fallback: string) => value?.value ?? value ?? fallback;

  const labels = {
    title: resolveLabel((t as any)?.spendOverTimeAnalytics?.title, 'Spend over time'),
    subtitle: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.subtitle,
      'Track spend and income dynamics with the same filters and drill-down as Top merchants.',
    ),
    searchPlaceholder: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.searchPlaceholder,
      'Search by merchant, sender or subject',
    ),
    totalSpend: resolveLabel((t as any)?.spendOverTimeAnalytics?.totalSpend, 'Total spend'),
    totalIncome: resolveLabel((t as any)?.spendOverTimeAnalytics?.totalIncome, 'Total income'),
    statementsAmount: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.statementsAmount,
      'Statements',
    ),
    receiptsAmount: resolveLabel((t as any)?.spendOverTimeAnalytics?.receiptsAmount, 'Receipts'),
    totalOperations: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.totalOperations,
      'Operations',
    ),
    avgPerPeriod: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.avgPerPeriod,
      'Average per period',
    ),
    periodChart: resolveLabel((t as any)?.spendOverTimeAnalytics?.periodChart, 'Top periods'),
    trendTitle: resolveLabel((t as any)?.spendOverTimeAnalytics?.trendTitle, 'Trend'),
    sourceSplit: resolveLabel((t as any)?.spendOverTimeAnalytics?.sourceSplit, 'Source split'),
    leaderboard: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.leaderboard,
      'Periods leaderboard',
    ),
    workspace: resolveLabel((t as any)?.spendOverTimeAnalytics?.workspace, 'Workspace'),
    allWorkspaces: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.allWorkspaces,
      'All workspaces',
    ),
    currentWorkspace: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.currentWorkspace,
      'Current workspace',
    ),
    tabExpense: resolveLabel((t as any)?.spendOverTimeAnalytics?.tabExpense, 'Expenses'),
    tabIncome: resolveLabel((t as any)?.spendOverTimeAnalytics?.tabIncome, 'Income'),
    period: resolveLabel((t as any)?.spendOverTimeAnalytics?.period, 'Period'),
    amount: resolveLabel((t as any)?.spendOverTimeAnalytics?.amount, 'Amount'),
    average: resolveLabel((t as any)?.spendOverTimeAnalytics?.average, 'Average'),
    operations: resolveLabel((t as any)?.spendOverTimeAnalytics?.operations, 'Operations'),
    source: resolveLabel((t as any)?.spendOverTimeAnalytics?.source, 'Source'),
    lastOperation: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.lastOperation,
      'Last operation',
    ),
    sortByAmount: resolveLabel((t as any)?.spendOverTimeAnalytics?.sortByAmount, 'Amount'),
    sortByAverage: resolveLabel((t as any)?.spendOverTimeAnalytics?.sortByAverage, 'Average'),
    sortByOperations: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.sortByOperations,
      'Operations',
    ),
    comparisonNoData: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.comparisonNoData,
      'No previous period data',
    ),
    vsPreviousPeriod: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.vsPreviousPeriod,
      'vs previous period',
    ),
    drillDown: resolveLabel((t as any)?.spendOverTimeAnalytics?.drillDown, 'Drill-down'),
    noOperations: resolveLabel(
      (t as any)?.spendOverTimeAnalytics?.noOperations,
      'No operations found',
    ),
    sourceBank: resolveLabel((t as any)?.spendOverTimeAnalytics?.sourceBank, 'Bank'),
    sourceReceipt: resolveLabel((t as any)?.spendOverTimeAnalytics?.sourceReceipt, 'Receipt'),
    sourceGmailInbox: resolveLabel((t as any)?.spendOverTimeAnalytics?.sourceGmailInbox, 'Gmail'),
    emptyStateTitle: resolveLabel(
      (t as any)?.spendOverTime?.emptyStateTitle,
      'No data for selected period',
    ),
    emptyStateDescription: resolveLabel(
      (t as any)?.spendOverTime?.emptyStateDescription,
      'Upload statements or apply another filter',
    ),
    emptyStateUploadCta: resolveLabel(
      (t as any)?.spendOverTime?.emptyStateUploadCta,
      'Go to statement upload',
    ),
    emptyStateResetCta: resolveLabel(
      (t as any)?.spendOverTime?.emptyStateResetCta,
      'Reset filters',
    ),
    close: resolveLabel((t as any)?.common?.close, 'Close'),
    filters: resolveLabel((t as any)?.filters?.filters, 'Filters'),
    type: resolveLabel((t as any)?.filters?.type, 'Type'),
    status: resolveLabel((t as any)?.filters?.status, 'Status'),
    date: resolveLabel((t as any)?.filters?.date, 'Date'),
    from: resolveLabel((t as any)?.filters?.from, 'From'),
    apply: resolveLabel((t as any)?.filters?.apply, 'Apply'),
    reset: resolveLabel((t as any)?.filters?.reset, 'Reset'),
  };

  const filterOptionLabels = {
    apply: resolveLabel((t as any)?.filters?.apply, 'Apply'),
    reset: resolveLabel((t as any)?.filters?.reset, 'Reset'),
    resetFilters: resolveLabel((t as any)?.filters?.resetFilters, 'Reset filters'),
    viewResults: resolveLabel((t as any)?.filters?.viewResults, 'View results'),
    saveSearch: resolveLabel((t as any)?.filters?.saveSearch, 'Save search'),
    any: resolveLabel((t as any)?.filters?.any, 'Any'),
    yes: resolveLabel((t as any)?.filters?.yes, 'Yes'),
    no: resolveLabel((t as any)?.filters?.no, 'No'),
    typeExpense: resolveLabel((t as any)?.filters?.typeExpense, 'Expense'),
    typeReport: resolveLabel((t as any)?.filters?.typeReport, 'Expense Report'),
    typeChat: resolveLabel((t as any)?.filters?.typeChat, 'Chat'),
    typeTrip: resolveLabel((t as any)?.filters?.typeTrip, 'Trip'),
    typeTask: resolveLabel((t as any)?.filters?.typeTask, 'Task'),
    statusUnreported: resolveLabel((t as any)?.filters?.statusUnreported, 'Unreported'),
    statusDraft: resolveLabel((t as any)?.filters?.statusDraft, 'Draft'),
    statusOutstanding: resolveLabel((t as any)?.filters?.statusOutstanding, 'Outstanding'),
    statusApproved: resolveLabel((t as any)?.filters?.statusApproved, 'Approved'),
    statusPaid: resolveLabel((t as any)?.filters?.statusPaid, 'Paid'),
    statusDone: resolveLabel((t as any)?.filters?.statusDone, 'Done'),
    dateThisMonth: resolveLabel((t as any)?.filters?.dateThisMonth, 'This month'),
    dateLastMonth: resolveLabel((t as any)?.filters?.dateLastMonth, 'Last month'),
    dateYearToDate: resolveLabel((t as any)?.filters?.dateYearToDate, 'Year to date'),
    dateOn: resolveLabel((t as any)?.filters?.dateOn, 'On'),
    dateAfter: resolveLabel((t as any)?.filters?.dateAfter, 'After'),
    dateBefore: resolveLabel((t as any)?.filters?.dateBefore, 'Before'),
    drawerTitle: resolveLabel((t as any)?.filters?.drawerTitle, 'Filters'),
    drawerGeneral: resolveLabel((t as any)?.filters?.drawerGeneral, 'General'),
    drawerExpenses: resolveLabel((t as any)?.filters?.drawerExpenses, 'Expenses'),
    drawerReports: resolveLabel((t as any)?.filters?.drawerReports, 'Reports'),
    drawerGroupBy: resolveLabel((t as any)?.filters?.drawerGroupBy, 'Group by'),
    drawerHas: resolveLabel((t as any)?.filters?.drawerHas, 'Has'),
    drawerKeywords: resolveLabel((t as any)?.filters?.drawerKeywords, 'Keywords'),
    drawerLimit: resolveLabel((t as any)?.filters?.drawerLimit, 'Limit'),
    drawerTo: resolveLabel((t as any)?.filters?.drawerTo, 'To'),
    drawerAmount: resolveLabel((t as any)?.filters?.drawerAmount, 'Amount'),
    drawerApproved: resolveLabel((t as any)?.filters?.drawerApproved, 'Approved'),
    drawerBillable: resolveLabel((t as any)?.filters?.drawerBillable, 'Billable'),
    groupByDate: resolveLabel((t as any)?.filters?.groupByDate, 'Date'),
    groupByStatus: resolveLabel((t as any)?.filters?.groupByStatus, 'Status'),
    groupByType: resolveLabel((t as any)?.filters?.groupByType, 'Type'),
    groupByBank: resolveLabel((t as any)?.filters?.groupByBank, 'Bank'),
    groupByUser: resolveLabel((t as any)?.filters?.groupByUser, 'User'),
    groupByAmount: resolveLabel((t as any)?.filters?.groupByAmount, 'Amount'),
    hasErrors: resolveLabel((t as any)?.filters?.hasErrors, 'Errors'),
    hasLogs: resolveLabel((t as any)?.filters?.hasLogs, 'Logs'),
    hasTransactions: resolveLabel((t as any)?.filters?.hasTransactions, 'Transactions'),
    hasDateRange: resolveLabel((t as any)?.filters?.hasDateRange, 'Date range'),
    hasCurrency: resolveLabel((t as any)?.filters?.hasCurrency, 'Currency'),
  };

  const filterLinkClassName =
    'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-primary';

  const typeOptions = [
    { value: 'expense', label: filterOptionLabels.typeExpense },
    { value: 'expense_report', label: filterOptionLabels.typeReport },
    { value: 'chat', label: filterOptionLabels.typeChat },
    { value: 'trip', label: filterOptionLabels.typeTrip },
    { value: 'task', label: filterOptionLabels.typeTask },
    { value: 'gmail', label: 'Gmail' },
    { value: 'pdf', label: 'PDF' },
    { value: 'xlsx', label: 'Excel' },
    { value: 'csv', label: 'CSV' },
    { value: 'image', label: 'Image' },
  ];

  const statusOptions = [
    { value: 'unreported', label: filterOptionLabels.statusUnreported },
    { value: 'draft', label: filterOptionLabels.statusDraft },
    { value: 'outstanding', label: filterOptionLabels.statusOutstanding },
    { value: 'approved', label: filterOptionLabels.statusApproved },
    { value: 'paid', label: filterOptionLabels.statusPaid },
    { value: 'done', label: filterOptionLabels.statusDone },
  ];

  const datePresets = [
    { value: 'thisMonth' as const, label: filterOptionLabels.dateThisMonth },
    { value: 'lastMonth' as const, label: filterOptionLabels.dateLastMonth },
    { value: 'yearToDate' as const, label: filterOptionLabels.dateYearToDate },
  ];

  const dateModes = [
    { value: 'on' as const, label: filterOptionLabels.dateOn },
    { value: 'after' as const, label: filterOptionLabels.dateAfter },
    { value: 'before' as const, label: filterOptionLabels.dateBefore },
  ];

  const groupByOptions = [
    { value: 'day' as const, label: 'Day' },
    { value: 'week' as const, label: 'Week' },
    { value: 'month' as const, label: 'Month' },
    { value: 'quarter' as const, label: 'Quarter' },
    { value: 'year' as const, label: 'Year' },
  ];

  const viewOptions = [
    { value: 'line' as const, label: 'Line' },
    { value: 'bar' as const, label: 'Bar' },
    { value: 'stacked' as const, label: 'Stacked' },
  ];

  const hasOptions = [
    { value: 'errors', label: filterOptionLabels.hasErrors },
    { value: 'processingDetails', label: filterOptionLabels.hasLogs },
    { value: 'transactions', label: filterOptionLabels.hasTransactions },
    { value: 'dateRange', label: filterOptionLabels.hasDateRange },
    { value: 'currency', label: filterOptionLabels.hasCurrency },
  ];

  const workspaceTargets = useMemo(() => {
    if (workspaceFilter === 'all') {
      const all = workspaces.map(workspace => ({
        id: workspace.id,
        name: workspace.name || 'Workspace',
      }));
      if (all.length > 0) return all;
    }

    if (workspaceFilter === 'current') {
      if (currentWorkspace?.id) {
        return [
          { id: currentWorkspace.id, name: currentWorkspace.name || labels.currentWorkspace },
        ];
      }
      return [];
    }

    const selectedWorkspace = workspaces.find(workspace => workspace.id === workspaceFilter);
    return [{ id: workspaceFilter, name: selectedWorkspace?.name || labels.currentWorkspace }];
  }, [
    workspaceFilter,
    workspaces,
    currentWorkspace?.id,
    currentWorkspace?.name,
    labels.currentWorkspace,
  ]);

  const workspaceTargetKey = useMemo(
    () => workspaceTargets.map(target => target.id).join(','),
    [workspaceTargets],
  );

  useEffect(() => {
    saveStoredState({
      filters: appliedFilters,
      groupBy,
      viewType,
      workspaceFilter,
      activeFlowType,
    });
  }, [appliedFilters, groupBy, viewType, workspaceFilter, activeFlowType]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user?.id) return;
      if (workspaceTargets.length === 0) {
        setStatements([]);
        setTransactions([]);
        setGmailReceipts([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const allStatements: StatementMeta[] = [];
        const allTransactions: Transaction[] = [];
        const allReceipts: GmailReceipt[] = [];

        for (const target of workspaceTargets) {
          const requestHeaders = {
            'X-Workspace-Id': target.id,
          };

          const statementsResponse = await apiClient.get('/statements', {
            params: { page: 1, limit: 500 },
            headers: requestHeaders,
          });
          const statementItems = statementsResponse.data?.data || statementsResponse.data || [];
          allStatements.push(
            ...(Array.isArray(statementItems) ? statementItems : []).map(statement => ({
              ...statement,
              workspaceId: target.id,
              workspaceName: target.name,
            })),
          );

          const transactionsResponse = await apiClient.get('/transactions', {
            params: { page: 1, limit: 500 },
            headers: requestHeaders,
          });
          const transactionItems =
            transactionsResponse.data?.data ||
            transactionsResponse.data?.items ||
            transactionsResponse.data ||
            [];
          allTransactions.push(
            ...(Array.isArray(transactionItems) ? transactionItems : []).map(transaction => ({
              ...transaction,
              workspaceId: target.id,
              workspaceName: target.name,
            })),
          );

          const receiptsResponse = await apiClient.get('/integrations/gmail/receipts', {
            params: { limit: 100, offset: 0 },
            headers: requestHeaders,
          });
          const receiptItems = receiptsResponse.data?.receipts || [];
          allReceipts.push(
            ...(Array.isArray(receiptItems) ? receiptItems : []).map(receipt => ({
              ...receipt,
              workspaceId: target.id,
              workspaceName: target.name,
            })),
          );
        }

        if (!isMounted) return;
        setStatements(allStatements);
        setTransactions(allTransactions);
        setGmailReceipts(allReceipts);
      } catch (error) {
        console.error('Failed to load spend over time data', error);
        if (isMounted) {
          toast.error('Failed to load spending data');
          setStatements([]);
          setTransactions([]);
          setGmailReceipts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.id, workspaceTargetKey]);

  const allRecords = useMemo<SpendOverTimeRecord[]>(() => {
    const statementById = new Map(statements.map(statement => [statement.id, statement]));

    const mappedTransactions: SpendOverTimeRecord[] = transactions
      .map((item): SpendOverTimeRecord => {
        const statementMeta = item.statementId ? statementById.get(item.statementId) : undefined;
        const flow = resolveSpendOverTimeFlow({
          sourceType: 'statement' as const,
          debit: item.debit,
          credit: item.credit,
          amount: item.amount,
          transactionType: item.transactionType,
        });
        const currency = getTransactionCurrency(item, statementMeta, workspaceCurrency);
        const merchant = (item.counterpartyName || '').trim() || 'Unknown';
        const fileType = (statementMeta?.fileType || item.transactionType || 'expense')
          .toString()
          .toLowerCase();

        return {
          id: item.id,
          source: 'statement' as const,
          fileName: merchant,
          subject: null,
          sender: null,
          status: statementMeta?.status || null,
          fileType,
          createdAt: statementMeta?.createdAt || item.createdAt || null,
          statementDateFrom: statementMeta?.statementDateFrom || item.transactionDate || null,
          statementDateTo: statementMeta?.statementDateTo || null,
          bankName: statementMeta?.bankName || null,
          totalDebit: flow.flowType === 'expense' ? flow.amount : null,
          totalCredit: flow.flowType === 'income' ? flow.amount : null,
          currency,
          exported: statementMeta?.exported ?? null,
          paid: statementMeta?.paid ?? null,
          parsingDetails: statementMeta?.parsingDetails || null,
          user: statementMeta?.user || null,
          receivedAt: null,
          parsedData: {
            vendor: merchant,
            date: item.transactionDate || null,
          },
          sourceType: 'statement',
          sourceChannel: resolveSourceChannel({ sourceType: 'statement', fileType }),
          flowType: flow.flowType,
          amount: flow.amount,
          currencyValue: currency,
          dateValue: getTransactionDate(item, statementMeta),
          transactionId: item.id,
          workspaceId: statementMeta?.workspaceId || item.workspaceId,
          workspaceName: statementMeta?.workspaceName || item.workspaceName,
          merchant,
          paymentPurpose: item.paymentPurpose,
        };
      })
      .filter(record => record.amount > 0);

    const mappedReceipts: SpendOverTimeRecord[] = gmailReceipts
      .map((receipt): SpendOverTimeRecord => {
        const flow = resolveSpendOverTimeFlow({
          sourceType: 'gmail' as const,
          amount: receipt.parsedData?.amount ?? 0,
          transactionType: receipt.parsedData?.transactionType,
        });
        const merchant = resolveGmailMerchantLabel({
          vendor: receipt.parsedData?.vendor,
          sender: receipt.sender,
          subject: receipt.subject,
          fallback: 'Gmail receipt',
        });
        const currency = resolveCurrencyCode(receipt.parsedData?.currency, workspaceCurrency);

        return {
          id: receipt.id,
          source: 'gmail' as const,
          fileName: merchant,
          subject: receipt.subject,
          sender: receipt.sender,
          status: receipt.status,
          fileType: 'gmail',
          createdAt: receipt.receivedAt,
          statementDateFrom: receipt.parsedData?.date || receipt.receivedAt,
          statementDateTo: null,
          bankName: 'gmail',
          totalDebit: flow.flowType === 'expense' ? flow.amount : null,
          totalCredit: flow.flowType === 'income' ? flow.amount : null,
          currency,
          exported: null,
          paid: null,
          parsingDetails: null,
          user: null,
          receivedAt: receipt.receivedAt,
          parsedData: {
            vendor: merchant,
            date: receipt.parsedData?.date || receipt.receivedAt,
          },
          sourceType: 'gmail',
          sourceChannel: 'gmail',
          flowType: flow.flowType,
          amount: flow.amount,
          currencyValue: currency,
          dateValue: receipt.parsedData?.date || receipt.receivedAt,
          transactionId: receipt.transactionId ?? null,
          workspaceId: receipt.workspaceId,
          workspaceName: receipt.workspaceName,
          merchant,
          paymentPurpose: merchant,
        };
      })
      .filter(record => record.amount > 0);

    const existingTransactionIds = new Set(transactions.map(transaction => transaction.id));
    const uniqueReceipts = dedupeSpendOverTimeReceiptRecords(
      mappedReceipts,
      existingTransactionIds,
    );

    return [...mappedTransactions, ...uniqueReceipts];
  }, [transactions, gmailReceipts, statements, workspaceCurrency]);

  const fromOptions = useMemo(() => {
    const seen = new Map<
      string,
      {
        id: string;
        label: string;
        description?: string | null;
        avatarUrl?: string | null;
        bankName?: string | null;
      }
    >();

    allRecords.forEach(record => {
      if (record.user?.id && !seen.has(`user:${record.user.id}`)) {
        seen.set(`user:${record.user.id}`, {
          id: `user:${record.user.id}`,
          label: record.user.name || record.user.email || 'User',
          description: record.user.email ? `@${record.user.email.split('@')[0]}` : null,
        });
      }

      if (record.bankName && !seen.has(`bank:${record.bankName}`)) {
        seen.set(`bank:${record.bankName}`, {
          id: `bank:${record.bankName}`,
          label: record.bankName === 'gmail' ? 'Gmail' : record.bankName,
          bankName: record.bankName,
        });
      }
    });

    return Array.from(seen.values());
  }, [allRecords]);

  const currencyOptions = useMemo(() => {
    const unique = new Set<string>();
    allRecords.forEach(record => {
      if (record.currencyValue) unique.add(record.currencyValue);
    });
    return Array.from(unique.values());
  }, [allRecords]);

  const filterBySearchQuery = (records: SpendOverTimeRecord[]) => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return records;

    return records.filter(record => {
      return (
        (record.merchant || '').toLowerCase().includes(query) ||
        (record.sender || '').toLowerCase().includes(query) ||
        (record.subject || '').toLowerCase().includes(query) ||
        (record.paymentPurpose || '').toLowerCase().includes(query) ||
        (record.bankName || '').toLowerCase().includes(query)
      );
    });
  };

  const filteredRecords = useMemo(() => {
    const filtered = applyStatementsFilters<SpendOverTimeRecord>(allRecords, appliedFilters);
    return filterBySearchQuery(filtered);
  }, [allRecords, appliedFilters, searchInput]);

  const flowFilteredRecords = useMemo(
    () => filteredRecords.filter(record => record.flowType === activeFlowType),
    [filteredRecords, activeFlowType],
  );

  const recordsWithoutDateFilter = useMemo(() => {
    const filtersWithoutDate = {
      ...appliedFilters,
      date: null,
    };
    const filtered = applyStatementsFilters<SpendOverTimeRecord>(allRecords, filtersWithoutDate);
    return filterBySearchQuery(filtered);
  }, [allRecords, appliedFilters, searchInput]);

  const flowRecordsWithoutDateFilter = useMemo(
    () => recordsWithoutDateFilter.filter(record => record.flowType === activeFlowType),
    [recordsWithoutDateFilter, activeFlowType],
  );

  const report = useMemo(
    () => buildSpendOverTimeReport(flowFilteredRecords, groupBy),
    [flowFilteredRecords, groupBy],
  );

  const rows = useMemo(() => {
    return [...report.points].sort((a, b) => {
      if (sortKey === 'average') {
        const aAvg = a.count > 0 ? (a.income + a.expense) / a.count : 0;
        const bAvg = b.count > 0 ? (b.income + b.expense) / b.count : 0;
        return bAvg - aAvg;
      }
      if (sortKey === 'operations') return b.count - a.count;
      return b.income + b.expense - (a.income + a.expense);
    });
  }, [report.points, sortKey]);

  const currentPeriodRange = useMemo(() => {
    const points = flowFilteredRecords
      .map(record => getRecordDate(record))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime());

    if (points.length === 0) return null;

    return {
      start: points[0],
      end: points[points.length - 1],
    };
  }, [flowFilteredRecords]);

  const previousPeriodTotals = useMemo(() => {
    if (!currentPeriodRange) return null;
    const previousRange = buildPreviousPeriodRange(
      currentPeriodRange.start,
      currentPeriodRange.end,
    );
    if (!previousRange) return null;

    const previousRecords = flowRecordsWithoutDateFilter.filter(record => {
      const recordDate = getRecordDate(record);
      if (!recordDate) return false;
      return recordDate >= previousRange.start && recordDate <= previousRange.end;
    });

    return buildSpendOverTimeReport(previousRecords, groupBy).totals;
  }, [currentPeriodRange, flowRecordsWithoutDateFilter, groupBy]);

  const comparison = useMemo(() => {
    if (!previousPeriodTotals) return null;

    return {
      total: getComparisonDelta(
        activeFlowType === 'income' ? report.totals.income : report.totals.expense,
        activeFlowType === 'income' ? previousPeriodTotals.income : previousPeriodTotals.expense,
      ),
      statementsAmount: getComparisonDelta(
        report.totals.statementAmount,
        previousPeriodTotals.statementAmount,
      ),
      receiptsAmount: getComparisonDelta(
        report.totals.gmailAmount,
        previousPeriodTotals.gmailAmount,
      ),
      operations: getComparisonDelta(report.totals.count, previousPeriodTotals.count),
      avgPerPeriod: getComparisonDelta(
        report.totals.avgPerPeriod,
        previousPeriodTotals.avgPerPeriod,
      ),
    };
  }, [report.totals, previousPeriodTotals, activeFlowType]);

  const selectedPoint = useMemo(
    () => report.points.find(point => point.period === selectedPeriod) || null,
    [report.points, selectedPeriod],
  );

  const drillDownRecords = useMemo(() => {
    if (!selectedPoint) return [];

    return flowFilteredRecords
      .filter(record => {
        const date = getRecordDate(record);
        if (!date) return false;
        return matchesPeriod(date, selectedPoint.period, groupBy);
      })
      .sort((a, b) => {
        const aTime = getRecordDate(a)?.getTime() ?? 0;
        const bTime = getRecordDate(b)?.getTime() ?? 0;
        return bTime - aTime;
      });
  }, [selectedPoint, flowFilteredRecords, groupBy]);

  const trendChart = useMemo(() => {
    const labelsList = report.points.map(point => point.label);

    if (viewType === 'stacked') {
      return {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { top: 0 },
        grid: { left: 30, right: 30, bottom: 30, top: 38 },
        xAxis: { type: 'category', data: labelsList },
        yAxis: { type: 'value' },
        series: [
          {
            name: labels.totalIncome,
            type: 'bar',
            stack: 'flow',
            data: report.points.map(point => Number(point.income.toFixed(2))),
            itemStyle: {
              color: resolvedTheme === 'dark' ? '#4ade80' : '#16a34a',
              borderRadius: [6, 6, 0, 0],
            },
          },
          {
            name: labels.totalSpend,
            type: 'bar',
            stack: 'flow',
            data: report.points.map(point => Number(point.expense.toFixed(2))),
            itemStyle: {
              color: resolvedTheme === 'dark' ? '#f87171' : '#dc2626',
              borderRadius: [6, 6, 0, 0],
            },
          },
        ],
      };
    }

    const values = report.points.map(point =>
      Number((activeFlowType === 'income' ? point.income : point.expense).toFixed(2)),
    );
    const color = activeFlowType === 'income' ? '#16a34a' : '#dc2626';
    const darkColor = activeFlowType === 'income' ? '#4ade80' : '#f87171';

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 30, right: 30, bottom: 30, top: 30 },
      xAxis: { type: 'category', data: labelsList },
      yAxis: { type: 'value' },
      series: [
        viewType === 'bar'
          ? {
              name: activeFlowType === 'income' ? labels.totalIncome : labels.totalSpend,
              type: 'bar',
              data: values,
              barWidth: 24,
              itemStyle: {
                color: resolvedTheme === 'dark' ? darkColor : color,
                borderRadius: [6, 6, 0, 0],
              },
            }
          : {
              name: activeFlowType === 'income' ? labels.totalIncome : labels.totalSpend,
              type: 'line',
              smooth: true,
              data: values,
              areaStyle: {
                color:
                  activeFlowType === 'income'
                    ? resolvedTheme === 'dark'
                      ? 'rgba(74,222,128,0.18)'
                      : 'rgba(22,163,74,0.14)'
                    : resolvedTheme === 'dark'
                      ? 'rgba(248,113,113,0.18)'
                      : 'rgba(220,38,38,0.12)',
              },
              lineStyle: { color: resolvedTheme === 'dark' ? darkColor : color },
              itemStyle: { color: resolvedTheme === 'dark' ? darkColor : color },
            },
      ],
    };
  }, [
    report.points,
    viewType,
    activeFlowType,
    labels.totalIncome,
    labels.totalSpend,
    resolvedTheme,
  ]);

  const sourceChart = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: { top: 'bottom' },
      series: [
        {
          type: 'pie',
          radius: ['35%', '72%'],
          data: [
            {
              name: labels.statementsAmount,
              value: Number(report.totals.statementAmount.toFixed(2)),
            },
            { name: labels.receiptsAmount, value: Number(report.totals.gmailAmount.toFixed(2)) },
          ],
        },
      ],
    };
  }, [
    labels.receiptsAmount,
    labels.statementsAmount,
    report.totals.gmailAmount,
    report.totals.statementAmount,
  ]);

  const periodsChart = useMemo(() => {
    const top = rows.slice(0, 12).reverse();
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 120, right: 20, top: 20, bottom: 20 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: top.map(item => item.label),
      },
      series: [
        {
          type: 'bar',
          data: top.map(item => ({
            value: Number((activeFlowType === 'income' ? item.income : item.expense).toFixed(2)),
            itemStyle: {
              color:
                activeFlowType === 'income'
                  ? resolvedTheme === 'dark'
                    ? '#4ade80'
                    : '#16a34a'
                  : resolvedTheme === 'dark'
                    ? '#f87171'
                    : '#dc2626',
              borderRadius: [4, 4, 4, 4],
            },
          })),
        },
      ],
    };
  }, [rows, activeFlowType, resolvedTheme]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.type) count += 1;
    if (appliedFilters.statuses.length > 0) count += 1;
    if (appliedFilters.date?.preset || appliedFilters.date?.mode) count += 1;
    if (appliedFilters.from.length > 0) count += 1;
    if (appliedFilters.to.length > 0) count += 1;
    if (appliedFilters.keywords.trim()) count += 1;
    if (appliedFilters.amountMin !== null || appliedFilters.amountMax !== null) count += 1;
    if (appliedFilters.approved !== null) count += 1;
    if (appliedFilters.billable !== null) count += 1;
    if (appliedFilters.groupBy) count += 1;
    if (appliedFilters.has.length > 0) count += 1;
    if (appliedFilters.currencies.length > 0) count += 1;
    if (appliedFilters.exported !== null) count += 1;
    if (appliedFilters.paid !== null) count += 1;
    if (appliedFilters.limit !== null) count += 1;
    return count;
  }, [appliedFilters]);

  const updateFilter = (next: Partial<StatementFilters>) => {
    setDraftFilters(prev => ({ ...prev, ...next }));
  };

  const applyFilterChanges = () => {
    setAppliedFilters(draftFilters);
    setGroupBy(draftGroupBy);
    setViewType(draftViewType);
  };

  const applyAndClose = (close: () => void) => {
    applyFilterChanges();
    close();
  };

  const resetAndClose = (key: keyof StatementFilters, close: () => void) => {
    const next = resetSingleStatementFilter(draftFilters, key);
    setDraftFilters(next);
    setAppliedFilters(next);
    close();
  };

  const resetAllFilters = () => {
    setDraftFilters(DEFAULT_STATEMENT_FILTERS);
    setAppliedFilters(DEFAULT_STATEMENT_FILTERS);
    setDraftGroupBy(DEFAULT_GROUP_BY);
    setGroupBy(DEFAULT_GROUP_BY);
    setDraftViewType(DEFAULT_VIEW);
    setViewType(DEFAULT_VIEW);
  };

  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const formatPercentage = (value: number) => {
    const normalized = Number.isInteger(value) ? value.toString() : value.toFixed(1);
    if (value > 0) return `+${normalized}%`;
    return `${normalized}%`;
  };

  const renderComparisonLine = (
    item: ReturnType<typeof getComparisonDelta> | null,
    isMoney = true,
  ) => {
    if (!item) {
      return <p className="mt-1 text-xs text-gray-400">{labels.comparisonNoData}</p>;
    }

    const deltaColor =
      item.trend === 'up'
        ? 'text-emerald-600'
        : item.trend === 'down'
          ? 'text-red-600'
          : 'text-gray-500';
    const prefix = item.delta > 0 ? '+' : item.delta < 0 ? '-' : '';
    const deltaValue = isMoney
      ? formatMoney(Math.abs(item.delta), workspaceCurrency)
      : Math.abs(Math.round(item.delta)).toString();

    return (
      <p className={`mt-1 text-xs ${deltaColor}`}>
        {formatPercentage(item.percentage)} ({prefix}
        {deltaValue}) {labels.vsPreviousPeriod}
      </p>
    );
  };

  const renderSourceBadge = (sourceChannel: SpendOverTimeRecord['sourceChannel']) => {
    const label = getSourceLabel(sourceChannel, {
      sourceBank: labels.sourceBank,
      sourceReceipt: labels.sourceReceipt,
      sourceGmailInbox: labels.sourceGmailInbox,
    });

    if (sourceChannel === 'gmail') {
      return (
        <span className="inline-flex items-center gap-1.5 text-gray-600">
          <Mail className="h-3.5 w-3.5" />
          {label}
        </span>
      );
    }

    if (sourceChannel === 'receipt') {
      return (
        <span className="inline-flex items-center gap-1.5 text-gray-600">
          <Receipt className="h-3.5 w-3.5" />
          {label}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-gray-600">
        <Landmark className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  };

  return (
    <div className="container-shared flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{labels.title}</h1>
            <p className="text-sm text-gray-500">{labels.subtitle}</p>
          </div>
          <div className="inline-flex rounded-md border border-gray-200 bg-white p-1">
            <button
              type="button"
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                activeFlowType === 'expense'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => setActiveFlowType('expense')}
            >
              {labels.tabExpense}
            </button>
            <button
              type="button"
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                activeFlowType === 'income'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => setActiveFlowType('income')}
            >
              {labels.tabIncome}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder={labels.searchPlaceholder}
              aria-label={labels.searchPlaceholder}
              className="w-full rounded-md border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div className="sm:w-60">
            <label htmlFor="spend-over-time-workspace-filter" className="sr-only">
              {labels.workspace}
            </label>
            <select
              id="spend-over-time-workspace-filter"
              value={workspaceFilter}
              onChange={event => setWorkspaceFilter(event.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            >
              <option value="current">{labels.currentWorkspace}</option>
              <option value="all">{labels.allWorkspaces}</option>
              {workspaces.map(workspace => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GroupByFilterDropdown
            open={groupByDropdownOpen}
            onOpenChange={setGroupByDropdownOpen}
            options={groupByOptions}
            value={draftGroupBy}
            onChange={value => setDraftGroupBy(value as SpendOverTimeGroupBy)}
            onApply={() => applyAndClose(() => setGroupByDropdownOpen(false))}
            onReset={() => {
              setDraftGroupBy(DEFAULT_GROUP_BY);
              setGroupByDropdownOpen(false);
            }}
            trigger={
              <FilterChipButton active>
                Group by: {groupByOptions.find(option => option.value === draftGroupBy)?.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
          />

          <ViewFilterDropdown
            open={viewDropdownOpen}
            onOpenChange={setViewDropdownOpen}
            options={viewOptions}
            value={draftViewType}
            onChange={value => setDraftViewType(value as ViewTypeValue)}
            onApply={() => applyAndClose(() => setViewDropdownOpen(false))}
            onReset={() => {
              setDraftViewType(DEFAULT_VIEW);
              setViewDropdownOpen(false);
            }}
            trigger={
              <FilterChipButton active>
                View: {viewOptions.find(option => option.value === draftViewType)?.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
          />

          <StatusFilterDropdown
            open={statusDropdownOpen}
            onOpenChange={setStatusDropdownOpen}
            options={statusOptions}
            values={draftFilters.statuses}
            onChange={values => updateFilter({ statuses: values })}
            onApply={() => applyAndClose(() => setStatusDropdownOpen(false))}
            onReset={() => resetAndClose('statuses', () => setStatusDropdownOpen(false))}
            trigger={
              <FilterChipButton active={draftFilters.statuses.length > 0}>
                {draftFilters.statuses.length > 0
                  ? `${labels.status} (${draftFilters.statuses.length})`
                  : labels.status}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
          />

          <DateFilterDropdown
            open={dateDropdownOpen}
            onOpenChange={setDateDropdownOpen}
            presets={datePresets}
            modes={dateModes}
            value={draftFilters.date}
            onChange={value => updateFilter({ date: value })}
            onApply={() => applyAndClose(() => setDateDropdownOpen(false))}
            onReset={() => resetAndClose('date', () => setDateDropdownOpen(false))}
            trigger={
              <FilterChipButton active={Boolean(draftFilters.date)}>
                {draftFilters.date?.preset
                  ? datePresets.find(option => option.value === draftFilters.date?.preset)?.label
                  : draftFilters.date?.mode
                    ? dateModes.find(option => option.value === draftFilters.date?.mode)?.label
                    : labels.date}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
          />

          <FromFilterDropdown
            open={fromDropdownOpen}
            onOpenChange={setFromDropdownOpen}
            options={fromOptions}
            values={draftFilters.from}
            onChange={values => updateFilter({ from: values })}
            onApply={() => applyAndClose(() => setFromDropdownOpen(false))}
            onReset={() => resetAndClose('from', () => setFromDropdownOpen(false))}
            trigger={
              <FilterChipButton active={draftFilters.from.length > 0}>
                {draftFilters.from.length > 0
                  ? `${labels.from} (${draftFilters.from.length})`
                  : labels.from}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
          />

          <button
            type="button"
            className={filterLinkClassName}
            onClick={() => {
              setDraftFilters(appliedFilters);
              setDraftGroupBy(groupBy);
              setDraftViewType(viewType);
              setFiltersDrawerScreen('root');
              setFiltersDrawerOpen(true);
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {labels.filters}
            {activeFilterCount > 0 ? (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingAnimation size="lg" />
          </div>
        ) : flowFilteredRecords.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-base font-semibold text-gray-900">{labels.emptyStateTitle}</p>
            <p className="mt-1 text-sm text-gray-500">{labels.emptyStateDescription}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
                onClick={() => router.push('/statements/submit')}
              >
                {labels.emptyStateUploadCta}
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
                onClick={resetAllFilters}
              >
                {labels.emptyStateResetCta}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {activeFlowType === 'income' ? labels.totalIncome : labels.totalSpend}
                  </span>
                  {activeFlowType === 'income' ? (
                    <ArrowUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div
                  className={`mt-2 text-lg font-semibold ${
                    activeFlowType === 'income' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatMoney(
                    activeFlowType === 'income' ? report.totals.income : report.totals.expense,
                    workspaceCurrency,
                  )}
                </div>
                {renderComparisonLine(comparison?.total || null)}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {labels.statementsAmount}
                  </span>
                  <ChartPie className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 text-lg font-semibold text-primary">
                  {formatMoney(report.totals.statementAmount, workspaceCurrency)}
                </div>
                {renderComparisonLine(comparison?.statementsAmount || null)}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {labels.receiptsAmount}
                  </span>
                  <Mail className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-2 text-lg font-semibold text-emerald-600">
                  {formatMoney(report.totals.gmailAmount, workspaceCurrency)}
                </div>
                {renderComparisonLine(comparison?.receiptsAmount || null)}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {labels.totalOperations}
                  </span>
                  <span className="text-xs font-medium text-gray-500">#</span>
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {report.totals.count}
                </div>
                {renderComparisonLine(comparison?.operations || null, false)}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {labels.avgPerPeriod}
                  </span>
                  <span className="text-xs font-medium text-gray-500">AVG</span>
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {formatMoney(report.totals.avgPerPeriod, workspaceCurrency)}
                </div>
                {renderComparisonLine(comparison?.avgPerPeriod || null)}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{labels.trendTitle}</h3>
                </div>
                <ReactECharts style={{ height: 300 }} option={trendChart} theme={chartTheme} />
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{labels.sourceSplit}</h3>
                </div>
                <ReactECharts style={{ height: 300 }} option={sourceChart} theme={chartTheme} />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{labels.periodChart}</h3>
              </div>
              <ReactECharts style={{ height: 320 }} option={periodsChart} theme={chartTheme} />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{labels.leaderboard}</h3>
                  <span className="text-xs text-gray-500">{rows.length}</span>
                </div>
                <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                      sortKey === 'amount' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                    }`}
                    onClick={() => setSortKey('amount')}
                  >
                    {labels.sortByAmount}
                  </button>
                  <button
                    type="button"
                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                      sortKey === 'average' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                    }`}
                    onClick={() => setSortKey('average')}
                  >
                    {labels.sortByAverage}
                  </button>
                  <button
                    type="button"
                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                      sortKey === 'operations'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600'
                    }`}
                    onClick={() => setSortKey('operations')}
                  >
                    {labels.sortByOperations}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-4">{labels.period}</th>
                      <th className="py-2 pr-4 text-right">{labels.operations}</th>
                      <th className="py-2 pr-4 text-right">{labels.average}</th>
                      <th className="py-2 pr-4 text-right">{labels.amount}</th>
                      <th className="py-2 text-right">{labels.lastOperation}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.slice(0, 60).map(row => {
                      const total = activeFlowType === 'income' ? row.income : row.expense;
                      const average = row.count > 0 ? total / row.count : 0;
                      return (
                        <tr key={row.period} className="text-gray-700">
                          <td className="py-2 pr-4 font-medium text-gray-900">
                            <button
                              type="button"
                              className="text-left text-primary hover:underline"
                              onClick={() => setSelectedPeriod(row.period)}
                            >
                              {row.label}
                            </button>
                          </td>
                          <td className="py-2 pr-4 text-right">{row.count}</td>
                          <td className="py-2 pr-4 text-right">
                            {formatMoney(average, workspaceCurrency)}
                          </td>
                          <td className="py-2 pr-4 text-right font-semibold text-gray-900">
                            {formatMoney(total, workspaceCurrency)}
                          </td>
                          <td className="py-2 text-right text-gray-500">{row.label}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <FiltersDrawer
        open={filtersDrawerOpen}
        onClose={() => {
          setFiltersDrawerOpen(false);
          setFiltersDrawerScreen('root');
        }}
        filters={draftFilters}
        screen={filtersDrawerScreen}
        onBack={() => setFiltersDrawerScreen('root')}
        onSelect={screen => setFiltersDrawerScreen(screen)}
        onUpdateFilters={updateFilter}
        onResetAll={resetAllFilters}
        onViewResults={() => {
          applyFilterChanges();
          setFiltersDrawerOpen(false);
          setFiltersDrawerScreen('root');
        }}
        typeOptions={typeOptions}
        statusOptions={statusOptions}
        datePresets={datePresets}
        dateModes={dateModes}
        fromOptions={fromOptions}
        toOptions={fromOptions}
        groupByOptions={groupByOptions}
        hasOptions={hasOptions}
        currencyOptions={currencyOptions}
        labels={{
          title: filterOptionLabels.drawerTitle,
          viewResults: filterOptionLabels.viewResults,
          saveSearch: filterOptionLabels.saveSearch,
          resetFilters: filterOptionLabels.resetFilters,
          general: filterOptionLabels.drawerGeneral,
          expenses: filterOptionLabels.drawerExpenses,
          reports: filterOptionLabels.drawerReports,
          type: labels.type,
          from: labels.from,
          groupBy: filterOptionLabels.drawerGroupBy,
          has: filterOptionLabels.drawerHas,
          keywords: filterOptionLabels.drawerKeywords,
          limit: filterOptionLabels.drawerLimit,
          status: labels.status,
          to: filterOptionLabels.drawerTo,
          amount: filterOptionLabels.drawerAmount,
          approved: filterOptionLabels.drawerApproved,
          billable: filterOptionLabels.drawerBillable,
          currency: filterOptionLabels.hasCurrency,
          date: labels.date,
          exported: 'Exported',
          paid: 'Paid',
          any: filterOptionLabels.any,
          yes: filterOptionLabels.yes,
          no: filterOptionLabels.no,
        }}
        activeCount={activeFilterCount}
      />

      {selectedPoint ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  {selectedPoint.label} - {labels.drillDown}
                </h4>
                <p className="text-xs text-gray-500">{groupBy}</p>
              </div>
              <button
                type="button"
                className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                onClick={() => setSelectedPeriod(null)}
                aria-label={labels.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
              {drillDownRecords.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  {labels.noOperations}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-4">{labels.lastOperation}</th>
                      <th className="py-2 pr-4">{labels.source}</th>
                      <th className="py-2 pr-4">{labels.workspace}</th>
                      <th className="py-2 pr-4">Merchant</th>
                      <th className="py-2 text-right">{labels.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {drillDownRecords.slice(0, 120).map(record => (
                      <tr key={record.id} className="text-gray-700">
                        <td className="py-2 pr-4 text-gray-600">
                          {record.dateValue && !Number.isNaN(new Date(record.dateValue).getTime())
                            ? new Date(record.dateValue).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="py-2 pr-4">{renderSourceBadge(record.sourceChannel)}</td>
                        <td className="py-2 pr-4 text-gray-600">{record.workspaceName || '-'}</td>
                        <td className="py-2 pr-4 text-gray-600">
                          {record.merchant || record.sender || record.subject || '-'}
                        </td>
                        <td className="py-2 text-right font-medium text-gray-900">
                          {formatMoney(record.amount, workspaceCurrency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
