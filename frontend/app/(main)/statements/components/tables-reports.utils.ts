export type TablesReportFlowType = 'all' | 'expense' | 'income';
export type TablesReportSortKey = 'amount' | 'average' | 'operations';
export type TablesReportTrend = 'up' | 'down' | 'flat';

export interface TablesReportsFilters {
  tableIds: string[];
  days: number;
  flowType: TablesReportFlowType;
  sortBy: TablesReportSortKey;
  search: string;
}

export interface TablesReportRow {
  counterparty: string;
  source: 'manual';
  tableId: string;
  tableName: string;
  count: number;
  total: number;
  average: number;
  lastDate: string | null;
  currency: string | null;
}

export interface TablesReportResponse {
  totals: {
    total: number;
    manualTotal: number;
    operations: number;
  };
  comparison: {
    totalDelta: number;
    totalPercentage: number;
    totalTrend: TablesReportTrend;
    manualDelta: number;
    manualPercentage: number;
    manualTrend: TablesReportTrend;
    operationsDelta: number;
    operationsPercentage: number;
    operationsTrend: TablesReportTrend;
  };
  timeseries: Array<{ date: string; amount: number }>;
  sourceSplit: { manual: number };
  aggregatedRows: TablesReportRow[];
  tables: Array<{
    id: string;
    name: string;
    source: 'manual';
    total: number;
    rows: number;
  }>;
}

export interface TablesReportDrillDownItem {
  rowId: string;
  tableId: string;
  tableName: string;
  source: 'manual';
  date: string | null;
  amount: number;
  category: string | null;
  currency: string | null;
}

export interface TablesReportDrillDownResponse {
  counterparty: string;
  items: TablesReportDrillDownItem[];
}

export interface AvailableTable {
  id: string;
  name: string;
  source: 'manual';
  rowCount: number;
}

export const TABLES_REPORTS_FILTERS_STORAGE_KEY = 'lumio-tables-reports-filters';

export const DEFAULT_TABLES_REPORTS_FILTERS: TablesReportsFilters = {
  tableIds: [],
  days: 30,
  flowType: 'all',
  sortBy: 'amount',
  search: '',
};

export const DATE_PRESETS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 365 days', value: 365 },
  { label: 'Year to date', value: -1 },
] as const;

export function loadTablesReportsFilters(): TablesReportsFilters {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_TABLES_REPORTS_FILTERS };
  }

  try {
    const raw = localStorage.getItem(TABLES_REPORTS_FILTERS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_TABLES_REPORTS_FILTERS };
    }
    return {
      ...DEFAULT_TABLES_REPORTS_FILTERS,
      ...(JSON.parse(raw) as Partial<TablesReportsFilters>),
    };
  } catch {
    return { ...DEFAULT_TABLES_REPORTS_FILTERS };
  }
}

export function saveTablesReportsFilters(filters: TablesReportsFilters): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(TABLES_REPORTS_FILTERS_STORAGE_KEY, JSON.stringify(filters));
}

export function formatAmount(value: number, currency?: string | null): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

export function getSourceLabel(source: string, manualLabel = 'Manual'): string {
  return source === 'manual' ? manualLabel : source;
}

export function getComparisonColor(trend: TablesReportTrend): string {
  if (trend === 'up') {
    return 'text-emerald-600';
  }
  if (trend === 'down') {
    return 'text-red-500';
  }
  return 'text-gray-400';
}

export function getComparisonArrow(trend: TablesReportTrend): string {
  if (trend === 'up') {
    return '↑';
  }
  if (trend === 'down') {
    return '↓';
  }
  return '–';
}

export function resolveDays(preset: number): number {
  if (preset !== -1) {
    return preset;
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
