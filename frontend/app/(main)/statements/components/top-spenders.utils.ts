export type TopSpenderFlowType = 'spend' | 'income';
export type TopSpenderSourceType = 'statement' | 'gmail';
export type TopSpenderSourceChannel = 'bank' | 'receipt' | 'gmail';
export type ComparisonTrend = 'up' | 'down' | 'flat';

export type AggregateSortKey = 'amount' | 'average' | 'operations';

export type TopSpenderAggregateRow = {
  id: string;
  company: string;
  sourceType: TopSpenderSourceType;
  sourceChannel: TopSpenderSourceChannel;
  flowType: TopSpenderFlowType;
  count: number;
  total: number;
  average: number;
  lastDate: string;
  currency: string;
};

type ResolveSpenderFlowInput = {
  sourceType: TopSpenderSourceType;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
};

type ResolveSourceChannelInput = {
  sourceType: TopSpenderSourceType;
  fileType?: string | null;
};

const RECEIPT_FILE_TYPES = new Set(['pdf', 'image', 'jpg', 'jpeg', 'png', 'csv', 'xlsx']);

const parseAmount = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(parsed)) return 0;
  return Math.abs(parsed);
};

export const resolveSpenderFlow = (input: ResolveSpenderFlowInput) => {
  if (input.sourceType === 'gmail') {
    return {
      flowType: 'spend' as const,
      amount: parseAmount(input.totalDebit),
    };
  }

  const debit = parseAmount(input.totalDebit);
  if (debit > 0) {
    return {
      flowType: 'spend' as const,
      amount: debit,
    };
  }

  const credit = parseAmount(input.totalCredit);
  if (credit > 0) {
    return {
      flowType: 'income' as const,
      amount: credit,
    };
  }

  return {
    flowType: 'spend' as const,
    amount: 0,
  };
};

export const resolveSourceChannel = (input: ResolveSourceChannelInput): TopSpenderSourceChannel => {
  if (input.sourceType === 'gmail') return 'gmail';
  const normalizedType = String(input.fileType || '').toLowerCase();
  if (RECEIPT_FILE_TYPES.has(normalizedType)) return 'receipt';
  return 'bank';
};

export const sortAggregateRows = (
  rows: TopSpenderAggregateRow[],
  key: AggregateSortKey,
): TopSpenderAggregateRow[] => {
  return [...rows].sort((a, b) => {
    if (key === 'average') return b.average - a.average;
    if (key === 'operations') return b.count - a.count;
    return b.total - a.total;
  });
};

export const buildTopSpendersStatementsParams = (page: number, limit: number) => ({
  page,
  limit,
});

export const buildPreviousPeriodRange = (currentStart: Date, currentEnd: Date) => {
  if (Number.isNaN(currentStart.getTime()) || Number.isNaN(currentEnd.getTime())) return null;
  const startTime = currentStart.getTime();
  const endTime = currentEnd.getTime();
  if (endTime < startTime) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const periodDays = Math.floor((endTime - startTime) / dayMs) + 1;
  const previousEnd = new Date(startTime - dayMs);
  const previousStart = new Date(previousEnd.getTime() - dayMs * (periodDays - 1));

  return {
    start: previousStart,
    end: previousEnd,
  };
};

export const getComparisonDelta = (current: number, previous: number) => {
  const delta = current - previous;
  const trend: ComparisonTrend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  if (previous === 0) {
    return {
      delta,
      percentage: current === 0 ? 0 : 100,
      trend,
    };
  }

  return {
    delta,
    percentage: Number(((delta / previous) * 100).toFixed(1)),
    trend,
  };
};
