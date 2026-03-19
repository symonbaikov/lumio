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

export interface DashboardRecentActivity {
  id: string;
  type: 'statement_upload' | 'payment' | 'categorization' | 'transaction';
  title: string;
  description: string | null;
  amount: number | null;
  timestamp: string;
  href: string;
}

export interface DashboardTopMerchant {
  name: string;
  amount: number;
  count: number;
}

export interface DashboardTopCategory {
  id: string | null;
  name: string;
  amount: number;
  count: number;
}

export interface DashboardDataHealth {
  uncategorizedTransactions: number;
  statementsWithErrors: number;
  statementsPendingReview: number;
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
  recentActivity: DashboardRecentActivity[];
  role: 'owner' | 'admin' | 'member' | 'viewer';
  range: '7d' | '30d' | '90d';
  dataHealth: DashboardDataHealth;
  effectiveEndDate?: string;
  effectiveSince?: string;
}
