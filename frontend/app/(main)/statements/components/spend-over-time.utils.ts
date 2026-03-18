import type { StatementFilterItem } from '@/app/(main)/statements/components/filters/statement-filters';

export type SpendOverTimeFlowType = 'expense' | 'income';
export type SpendOverTimeSourceType = 'statement' | 'gmail';
export type SpendOverTimeSourceChannel = 'bank' | 'receipt' | 'gmail';
export type SpendOverTimeGroupBy = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type SpendOverTimeRecord = StatementFilterItem & {
  sourceType: SpendOverTimeSourceType;
  sourceChannel: SpendOverTimeSourceChannel;
  flowType: SpendOverTimeFlowType;
  amount: number;
  currencyValue: string;
  dateValue: string;
  transactionId?: string | null;
  workspaceId?: string;
  workspaceName?: string;
  merchant?: string | null;
  paymentPurpose?: string | null;
};

export type SpendOverTimePoint = {
  period: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  count: number;
  statementAmount: number;
  gmailAmount: number;
};

export type SpendOverTimeTotals = {
  income: number;
  expense: number;
  net: number;
  count: number;
  avgPerPeriod: number;
  statementAmount: number;
  gmailAmount: number;
};

export type SpendOverTimeReport = {
  points: SpendOverTimePoint[];
  totals: SpendOverTimeTotals;
};

type ResolveSpendOverTimeFlowInput = {
  sourceType: SpendOverTimeSourceType;
  debit?: number | string | null;
  credit?: number | string | null;
  amount?: number | string | null;
  transactionType?: 'income' | 'expense' | 'transfer' | 'unknown' | null;
};

const parseAmount = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(parsed)) return 0;
  return Math.abs(parsed);
};

const toDateOnly = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const formatDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekStart = (date: Date) => {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const result = new Date(date);
  result.setDate(date.getDate() + diff);
  return new Date(result.getFullYear(), result.getMonth(), result.getDate());
};

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const buildPeriodMeta = (date: Date, groupBy: SpendOverTimeGroupBy) => {
  if (groupBy === 'day') {
    const period = formatDateOnly(date);
    return { period, label: period };
  }

  if (groupBy === 'week') {
    const weekStart = getWeekStart(date);
    const period = formatDateOnly(weekStart);
    return { period, label: period };
  }

  if (groupBy === 'month') {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const period = `${year}-${month}`;
    const label = monthFormatter.format(new Date(Date.UTC(year, date.getMonth(), 1)));
    return { period, label };
  }

  if (groupBy === 'quarter') {
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const period = `${year}-Q${quarter}`;
    return { period, label: `Q${quarter} ${year}` };
  }

  const period = `${date.getFullYear()}`;
  return { period, label: period };
};

export const resolveSpendOverTimeFlow = (input: ResolveSpendOverTimeFlowInput) => {
  if (input.sourceType === 'gmail') {
    return {
      flowType: input.transactionType === 'income' ? ('income' as const) : ('expense' as const),
      amount: parseAmount(input.amount),
    };
  }

  const debit = parseAmount(input.debit);
  if (debit > 0) {
    return {
      flowType: 'expense' as const,
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

  return {
    flowType: input.transactionType === 'income' ? ('income' as const) : ('expense' as const),
    amount: parseAmount(input.amount),
  };
};

export const dedupeSpendOverTimeReceiptRecords = (
  receipts: SpendOverTimeRecord[],
  existingTransactionIds: Set<string>,
) => {
  return receipts.filter(receipt => {
    if (!receipt.transactionId) return true;
    return !existingTransactionIds.has(receipt.transactionId);
  });
};

export const buildSpendOverTimeReport = (
  records: SpendOverTimeRecord[],
  groupBy: SpendOverTimeGroupBy,
): SpendOverTimeReport => {
  const pointsMap = new Map<string, SpendOverTimePoint>();

  records.forEach(record => {
    const date = toDateOnly(record.dateValue || record.createdAt || null);
    if (!date || record.amount <= 0) return;

    const meta = buildPeriodMeta(date, groupBy);
    const existing = pointsMap.get(meta.period) || {
      period: meta.period,
      label: meta.label,
      income: 0,
      expense: 0,
      net: 0,
      count: 0,
      statementAmount: 0,
      gmailAmount: 0,
    };

    if (record.flowType === 'income') {
      existing.income += record.amount;
    } else {
      existing.expense += record.amount;
    }

    if (record.sourceType === 'gmail') {
      existing.gmailAmount += record.amount;
    } else {
      existing.statementAmount += record.amount;
    }

    existing.count += 1;
    existing.net = existing.income - existing.expense;
    pointsMap.set(meta.period, existing);
  });

  const points = Array.from(pointsMap.values())
    .sort((a, b) => a.period.localeCompare(b.period))
    .map(point => ({
      ...point,
      income: Number(point.income.toFixed(2)),
      expense: Number(point.expense.toFixed(2)),
      net: Number(point.net.toFixed(2)),
      statementAmount: Number(point.statementAmount.toFixed(2)),
      gmailAmount: Number(point.gmailAmount.toFixed(2)),
    }));

  const totals = points.reduce<SpendOverTimeTotals>(
    (result, point) => {
      result.income += point.income;
      result.expense += point.expense;
      result.net += point.net;
      result.count += point.count;
      result.statementAmount += point.statementAmount;
      result.gmailAmount += point.gmailAmount;
      return result;
    },
    {
      income: 0,
      expense: 0,
      net: 0,
      count: 0,
      avgPerPeriod: 0,
      statementAmount: 0,
      gmailAmount: 0,
    },
  );

  const totalFlow = totals.income + totals.expense;
  totals.avgPerPeriod = points.length > 0 ? Number((totalFlow / points.length).toFixed(2)) : 0;
  totals.income = Number(totals.income.toFixed(2));
  totals.expense = Number(totals.expense.toFixed(2));
  totals.net = Number(totals.net.toFixed(2));
  totals.statementAmount = Number(totals.statementAmount.toFixed(2));
  totals.gmailAmount = Number(totals.gmailAmount.toFixed(2));

  return {
    points,
    totals,
  };
};
