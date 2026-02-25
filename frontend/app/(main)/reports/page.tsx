'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  RefreshCcw,
  TrendingUp,
} from 'lucide-react';
import { useIntlayer, useLocale } from 'next-intlayer';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import apiClient from '../../lib/api';
import BalanceSheet from './components/BalanceSheet';
import { buildResponsiveReportChartLayout } from './reportChartLayout';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type SummaryResponse = {
  totals: {
    income: number;
    expense: number;
    net: number;
    rows: number;
  };
  timeseries: Array<{ date: string; income: number; expense: number }>;
  categories: Array<{ name: string; amount: number; rows: number }>;
  counterparties: Array<{ name: string; amount: number; rows: number }>;
  recent: Array<{
    id: string;
    rowNumber: number;
    amount: number;
    category: string | null;
    counterparty: string | null;
    updatedAt: string;
  }>;
};

type LocalSummaryResponse = {
  totals: {
    income: number;
    expense: number;
    net: number;
    rows: number;
  };
  timeseries: Array<{ date: string; income: number; expense: number }>;
  categories: Array<{ name: string; amount: number; rows: number }>;
  counterparties: Array<{ name: string; amount: number; rows: number }>;
  recent: Array<{
    id: string;
    tableId: string;
    tableName: string;
    rowNumber: number;
    amount: number;
    category: string | null;
    counterparty: string | null;
    updatedAt: string;
  }>;
  tables: Array<{
    id: string;
    name: string;
    income: number;
    expense: number;
    net: number;
    rows: number;
  }>;
};

type StatementsSummaryResponse = {
  totals: {
    income: number;
    expense: number;
    net: number;
    rows: number;
  };
  timeseries: Array<{ date: string; income: number; expense: number }>;
  categories: Array<{ name: string; amount: number; rows: number }>;
  counterparties: Array<{ name: string; amount: number; rows: number }>;
  recent: Array<{
    id: string;
    amount: number;
    category: string | null;
    counterparty: string | null;
    updatedAt: string;
  }>;
};

type StatementStatus =
  | 'uploaded'
  | 'processing'
  | 'parsed'
  | 'validated'
  | 'completed'
  | 'error'
  | string;

type StatementItem = {
  id: string;
  fileName: string;
  status: StatementStatus;
  bankName?: string;
  totalTransactions?: number;
  createdAt: string;
  errorMessage?: string | null;
};

type CustomTableListItem = {
  id: string;
  name: string;
  description?: string | null;
};

const resolveLocale = (locale: string) => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

const resolveCurrencyCode = (currency: string | null | undefined) => {
  const normalized = String(currency || '')
    .trim()
    .toUpperCase();

  if (/^[A-Z]{3}$/.test(normalized)) {
    return normalized;
  }

  return 'KZT';
};

const formatCurrency = (value: number, locale: string, currency: string) =>
  new Intl.NumberFormat(resolveLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);

const InfoCard = ({
  title,
  value,
  accent,
  icon,
}: {
  title: string;
  value: string;
  accent?: 'green' | 'red' | 'blue';
  icon?: React.ReactNode;
}) => {
  const color =
    accent === 'green' ? 'text-emerald-600' : accent === 'red' ? 'text-red-600' : 'text-primary';
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-gray-500">{title}</div>
        {icon}
      </div>
      <div className={`mt-2 text-xl font-semibold tracking-tight ${color}`}>{value}</div>
    </div>
  );
};

export default function ReportsPage() {
  const t = useIntlayer('reportsPage');
  const { locale } = useLocale();
  const { currentWorkspace } = useWorkspace();
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);
  const formatAmount = useCallback(
    (value: number) => formatCurrency(value, locale, workspaceCurrency),
    [locale, workspaceCurrency],
  );
  const echartsTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const chartBlue = resolvedTheme === 'dark' ? '#38BDF8' : '#0EA5E9';
  const chartLayout = useMemo(() => buildResponsiveReportChartLayout(isMobile), [isMobile]);
  const [tab, setTab] = useState<'sheets' | 'statements' | 'local' | 'balance'>('sheets');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [statements, setStatements] = useState<StatementItem[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);
  const [statementSummary, setStatementSummary] = useState<StatementsSummaryResponse | null>(null);
  const [loadingStatementSummary, setLoadingStatementSummary] = useState(false);
  const [localDays, setLocalDays] = useState(30);
  const [localTablesLoaded, setLocalTablesLoaded] = useState(false);
  const [loadingLocalTables, setLoadingLocalTables] = useState(false);
  const [customTables, setCustomTables] = useState<CustomTableListItem[]>([]);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [localSummary, setLocalSummary] = useState<LocalSummaryResponse | null>(null);
  const [loadingLocalSummary, setLoadingLocalSummary] = useState(false);

  const load = async (daysOverride?: number) => {
    const windowDays = daysOverride ?? days;
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.get(`/integrations/google-sheets/summary?days=${windowDays}`);
      const payload = resp.data?.data || resp.data;
      setData(payload);
      setDays(windowDays);
    } catch (err: any) {
      setError(err?.response?.data?.message || t.errors.loadReport.value);
    } finally {
      setLoading(false);
    }
  };

  const loadStatementSummary = async (daysOverride = 30) => {
    setLoadingStatementSummary(true);
    setError(null);
    try {
      const resp = await apiClient.get(`/reports/statements/summary?days=${daysOverride}`);
      const payload = resp.data?.data || resp.data;
      setStatementSummary(payload);
    } catch (err: any) {
      setError(err?.response?.data?.message || t.errors.loadStatementsStats.value);
    } finally {
      setLoadingStatementSummary(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadCustomTables = async () => {
    setLoadingLocalTables(true);
    setError(null);
    try {
      const resp = await apiClient.get('/custom-tables');
      const payload = resp.data?.data || resp.data;
      const items = (payload?.items || []) as CustomTableListItem[];
      setCustomTables(items);

      const ids = items.map(t => t.id);
      setSelectedTableIds(prev => (prev.length ? prev : ids));
    } catch (err: any) {
      setError(err?.response?.data?.message || t.errors.loadTables.value);
    } finally {
      setLoadingLocalTables(false);
      setLocalTablesLoaded(true);
    }
  };

  const loadLocalSummary = async (tableIds: string[], daysOverride?: number) => {
    const windowDays = daysOverride ?? localDays;
    setLoadingLocalSummary(true);
    setError(null);
    try {
      const resp = await apiClient.post('/reports/custom-tables/summary', {
        days: windowDays,
        tableIds,
      });
      const payload = resp.data?.data || resp.data;
      setLocalSummary(payload);
      setLocalDays(windowDays);
    } catch (err: any) {
      setError(err?.response?.data?.message || t.errors.loadLocalReport.value);
    } finally {
      setLoadingLocalSummary(false);
    }
  };

  const loadStatements = async () => {
    setLoadingStatements(true);
    setError(null);
    try {
      const resp = await apiClient.get('/statements');
      const payload = resp.data?.data || resp.data || [];
      setStatements(payload);
    } catch (err: any) {
      setError(err?.response?.data?.message || t.errors.loadStatementsData.value);
    } finally {
      setLoadingStatements(false);
    }
  };

  useEffect(() => {
    if (tab === 'statements' && statements.length === 0) {
      loadStatements();
      loadStatementSummary();
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== 'local') return;
    if (!localTablesLoaded) {
      loadCustomTables();
    }
  }, [tab, localTablesLoaded]);

  useEffect(() => {
    if (tab !== 'local') return;
    if (!localTablesLoaded) return;
    if (selectedTableIds.length === 0) {
      setLocalSummary(null);
      return;
    }
    loadLocalSummary(selectedTableIds, localDays);
  }, [tab, localTablesLoaded, selectedTableIds, localDays]);

  const refreshActiveTab = useCallback(async () => {
    if (tab === 'sheets') {
      await load(days);
      return;
    }

    if (tab === 'statements') {
      await Promise.all([loadStatements(), loadStatementSummary()]);
      return;
    }

    if (tab === 'local') {
      if (!localTablesLoaded) {
        await loadCustomTables();
      }
      if (selectedTableIds.length > 0) {
        await loadLocalSummary(selectedTableIds, localDays);
      }
    }
  }, [
    tab,
    days,
    localDays,
    localTablesLoaded,
    selectedTableIds,
    load,
    loadStatements,
    loadStatementSummary,
    loadCustomTables,
    loadLocalSummary,
  ]);

  const {
    handlers: pullToRefreshHandlers,
    pullDistance,
    isRefreshing: pullRefreshing,
    isReadyToRefresh,
  } = usePullToRefresh({
    enabled: isMobile,
    onRefresh: refreshActiveTab,
  });

  const cashflowOption = useMemo(() => {
    if (!data) return undefined;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { top: chartLayout.legendTop, data: [t.labels.income.value, t.labels.expense.value] },
      grid: chartLayout.lineGrid,
      xAxis: { type: 'category', data: data.timeseries.map(p => p.date) },
      yAxis: { type: 'value' },
      series: [
        {
          name: t.labels.income.value,
          type: 'line',
          smooth: true,
          data: data.timeseries.map(p => p.income),
          areaStyle: { color: 'rgba(14,165,233,0.12)' },
          lineStyle: { color: '#0EA5E9' },
          itemStyle: { color: '#0EA5E9' },
        },
        {
          name: t.labels.expense.value,
          type: 'line',
          smooth: true,
          data: data.timeseries.map(p => p.expense),
          areaStyle: { color: 'rgba(239,68,68,0.08)' },
          lineStyle: { color: '#DC2626' },
          itemStyle: { color: '#DC2626' },
        },
      ],
    };
  }, [data, t, chartLayout]);

  const localCashflowOption = useMemo(() => {
    if (!localSummary) return undefined;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { top: chartLayout.legendTop, data: [t.labels.income.value, t.labels.expense.value] },
      grid: chartLayout.lineGrid,
      xAxis: {
        type: 'category',
        data: localSummary.timeseries.map(p => p.date),
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: t.labels.income.value,
          type: 'line',
          smooth: true,
          data: localSummary.timeseries.map(p => p.income),
          areaStyle: { color: 'rgba(14,165,233,0.12)' },
          lineStyle: { color: '#0EA5E9' },
          itemStyle: { color: '#0EA5E9' },
        },
        {
          name: t.labels.expense.value,
          type: 'line',
          smooth: true,
          data: localSummary.timeseries.map(p => p.expense),
          areaStyle: { color: 'rgba(239,68,68,0.08)' },
          lineStyle: { color: '#DC2626' },
          itemStyle: { color: '#DC2626' },
        },
      ],
    };
  }, [localSummary, t, chartLayout]);

  const expensePieOption = useMemo(() => {
    if (!data) return undefined;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: { top: chartLayout.legendTop },
      series: [
        {
          name: t.labels.expense.value,
          type: 'pie',
          radius: chartLayout.pieRadius,
          roseType: 'radius',
          data: data.categories.map(c => ({
            name: c.name,
            value: Number(c.amount.toFixed(2)),
          })),
        },
      ],
    };
  }, [data, t, chartLayout]);

  const localExpensePieOption = useMemo(() => {
    if (!localSummary) return undefined;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: { top: chartLayout.legendTop },
      series: [
        {
          name: t.labels.expense.value,
          type: 'pie',
          radius: chartLayout.pieRadius,
          roseType: 'radius',
          data: localSummary.categories.map(c => ({
            name: c.name,
            value: Number(c.amount.toFixed(2)),
          })),
        },
      ],
    };
  }, [localSummary, t, chartLayout]);

  const incomeBarOption = useMemo(() => {
    if (!data) return undefined;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: chartLayout.barGrid,
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: data.counterparties.map(c => c.name),
      },
      series: [
        {
          type: 'bar',
          data: data.counterparties.map(c => Number(c.amount.toFixed(2))),
          itemStyle: {
            color: '#0EA5E9',
            borderRadius: [4, 4, 4, 4],
          },
        },
      ],
    };
  }, [data, chartLayout]);

  const localIncomeBarOption = useMemo(() => {
    if (!localSummary) return undefined;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: chartLayout.barGrid,
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: localSummary.counterparties.map(c => c.name),
      },
      series: [
        {
          type: 'bar',
          data: localSummary.counterparties.map(c => Number(c.amount.toFixed(2))),
          itemStyle: {
            color: '#0EA5E9',
            borderRadius: [4, 4, 4, 4],
          },
        },
      ],
    };
  }, [localSummary, chartLayout]);

  const parsedStatements = useMemo(() => {
    if (!statements || statements.length === 0) {
      return {
        total: 0,
        processed: 0,
        processing: 0,
        errors: 0,
        totalTransactions: 0,
        lastDate: null as string | null,
        recentErrors: [] as StatementItem[],
        timeseries: [] as Array<{ date: string; count: number }>,
        banks: [] as Array<{ name: string; value: number }>,
        statuses: [] as Array<{ name: string; value: number }>,
      };
    }
    const total = statements.length;
    const processedStatuses = new Set(['parsed', 'validated', 'completed']);
    const processingStatuses = new Set(['processing']);

    let processed = 0;
    let processing = 0;
    let errors = 0;
    let totalTransactions = 0;
    let lastDate: string | null = null;
    const errorItems: StatementItem[] = [];
    const timeseriesMap = new Map<string, number>();
    const bankMap = new Map<string, number>();
    const statusMap = new Map<string, number>();

    statements.forEach(s => {
      if (processedStatuses.has(s.status)) processed += 1;
      if (processingStatuses.has(s.status)) processing += 1;
      if (s.status === 'error') {
        errors += 1;
        errorItems.push(s);
      }
      totalTransactions += Number(s.totalTransactions || 0);
      if (!lastDate || new Date(s.createdAt) > new Date(lastDate)) {
        lastDate = s.createdAt;
      }

      const dateKey = s.createdAt ? s.createdAt.split('T')[0] : '—';
      timeseriesMap.set(dateKey, (timeseriesMap.get(dateKey) || 0) + 1);
      const bankKey = s.bankName || t.labels.withoutBank.value;
      bankMap.set(bankKey, (bankMap.get(bankKey) || 0) + 1);
      statusMap.set(s.status, (statusMap.get(s.status) || 0) + 1);
    });

    return {
      total,
      processed,
      processing,
      errors,
      totalTransactions,
      lastDate,
      recentErrors: errorItems.slice(0, 5),
      timeseries: Array.from(timeseriesMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      banks: Array.from(bankMap.entries()).map(([name, value]) => ({
        name,
        value,
      })),
      statuses: Array.from(statusMap.entries()).map(([name, value]) => ({
        name,
        value,
      })),
    };
  }, [statements, t]);

  const statementsLineOption = useMemo(() => {
    const ts = parsedStatements.timeseries;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: chartLayout.lineGrid,
      xAxis: { type: 'category', data: ts.map(p => p.date) },
      yAxis: { type: 'value' },
      series: [
        {
          name: t.labels.statements.value,
          type: 'line',
          smooth: true,
          data: ts.map(p => p.count),
          areaStyle: {
            color: resolvedTheme === 'dark' ? 'rgba(56,189,248,0.14)' : 'rgba(14,165,233,0.12)',
          },
          lineStyle: { color: chartBlue },
          itemStyle: { color: chartBlue },
        },
      ],
    };
  }, [chartBlue, parsedStatements.timeseries, resolvedTheme, t, chartLayout]);

  const statementsPieOption = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: { top: chartLayout.legendTop },
      series: [
        {
          name: t.labels.banks.value,
          type: 'pie',
          radius: chartLayout.pieRadius,
          data: parsedStatements.banks.map(b => ({
            name: b.name,
            value: b.value,
          })),
        },
      ],
    };
  }, [parsedStatements.banks, t, chartLayout]);

  const statementsBarOption = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: chartLayout.barGrid,
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: parsedStatements.statuses.map(s => s.name),
      },
      series: [
        {
          type: 'bar',
          data: parsedStatements.statuses.map(s => s.value),
          itemStyle: {
            color: resolvedTheme === 'dark' ? '#38BDF8' : '#0EA5E9',
            borderRadius: [4, 4, 4, 4],
          },
        },
      ],
    };
  }, [parsedStatements.statuses, resolvedTheme, chartLayout]);

  return (
    <div
      className="container-shared px-4 py-12 space-y-6 sm:px-6 lg:px-8"
      {...pullToRefreshHandlers}
    >
      {isMobile && (pullDistance > 0 || pullRefreshing) ? (
        <div className="pointer-events-none flex justify-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors ${
              isReadyToRefresh || pullRefreshing
                ? 'border-primary/40 text-primary'
                : 'border-gray-200'
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

      <div className="mb-6 border-b border-gray-200">
        <nav
          className="-mb-px flex items-center gap-8 overflow-x-auto"
          aria-label="Tabs"
          data-tour-id="reports-tabs"
        >
          <button
            onClick={() => setTab('sheets')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
              tab === 'sheets'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
            data-tour-id="reports-tab-sheets"
          >
            {t.labels.tabSheets}
          </button>
          <button
            onClick={() => setTab('local')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
              tab === 'local'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
            data-tour-id="reports-tab-local"
          >
            {t.labels.tabLocal}
          </button>
          <button
            onClick={() => setTab('statements')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
              tab === 'statements'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
            data-tour-id="reports-tab-statements"
          >
            {t.labels.tabStatements}
          </button>
          <button
            onClick={() => setTab('balance')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
              tab === 'balance'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
            data-tour-id="reports-tab-balance"
          >
            {(t.labels as any).tabBalance?.value ?? 'Баланс'}
          </button>
        </nav>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {tab === 'sheets' && (
        <>
          <div className="flex items-center gap-2" data-tour-id="reports-sheets-days">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => load(d)}
                className={`rounded-md border px-3 py-1 text-sm font-medium ${
                  days === d
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                }`}
              >
                {d} {t.labels.daysShort}
              </button>
            ))}
            <button
              onClick={() => load(days)}
              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 hover:border-primary"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>

          <div
            className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4"
            data-tour-id="reports-sheets-totals"
          >
            <InfoCard
              title={t.labels.income.value}
              value={formatAmount(data?.totals.income || 0)}
              accent="green"
              icon={<ArrowUp className="h-4 w-4 text-emerald-500" />}
            />
            <InfoCard
              title={t.labels.expense.value}
              value={formatAmount(data?.totals.expense || 0)}
              accent="red"
              icon={<ArrowDown className="h-4 w-4 text-red-500" />}
            />
            <InfoCard
              title={t.labels.net.value}
              value={formatAmount(data?.totals.net || 0)}
              accent={(data?.totals.net || 0) >= 0 ? 'green' : 'red'}
              icon={<TrendingUp className="h-4 w-4 text-primary" />}
            />
            <InfoCard
              title={t.labels.rows.value}
              value={`${data?.totals.rows || 0}`}
              icon={<Download className="h-4 w-4 text-primary" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
              data-tour-id="reports-sheets-trend"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{t.labels.dailyTrend}</h3>
                <span className="text-xs text-gray-500">
                  {t.labels.lastDaysPrefix.value} {days} {t.labels.daysSuffix.value}
                </span>
              </div>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  {t.labels.loadingEllipsis}
                </div>
              ) : (
                <ReactECharts
                  style={{ height: chartLayout.primaryChartHeight }}
                  option={cashflowOption}
                  notMerge
                  lazyUpdate
                  theme={echartsTheme}
                />
              )}
            </div>

            <div
              className="rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
              data-tour-id="reports-sheets-expense-categories"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t.labels.expensesCategories}
                </h3>
                <span className="text-xs text-gray-500">{t.labels.topTen}</span>
              </div>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  {t.labels.loadingEllipsis}
                </div>
              ) : (
                <ReactECharts
                  style={{ height: chartLayout.secondaryChartHeight }}
                  option={expensePieOption}
                  notMerge
                  lazyUpdate
                  theme={echartsTheme}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className="rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
              data-tour-id="reports-sheets-income-counterparty"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t.labels.incomeByCounterparty}
                </h3>
                <span className="text-xs text-gray-500">{t.labels.topTen}</span>
              </div>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  {t.labels.loadingEllipsis}
                </div>
              ) : (
                <ReactECharts
                  style={{ height: chartLayout.secondaryChartHeight }}
                  option={incomeBarOption}
                  notMerge
                  lazyUpdate
                  theme={echartsTheme}
                />
              )}
            </div>

            <div
              className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
              data-tour-id="reports-sheets-last-operations"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{t.labels.lastOperations}</h3>
                <span className="text-xs text-gray-500">{t.labels.twentyRows}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {(data?.recent || []).map(row => (
                  <div
                    key={row.id}
                    className="flex flex-col justify-between gap-1 py-3 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {row.counterparty || t.labels.withoutName.value} · #{row.rowNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        {row.category || t.labels.withoutCategory.value} ·{' '}
                        {new Date(row.updatedAt).toLocaleString(resolveLocale(locale))}
                      </p>
                    </div>
                    <div
                      className={`text-sm font-semibold ${row.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {formatAmount(row.amount)}
                    </div>
                  </div>
                ))}
                {(data?.recent || []).length === 0 && (
                  <div className="py-6 text-sm text-gray-500 text-center">
                    {t.labels.noDataPeriod}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'local' && (
        <>
          <div className="flex flex-wrap items-center gap-2" data-tour-id="reports-local-days">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setLocalDays(d)}
                className={`rounded-md border px-3 py-1 text-sm font-medium ${
                  localDays === d
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                }`}
              >
                {d} {t.labels.daysShort}
              </button>
            ))}
            <button
              onClick={() => {
                if (selectedTableIds.length) loadLocalSummary(selectedTableIds, localDays);
              }}
              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 hover:border-primary"
              disabled={loadingLocalSummary}
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>

          <details
            className="rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
            data-tour-id="reports-local-tables"
          >
            <summary className="cursor-pointer select-none font-semibold text-gray-900">
              {t.labels.tablesForReport}{' '}
              <span className="text-sm font-normal text-gray-500">
                ({selectedTableIds.length}/{customTables.length})
              </span>
            </summary>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedTableIds(customTables.map(t => t.id))}
                className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 hover:border-primary"
                disabled={loadingLocalTables || customTables.length === 0}
              >
                {t.labels.selectAll}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTableIds([])}
                className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 hover:border-primary"
                disabled={loadingLocalTables || selectedTableIds.length === 0}
              >
                {t.labels.clear}
              </button>
              {loadingLocalTables && (
                <span className="text-sm text-gray-500">{t.labels.loadingTables}</span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {customTables.map(t => {
                const checked = selectedTableIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className={`flex items-start gap-2 rounded-md border p-3 text-sm cursor-pointer ${
                      checked ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={checked}
                      onCheckedChange={() => {
                        setSelectedTableIds(prev =>
                          prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id],
                        );
                      }}
                    />
                    <span className="leading-tight">
                      <span className="font-semibold text-gray-900">{t.name}</span>
                      {t.description ? (
                        <span className="block text-xs text-gray-500 mt-1">{t.description}</span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
              {!loadingLocalTables && localTablesLoaded && customTables.length === 0 && (
                <div className="text-sm text-gray-500">{t.labels.noTables}</div>
              )}
            </div>
          </details>

          {selectedTableIds.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500 text-center">
              {t.labels.selectAtLeastOneTable}
            </div>
          ) : (
            <>
              <div
                className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4"
                data-tour-id="reports-local-totals"
              >
                <InfoCard
                  title={t.labels.income.value}
                  value={formatAmount(localSummary?.totals.income || 0)}
                  accent="green"
                  icon={<ArrowUp className="h-4 w-4 text-emerald-500" />}
                />
                <InfoCard
                  title={t.labels.expense.value}
                  value={formatAmount(localSummary?.totals.expense || 0)}
                  accent="red"
                  icon={<ArrowDown className="h-4 w-4 text-red-500" />}
                />
                <InfoCard
                  title={t.labels.net.value}
                  value={formatAmount(localSummary?.totals.net || 0)}
                  accent={(localSummary?.totals.net || 0) >= 0 ? 'green' : 'red'}
                  icon={<TrendingUp className="h-4 w-4 text-primary" />}
                />
                <InfoCard
                  title={t.labels.rows.value}
                  value={`${localSummary?.totals.rows || 0}`}
                  icon={<Download className="h-4 w-4 text-primary" />}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div
                  className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
                  data-tour-id="reports-local-trend"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">{t.labels.dailyTrend}</h3>
                    <span className="text-xs text-gray-500">
                      {t.labels.lastDaysPrefix.value} {localDays} {t.labels.daysSuffix.value}
                    </span>
                  </div>
                  {loadingLocalSummary ? (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      {t.labels.loadingEllipsis}
                    </div>
                  ) : (
                    <ReactECharts
                      style={{ height: chartLayout.primaryChartHeight }}
                      option={localCashflowOption}
                      notMerge
                      lazyUpdate
                      theme={echartsTheme}
                    />
                  )}
                </div>

                <div
                  className="rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
                  data-tour-id="reports-local-expense-categories"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t.labels.expensesCategories}
                    </h3>
                    <span className="text-xs text-gray-500">{t.labels.topTen}</span>
                  </div>
                  {loadingLocalSummary ? (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      {t.labels.loadingEllipsis}
                    </div>
                  ) : (
                    <ReactECharts
                      style={{ height: chartLayout.secondaryChartHeight }}
                      option={localExpensePieOption}
                      notMerge
                      lazyUpdate
                      theme={echartsTheme}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div
                  className="rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
                  data-tour-id="reports-local-income-counterparty"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t.labels.incomeByCounterparty}
                    </h3>
                    <span className="text-xs text-gray-500">{t.labels.topTen}</span>
                  </div>
                  {loadingLocalSummary ? (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      {t.labels.loadingEllipsis}
                    </div>
                  ) : (
                    <ReactECharts
                      style={{ height: chartLayout.secondaryChartHeight }}
                      option={localIncomeBarOption}
                      notMerge
                      lazyUpdate
                      theme={echartsTheme}
                    />
                  )}
                </div>

                <div
                  className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
                  data-tour-id="reports-local-last-operations"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t.labels.lastOperations}
                    </h3>
                    <span className="text-xs text-gray-500">{t.labels.twentyRows}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {(localSummary?.recent || []).map(row => (
                      <div
                        key={row.id}
                        className="flex flex-col justify-between gap-1 py-3 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {row.counterparty || t.labels.withoutName.value} · #{row.rowNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.tableName} · {row.category || t.labels.withoutCategory.value} ·{' '}
                            {new Date(row.updatedAt).toLocaleString(resolveLocale(locale))}
                          </p>
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            row.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {formatAmount(row.amount)}
                        </div>
                      </div>
                    ))}
                    {(localSummary?.recent || []).length === 0 && (
                      <div className="py-6 text-sm text-gray-500 text-center">
                        {t.labels.noDataPeriod}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(localSummary?.tables || []).length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t.labels.tablesSummary}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {localSummary?.tables.length} {t.labels.piecesShort}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {(localSummary?.tables || []).map(table => (
                      <div key={table.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{table.name}</p>
                          <p className="text-xs text-gray-500">
                            {t.labels.rows.value}: {table.rows} · {t.labels.income.value}:{' '}
                            {formatAmount(table.income)} · {t.labels.expense.value}:{' '}
                            {formatAmount(table.expense)}
                          </p>
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            table.net >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {formatAmount(table.net)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === 'statements' && (
        <>
          <div className="flex items-center gap-2" data-tour-id="reports-statements-refresh">
            <button
              onClick={() => {
                loadStatements();
                loadStatementSummary();
              }}
              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 hover:border-primary flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" /> {t.labels.refresh}
            </button>
          </div>

          <div
            className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4"
            data-tour-id="reports-statements-pipeline"
          >
            <InfoCard
              title={t.labels.total.value}
              value={`${parsedStatements.total}`}
              icon={<FileText className="h-4 w-4 text-primary" />}
            />
            <InfoCard
              title={t.labels.processed.value}
              value={`${parsedStatements.processed}`}
              accent="green"
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            />
            <InfoCard
              title={t.labels.inProgress.value}
              value={`${parsedStatements.processing}`}
              accent="blue"
              icon={<RefreshCcw className="h-4 w-4 text-primary" />}
            />
            <InfoCard
              title={t.labels.errorsLabel.value}
              value={`${parsedStatements.errors}`}
              accent="red"
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            />
          </div>

          <div
            className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4"
            data-tour-id="reports-statements-totals"
          >
            <InfoCard
              title={t.labels.income.value}
              value={formatAmount(statementSummary?.totals.income || 0)}
              accent="green"
              icon={<ArrowDown className="h-4 w-4 text-emerald-500" />}
            />
            <InfoCard
              title={t.labels.expense.value}
              value={formatAmount(statementSummary?.totals.expense || 0)}
              accent="red"
              icon={<ArrowUp className="h-4 w-4 text-red-500" />}
            />
            <InfoCard
              title={t.labels.net.value}
              value={formatAmount(statementSummary?.totals.net || 0)}
              accent={(statementSummary?.totals.net || 0) >= 0 ? 'green' : 'red'}
              icon={<TrendingUp className="h-4 w-4 text-primary" />}
            />
            <InfoCard
              title={t.labels.operations.value}
              value={`${statementSummary?.totals.rows || 0}`}
              icon={<FileText className="h-4 w-4 text-primary" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
              data-tour-id="reports-statements-uploads-trend"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{t.labels.uploadsTrend}</h3>
                <span className="text-xs text-gray-500">{t.labels.byUploadDates}</span>
              </div>
              {loadingStatements || loadingStatementSummary ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  {t.labels.loadingEllipsis}
                </div>
              ) : (
                <ReactECharts
                  style={{ height: chartLayout.primaryChartHeight }}
                  option={statementsLineOption}
                  notMerge
                  lazyUpdate
                  theme={echartsTheme}
                />
              )}
            </div>

            <div
              className="rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
              data-tour-id="reports-statements-banks"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{t.labels.banks}</h3>
                <span className="text-xs text-gray-500">{t.labels.top}</span>
              </div>
              {loadingStatements ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  {t.labels.loadingEllipsis}
                </div>
              ) : (
                <ReactECharts
                  style={{ height: chartLayout.secondaryChartHeight }}
                  option={statementsPieOption}
                  notMerge
                  lazyUpdate
                  theme={echartsTheme}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className="rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
              data-tour-id="reports-statements-statuses"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{t.labels.statuses}</h3>
                <span className="text-xs text-gray-500">{t.labels.distribution}</span>
              </div>
              {loadingStatements ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  {t.labels.loadingEllipsis}
                </div>
              ) : (
                <ReactECharts
                  style={{ height: chartLayout.secondaryChartHeight }}
                  option={statementsBarOption}
                  notMerge
                  lazyUpdate
                  theme={echartsTheme}
                />
              )}
            </div>

            <div
              className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
              data-tour-id="reports-statements-latest-uploads"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{t.labels.latestUploads}</h3>
                <span className="text-xs text-gray-500">{t.labels.upToTen}</span>
              </div>
              {loadingStatements ? (
                <div className="py-6 text-sm text-gray-500 text-center">
                  {t.labels.loadingEllipsis}
                </div>
              ) : statements.length === 0 ? (
                <div className="py-6 text-sm text-gray-500 text-center">{t.labels.noData}</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {statements.slice(0, 10).map(s => (
                    <div
                      key={s.id}
                      className="flex flex-col justify-between gap-1 py-3 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {s.bankName || '—'} ·{' '}
                          {new Date(s.createdAt).toLocaleString(resolveLocale(locale))}
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        <p className="font-semibold capitalize">{s.status}</p>
                        <p>
                          {s.totalTransactions || 0} {t.labels.transactionsCount}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'balance' && <BalanceSheet />}
    </div>
  );
}
