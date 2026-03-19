import type { DashboardData } from '@/app/hooks/useDashboard';

export type DashboardStatusHeadingKey =
  | 'error'
  | 'loading'
  | 'empty'
  | 'overdue'
  | 'needsReview'
  | 'parsingIssues'
  | 'uncategorized'
  | 'stale'
  | 'negativeFlow'
  | 'positiveFlow'
  | 'breakEven'
  | 'allClear';

interface ResolveDashboardStatusHeadingOptions {
  data: DashboardData | null;
  error: string | null;
  loading: boolean;
  now?: number;
  staleAfterDays?: number;
}

export const resolveDashboardStatusHeading = ({
  data,
  error,
  loading,
  now = Date.now(),
  staleAfterDays = 14,
}: ResolveDashboardStatusHeadingOptions): DashboardStatusHeadingKey => {
  if (error) {
    return 'error';
  }

  if (loading && !data) {
    return 'loading';
  }

  if (!data) {
    return 'allClear';
  }

  const lastUploadDate = data.dataHealth.lastUploadDate;

  if (!lastUploadDate) {
    return 'empty';
  }

  const daysSinceUpload = Math.floor(
    (now - new Date(lastUploadDate).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (data.snapshot.totalOverdue > 0) {
    return 'overdue';
  }

  if (data.dataHealth.statementsPendingReview > 0) {
    return 'needsReview';
  }

  if (data.dataHealth.parsingWarnings > 0) {
    return 'parsingIssues';
  }

  if (data.dataHealth.uncategorizedTransactions > 0) {
    return 'uncategorized';
  }

  if (daysSinceUpload >= staleAfterDays) {
    return 'stale';
  }

  if (data.snapshot.netFlow30d < 0) {
    return 'negativeFlow';
  }

  if (data.snapshot.netFlow30d > 0) {
    return 'positiveFlow';
  }

  if (data.snapshot.netFlow30d === 0 && data.snapshot.income30d > 0) {
    return 'breakEven';
  }

  return 'allClear';
};
