export type StatementFilterDatePreset = 'thisMonth' | 'lastMonth' | 'yearToDate';
export type StatementFilterDateMode = 'on' | 'after' | 'before';

export type StatementFilterDate = {
  preset?: StatementFilterDatePreset;
  mode?: StatementFilterDateMode;
  date?: string;
};

export type StatementFilters = {
  type: string | null;
  statuses: string[];
  date: StatementFilterDate | null;
  from: string[];
  to: string[];
  keywords: string;
  amountMin: number | null;
  amountMax: number | null;
  limit: number | null;
  approved: boolean | null;
  billable: boolean | null;
  groupBy: string | null;
  has: string[];
  currencies: string[];
  exported: boolean | null;
  paid: boolean | null;
};

export type StatementFilterUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export type StatementFilterItem = {
  id: string;
  source?: 'statement' | 'gmail';
  fileName: string;
  subject?: string | null;
  sender?: string | null;
  status?: string | null;
  fileType?: string | null;
  createdAt?: string | null;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  bankName?: string | null;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  currency?: string | null;
  exported?: boolean | null;
  paid?: boolean | null;
  parsingDetails?: {
    logEntries?: Array<{ timestamp: string; level: string; message: string }>;
    metadataExtracted?: {
      currency?: string;
      headerDisplay?: {
        currencyDisplay?: string;
      };
    };
  } | null;
  user?: StatementFilterUser | null;
  errorMessage?: string | null;
  totalTransactions?: number | null;
  receivedAt?: string | null;
  parsedData?: {
    vendor?: string | null;
    date?: string | null;
  } | null;
};

const APPROVED_STATUSES = new Set(['validated', 'completed', 'parsed']);
const NOT_APPROVED_STATUSES = new Set(['uploaded', 'processing', 'error']);

const parseNumber = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveStatementAmount = (statement: StatementFilterItem) => {
  const debit = parseNumber(statement.totalDebit);
  const credit = parseNumber(statement.totalCredit);
  const resolved = debit && debit > 0 ? debit : credit && credit > 0 ? credit : 0;
  return resolved ?? 0;
};

const resolveStatementDateValue = (statement: StatementFilterItem) => {
  if (statement.source === 'gmail') {
    return statement.parsedData?.date || statement.receivedAt || statement.createdAt || '';
  }

  return (
    statement.statementDateTo ||
    statement.statementDateFrom ||
    statement.createdAt ||
    ''
  );
};

const toDateOnlyString = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDateOnly = (value?: string | null) => {
  const dateString = toDateOnlyString(value);
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const getPresetRange = (preset: StatementFilterDatePreset, now: Date) => {
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === 'thisMonth') {
    const start = new Date(current.getFullYear(), current.getMonth(), 1);
    const end = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    return { start, end };
  }
  if (preset === 'lastMonth') {
    const start = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    const end = new Date(current.getFullYear(), current.getMonth(), 0);
    return { start, end };
  }
  const start = new Date(current.getFullYear(), 0, 1);
  const end = current;
  return { start, end };
};

const matchesKeywords = (statement: StatementFilterItem, rawQuery: string) => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  const candidates = [
    statement.fileName,
    statement.subject,
    statement.sender,
    statement.parsedData?.vendor,
    statement.bankName,
    statement.status,
    statement.user?.name,
    statement.user?.email,
  ]
    .filter(Boolean)
    .map((value) => value?.toString().toLowerCase() || '');
  return candidates.some((value) => value.includes(query));
};

const matchesToken = (token: string, statement: StatementFilterItem) => {
  if (token.startsWith('user:')) {
    const userId = token.replace('user:', '');
    return statement.user?.id === userId;
  }
  if (token.startsWith('bank:')) {
    const bankName = token.replace('bank:', '');
    return (statement.bankName || '').toLowerCase() === bankName.toLowerCase();
  }
  return false;
};

const matchesHas = (token: string, statement: StatementFilterItem) => {
  switch (token) {
    case 'errors':
      return statement.status === 'error' || Boolean(statement.errorMessage);
    case 'processingDetails':
      return Boolean(statement.parsingDetails?.logEntries?.length);
    case 'transactions':
      return (statement.totalTransactions || 0) > 0;
    case 'dateRange':
      return Boolean(statement.statementDateFrom || statement.statementDateTo);
    case 'currency':
      return Boolean(
        statement.currency ||
          statement.parsingDetails?.metadataExtracted?.currency ||
          statement.parsingDetails?.metadataExtracted?.headerDisplay?.currencyDisplay,
      );
    default:
      return false;
  }
};

const resolveStatementCurrency = (statement: StatementFilterItem) =>
  (
    statement.currency ||
    statement.parsingDetails?.metadataExtracted?.currency ||
    statement.parsingDetails?.metadataExtracted?.headerDisplay?.currencyDisplay ||
    ''
  ).toString();

const resolveGroupSortValue = (statement: StatementFilterItem, groupBy: string) => {
  switch (groupBy) {
    case 'date':
      return toDateOnly(resolveStatementDateValue(statement))?.getTime() ?? 0;
    case 'status':
      return (statement.status || '').toLowerCase();
    case 'type':
      return (statement.fileType || '').toLowerCase();
    case 'bank':
      return (statement.bankName || '').toLowerCase();
    case 'user':
      return (statement.user?.name || statement.user?.email || '').toLowerCase();
    case 'amount':
      return resolveStatementAmount(statement);
    default:
      return 0;
  }
};

const compareGroupValues = (a: unknown, b: unknown) => {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
};

export const DEFAULT_STATEMENT_FILTERS: StatementFilters = {
  type: null,
  statuses: [],
  date: null,
  from: [],
  to: [],
  keywords: '',
  amountMin: null,
  amountMax: null,
  limit: null,
  approved: null,
  billable: null,
  groupBy: null,
  has: [],
  currencies: [],
  exported: null,
  paid: null,
};

const cloneFilterValue = <K extends keyof StatementFilters>(
  value: StatementFilters[K],
): StatementFilters[K] => {
  if (Array.isArray(value)) {
    return [...value] as StatementFilters[K];
  }
  if (value && typeof value === 'object') {
    return { ...value } as StatementFilters[K];
  }
  return value;
};

export const resetSingleStatementFilter = <K extends keyof StatementFilters>(
  filters: StatementFilters,
  key: K,
): StatementFilters => {
  return {
    ...filters,
    [key]: cloneFilterValue(DEFAULT_STATEMENT_FILTERS[key]),
  };
};

export const STATEMENT_FILTERS_STORAGE_KEY = 'finflow-statement-filters';

export const loadStatementFilters = (): StatementFilters => {
  if (typeof window === 'undefined') return DEFAULT_STATEMENT_FILTERS;
  const raw = localStorage.getItem(STATEMENT_FILTERS_STORAGE_KEY);
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

export const saveStatementFilters = (filters: StatementFilters) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STATEMENT_FILTERS_STORAGE_KEY, JSON.stringify(filters));
};

export const applyStatementsFilters = <T extends StatementFilterItem>(
  statements: T[],
  filters: StatementFilters,
  now: Date = new Date(),
): T[] => {
  let result = [...statements];

  if (filters.type) {
    const typeValue = filters.type.toLowerCase();
    result = result.filter((statement) => (statement.fileType || '').toLowerCase() === typeValue);
  }

  if (filters.statuses.length > 0) {
    const normalized = filters.statuses.map((value) => value.toLowerCase());
    result = result.filter((statement) =>
      normalized.includes((statement.status || '').toLowerCase()),
    );
  }

  if (filters.approved !== null) {
    result = result.filter((statement) => {
      const status = (statement.status || '').toLowerCase();
      if (!status) return false;
      if (filters.approved) return APPROVED_STATUSES.has(status);
      return NOT_APPROVED_STATUSES.has(status);
    });
  }

  if (filters.billable !== null) {
    result = result.filter((statement) => {
      const amount = resolveStatementAmount(statement);
      return filters.billable ? amount > 0 : amount <= 0;
    });
  }

  if (filters.date) {
    const statementDateGetter = (statement: StatementFilterItem) =>
      toDateOnly(resolveStatementDateValue(statement));

    if (filters.date.preset) {
      const { start, end } = getPresetRange(filters.date.preset, now);
      result = result.filter((statement) => {
        const dateValue = statementDateGetter(statement);
        if (!dateValue) return false;
        return dateValue >= start && dateValue <= end;
      });
    } else if (filters.date.mode && filters.date.date) {
      const filterDate = toDateOnly(filters.date.date);
      if (filterDate) {
        result = result.filter((statement) => {
          const dateValue = statementDateGetter(statement);
          if (!dateValue) return false;
          if (filters.date?.mode === 'on') {
            return dateValue.getTime() === filterDate.getTime();
          }
          if (filters.date?.mode === 'after') {
            return dateValue.getTime() > filterDate.getTime();
          }
          return dateValue.getTime() < filterDate.getTime();
        });
      }
    }
  }

  if (filters.from.length > 0) {
    result = result.filter((statement) => filters.from.some((token) => matchesToken(token, statement)));
  }

  if (filters.to.length > 0) {
    result = result.filter((statement) => filters.to.some((token) => matchesToken(token, statement)));
  }

  if (filters.currencies.length > 0) {
    const normalized = filters.currencies.map((value) => value.toLowerCase());
    result = result.filter((statement) =>
      normalized.includes(resolveStatementCurrency(statement).toLowerCase()),
    );
  }

  if (filters.exported !== null) {
    result = result.filter((statement) =>
      filters.exported ? Boolean(statement.exported) : !statement.exported,
    );
  }

  if (filters.paid !== null) {
    result = result.filter((statement) =>
      filters.paid ? Boolean(statement.paid) : !statement.paid,
    );
  }

  if (filters.has.length > 0) {
    result = result.filter((statement) =>
      filters.has.every((token) => matchesHas(token, statement)),
    );
  }

  if (filters.keywords.trim()) {
    result = result.filter((statement) => matchesKeywords(statement, filters.keywords));
  }

  if (filters.amountMin !== null || filters.amountMax !== null) {
    result = result.filter((statement) => {
      const amount = resolveStatementAmount(statement);
      if (filters.amountMin !== null && amount < filters.amountMin) return false;
      if (filters.amountMax !== null && amount > filters.amountMax) return false;
      return true;
    });
  }

  if (filters.groupBy) {
    result = [...result].sort((a, b) => {
      const aValue = resolveGroupSortValue(a, filters.groupBy || '');
      const bValue = resolveGroupSortValue(b, filters.groupBy || '');
      return compareGroupValues(aValue, bValue);
    });
  }

  if (filters.limit !== null && Number.isFinite(filters.limit)) {
    result = result.slice(0, Math.max(0, filters.limit));
  }

  return result;
};
