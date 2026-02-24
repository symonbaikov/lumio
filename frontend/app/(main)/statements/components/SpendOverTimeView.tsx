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
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';
import { type SpendOverTimeReport, fetchSpendOverTimeReport } from '@/app/lib/spend-over-time-api';
import { ChevronDown, Columns2, LineChart, RefreshCcw, SlidersHorizontal } from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

const STORAGE_KEY = 'finflow-spend-over-time-filters';

const DEFAULT_GROUP_BY: 'day' | 'week' | 'month' = 'month';
const DEFAULT_VIEW: 'line' | 'bar' = 'line';

type StoredState = {
  filters: StatementFilters;
  groupBy: 'day' | 'week' | 'month';
  viewType: 'line' | 'bar';
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
  type: 'Type',
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

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
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

const GROUP_BY_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const VIEW_OPTIONS = [
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
];

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

const loadStoredState = (): StoredState => {
  if (typeof window === 'undefined') {
    return {
      filters: { ...DEFAULT_STATEMENT_FILTERS, type: 'expense' },
      groupBy: DEFAULT_GROUP_BY,
      viewType: DEFAULT_VIEW,
      showTable: true,
    };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      filters: { ...DEFAULT_STATEMENT_FILTERS, type: 'expense' },
      groupBy: DEFAULT_GROUP_BY,
      viewType: DEFAULT_VIEW,
      showTable: true,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      filters: { ...DEFAULT_STATEMENT_FILTERS, type: 'expense', ...(parsed.filters || {}) },
      groupBy: parsed.groupBy || DEFAULT_GROUP_BY,
      viewType: parsed.viewType || DEFAULT_VIEW,
      showTable: parsed.showTable ?? true,
    };
  } catch {
    return {
      filters: { ...DEFAULT_STATEMENT_FILTERS, type: 'expense' },
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
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);

  const initial = useMemo(() => loadStoredState(), []);

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SpendOverTimeReport | null>(null);

  const [draftFilters, setDraftFilters] = useState<StatementFilters>(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState<StatementFilters>(initial.filters);
  const [draftGroupBy, setDraftGroupBy] = useState<'day' | 'week' | 'month'>(initial.groupBy);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>(initial.groupBy);
  const [draftViewType, setDraftViewType] = useState<'line' | 'bar'>(initial.viewType);
  const [viewType, setViewType] = useState<'line' | 'bar'>(initial.viewType);
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
    const values = report.points.map(point => {
      if (appliedFilters.type === 'income') return Number(point.income.toFixed(2));
      if (appliedFilters.type === 'all') return Number(point.net.toFixed(2));
      return Number(point.expense.toFixed(2));
    });

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 30, right: 30, bottom: 30, top: 30 },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value' },
      series: [
        viewType === 'bar'
          ? {
              name: 'Spend',
              type: 'bar',
              data: values,
              barWidth: 24,
              itemStyle: {
                color: resolvedTheme === 'dark' ? '#38BDF8' : '#0EA5E9',
                borderRadius: [6, 6, 0, 0],
              },
            }
          : {
              name: 'Spend',
              type: 'line',
              smooth: true,
              data: values,
              areaStyle: {
                color: resolvedTheme === 'dark' ? 'rgba(56,189,248,0.16)' : 'rgba(14,165,233,0.14)',
              },
              lineStyle: { color: resolvedTheme === 'dark' ? '#38BDF8' : '#0EA5E9' },
              itemStyle: { color: resolvedTheme === 'dark' ? '#38BDF8' : '#0EA5E9' },
            },
      ],
    };
  }, [report, appliedFilters.type, viewType, resolvedTheme]);

  const filterChipClassName =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:border-primary hover:text-primary';
  const filterChipActiveClassName =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[13px] font-medium text-primary';
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
    const next = { ...DEFAULT_STATEMENT_FILTERS, type: 'expense' };
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
          : 'Periods';

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
            options={TYPE_OPTIONS}
            value={draftFilters.type}
            onChange={value => setDraftFilters(prev => ({ ...prev, type: value }))}
            onApply={() => applyAndClose(() => setTypeDropdownOpen(false))}
            onReset={() => resetAndClose('type', () => setTypeDropdownOpen(false))}
            trigger={
              <button
                type="button"
                className={draftFilters.type ? filterChipActiveClassName : filterChipClassName}
              >
                {draftFilters.type
                  ? `Type: ${TYPE_OPTIONS.find(option => option.value === draftFilters.type)?.label || 'Expense'}`
                  : 'Type'}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            }
            applyLabel="Apply"
            resetLabel="Reset"
          />

          <GroupByFilterDropdown
            open={groupByDropdownOpen}
            onOpenChange={setGroupByDropdownOpen}
            options={GROUP_BY_OPTIONS}
            value={draftGroupBy}
            onChange={value =>
              setDraftGroupBy((value as 'day' | 'week' | 'month') || DEFAULT_GROUP_BY)
            }
            onApply={() => applyAndClose(() => setGroupByDropdownOpen(false))}
            onReset={() => {
              setDraftGroupBy(DEFAULT_GROUP_BY);
              setGroupByDropdownOpen(false);
            }}
            trigger={
              <button type="button" className={filterChipActiveClassName}>
                Group by: {GROUP_BY_OPTIONS.find(option => option.value === draftGroupBy)?.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
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
              <button
                type="button"
                className={
                  draftFilters.statuses.length > 0 ? filterChipActiveClassName : filterChipClassName
                }
              >
                {draftFilters.statuses.length > 0
                  ? `Status (${draftFilters.statuses.length})`
                  : 'Status'}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
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
              <button
                type="button"
                className={draftFilters.date ? filterChipActiveClassName : filterChipClassName}
              >
                {draftFilters.date?.preset
                  ? `Date: ${DATE_PRESETS.find(option => option.value === draftFilters.date?.preset)?.label}`
                  : draftFilters.date?.mode
                    ? `Date: ${DATE_MODES.find(option => option.value === draftFilters.date?.mode)?.label}`
                    : 'Date'}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
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
              <button
                type="button"
                className={
                  draftFilters.from.length > 0 ? filterChipActiveClassName : filterChipClassName
                }
              >
                {draftFilters.from.length > 0 ? `From (${draftFilters.from.length})` : 'From'}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            }
            applyLabel="Apply"
            resetLabel="Reset"
          />

          <ViewFilterDropdown
            open={viewDropdownOpen}
            onOpenChange={setViewDropdownOpen}
            options={VIEW_OPTIONS}
            value={draftViewType}
            onChange={value => setDraftViewType((value as 'line' | 'bar') || DEFAULT_VIEW)}
            onApply={() => applyAndClose(() => setViewDropdownOpen(false))}
            onReset={() => {
              setDraftViewType(DEFAULT_VIEW);
              setViewDropdownOpen(false);
            }}
            trigger={
              <button type="button" className={filterChipActiveClassName}>
                View: {VIEW_OPTIONS.find(option => option.value === draftViewType)?.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
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
        ) : !report || report.points.length === 0 ? (
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
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wider text-gray-500">Avg per period</div>
                <div className="mt-2 text-lg font-semibold text-gray-900 sm:text-xl">
                  {formatMoney(report.totals.avgPerPeriod, workspaceCurrency)}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wider text-gray-500">Transactions</div>
                <div className="mt-2 text-lg font-semibold text-gray-900 sm:text-xl">
                  {report.totals.count}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wider text-gray-500">Net</div>
                <div className="mt-2 text-lg font-semibold text-gray-900 sm:text-xl">
                  {formatMoney(report.totals.net, workspaceCurrency)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <LineChart className="h-4 w-4 text-emerald-500" />
                {periodLabel}
              </div>
              <div className="mt-4 h-[280px] sm:h-[320px]">
                <ReactECharts option={chartOptions} theme={chartTheme} style={{ height: '100%' }} />
              </div>
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
        typeOptions={TYPE_OPTIONS}
        statusOptions={STATUS_OPTIONS}
        datePresets={DATE_PRESETS}
        dateModes={DATE_MODES}
        fromOptions={fromOptions}
        toOptions={fromOptions}
        groupByOptions={[]}
        hasOptions={HAS_OPTIONS}
        currencyOptions={[]}
        labels={FILTER_LABELS}
        activeCount={activeFilterCount}
      />
    </div>
  );
}
