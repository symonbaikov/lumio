import type { StatementFilters } from '@/app/(main)/statements/components/filters/statement-filters';
import apiClient from '@/app/lib/api';

export type TopCategoriesQuery = {
  type?: 'income' | 'expense' | 'all';
  dateFrom?: string;
  dateTo?: string;
  statuses?: string;
  keywords?: string;
  amountMin?: number;
  amountMax?: number;
  currencies?: string;
  approved?: boolean;
  billable?: boolean;
  has?: string;
  groupBy?: string;
  exported?: boolean;
  paid?: boolean;
  bankName?: string;
  counterparties?: string;
  limit?: number;
};

export type TopCategoriesReport = {
  period: {
    from: string;
    to: string;
  };
  totals: {
    income: number;
    expense: number;
    net: number;
    transactions: number;
  };
  categories: Array<{
    id: string | null;
    name: string;
    amount: number;
    percentage: number;
    transactions: number;
    type: 'income' | 'expense';
    color?: string | null;
    icon?: string | null;
  }>;
  banks: Array<{
    bankName: string;
    amount: number;
    percentage: number;
    statements: number;
  }>;
  counterparties: Array<{
    name: string;
    amount: number;
    percentage: number;
    transactions: number;
    type: 'income' | 'expense';
  }>;
};

const formatDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resolvePresetRange = (preset: NonNullable<StatementFilters['date']>['preset']) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === 'thisMonth') {
    return {
      dateFrom: formatDateOnly(new Date(today.getFullYear(), today.getMonth(), 1)),
      dateTo: formatDateOnly(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    };
  }

  if (preset === 'lastMonth') {
    return {
      dateFrom: formatDateOnly(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      dateTo: formatDateOnly(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }

  return {
    dateFrom: formatDateOnly(new Date(today.getFullYear(), 0, 1)),
    dateTo: formatDateOnly(today),
  };
};

const extractBankName = (tokens: string[]) => {
  const bankToken = tokens.find(token => token.startsWith('bank:'));
  if (!bankToken) return undefined;
  return bankToken.replace('bank:', '') || undefined;
};

const extractCounterparties = (tokens: string[]) =>
  tokens
    .filter(token => token.startsWith('counterparty:'))
    .map(token => token.replace('counterparty:', '').trim())
    .filter(Boolean);

const resolveReportType = (type: StatementFilters['type']): 'income' | 'expense' | 'all' => {
  if (type === 'income' || type === 'expense' || type === 'all') {
    return type;
  }
  return 'expense';
};

export const buildTopCategoriesQuery = (filters: StatementFilters): TopCategoriesQuery => {
  const query: TopCategoriesQuery = {
    type: resolveReportType(filters.type),
    limit: filters.limit && filters.limit > 0 ? filters.limit : 20,
  };

  if (filters.date?.preset) {
    Object.assign(query, resolvePresetRange(filters.date.preset));
  } else if (filters.date?.mode && filters.date.date) {
    if (filters.date.mode === 'on') {
      query.dateFrom = filters.date.date;
      query.dateTo = filters.date.date;
    } else if (filters.date.mode === 'after') {
      query.dateFrom = filters.date.date;
    } else {
      query.dateTo = filters.date.date;
    }
  }

  if (filters.statuses.length > 0) {
    query.statuses = filters.statuses.join(',');
  }
  if (filters.keywords.trim()) {
    query.keywords = filters.keywords.trim();
  }
  if (filters.amountMin !== null) {
    query.amountMin = filters.amountMin;
  }
  if (filters.amountMax !== null) {
    query.amountMax = filters.amountMax;
  }
  if (filters.currencies.length > 0) {
    query.currencies = filters.currencies.join(',');
  }
  if (filters.approved !== null) {
    query.approved = filters.approved;
  }
  if (filters.billable !== null) {
    query.billable = filters.billable;
  }
  if (filters.has.length > 0) {
    query.has = filters.has.join(',');
  }
  if (filters.groupBy) {
    query.groupBy = filters.groupBy;
  }
  if (filters.exported !== null) {
    query.exported = filters.exported;
  }
  if (filters.paid !== null) {
    query.paid = filters.paid;
  }

  const bankName = extractBankName([...filters.from, ...filters.to]);
  if (bankName) {
    query.bankName = bankName;
  }

  const counterparties = extractCounterparties([...filters.from, ...filters.to]);
  if (counterparties.length > 0) {
    query.counterparties = counterparties.join(',');
  }

  return query;
};

export const fetchTopCategoriesReport = async (
  filters: StatementFilters,
  overrides?: Partial<Pick<TopCategoriesQuery, 'dateFrom' | 'dateTo'>>,
): Promise<TopCategoriesReport> => {
  const response = await apiClient.get('/reports/top-categories', {
    params: {
      ...buildTopCategoriesQuery(filters),
      ...(overrides || {}),
    },
  });
  return response.data as TopCategoriesReport;
};
