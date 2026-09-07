/**
 * Типы дашборда вынесены из useDashboard.ts, чтобы файл хука не упирался в
 * max-lines. useDashboard.ts их ре-экспортирует — импорты по всему приложению
 * менять не нужно.
 */

export type DashboardRange = '7d' | '30d' | '90d' | 'month';

export interface DashboardFinancialSnapshot {
  totalBalance: number;
  income30d: number;
  expense30d: number;
  netFlow30d: number;
  totalPayable: number;
  totalOverdue: number;
  unapprovedCash: number;
  currency: string;
}

export interface DashboardActionItem {
  type: string;
  count: number;
  label: string;
  href: string;
}

export interface DashboardCashFlowPoint {
  date: string;
  income: number;
  expense: number;
}

export interface DashboardRecentTransaction {
  id: string;
  description: string;
  /** Signed: positive for income, negative for expense. */
  amount: number;
  currency: string;
  /** Calendar date (YYYY-MM-DD), no time component. */
  date: string;
  /** e.g. "Kaspi •••• 4821" — bank name plus masked account number. */
  account: string;
  categoryId: string | null;
  /** `null` means uncategorized — render the localized "Uncategorized" label. */
  categoryName: string | null;
  categoryColor: string;
  categoryIcon: string | null;
}

export interface DashboardTopCategory {
  id: string | null;
  /** `null` means uncategorized — render the localized "Uncategorized" label. */
  name: string | null;
  /** True only for the synthetic rollup of everything past the top categories. */
  isOther?: boolean;
  color: string;
  icon: string | null;
  amount: number;
  /** Share of total spend for the period, 0-100. Sums to 100 across the array. */
  percent: number;
  count: number;
}

export interface DashboardTopMerchant {
  name: string;
  amount: number;
  count: number;
}

export interface DashboardDataHealth {
  uncategorizedTransactions: number;
  statementsWithErrors: number;
  statementsPendingReview: number;
  statementsPendingSubmit: number;
  receiptsPendingReview: number;
  unapprovedCash: number;
  lastUploadDate: string | null;
  parsingWarnings: number;
}

export interface DashboardData {
  snapshot: DashboardFinancialSnapshot;
  actions: DashboardActionItem[];
  cashFlow: DashboardCashFlowPoint[];
  topMerchants: DashboardTopMerchant[];
  topCategories: DashboardTopCategory[];
  recentTransactions: DashboardRecentTransaction[];
  role: 'owner' | 'admin' | 'member' | 'viewer';
  range: DashboardRange;
  dataHealth: DashboardDataHealth;
  effectiveEndDate?: string;
  effectiveSince?: string;
}

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  severity: 'info' | 'warn' | 'error';
  isRead: boolean;
  type: string;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
}

export interface DashboardTrends {
  dailyTrend: Array<{ date: string; income: number; expense: number }>;
  forecast: Array<{ date: string; income: number; expense: number }>;
  categories: Array<{ name: string; amount: number; count: number }>;
  counterparties: Array<{ name: string; amount: number; count: number }>;
  sources: {
    statements: { income: number; expense: number; rows: number };
  };
  effectiveEndDate?: string;
  effectiveSince?: string;
}
