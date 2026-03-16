'use client';

import { DateFilterDropdown } from '@/app/(main)/statements/components/filters/DateFilterDropdown';
import { FiltersDrawer } from '@/app/(main)/statements/components/filters/FiltersDrawer';
import { FromFilterDropdown } from '@/app/(main)/statements/components/filters/FromFilterDropdown';
import { GroupByFilterDropdown } from '@/app/(main)/statements/components/filters/GroupByFilterDropdown';
import { StatusFilterDropdown } from '@/app/(main)/statements/components/filters/StatusFilterDropdown';
import { TypeFilterDropdown } from '@/app/(main)/statements/components/filters/TypeFilterDropdown';
import { ViewFilterDropdown } from '@/app/(main)/statements/components/filters/ViewFilterDropdown';
import {
  DEFAULT_STATEMENT_FILTERS,
  type StatementFilters,
  resetSingleStatementFilter,
} from '@/app/(main)/statements/components/filters/statement-filters';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';
import { useIntlayer } from '@/app/i18n';
import { type SpendOverTimeReport, fetchSpendOverTimeReport } from '@/app/lib/spend-over-time-api';
import { ChevronDown, Columns2, LineChart, RefreshCcw, SlidersHorizontal } from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

const STORAGE_KEY = 'lumio-spend-over-time-filters';

type FlowFilterValue = 'expense' | 'income' | 'net' | 'all';
type GroupByValue = 'day' | 'week' | 'month' | 'quarter' | 'year';
type ViewTypeValue = 'line' | 'bar' | 'stacked';

const DEFAULT_GROUP_BY: GroupByValue = 'month';
const DEFAULT_VIEW: ViewTypeValue = 'line';
const DEFAULT_FLOW: FlowFilterValue = 'expense';

type StoredState = {
  filters: StatementFilters;
  groupBy: GroupByValue;
  viewType: ViewTypeValue;
  showTable: boolean;
};

const FILTER_LABELS = {
  title: 'Filters',
  viewResults: 'View results',
  saveSearch: 'Save search',
  resetFilters: 'Reset filters',
  general: 'General',
  expenses: 'Expenses',
  reports: 'Reports',
  type: 'Flow',
  from: 'From',
  groupBy: 'Group by',
  has: 'Has',
  keywords: 'Keywords',
  limit: 'Limit',
  status: 'Status',
  to: 'To',
  amount: 'Amount',
  approved: 'Approved',
  billable: 'Billable',
  currency: 'Currency',
  date: 'Date',
  exported: 'Exported',
  paid: 'Paid',
  any: 'Any',
  yes: 'Yes',
  no: 'No',
};

const FLOW_OPTIONS: Array<{ value: FlowFilterValue; label: string }> = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'net', label: 'Net' },
  { value: 'all', label: 'All' },
];

const STATUS_OPTIONS = [
  { value: 'unreported', label: 'Unreported' },
  { value: 'draft', label: 'Draft' },
  { value: 'outstanding', label: 'Outstanding' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'done', label: 'Done' },
];

const DATE_PRESETS = [
  { value: 'thisMonth' as const, label: 'This month' },
  { value: 'lastMonth' as const, label: 'Last month' },
  { value: 'yearToDate' as const, label: 'Year to date' },
];

const DATE_MODES = [
  { value: 'on' as const, label: 'On' },
  { value: 'after' as const, label: 'After' },
  { value: 'before' as const, label: 'Before' },
];

const HAS_OPTIONS = [
  { value: 'errors', label: 'Errors' },
  { value: 'processingDetails', label: 'Logs' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'dateRange', label: 'Date range' },
  { value: 'currency', label: 'Currency' },
];

const GROUP_BY_OPTIONS: Array<{ value: GroupByValue; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

const VIEW_OPTIONS: Array<{ value: ViewTypeValue; label: string }> = [
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
  { value: 'stacked', label: 'Stacked' },
];

const FLOW_VALUES: FlowFilterValue[] = ['expense', 'income', 'net', 'all'];
const GROUP_BY_VALUES: GroupByValue[] = ['day', 'week', 'month', 'quarter', 'year'];
const VIEW_VALUES: ViewTypeValue[] = ['line', 'bar', 'stacked'];

const resolveCurrencyCode = (currency: string | null | undefined, fallback = 'KZT') => {
  const normalized = String(currency || '')
    .trim()
    .toUpperCase();

  if (/^[A-Z]{3}$/.test(normalized)) {
    return normalized;
  }

  return fallback;
};

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat('ru', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const resolveStoredFlow = (value: unknown): FlowFilterValue =>
  FLOW_VALUES.includes(value as FlowFilterValue) ? (value as FlowFilterValue) : DEFAULT_FLOW;

const resolveStoredGroupBy = (value: unknown): GroupByValue =>
  GROUP_BY_VALUES.includes(value as GroupByValue) ? (value as GroupByValue) : DEFAULT_GROUP_BY;

const resolveStoredViewType = (value: unknown): ViewTypeValue =>
  VIEW_VALUES.includes(value as ViewTypeValue) ? (value as ViewTypeValue) : DEFAULT_VIEW;

const loadStoredState = (): StoredState => {
  if (typeof window === 'undefined') {
    return {
      filters: { ...DEFAULT_STATEMENT_FILTERS, type: DEFAULT_FLOW },
      groupBy: DEFAULT_GROUP_BY,
      viewType: DEFAULT_VIEW,
      showTable: true,
    };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      filters: { ...DEFAULT_STATEMENT_FILTERS, type: DEFAULT_FLOW },
      groupBy: DEFAULT_GROUP_BY,
      viewType: DEFAULT_VIEW,
      showTable: true,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const parsedFilters = (parsed.filters || {}) as Partial<StatementFilters>;
    return {
      filters: {
        ...DEFAULT_STATEMENT_FILTERS,
        ...parsedFilters,
        type: resolveStoredFlow(parsedFilters.type),
      },
      groupBy: resolveStoredGroupBy(parsed.groupBy),
      viewType: resolveStoredViewType(parsed.viewType),
      showTable: parsed.showTable ?? true,
    };
  } catch {
    return {
      filters: { ...DEFAULT_STATEMENT_FILTERS, type: DEFAULT_FLOW },
      groupBy: DEFAULT_GROUP_BY,
      viewType: DEFAULT_VIEW,
      showTable: true,
    };
  }
};

const saveStoredState = (state: StoredState) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export default function SpendOverTimeView() {
  const t = useIntlayer('statementsPage') as any;
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);

  const initial = useMemo(() => loadStoredState(), []);

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SpendOverTimeReport | null>(null);

  const [draftFilters, setDraftFilters] = useState<StatementFilters>(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState<StatementFilters>(initial.filters);
  const [draftGroupBy, setDraftGroupBy] = useState<GroupByValue>(initial.groupBy);
  const [groupBy, setGroupBy] = useState<GroupByValue>(initial.groupBy);
  const [draftViewType, setDraftViewType] = useState<ViewTypeValue>(initial.viewType);
  const [viewType, setViewType] = useState<ViewTypeValue>(initial.viewType);
  const [showTable, setShowTable] = useState(initial.showTable);

  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [groupByDropdownOpen, setGroupByDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [filtersDrawerScreen, setFiltersDrawerScreen] = useState('root');
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  const fromOptions = useMemo(() => {
    const items = [] as Array<{
      id: string;
      label: string;
      description?: string | null;
      avatarUrl?: string | null;
      bankName?: string | null;
    }>;

    if (user?.id) {
      items.push({
        id: `user:${user.id}`,
        label: user.name || user.email || 'User',
        description: user.email ? `@${user.email.split('@')[0]}` : null,
      });
    }

    return items;
  }, [user]);

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

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchSpendOverTimeReport(appliedFilters, groupBy);
        if (!cancelled) {
          setReport(data);
        }
      } catch {
        if (!cancelled) {
          setReport(null);
          toast.error('Failed to load spend over time');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [appliedFilters, groupBy]);

  useEffect(() => {
    saveStoredState({
      filters: appliedFilters,
      groupBy,
      viewType,
      showTable,
    });
  }, [appliedFilters, groupBy, viewType, showTable]);

  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const chartOptions = useMemo(() => {
    if (!report) return {};

    const labels = report.points.map(point => point.label);

    if (viewType === 'stacked') {
      return {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { top: 0 },
        grid: { left: 30, right: 30, bottom: 30, top: 38 },
        xAxis: { type: 'category', data: labels },
        yAxis: { type: 'value' },
        series: [
          {
            name: 'Income',
            type: 'bar',
            stack: 'flow',
            data: report.points.map(point => Number(point.income.toFixed(2))),
            itemStyle: {
              color: resolvedTheme === 'dark' ? '#4ade80' : '#16a34a',
              borderRadius: [6, 6, 0, 0],
            },
          },
          {
            name: 'Expense',
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

    const selectedFlow = resolveStoredFlow(appliedFilters.type);
    const values = report.points.map(point => {
      if (selectedFlow === 'income') return Number(point.income.toFixed(2));
      if (selectedFlow === 'net') return Number(point.net.toFixed(2));
      if (selectedFlow === 'all') return Number((point.income + point.expense).toFixed(2));
      return Number(point.expense.toFixed(2));
    });

    const seriesName =
      selectedFlow === 'income'
        ? 'Income'
        : selectedFlow === 'expense'
          ? 'Expense'
          : selectedFlow === 'net'
            ? 'Net'
            : 'Total flow';

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 30, right: 30, bottom: 30, top: 30 },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value' },
      series: [
        viewType === 'bar'
          ? {
              name: seriesName,
              type: 'bar',
              data: values,
              barWidth: 24,
              itemStyle: {
                color: resolvedTheme === 'dark' ? '#60a5fa' : '#0a66c2',
                borderRadius: [6, 6, 0, 0],
              },
            }
          : {
              name: seriesName,
              type: 'line',
              smooth: true,
              data: values,
              areaStyle: {
                color: resolvedTheme === 'dark' ? 'rgba(96,165,250,0.18)' : 'rgba(10,102,194,0.14)',
              },
              lineStyle: { color: resolvedTheme === 'dark' ? '#60a5fa' : '#0a66c2' },
              itemStyle: { color: resolvedTheme === 'dark' ? '#60a5fa' : '#0a66c2' },
            },
      ],
    };
  }, [report, appliedFilters.type, viewType, resolvedTheme]);

  const filterLinkClassName =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-medium text-primary';

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
    const next = { ...DEFAULT_STATEMENT_FILTERS, type: DEFAULT_FLOW };
    setDraftFilters(next);
    setAppliedFilters(next);
    setDraftGroupBy(DEFAULT_GROUP_BY);
    setGroupBy(DEFAULT_GROUP_BY);
    setDraftViewType(DEFAULT_VIEW);
    setViewType(DEFAULT_VIEW);
  };

  const refreshReport = async () => {
    setLoading(true);
    try {
      const data = await fetchSpendOverTimeReport(appliedFilters, groupBy);
      setReport(data);
    } catch {
      toast.error('Failed to refresh spend over time');
    } finally {
      setLoading(false);
    }
  };

  const {
    handlers: pullToRefreshHandlers,
    pullDistance,
    isRefreshing: pullRefreshing,
    isReadyToRefresh,
  } = usePullToRefresh({
    enabled: isMobile,
    isAtTop: () => {
      if (!contentScrollRef.current) return true;
      return contentScrollRef.current.scrollTop <= 0;
    },
    onRefresh: refreshReport,
  });

  const periodLabel =
    groupBy === 'day'
      ? 'Days'
      : groupBy === 'week'
        ? 'Weeks'
        : groupBy === 'month'
          ? 'Months'
          : groupBy === 'quarter'
            ? 'Quarters'
            : groupBy === 'year'
              ? 'Years'
              : 'Periods';

  const hasAnyTransactions = (report?.totals.count || 0) > 0;
  const resolveLabel = (value: unknown, fallback: string) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'value' in value) {
      const tokenValue = (value as { value?: string }).value;
      if (typeof tokenValue === 'string') return tokenValue;
    }
    return fallback;
  };

  const spendOverTimeLabels = {
    kpiHint: resolveLabel(t?.spendOverTime?.kpiHint, 'No data yet for calculations'),
    emptyStateTitle: resolveLabel(t?.spendOverTime?.emptyStateTitle, 'No data for selected period'),
    emptyStateDescription: resolveLabel(
      t?.spendOverTime?.emptyStateDescription,
      'Upload statements or apply another filter',
    ),
    emptyStateUploadCta: resolveLabel(
      t?.spendOverTime?.emptyStateUploadCta,
      'Go to statement upload',
    ),
    emptyStateResetCta: resolveLabel(t?.spendOverTime?.emptyStateResetCta, 'Reset filters'),
  };

  const kpiHint = spendOverTimeLabels.kpiHint;

  return (
    <div className="container-shared flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 shrink-0 space-y-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Spend over time</h1>
          <p className="text-sm text-gray-500">Track spend dynamics by period.</p>
        </div>

        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          <TypeFilterDropdown
            open={typeDropdownOpen}
            onOpenChange={setTypeDropdownOpen}
            options={FLOW_OPTIONS}
            value={draftFilters.type}
            onChange={value => setDraftFilters(prev => ({ ...prev, type: value }))}
            onApply={() => applyAndClose(() => setTypeDropdownOpen(false))}
            onReset={() => resetAndClose('type', () => setTypeDropdownOpen(false))}
            trigger={
              <FilterChipButton active={Boolean(draftFilters.type)}>
                {draftFilters.type
                  ? `Flow: ${FLOW_OPTIONS.find(option => option.value === draftFilters.type)?.label || 'Expense'}`
                  : 'Flow'}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel="Apply"
            resetLabel="Reset"
          />

          <GroupByFilterDropdown
            open={groupByDropdownOpen}
            onOpenChange={setGroupByDropdownOpen}
            options={GROUP_BY_OPTIONS}
            value={draftGroupBy}
            onChange={value => setDraftGroupBy(resolveStoredGroupBy(value))}
            onApply={() => applyAndClose(() => setGroupByDropdownOpen(false))}
            onReset={() => {
              setDraftGroupBy(DEFAULT_GROUP_BY);
              setGroupByDropdownOpen(false);
            }}
            trigger={
              <FilterChipButton active>
                Group by: {GROUP_BY_OPTIONS.find(option => option.value === draftGroupBy)?.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel="Apply"
            resetLabel="Reset"
          />

          <StatusFilterDropdown
            open={statusDropdownOpen}
            onOpenChange={setStatusDropdownOpen}
            options={STATUS_OPTIONS}
            values={draftFilters.statuses}
            onChange={values => setDraftFilters(prev => ({ ...prev, statuses: values }))}
            onApply={() => applyAndClose(() => setStatusDropdownOpen(false))}
            onReset={() => resetAndClose('statuses', () => setStatusDropdownOpen(false))}
            trigger={
              <FilterChipButton active={draftFilters.statuses.length > 0}>
                {draftFilters.statuses.length > 0
                  ? `Status (${draftFilters.statuses.length})`
                  : 'Status'}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel="Apply"
            resetLabel="Reset"
          />

          <DateFilterDropdown
            open={dateDropdownOpen}
            onOpenChange={setDateDropdownOpen}
            presets={DATE_PRESETS}
            modes={DATE_MODES}
            value={draftFilters.date}
            onChange={value => setDraftFilters(prev => ({ ...prev, date: value }))}
            onApply={() => applyAndClose(() => setDateDropdownOpen(false))}
            onReset={() => resetAndClose('date', () => setDateDropdownOpen(false))}
            trigger={
              <FilterChipButton active={Boolean(draftFilters.date)}>
                {draftFilters.date?.preset
                  ? `Date: ${DATE_PRESETS.find(option => option.value === draftFilters.date?.preset)?.label}`
                  : draftFilters.date?.mode
                    ? `Date: ${DATE_MODES.find(option => option.value === draftFilters.date?.mode)?.label}`
                    : 'Date'}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel="Apply"
            resetLabel="Reset"
          />

          <FromFilterDropdown
            open={fromDropdownOpen}
            onOpenChange={setFromDropdownOpen}
            options={fromOptions}
            values={draftFilters.from}
            onChange={values => setDraftFilters(prev => ({ ...prev, from: values }))}
            onApply={() => applyAndClose(() => setFromDropdownOpen(false))}
            onReset={() => resetAndClose('from', () => setFromDropdownOpen(false))}
            trigger={
              <FilterChipButton active={draftFilters.from.length > 0}>
                {draftFilters.from.length > 0 ? `From (${draftFilters.from.length})` : 'From'}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel="Apply"
            resetLabel="Reset"
          />

          <ViewFilterDropdown
            open={viewDropdownOpen}
            onOpenChange={setViewDropdownOpen}
            options={VIEW_OPTIONS}
            value={draftViewType}
            onChange={value => setDraftViewType(resolveStoredViewType(value))}
            onApply={() => applyAndClose(() => setViewDropdownOpen(false))}
            onReset={() => {
              setDraftViewType(DEFAULT_VIEW);
              setViewDropdownOpen(false);
            }}
            trigger={
              <FilterChipButton active>
                View: {VIEW_OPTIONS.find(option => option.value === draftViewType)?.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel="Apply"
            resetLabel="Reset"
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
            Filters
            {activeFilterCount > 0 ? (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className={filterLinkClassName}
            onClick={() => setShowTable(prev => !prev)}
          >
            <Columns2 className="h-3.5 w-3.5" />
            {showTable ? 'Hide table' : 'Show table'}
          </button>
        </div>
      </div>

      {isMobile && (pullDistance > 0 || pullRefreshing) ? (
        <div className="pointer-events-none mb-2 flex justify-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
              isReadyToRefresh || pullRefreshing
                ? 'border-primary/40 text-primary'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${pullRefreshing ? 'animate-spin' : ''}`} />
            <span>
              {pullRefreshing
                ? 'Refreshing...'
                : isReadyToRefresh
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
            </span>
          </div>
        </div>
      ) : null}

      <div
        ref={contentScrollRef}
        className="min-h-0 flex-1 overflow-y-auto pr-1"
        {...pullToRefreshHandlers}
      >
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingAnimation size="lg" />
          </div>
        ) : !report ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
            No data for selected filters
          </div>
        ) : (
          <div className="space-y-4 pb-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wider text-gray-500">Total spend</div>
                <div className="mt-2 text-lg font-semibold text-gray-900 sm:text-xl">
                  {formatMoney(report.totals.expense, workspaceCurrency)}
                </div>
                {!hasAnyTransactions ? (
                  <p className="mt-1 text-xs text-gray-400">{kpiHint}</p>
                ) : null}
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wider text-gray-500">Avg per period</div>
                <div className="mt-2 text-lg font-semibold text-gray-900 sm:text-xl">
                  {formatMoney(report.totals.avgPerPeriod, workspaceCurrency)}
                </div>
                {!hasAnyTransactions ? (
                  <p className="mt-1 text-xs text-gray-400">{kpiHint}</p>
                ) : null}
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wider text-gray-500">Transactions</div>
                <div className="mt-2 text-lg font-semibold text-gray-900 sm:text-xl">
                  {report.totals.count}
                </div>
                {!hasAnyTransactions ? (
                  <p className="mt-1 text-xs text-gray-400">{kpiHint}</p>
                ) : null}
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wider text-gray-500">Net</div>
                <div className="mt-2 text-lg font-semibold text-gray-900 sm:text-xl">
                  {formatMoney(report.totals.net, workspaceCurrency)}
                </div>
                {!hasAnyTransactions ? (
                  <p className="mt-1 text-xs text-gray-400">{kpiHint}</p>
                ) : null}
              </div>
            </div>

            <div className="relative rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <LineChart className="h-4 w-4 text-emerald-500" />
                {periodLabel}
              </div>
              <div className="mt-4 h-[280px] sm:h-[320px]">
                <ReactECharts option={chartOptions} theme={chartTheme} style={{ height: '100%' }} />
              </div>

              {!hasAnyTransactions ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/90 p-6 backdrop-blur-[1px]">
                  <div className="max-w-md text-center">
                    <p className="text-base font-semibold text-gray-900">
                      {spendOverTimeLabels.emptyStateTitle}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {spendOverTimeLabels.emptyStateDescription}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
                        onClick={() => router.push('/statements/submit')}
                      >
                        {spendOverTimeLabels.emptyStateUploadCta}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
                        onClick={resetAllFilters}
                      >
                        {spendOverTimeLabels.emptyStateResetCta}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {showTable ? (
              <div className="rounded-xl border border-gray-200 bg-white">
                {isMobile ? (
                  <div data-testid="spend-over-time-mobile-points" className="space-y-2 p-3">
                    {report.points.map(point => (
                      <article key={point.period} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{point.label}</h3>
                          <span className="text-xs text-gray-500">Count: {point.count}</span>
                        </div>

                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <div>
                            <dt className="text-gray-500">Income</dt>
                            <dd className="font-medium text-gray-900">
                              {formatMoney(point.income, workspaceCurrency)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Expense</dt>
                            <dd className="font-medium text-gray-900">
                              {formatMoney(point.expense, workspaceCurrency)}
                            </dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-gray-500">Net</dt>
                            <dd className="font-medium text-gray-900">
                              {formatMoney(point.net, workspaceCurrency)}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
                          <th className="px-4 py-3">Period</th>
                          <th className="px-4 py-3">Income</th>
                          <th className="px-4 py-3">Expense</th>
                          <th className="px-4 py-3">Net</th>
                          <th className="px-4 py-3">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.points.map(point => (
                          <tr
                            key={point.period}
                            className="border-b border-gray-100 last:border-b-0"
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">{point.label}</td>
                            <td className="px-4 py-3 text-gray-700">
                              {formatMoney(point.income, workspaceCurrency)}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {formatMoney(point.expense, workspaceCurrency)}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {formatMoney(point.net, workspaceCurrency)}
                            </td>
                            <td className="px-4 py-3 text-gray-700">{point.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
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
        onUpdateFilters={next => setDraftFilters(prev => ({ ...prev, ...next }))}
        onResetAll={resetAllFilters}
        onViewResults={() => {
          applyFilterChanges();
          setFiltersDrawerOpen(false);
          setFiltersDrawerScreen('root');
        }}
        typeOptions={FLOW_OPTIONS}
        statusOptions={STATUS_OPTIONS}
        datePresets={DATE_PRESETS}
        dateModes={DATE_MODES}
        fromOptions={fromOptions}
        toOptions={fromOptions}
        groupByOptions={GROUP_BY_OPTIONS}
        hasOptions={HAS_OPTIONS}
        currencyOptions={[]}
        labels={FILTER_LABELS}
        activeCount={activeFilterCount}
      />
    </div>
  );
}
