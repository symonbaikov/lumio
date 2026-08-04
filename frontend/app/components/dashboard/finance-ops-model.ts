import type { DashboardActionItem, DashboardData } from '@/app/hooks/useDashboard';
import { DEFAULT_CURRENCY } from '@/app/lib/format-money';

export type FinanceOpsFeatureStatus = 'ready' | 'review' | 'blocked';

export type FinanceOpsFeature = {
  id: string;
  title: string;
  summary: string;
  pendingCount: number;
  status: FinanceOpsFeatureStatus;
  href: string;
  primaryAction: string;
  evidence: string;
};

export type FinanceOpsChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

export type FinanceOpsModel = {
  totalPending: number;
  closeChecklist: FinanceOpsChecklistItem[];
  savedViews: Array<{ id: string; label: string; href: string; count: number }>;
  notifications: DashboardActionItem[];
  features: FinanceOpsFeature[];
};

const statusFor = (count: number, blocked = false): FinanceOpsFeatureStatus => {
  if (blocked) return 'blocked';
  return count > 0 ? 'review' : 'ready';
};

const plural = (count: number, singular: string, pluralLabel = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : pluralLabel}`;

export function buildFinanceOpsModel(
  data: DashboardData,
  formatAmount: (value: number) => string,
): FinanceOpsModel {
  const dataHealth = {
    uncategorizedTransactions: data.dataHealth?.uncategorizedTransactions ?? 0,
    statementsWithErrors: data.dataHealth?.statementsWithErrors ?? 0,
    statementsPendingReview: data.dataHealth?.statementsPendingReview ?? 0,
    statementsPendingSubmit: data.dataHealth?.statementsPendingSubmit ?? 0,
    receiptsPendingReview: data.dataHealth?.receiptsPendingReview ?? 0,
    unapprovedCash: data.dataHealth?.unapprovedCash ?? 0,
    lastUploadDate: data.dataHealth?.lastUploadDate ?? null,
    parsingWarnings: data.dataHealth?.parsingWarnings ?? 0,
  };
  const snapshot = {
    totalBalance: data.snapshot?.totalBalance ?? 0,
    income30d: data.snapshot?.income30d ?? 0,
    expense30d: data.snapshot?.expense30d ?? 0,
    netFlow30d: data.snapshot?.netFlow30d ?? 0,
    totalPayable: data.snapshot?.totalPayable ?? 0,
    totalOverdue: data.snapshot?.totalOverdue ?? 0,
    unapprovedCash: data.snapshot?.unapprovedCash ?? 0,
    currency: data.snapshot?.currency ?? DEFAULT_CURRENCY,
  };
  const actions = data.actions ?? [];
  const topCategories = data.topCategories ?? [];
  const topMerchants = data.topMerchants ?? [];
  const importPending =
    dataHealth.statementsPendingSubmit +
    dataHealth.statementsPendingReview +
    dataHealth.statementsWithErrors +
    dataHealth.parsingWarnings;
  const triagePending = dataHealth.uncategorizedTransactions;
  const receiptPending = dataHealth.receiptsPendingReview;
  const reconciliationPending = Math.abs(snapshot.unapprovedCash) > 0 ? 1 : 0;
  const anomalyPending =
    snapshot.totalOverdue > 0 || snapshot.expense30d > snapshot.income30d ? 1 : 0;

  const closeChecklist: FinanceOpsChecklistItem[] = [
    {
      id: 'statements-loaded',
      label: 'Statements imported and submitted',
      done: dataHealth.statementsPendingSubmit === 0,
      href: '/statements/submit',
    },
    {
      id: 'review-clear',
      label: 'Statement review queue is clear',
      done: dataHealth.statementsPendingReview === 0 && dataHealth.statementsWithErrors === 0,
      href: '/statements/approve',
    },
    {
      id: 'categories-clear',
      label: 'Uncategorized transactions are resolved',
      done: dataHealth.uncategorizedTransactions === 0,
      href: '/statements/submit?categoryId=uncategorized',
    },
    {
      id: 'receipts-clear',
      label: 'Receipts are matched or reviewed',
      done: dataHealth.receiptsPendingReview === 0,
      href: '/statements/submit?status=needs_review',
    },
    {
      id: 'cash-approved',
      label: 'Unapproved cash is reconciled',
      done: Math.abs(snapshot.unapprovedCash) === 0,
      href: '/statements/approve',
    },
  ];

  const closePending = closeChecklist.filter(item => !item.done).length;
  const savedViews = [
    {
      id: 'uncategorized',
      label: 'Uncategorized',
      href: '/statements/submit?categoryId=uncategorized',
      count: dataHealth.uncategorizedTransactions,
    },
    {
      id: 'needs-receipt',
      label: 'Needs receipt',
      href: '/statements/submit?status=needs_review',
      count: dataHealth.receiptsPendingReview,
    },
    {
      id: 'review-statements',
      label: 'Statement review',
      href: '/statements/approve',
      count: dataHealth.statementsPendingReview,
    },
    {
      id: 'large-expenses',
      label: 'Large expenses',
      href: '/statements/transactions?sort=amount-desc&type=expense',
      count: 0,
    },
    {
      id: 'month-close',
      label: 'This month close',
      href: '/reports',
      count: closePending,
    },
  ];

  const features: FinanceOpsFeature[] = [
    {
      id: 'import-review-inbox',
      title: 'Import Review Inbox',
      summary: 'One queue for submitted statements, parse warnings, errors, and pending review.',
      pendingCount: importPending,
      status: statusFor(importPending, dataHealth.statementsWithErrors > 0),
      href: importPending > 0 ? '/statements/approve' : '/statements/submit',
      primaryAction: importPending > 0 ? 'Open review queue' : 'Import statement',
      evidence: `${plural(dataHealth.statementsPendingReview, 'statement')} in review, ${plural(dataHealth.parsingWarnings, 'warning')}`,
    },
    {
      id: 'transaction-triage',
      title: 'Transaction Triage Mode',
      summary:
        'Process uncategorized transactions as an approval queue instead of hunting in tables.',
      pendingCount: triagePending,
      status: statusFor(triagePending),
      href: '/statements/submit?categoryId=uncategorized',
      primaryAction: 'Start triage',
      evidence: plural(triagePending, 'transaction'),
    },
    {
      id: 'smart-category-suggestions',
      title: 'Smart Category Suggestions',
      summary: 'Explain category work with merchant history, team rules, and high-volume patterns.',
      pendingCount: triagePending,
      status: statusFor(triagePending),
      href: '/categories',
      primaryAction: 'Review category rules',
      evidence: topCategories[0]
        ? `Top category: ${topCategories[0].name}`
        : 'No category pressure detected',
    },
    {
      id: 'period-close-checklist',
      title: 'Period Close Checklist',
      summary:
        'Make month close explicit: imports, review, categories, receipts, and cash approval.',
      pendingCount: closePending,
      status: statusFor(closePending, closePending > 0),
      href: '/reports',
      primaryAction: closePending > 0 ? 'Resolve blockers' : 'Export reports',
      evidence: `${closeChecklist.length - closePending}/${closeChecklist.length} checks complete`,
    },
    {
      id: 'anomaly-feed',
      title: 'Anomaly Detection Feed',
      summary: 'Surface unusual spend, overdue payables, new merchants, and concentration risk.',
      pendingCount: anomalyPending,
      status: statusFor(anomalyPending),
      href: '/dashboard',
      primaryAction: 'Inspect anomalies',
      evidence:
        snapshot.totalOverdue > 0
          ? `${formatAmount(snapshot.totalOverdue)} overdue`
          : `Top merchant: ${topMerchants[0]?.name ?? 'none'}`,
    },
    {
      id: 'reconciliation-dashboard',
      title: 'Reconciliation Dashboard',
      summary: 'Show income minus expenses, unapproved cash, and balance confidence in one place.',
      pendingCount: reconciliationPending,
      status: statusFor(reconciliationPending),
      href: '/reports',
      primaryAction: 'Open reconciliation',
      evidence: `Net flow: ${formatAmount(snapshot.netFlow30d)}; unapproved: ${formatAmount(snapshot.unapprovedCash)}`,
    },
    {
      id: 'saved-views',
      title: 'Saved Views & Team Filters',
      summary: 'Give the team stable operational views for daily review and month close.',
      pendingCount: savedViews.reduce((sum, view) => sum + view.count, 0),
      status: statusFor(savedViews.reduce((sum, view) => sum + view.count, 0)),
      href: '/statements/transactions',
      primaryAction: 'Open saved views',
      evidence: `${savedViews.length} team views ready`,
    },
    {
      id: 'receipt-matching',
      title: 'Receipt Matching Assistant',
      summary: 'Keep unmatched receipts visible until they are linked, approved, or dismissed.',
      pendingCount: receiptPending,
      status: statusFor(receiptPending),
      href: '/statements/submit?status=needs_review',
      primaryAction: 'Match receipts',
      evidence: plural(receiptPending, 'receipt'),
    },
    {
      id: 'actionable-notifications',
      title: 'Actionable Notifications',
      summary: 'Turn dashboard action items into direct links to the work that remains.',
      pendingCount: actions.reduce((sum, action) => sum + action.count, 0),
      status: statusFor(actions.reduce((sum, action) => sum + action.count, 0)),
      href: actions[0]?.href ?? '/dashboard',
      primaryAction: actions[0] ? 'Open first action' : 'No action needed',
      evidence: actions[0]?.label ?? 'All operational actions are clear',
    },
    {
      id: 'explain-number',
      title: 'Explain This Number',
      summary:
        'Connect every headline number to source transactions, categories, and period changes.',
      pendingCount: 0,
      status: 'ready',
      href: '/reports',
      primaryAction: 'Explain report numbers',
      evidence: topCategories[0]
        ? `${topCategories[0].name}: ${formatAmount(topCategories[0].amount)}`
        : `Balance: ${formatAmount(snapshot.totalBalance)}`,
    },
  ];

  return {
    totalPending: features.reduce((sum, feature) => sum + feature.pendingCount, 0),
    closeChecklist,
    savedViews,
    notifications: actions,
    features,
  };
}
