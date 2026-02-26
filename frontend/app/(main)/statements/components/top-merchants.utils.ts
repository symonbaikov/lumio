export type TopMerchantFlowType = 'spend' | 'income';
export type TopMerchantSourceType = 'statement' | 'gmail';
export type TopMerchantSourceChannel = 'bank' | 'receipt' | 'gmail';
export type ComparisonTrend = 'up' | 'down' | 'flat';

export type AggregateSortKey = 'amount' | 'average' | 'operations';

export type TopMerchantAggregateRow = {
  id: string;
  merchant: string;
  sourceType: TopMerchantSourceType;
  sourceChannel: TopMerchantSourceChannel;
  flowType: TopMerchantFlowType;
  count: number;
  total: number;
  average: number;
  lastDate: string;
  currency: string;
};

type ResolveMerchantFlowInput = {
  sourceType: TopMerchantSourceType;
  debit?: number | string | null;
  credit?: number | string | null;
  amount?: number | string | null;
  transactionType?: 'income' | 'expense' | null;
};

type ResolveSourceChannelInput = {
  sourceType: TopMerchantSourceType;
  fileType?: string | null;
};

const RECEIPT_FILE_TYPES = new Set(['pdf', 'image', 'jpg', 'jpeg', 'png', 'csv', 'xlsx']);

const parseAmount = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(parsed)) return 0;
  return Math.abs(parsed);
};

export const resolveMerchantFlow = (input: ResolveMerchantFlowInput) => {
  if (input.sourceType === 'gmail') {
    return {
      flowType: 'spend' as const,
      amount: parseAmount(input.amount),
    };
  }

  const debit = parseAmount(input.debit);
  if (debit > 0) {
    return {
      flowType: 'spend' as const,
      amount: debit,
    };
  }

  const credit = parseAmount(input.credit);
  if (credit > 0) {
    return {
      flowType: 'income' as const,
      amount: credit,
    };
  }

  const fallbackAmount = parseAmount(input.amount);
  const flowType = input.transactionType === 'income' ? ('income' as const) : ('spend' as const);

  return {
    flowType,
    amount: fallbackAmount,
  };
};

export const resolveSourceChannel = (
  input: ResolveSourceChannelInput,
): TopMerchantSourceChannel => {
  if (input.sourceType === 'gmail') return 'gmail';
  const normalizedType = String(input.fileType || '').toLowerCase();
  if (RECEIPT_FILE_TYPES.has(normalizedType)) return 'receipt';
  return 'bank';
};

export const sortAggregateRows = (
  rows: TopMerchantAggregateRow[],
  key: AggregateSortKey,
): TopMerchantAggregateRow[] => {
  return [...rows].sort((a, b) => {
    if (key === 'average') return b.average - a.average;
    if (key === 'operations') return b.count - a.count;
    return b.total - a.total;
  });
};

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
