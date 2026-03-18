import type {
  StatementFilterItem,
  StatementFilters,
} from '@/app/(main)/statements/components/filters/statement-filters';
import { DEFAULT_STATEMENT_FILTERS } from '@/app/(main)/statements/components/filters/statement-filters';
import { resolveSourceChannel } from '@/app/(main)/statements/components/top-merchants.utils';

export type TopCategoryFlowType = 'spend' | 'income';
export type TopCategorySourceType = 'statement' | 'gmail';
export type TopCategorySourceChannel = 'bank' | 'receipt' | 'gmail';
export type CategorySortKey = 'amount' | 'average' | 'operations';

export type TopCategoryRecord = StatementFilterItem & {
  sourceType: TopCategorySourceType;
  sourceChannel: TopCategorySourceChannel;
  flowType: TopCategoryFlowType;
  category: string;
  amount: number;
  currencyValue: string;
  dateValue: string;
  transactionId?: string | null;
  color?: string | null;
  icon?: string | null;
  workspaceId?: string;
  workspaceName?: string;
  paymentPurpose?: string | null;
  counterpartyName?: string | null;
};

export type TopCategoryAggregateRow = {
  id: string;
  category: string;
  sourceType: TopCategorySourceType;
  sourceChannel: TopCategorySourceChannel;
  flowType: TopCategoryFlowType;
  count: number;
  total: number;
  average: number;
  lastDate: string;
  currency: string;
  color?: string | null;
  icon?: string | null;
};

type ResolveCategoryFlowInput = {
  sourceType: TopCategorySourceType;
  debit?: number | string | null;
  credit?: number | string | null;
  amount?: number | string | null;
  transactionType?: 'income' | 'expense' | 'transfer' | 'unknown' | null;
};

const STORAGE_KEY = 'lumio-top-categories-filters';

const parseAmount = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(parsed)) return 0;
  return Math.abs(parsed);
};

export const loadTopCategoriesFilters = (): StatementFilters => {
  if (typeof window === 'undefined') return DEFAULT_STATEMENT_FILTERS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_STATEMENT_FILTERS;

  try {
    const parsed = JSON.parse(raw) as Partial<StatementFilters>;
    return {
      ...DEFAULT_STATEMENT_FILTERS,
      ...parsed,
    };
  } catch {
    return DEFAULT_STATEMENT_FILTERS;
  }
};

export const saveTopCategoriesFilters = (filters: StatementFilters) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
};

export const resolveCategoryFlow = (input: ResolveCategoryFlowInput) => {
  if (input.sourceType === 'gmail') {
    return {
      flowType: input.transactionType === 'income' ? ('income' as const) : ('spend' as const),
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

  return {
    flowType: input.transactionType === 'income' ? ('income' as const) : ('spend' as const),
    amount: parseAmount(input.amount),
  };
};

export const resolveCategoryName = (name?: string | null) => {
  const normalized = (name || '').trim();
  return normalized || 'Uncategorized';
};

export const dedupeCategoryReceiptRecords = (
  receipts: TopCategoryRecord[],
  existingTransactionIds: Set<string>,
) => {
  return receipts.filter(receipt => {
    if (!receipt.transactionId) return true;
    return !existingTransactionIds.has(receipt.transactionId);
  });
};

export const createCategoryAggregateRows = (
  records: TopCategoryRecord[],
): TopCategoryAggregateRow[] => {
  const aggregate = new Map<string, TopCategoryAggregateRow>();

  records.forEach(record => {
    const normalizedCategory = resolveCategoryName(record.category);
    const key = `${record.flowType}:${record.sourceChannel}:${normalizedCategory.toLowerCase()}`;
    const existing = aggregate.get(key);
    const date = record.dateValue || record.createdAt || '';

    if (!existing) {
      aggregate.set(key, {
        id: key,
        category: normalizedCategory,
        sourceType: record.sourceType,
        sourceChannel: record.sourceChannel,
        flowType: record.flowType,
        count: 1,
        total: record.amount,
        average: record.amount,
        lastDate: date,
        currency: record.currencyValue,
        color: record.color ?? null,
        icon: record.icon ?? null,
      });
      return;
    }

    existing.count += 1;
    existing.total += record.amount;
    existing.average = existing.total / existing.count;
    existing.lastDate =
      new Date(date).getTime() > new Date(existing.lastDate || 0).getTime()
        ? date
        : existing.lastDate;

    if (!existing.color && record.color) {
      existing.color = record.color;
    }

    if (!existing.icon && record.icon) {
      existing.icon = record.icon;
    }
  });

  return Array.from(aggregate.values());
};

export const sortCategoryRows = (rows: TopCategoryAggregateRow[], key: CategorySortKey) => {
  return [...rows].sort((a, b) => {
    if (key === 'average') return b.average - a.average;
    if (key === 'operations') return b.count - a.count;
    return b.total - a.total;
  });
};

export const resolveCategorySourceChannel = (input: {
  sourceType: TopCategorySourceType;
  fileType?: string | null;
}): TopCategorySourceChannel => {
  return resolveSourceChannel(input);
};
