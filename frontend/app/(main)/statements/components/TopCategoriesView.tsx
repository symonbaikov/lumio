'use client';

import { DateFilterDropdown } from '@/app/(main)/statements/components/filters/DateFilterDropdown';
import { FiltersDrawer } from '@/app/(main)/statements/components/filters/FiltersDrawer';
import { FromFilterDropdown } from '@/app/(main)/statements/components/filters/FromFilterDropdown';
import { StatusFilterDropdown } from '@/app/(main)/statements/components/filters/StatusFilterDropdown';
import { TypeFilterDropdown } from '@/app/(main)/statements/components/filters/TypeFilterDropdown';
import {
  DEFAULT_STATEMENT_FILTERS,
  type StatementFilters,
  loadStatementFilters,
  resetSingleStatementFilter,
  saveStatementFilters,
} from '@/app/(main)/statements/components/filters/statement-filters';
import { Button } from '@/app/components/ui/button';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import apiClient from '@/app/lib/api';
import { type TopCategoriesReport, fetchTopCategoriesReport } from '@/app/lib/top-categories-api';
import { ChevronDown, Download, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import TopCategoriesChart from './TopCategoriesChart';
import TopCategoriesPeriodFilter, {
  type TopCategoriesPeriodPreset,
} from './TopCategoriesPeriodFilter';
import TopCategoriesTable from './TopCategoriesTable';

const formatDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resolvePeriodRange = (
  period: TopCategoriesPeriodPreset,
  customFrom: string,
  customTo: string,
): { dateFrom?: string; dateTo?: string } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'custom') {
    return {
      dateFrom: customFrom || undefined,
      dateTo: customTo || undefined,
    };
  }

  const start = new Date(today);
  if (period === '7d') {
    start.setDate(today.getDate() - 7);
  } else if (period === '30d') {
    start.setDate(today.getDate() - 30);
  } else if (period === '90d') {
    start.setDate(today.getDate() - 90);
  } else {
    start.setFullYear(today.getFullYear() - 1);
  }

  return {
    dateFrom: formatDateOnly(start),
    dateTo: formatDateOnly(today),
  };
};

const STATUS_OPTIONS = [
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'processing', label: 'Processing' },
  { value: 'parsed', label: 'Parsed' },
  { value: 'validated', label: 'Validated' },
  { value: 'completed', label: 'Completed' },
  { value: 'error', label: 'Error' },
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

const GROUP_BY_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'status', label: 'Status' },
  { value: 'type', label: 'Type' },
  { value: 'bank', label: 'Bank' },
  { value: 'user', label: 'User' },
  { value: 'amount', label: 'Amount' },
];

const HAS_OPTIONS = [
  { value: 'errors', label: 'Errors' },
  { value: 'processingDetails', label: 'Processing details' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'dateRange', label: 'Date range' },
  { value: 'currency', label: 'Currency' },
];

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

export default function TopCategoriesView() {
  const [report, setReport] = useState<TopCategoriesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<TopCategoriesPeriodPreset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [appliedFilters, setAppliedFilters] = useState<StatementFilters>(DEFAULT_STATEMENT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<StatementFilters>(DEFAULT_STATEMENT_FILTERS);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [filtersDrawerScreen, setFiltersDrawerScreen] = useState('root');

  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [fromDropdownOpen, setFromDropdownOpen] = useState(false);

  useEffect(() => {
    const stored = loadStatementFilters();
    setAppliedFilters(stored);
    setDraftFilters(stored);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const range = resolvePeriodRange(period, customFrom, customTo);
        const response = await fetchTopCategoriesReport(appliedFilters, range);
        if (!active) return;
        setReport(response);
      } catch (requestError: any) {
        if (!active) return;
        setError(requestError?.message || 'Failed to load top categories');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [appliedFilters, period, customFrom, customTo]);

  const categoryRows = useMemo(
    () =>
      (report?.categories || []).map(item => ({
        name: item.name,
        amount: item.amount,
        percentage: item.percentage,
        count: item.transactions,
        color: item.color,
      })),
    [report],
  );

  const bankRows = useMemo(
    () =>
      (report?.banks || []).map(item => ({
        name: item.bankName,
        amount: item.amount,
        percentage: item.percentage,
        count: item.statements,
        bankName: item.bankName,
      })),
    [report],
  );

  const counterpartyRows = useMemo(
    () =>
      (report?.counterparties || []).map(item => ({
        name: item.name,
        amount: item.amount,
        percentage: item.percentage,
        count: item.transactions,
      })),
    [report],
  );

  const fromOptions = useMemo(() => {
    const banks = (report?.banks || []).map(item => ({
      id: `bank:${item.bankName}`,
      label: item.bankName,
      description: 'Bank',
      bankName: item.bankName,
    }));
    const counterparties = (report?.counterparties || []).map(item => ({
      id: `counterparty:${item.name}`,
      label: item.name,
      description: 'Company',
    }));
    return [...banks, ...counterparties];
  }, [report]);

  const typeOptions = useMemo(
    () => [
      { value: 'expense', label: 'Expense' },
      { value: 'income', label: 'Income' },
      { value: 'all', label: 'All' },
    ],
    [],
  );

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

  const applyAndClose = (close: () => void) => {
    setAppliedFilters(draftFilters);
    saveStatementFilters(draftFilters);
    close();
  };

  const resetAndClose = (field: keyof StatementFilters, close: () => void) => {
    const next = resetSingleStatementFilter(draftFilters, field);
    setDraftFilters(next);
    setAppliedFilters(next);
    saveStatementFilters(next);
    close();
  };

  const handleExport = async () => {
    const range = resolvePeriodRange(period, customFrom, customTo);
    if (!range.dateFrom || !range.dateTo) {
      toast.error('Select both from and to dates for export');
      return;
    }

    setExporting(true);
    try {
      const response = await apiClient.post(
        '/reports/export',
        {
          dateFrom: range.dateFrom,
          dateTo: range.dateTo,
          format: 'excel',
        },
        { responseType: 'blob' },
      );

      const blob = response.data as Blob;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `top-categories-${range.dateFrom}-${range.dateTo}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch {
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container-shared flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 shrink-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Top categories</h1>
            <p className="mt-1 text-sm text-gray-500">
              Category, bank, and company spend analytics with detailed filters.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>

        <TopCategoriesPeriodFilter
          period={period}
          customFrom={customFrom}
          customTo={customTo}
          onPeriodChange={setPeriod}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />

        <div className="flex flex-wrap items-center gap-2">
          <TypeFilterDropdown
            open={typeDropdownOpen}
            onOpenChange={setTypeDropdownOpen}
            options={typeOptions}
            value={draftFilters.type}
            onChange={value => setDraftFilters(prev => ({ ...prev, type: value }))}
            onApply={() => applyAndClose(() => setTypeDropdownOpen(false))}
            onReset={() => resetAndClose('type', () => setTypeDropdownOpen(false))}
            trigger={
              <FilterChipButton active={Boolean(draftFilters.type)}>
                {draftFilters.type || 'Type'}
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
                Status
                {draftFilters.statuses.length > 0 ? ` (${draftFilters.statuses.length})` : ''}
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
                Date
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
                Companies
                {draftFilters.from.length > 0 ? ` (${draftFilters.from.length})` : ''}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel="Apply"
            resetLabel="Reset"
          />

          <button
            type="button"
            onClick={() => {
              setDraftFilters(appliedFilters);
              setFiltersDrawerScreen('root');
              setFiltersDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            Loading top categories...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <TopCategoriesChart
                title="Top categories by amount"
                items={(report?.categories || []).slice(0, 10).map(item => ({
                  name: item.name,
                  amount: item.amount,
                  color: item.color,
                }))}
              />
              <TopCategoriesTable title="Top categories" rows={categoryRows} />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <TopCategoriesChart
                title="Top banks by amount"
                items={(report?.banks || []).slice(0, 10).map(item => ({
                  name: item.bankName,
                  amount: item.amount,
                }))}
              />
              <TopCategoriesTable title="Top banks" rows={bankRows} />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <TopCategoriesChart
                title="Top companies by amount"
                items={(report?.counterparties || []).slice(0, 10).map(item => ({
                  name: item.name,
                  amount: item.amount,
                }))}
              />
              <TopCategoriesTable title="Top companies" rows={counterpartyRows} />
            </div>
          </>
        )}
      </div>

      <FiltersDrawer
        open={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        filters={draftFilters}
        screen={filtersDrawerScreen}
        onBack={() => setFiltersDrawerScreen('root')}
        onSelect={field => setFiltersDrawerScreen(field)}
        onUpdateFilters={next => setDraftFilters(prev => ({ ...prev, ...next }))}
        onResetAll={() => setDraftFilters(DEFAULT_STATEMENT_FILTERS)}
        onViewResults={() => {
          applyAndClose(() => setFiltersDrawerOpen(false));
        }}
        typeOptions={typeOptions}
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
