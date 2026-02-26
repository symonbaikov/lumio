export type UnapprovedReasonId =
  | 'missing-category'
  | 'duplicate-detected'
  | 'unknown-merchant'
  | 'missing-type'
  | 'missing-currency'
  | 'ocr-issues'
  | 'requires-confirmation';

export type UnapprovedSource = 'gmail' | 'pdf' | 'bank' | 'manual' | 'unknown';

export type UnapprovedQueueTransaction = {
  id: string;
  statementId?: string | null;
  counterpartyName?: string | null;
  transactionType?: string | null;
  currency?: string | null;
  isVerified?: boolean | null;
  isDuplicate?: boolean | null;
  duplicateOfId?: string | null;
  categoryId?: string | null;
  category?: {
    id?: string | null;
  } | null;
  transactionDate?: string | Date | null;
  amount?: number | string | null;
  debit?: number | string | null;
  credit?: number | string | null;
};

export type UnapprovedStatementMeta = {
  id: string;
  status?: string | null;
  errorMessage?: string | null;
  fileType?: string | null;
  sourceHint?: string | null;
};

export type UnapprovedQueueItem = {
  transaction: UnapprovedQueueTransaction;
  statement: UnapprovedStatementMeta | null;
  reasons: UnapprovedReasonId[];
  source: UnapprovedSource;
  amount: number | null;
  date: Date | null;
  searchBlob: string;
};

export type UnapprovedQueueFilters = {
  reasons: UnapprovedReasonId[];
  source: 'all' | UnapprovedSource;
  amountMin: number | null;
  amountMax: number | null;
  dateFrom: string;
  dateTo: string;
  search: string;
};

const UNKNOWN_MERCHANT_MARKERS = ['unknown', 'ambiguous', 'неизвест', 'без названия', 'n/a'];

const NUMERIC_FILE_TYPES = ['csv', 'xls', 'xlsx', 'ofx', 'qif'];

const isPresentId = (value?: string | null) => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized !== '' && normalized !== 'null' && normalized !== 'undefined' && normalized !== '0'
  );
};

const parseNumberish = (value?: number | string | null): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const normalized = typeof value === 'string' ? value.replace(',', '.').trim() : value;
  const parsed = typeof normalized === 'string' ? Number(normalized) : normalized;
  return Number.isFinite(parsed) ? Number(parsed) : null;
};

const resolveAmount = (transaction: UnapprovedQueueTransaction): number | null => {
  const explicitAmount = parseNumberish(transaction.amount);
  if (explicitAmount !== null) return Math.abs(explicitAmount);

  const debit = parseNumberish(transaction.debit);
  if (debit !== null && debit !== 0) return Math.abs(debit);

  const credit = parseNumberish(transaction.credit);
  if (credit !== null && credit !== 0) return Math.abs(credit);

  return null;
};

const resolveDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const hasUnknownMerchant = (counterpartyName?: string | null): boolean => {
  const normalized = (counterpartyName || '').trim().toLowerCase();
  if (!normalized) return true;
  return UNKNOWN_MERCHANT_MARKERS.some(marker => normalized.includes(marker));
};

const hasValidCurrency = (currency?: string | null): boolean => {
  const normalized = (currency || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized);
};

export const resolveUnapprovedSource = (
  statement?: UnapprovedStatementMeta | null,
): UnapprovedSource => {
  if (!statement) return 'unknown';

  const sourceHint = (statement.sourceHint || '').trim().toLowerCase();
  if (sourceHint.includes('gmail')) return 'gmail';
  if (sourceHint.includes('manual')) return 'manual';
  if (sourceHint.includes('pdf')) return 'pdf';
  if (sourceHint.includes('bank') || sourceHint.includes('statement')) return 'bank';

  const fileType = (statement.fileType || '').trim().toLowerCase();
  if (!fileType) return 'unknown';
  if (fileType.includes('pdf')) return 'pdf';
  if (NUMERIC_FILE_TYPES.some(type => fileType.includes(type))) return 'bank';

  return 'unknown';
};

export const resolveUnapprovedReasons = (
  transaction: UnapprovedQueueTransaction,
  statement?: UnapprovedStatementMeta | null,
): UnapprovedReasonId[] => {
  const reasons: UnapprovedReasonId[] = [];

  const hasCategory = isPresentId(transaction.categoryId) || isPresentId(transaction.category?.id);
  if (!hasCategory) {
    reasons.push('missing-category');
  }

  if (Boolean(transaction.isDuplicate) || isPresentId(transaction.duplicateOfId)) {
    reasons.push('duplicate-detected');
  }

  if (hasUnknownMerchant(transaction.counterpartyName)) {
    reasons.push('unknown-merchant');
  }

  if (!(transaction.transactionType || '').trim()) {
    reasons.push('missing-type');
  }

  if (!hasValidCurrency(transaction.currency)) {
    reasons.push('missing-currency');
  }

  const statementStatus = (statement?.status || '').trim().toLowerCase();
  if (statementStatus === 'error' || Boolean(statement?.errorMessage)) {
    reasons.push('ocr-issues');
  }

  if (!transaction.isVerified) {
    reasons.push('requires-confirmation');
  }

  return Array.from(new Set(reasons));
};

export const buildUnapprovedQueueItem = (
  transaction: UnapprovedQueueTransaction,
  statement?: UnapprovedStatementMeta | null,
): UnapprovedQueueItem => {
  const reasons = resolveUnapprovedReasons(transaction, statement);
  const source = resolveUnapprovedSource(statement);
  const amount = resolveAmount(transaction);
  const date = resolveDate(transaction.transactionDate);
  const searchBlob = [
    transaction.id,
    transaction.counterpartyName,
    transaction.transactionType,
    transaction.currency,
    transaction.statementId,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    transaction,
    statement: statement ?? null,
    reasons,
    source,
    amount,
    date,
    searchBlob,
  };
};

const startOfDay = (dateValue: string): Date | null => {
  if (!dateValue) return null;
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const endOfDay = (dateValue: string): Date | null => {
  if (!dateValue) return null;
  const date = new Date(`${dateValue}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const matchesUnapprovedFilters = (
  item: UnapprovedQueueItem,
  filters: UnapprovedQueueFilters,
): boolean => {
  if (filters.reasons.length > 0) {
    const hasReason = filters.reasons.some(reason => item.reasons.includes(reason));
    if (!hasReason) return false;
  }

  if (filters.source !== 'all' && item.source !== filters.source) {
    return false;
  }

  if (filters.amountMin !== null) {
    if (item.amount === null || item.amount < filters.amountMin) {
      return false;
    }
  }

  if (filters.amountMax !== null) {
    if (item.amount === null || item.amount > filters.amountMax) {
      return false;
    }
  }

  const fromDate = startOfDay(filters.dateFrom);
  if (fromDate) {
    if (!item.date || item.date < fromDate) {
      return false;
    }
  }

  const toDate = endOfDay(filters.dateTo);
  if (toDate) {
    if (!item.date || item.date > toDate) {
      return false;
    }
  }

  const searchValue = filters.search.trim().toLowerCase();
  if (searchValue && !item.searchBlob.includes(searchValue)) {
    return false;
  }

  return true;
};

export const DEFAULT_UNAPPROVED_QUEUE_FILTERS: UnapprovedQueueFilters = {
  reasons: [],
  source: 'all',
  amountMin: null,
  amountMax: null,
  dateFrom: '',
  dateTo: '',
  search: '',
};
