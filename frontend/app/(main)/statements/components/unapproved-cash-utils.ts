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
  fileName?: string | null;
  bankName?: string | null;
  currency?: string | null;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  statementDateFrom?: string | Date | null;
  statementDateTo?: string | Date | null;
  createdAt?: string | Date | null;
};

export type UnapprovedQueueFilterTarget = {
  reasons: UnapprovedReasonId[];
  source: UnapprovedSource;
  amount: number | null;
  date: Date | null;
  searchBlob: string;
};

export type UnapprovedQueueItem = UnapprovedQueueFilterTarget & {
  transaction: UnapprovedQueueTransaction;
  statement: UnapprovedStatementMeta | null;
};

export type UnapprovedStatementQueueItem = UnapprovedQueueFilterTarget & {
  id: string;
  statement: UnapprovedStatementMeta;
  transactionIds: string[];
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
const PENDING_CONFIRMATION_STATUSES = ['uploaded', 'parsed', 'validated'];

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

const resolveStatementAmount = (statement: UnapprovedStatementMeta): number | null => {
  const totalDebit = parseNumberish(statement.totalDebit);
  if (totalDebit !== null && totalDebit !== 0) return Math.abs(totalDebit);

  const totalCredit = parseNumberish(statement.totalCredit);
  if (totalCredit !== null && totalCredit !== 0) return Math.abs(totalCredit);

  return totalDebit !== null
    ? Math.abs(totalDebit)
    : totalCredit !== null
      ? Math.abs(totalCredit)
      : null;
};

const resolveStatementDate = (statement: UnapprovedStatementMeta): Date | null =>
  resolveDate(statement.statementDateTo || statement.statementDateFrom || statement.createdAt);

const normalizeStatementStatus = (status?: string | null) => (status || '').trim().toLowerCase();

const isPendingConfirmationStatement = (statement?: UnapprovedStatementMeta | null) =>
  PENDING_CONFIRMATION_STATUSES.includes(normalizeStatementStatus(statement?.status));

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

export const buildUnapprovedStatementQueue = ({
  statements,
  transactions,
}: {
  statements: UnapprovedStatementMeta[];
  transactions: UnapprovedQueueTransaction[];
}): UnapprovedStatementQueueItem[] => {
  const transactionsByStatementId = new Map<string, UnapprovedQueueTransaction[]>();

  transactions.forEach(transaction => {
    if (!transaction.statementId) return;
    const items = transactionsByStatementId.get(transaction.statementId) || [];
    items.push(transaction);
    transactionsByStatementId.set(transaction.statementId, items);
  });

  return statements
    .map(statement => {
      const relatedTransactions = transactionsByStatementId.get(statement.id) || [];
      const reasons = new Set<UnapprovedReasonId>();

      relatedTransactions.forEach(transaction => {
        resolveUnapprovedReasons(transaction, statement).forEach(reason => {
          reasons.add(reason);
        });
      });

      if (normalizeStatementStatus(statement.status) === 'error' || statement.errorMessage) {
        reasons.add('ocr-issues');
      }

      if (isPendingConfirmationStatement(statement)) {
        reasons.add('requires-confirmation');
      }

      const searchBlob = [
        statement.id,
        statement.fileName,
        statement.bankName,
        statement.currency,
        ...relatedTransactions.map(transaction => transaction.counterpartyName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return {
        id: statement.id,
        statement,
        transactionIds: relatedTransactions.map(transaction => transaction.id),
        reasons: Array.from(reasons),
        source: resolveUnapprovedSource(statement),
        amount: resolveStatementAmount(statement),
        date: resolveStatementDate(statement),
        searchBlob,
      } satisfies UnapprovedStatementQueueItem;
    })
    .filter(item => item.reasons.length > 0);
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
  item: UnapprovedQueueFilterTarget,
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
