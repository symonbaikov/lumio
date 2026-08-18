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
  type:
    | 'statements_pending_submit'
    | 'statements_pending_review'
    | 'payments_overdue'
    | 'transactions_uncategorized'
    | 'receipts_pending_review';
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
  /** `null` means uncategorized — the client supplies the localized label. */
  categoryName: string | null;
  /** Always a concrete color — falls back to a neutral swatch when unset. */
  categoryColor: string;
  categoryIcon: string | null;
}

export interface DashboardTopMerchant {
  name: string;
  amount: number;
  count: number;
}

export interface DashboardTopCategory {
  id: string | null;
  /** `null` means uncategorized — the client supplies the localized label. */
  name: string | null;
  /** True only for the synthetic rollup of everything past the top categories. */
  isOther?: boolean;
  /** Always a concrete color — falls back to a neutral swatch when unset. */
  color: string;
  icon: string | null;
  amount: number;
  /** Share of total spend for the period, 0-100. Always sums to 100 across the array. */
  percent: number;
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

export interface DashboardResponse {
  snapshot: DashboardFinancialSnapshot;
  actions: DashboardActionItem[];
  cashFlow: DashboardCashFlowPoint[];
  topMerchants: DashboardTopMerchant[];
  topCategories: DashboardTopCategory[];
  recentTransactions: DashboardRecentTransaction[];
  role: 'owner' | 'admin' | 'member' | 'viewer';
  range: '7d' | '30d' | '90d' | 'month';
  dataHealth: DashboardDataHealth;
  effectiveEndDate?: string;
  effectiveSince?: string;
}
