/* eslint-disable max-lines */
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getNestedValue, resolveLabel } from '@/app/lib/side-panel-utils';
import { formatStoredDate } from '@/app/lib/user-format-store';
import { format as formatDate, isValid as isValidDate, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  DEFAULT_UNAPPROVED_QUEUE_FILTERS,
  type UnapprovedQueueFilterTarget,
  type UnapprovedQueueFilters,
  type UnapprovedQueueTransaction,
  type UnapprovedReasonId,
  type UnapprovedSource,
  type UnapprovedStatementMeta,
  type UnapprovedStatementQueueItem,
  buildUnapprovedStatementQueue,
  matchesUnapprovedFilters,
} from '../../unapproved-cash-utils';

const IGNORED_STORAGE_KEY = 'lumio-unapproved-cash-ignored';
const DATE_VALUE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type StatementApiItem = {
  id: string;
  fileName?: string | null;
  bankName?: string | null;
  status?: string | null;
  errorMessage?: string | null;
  fileType?: string | null;
  currency?: string | null;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  createdAt?: string | null;
  parsingDetails?: {
    importPreview?: {
      source?: string | null;
    } | null;
  } | null;
};

const normalizeToDateString = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  if (DATE_VALUE_REGEX.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toCalendarDate = (value?: string | null): Date | null => {
  const normalized = normalizeToDateString(value);
  if (!normalized) {
    return null;
  }
  try {
    const parsed = parseISO(normalized);
    return isValidDate(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const toFilterDateValue = (date: Date | null): string =>
  date && isValidDate(date) ? formatDate(date, 'yyyy-MM-dd') : '';

// eslint-disable-next-line complexity
const extractErrorMessage = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }
  const payload = error as {
    response?: { data?: { message?: string | string[]; error?: string } };
    message?: string;
  };
  const dataMessage = payload.response?.data?.message;
  if (Array.isArray(dataMessage)) {
    return dataMessage.filter(Boolean).join(', ');
  }
  if (typeof dataMessage === 'string' && dataMessage.trim()) {
    return dataMessage;
  }
  if (typeof payload.response?.data?.error === 'string' && payload.response.data.error.trim()) {
    return payload.response.data.error;
  }
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  return null;
};

// eslint-disable-next-line complexity
const fetchAllTransactions = async (): Promise<UnapprovedQueueTransaction[]> => {
  const all: UnapprovedQueueTransaction[] = [];
  const pageSize = 500;
  let page = 1;
  let total = Number.POSITIVE_INFINITY;
  while (all.length < total) {
    // eslint-disable-next-line no-await-in-loop
    const response = await apiClient.get('/transactions', { params: { page, limit: pageSize } });
    const payload = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
        ? response.data
        : [];
    all.push(...payload);
    total = Number(response.data?.total ?? all.length);
    if (payload.length < pageSize) {
      break;
    }
    page += 1;
  }
  return all;
};

// eslint-disable-next-line complexity
const fetchAllStatements = async (): Promise<StatementApiItem[]> => {
  const all: StatementApiItem[] = [];
  const pageSize = 500;
  let page = 1;
  let total = Number.POSITIVE_INFINITY;
  while (all.length < total) {
    // eslint-disable-next-line no-await-in-loop
    const response = await apiClient.get('/statements', { params: { page, limit: pageSize } });
    const payload = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
        ? response.data
        : [];
    all.push(...payload);
    total = Number(response.data?.total ?? all.length);
    if (payload.length < pageSize) {
      break;
    }
    page += 1;
  }
  return all;
};

const toStatementMeta = (statement: StatementApiItem): UnapprovedStatementMeta => ({
  id: statement.id,
  fileName: statement.fileName,
  bankName: statement.bankName,
  status: statement.status,
  errorMessage: statement.errorMessage,
  fileType: statement.fileType,
  currency: statement.currency,
  totalDebit: statement.totalDebit,
  totalCredit: statement.totalCredit,
  statementDateFrom: statement.statementDateFrom,
  statementDateTo: statement.statementDateTo,
  createdAt: statement.createdAt,
  sourceHint: statement.parsingDetails?.importPreview?.source ?? null,
});

const sortByNewestDate = (
  left: UnapprovedQueueFilterTarget,
  right: UnapprovedQueueFilterTarget,
): number => {
  const leftTime = left.date?.getTime() ?? 0;
  const rightTime = right.date?.getTime() ?? 0;
  return rightTime - leftTime;
};

const formatTemplate = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );

export interface UnapprovedCashViewModel {
  labels: ReturnType<typeof buildLabels>;
  reasonOptions: Array<{ id: UnapprovedReasonId; label: string }>;
  sourceOptions: Array<{ id: UnapprovedSource; label: string }>;
  reasonLabelById: Record<UnapprovedReasonId, string>;
  sourceLabelById: Record<UnapprovedSource, string>;
  queueItems: UnapprovedStatementQueueItem[];
  filters: UnapprovedQueueFilters;
  selectedIds: string[];
  ignoredIds: string[];
  loading: boolean;
  refreshing: boolean;
  filteredQueue: UnapprovedStatementQueueItem[];
  queueWithoutIgnored: UnapprovedStatementQueueItem[];
  visibleIds: string[];
  selectedCount: number;
  allVisibleSelected: boolean;
  reasonCounts: Record<UnapprovedReasonId, number>;
  workspaceCurrency: string;
  setFilters: (updater: (prev: UnapprovedQueueFilters) => UnapprovedQueueFilters) => void;
  setSelectedIds: (updater: (prev: string[]) => string[]) => void;
  resetFilters: () => void;
  toggleSelect: (id: string) => void;
  toggleSelectAllVisible: () => void;
  handleIgnoreSelected: () => void;
  handleReview: (item: UnapprovedStatementQueueItem) => void;
  loadQueueData: (silent?: boolean) => Promise<void>;
  formatItemAmount: (item: UnapprovedStatementQueueItem) => string;
  formatItemDate: (item: UnapprovedStatementQueueItem) => string;
  formatTemplate: typeof formatTemplate;
}

// eslint-disable-next-line max-lines-per-function
const buildLabels = ({
  t: T,
  tx,
}: { t: ReturnType<typeof useIntlayer>; tx: (path: string[], fallback: string) => string }): {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  filters: Record<string, string>;
  reasons: Record<string, string>;
  sources: Record<string, string>;
  summary: Record<string, string>;
  table: Record<string, string>;
  actions: Record<string, string>;
  empty: Record<string, string>;
  toasts: Record<string, string>;
} => ({
  title: tx(['unapprovedCash', 'title'], 'Unapproved cash'),
  subtitle: tx(
    ['unapprovedCash', 'subtitle'],
    'Review uploaded statements before they appear in reports and exports.',
  ),
  searchPlaceholder: tx(
    ['unapprovedCash', 'searchPlaceholder'],
    'Search file, bank, or transaction',
  ),
  filters: {
    reason: tx(['unapprovedCash', 'filters', 'reason'], 'Reason'),
    source: tx(['unapprovedCash', 'filters', 'source'], 'Source'),
    amountFrom: tx(['unapprovedCash', 'filters', 'amountFrom'], 'Amount from'),
    amountTo: tx(['unapprovedCash', 'filters', 'amountTo'], 'Amount to'),
    dateFrom: tx(['unapprovedCash', 'filters', 'dateFrom'], 'Date from'),
    dateTo: tx(['unapprovedCash', 'filters', 'dateTo'], 'Date to'),
    allReasons: tx(['unapprovedCash', 'filters', 'allReasons'], 'All reasons'),
    allSources: tx(['unapprovedCash', 'filters', 'allSources'], 'All sources'),
    reset: tx(['unapprovedCash', 'filters', 'reset'], 'Reset filters'),
  },
  reasons: {
    missingCategory: tx(['unapprovedCash', 'reasons', 'missingCategory'], 'Missing category'),
    duplicateDetected: tx(['unapprovedCash', 'reasons', 'duplicateDetected'], 'Duplicate detected'),
    unknownMerchant: tx(['unapprovedCash', 'reasons', 'unknownMerchant'], 'Unknown merchant'),
    missingType: tx(['unapprovedCash', 'reasons', 'missingType'], 'Missing type'),
    missingCurrency: tx(['unapprovedCash', 'reasons', 'missingCurrency'], 'Missing currency'),
    ocrIssues: tx(['unapprovedCash', 'reasons', 'ocrIssues'], 'OCR issues'),
    requiresConfirmation: tx(
      ['unapprovedCash', 'reasons', 'requiresConfirmation'],
      'Requires confirmation',
    ),
  },
  sources: {
    gmail: tx(['unapprovedCash', 'sources', 'gmail'], 'Gmail'),
    pdf: tx(['unapprovedCash', 'sources', 'pdf'], 'PDF'),
    bank: tx(['unapprovedCash', 'sources', 'bank'], 'Bank'),
    manual: tx(['unapprovedCash', 'sources', 'manual'], 'Manual'),
    unknown: tx(['unapprovedCash', 'sources', 'unknown'], 'Unknown'),
  },
  summary: {
    total: tx(['unapprovedCash', 'summary', 'total'], 'Total unapproved'),
    missingCategory: tx(['unapprovedCash', 'summary', 'missingCategory'], 'Missing category'),
    duplicates: tx(['unapprovedCash', 'summary', 'duplicates'], 'Duplicates'),
    confirmation: tx(['unapprovedCash', 'summary', 'confirmation'], 'Needs confirmation'),
  },
  table: {
    merchant: tx(['unapprovedCash', 'table', 'merchant'], 'Statement'),
    date: tx(['unapprovedCash', 'table', 'date'], 'Date'),
    amount: tx(['unapprovedCash', 'table', 'amount'], 'Amount'),
    reason: tx(['unapprovedCash', 'table', 'reason'], 'Reason'),
    source: tx(['unapprovedCash', 'table', 'source'], 'Source'),
    actions: tx(['unapprovedCash', 'table', 'actions'], 'Actions'),
  },
  actions: {
    selected: tx(['unapprovedCash', 'actions', 'selected'], 'Selected: {count}'),
    selectAllVisible: tx(['unapprovedCash', 'actions', 'selectAllVisible'], 'Select all visible'),
    clearSelection: tx(['unapprovedCash', 'actions', 'clearSelection'], 'Clear selection'),
    assignCategory: tx(['unapprovedCash', 'actions', 'assignCategory'], 'Assign category'),
    approveSelected: tx(['unapprovedCash', 'actions', 'approveSelected'], 'Approve selected'),
    mergeDuplicates: tx(['unapprovedCash', 'actions', 'mergeDuplicates'], 'Merge duplicates'),
    ignore: tx(['unapprovedCash', 'actions', 'ignore'], 'Ignore'),
    reviewFix: tx(['unapprovedCash', 'actions', 'reviewFix'], 'Review / Fix'),
    approve: tx(['unapprovedCash', 'actions', 'approve'], 'Approve'),
    refresh: tx(['unapprovedCash', 'actions', 'refresh'], 'Refresh'),
    applying: tx(['unapprovedCash', 'actions', 'applying'], 'Applying...'),
  },
  empty: {
    title: tx(['unapprovedCash', 'empty', 'title'], 'All clear'),
    description: tx(
      ['unapprovedCash', 'empty', 'description'],
      'No statement files need manual review for the selected filters.',
    ),
  },
  toasts: {
    loadFailed: tx(
      ['unapprovedCash', 'toasts', 'loadFailed'],
      'Failed to load unapproved cash queue',
    ),
    ignoreSuccess: tx(
      ['unapprovedCash', 'toasts', 'ignoreSuccess'],
      'Ignored {count} transaction(s)',
    ),
    reviewUnavailable: tx(
      ['unapprovedCash', 'toasts', 'reviewUnavailable'],
      'Review is unavailable for this transaction',
    ),
  },
});

// eslint-disable-next-line max-lines-per-function
export const useUnapprovedCashViewModel = (): UnapprovedCashViewModel => {
  const router = useRouter();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const t = useIntlayer('statementsPage');
  const workspaceCurrency = (currentWorkspace?.currency || 'KZT').toUpperCase();

  const tx = useCallback(
    (path: string[], fallback: string): string => resolveLabel(getNestedValue(t, path), fallback),
    [t],
  );

  const labels = useMemo(() => buildLabels({ t, tx }), [t, tx]);

  const reasonOptions = useMemo(
    () => [
      { id: 'missing-category' as UnapprovedReasonId, label: labels.reasons.missingCategory },
      { id: 'duplicate-detected' as UnapprovedReasonId, label: labels.reasons.duplicateDetected },
      { id: 'unknown-merchant' as UnapprovedReasonId, label: labels.reasons.unknownMerchant },
      { id: 'missing-type' as UnapprovedReasonId, label: labels.reasons.missingType },
      { id: 'missing-currency' as UnapprovedReasonId, label: labels.reasons.missingCurrency },
      { id: 'ocr-issues' as UnapprovedReasonId, label: labels.reasons.ocrIssues },
      {
        id: 'requires-confirmation' as UnapprovedReasonId,
        label: labels.reasons.requiresConfirmation,
      },
    ],
    [labels.reasons],
  );

  const sourceOptions = useMemo(
    () => [
      { id: 'gmail' as UnapprovedSource, label: labels.sources.gmail },
      { id: 'pdf' as UnapprovedSource, label: labels.sources.pdf },
      { id: 'bank' as UnapprovedSource, label: labels.sources.bank },
      { id: 'manual' as UnapprovedSource, label: labels.sources.manual },
      { id: 'unknown' as UnapprovedSource, label: labels.sources.unknown },
    ],
    [labels.sources],
  );

  const reasonLabelById = useMemo(
    (): Record<UnapprovedReasonId, string> => ({
      'missing-category': labels.reasons.missingCategory,
      'duplicate-detected': labels.reasons.duplicateDetected,
      'unknown-merchant': labels.reasons.unknownMerchant,
      'missing-type': labels.reasons.missingType,
      'missing-currency': labels.reasons.missingCurrency,
      'ocr-issues': labels.reasons.ocrIssues,
      'requires-confirmation': labels.reasons.requiresConfirmation,
    }),
    [labels.reasons],
  );

  const sourceLabelById = useMemo(
    (): Record<UnapprovedSource, string> => ({
      gmail: labels.sources.gmail,
      pdf: labels.sources.pdf,
      bank: labels.sources.bank,
      manual: labels.sources.manual,
      unknown: labels.sources.unknown,
    }),
    [labels.sources],
  );

  const [queueItems, setQueueItems] = useState<UnapprovedStatementQueueItem[]>([]);
  const [filters, setFilters] = useState<UnapprovedQueueFilters>(DEFAULT_UNAPPROVED_QUEUE_FILTERS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const raw = localStorage.getItem(IGNORED_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setIgnoredIds(parsed.filter((v): v is string => typeof v === 'string'));
      }
    } catch {
      setIgnoredIds([]);
    }
  }, []);

  const persistIgnoredIds = useCallback((ids: string[]): void => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(IGNORED_STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const loadQueueData = useCallback(
    // eslint-disable-next-line complexity
    async (silent = false): Promise<void> => {
      if (!user) {
        setQueueItems([]);
        setLoading(false);
        return;
      }
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const [transactions, statements] = await Promise.all([
          fetchAllTransactions(),
          fetchAllStatements(),
        ]);
        const nextQueue = buildUnapprovedStatementQueue({
          statements: statements.map(toStatementMeta),
          transactions,
        }).sort(sortByNewestDate);
        setQueueItems(nextQueue);
      } catch (error) {
        toast.error(extractErrorMessage(error) || labels.toasts.loadFailed);
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [labels.toasts.loadFailed, user],
  );

  useEffect(() => {
    void loadQueueData(false);
  }, [loadQueueData]);

  const ignoredSet = useMemo(() => new Set(ignoredIds), [ignoredIds]);

  const queueWithoutIgnored = useMemo(
    () => queueItems.filter(item => !ignoredSet.has(item.id)),
    [ignoredSet, queueItems],
  );

  const filteredQueue = useMemo(
    () => queueWithoutIgnored.filter(item => matchesUnapprovedFilters(item, filters)),
    [filters, queueWithoutIgnored],
  );

  useEffect(() => {
    const availableIds = new Set(queueWithoutIgnored.map(item => item.id));
    setSelectedIds(prev => prev.filter(id => availableIds.has(id)));
  }, [queueWithoutIgnored]);

  const visibleIds = useMemo(() => filteredQueue.map(item => item.id), [filteredQueue]);
  const selectedCount = selectedIds.length;
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

  const reasonCounts = useMemo((): Record<UnapprovedReasonId, number> => {
    const counts: Record<UnapprovedReasonId, number> = {
      'missing-category': 0,
      'duplicate-detected': 0,
      'unknown-merchant': 0,
      'missing-type': 0,
      'missing-currency': 0,
      'ocr-issues': 0,
      'requires-confirmation': 0,
    };
    queueWithoutIgnored.forEach(item => {
      item.reasons.forEach(reason => {
        counts[reason] += 1;
      });
    });
    return counts;
  }, [queueWithoutIgnored]);

  const resetFilters = (): void => {
    setFilters(() => DEFAULT_UNAPPROVED_QUEUE_FILTERS);
  };

  const toggleSelect = (transactionId: string): void => {
    setSelectedIds(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId],
    );
  };

  const toggleSelectAllVisible = (): void => {
    setSelectedIds(prev => {
      if (allVisibleSelected) {
        return prev.filter(id => !visibleIds.includes(id));
      }
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleIgnoreSelected = (): void => {
    if (selectedIds.length === 0) {
      return;
    }
    const nextIgnoredIds = Array.from(new Set([...ignoredIds, ...selectedIds]));
    setIgnoredIds(nextIgnoredIds);
    persistIgnoredIds(nextIgnoredIds);
    toast.success(formatTemplate(labels.toasts.ignoreSuccess, { count: selectedIds.length }));
    setSelectedIds(() => []);
  };

  const handleReview = (item: UnapprovedStatementQueueItem): void => {
    const statementId = item.statement.id;
    if (!statementId) {
      toast.error(labels.toasts.reviewUnavailable);
      return;
    }
    router.push(`/statements/${statementId}/edit`);
  };

  const formatItemAmount = (item: UnapprovedStatementQueueItem): string => {
    if (item.amount === null) {
      return '—';
    }
    const currency = (item.statement.currency || workspaceCurrency).toUpperCase();
    const value = new Intl.NumberFormat('ru', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(item.amount);
    return `${value} ${currency}`.trim();
  };

  const formatItemDate = (item: UnapprovedStatementQueueItem): string => {
    if (!item.date) {
      return '—';
    }
    return formatStoredDate(item.date);
  };

  return {
    labels,
    reasonOptions,
    sourceOptions,
    reasonLabelById,
    sourceLabelById,
    queueItems,
    filters,
    selectedIds,
    ignoredIds,
    loading,
    refreshing,
    filteredQueue,
    queueWithoutIgnored,
    visibleIds,
    selectedCount,
    allVisibleSelected,
    reasonCounts,
    workspaceCurrency,
    setFilters,
    setSelectedIds,
    resetFilters,
    toggleSelect,
    toggleSelectAllVisible,
    handleIgnoreSelected,
    handleReview,
    loadQueueData,
    formatItemAmount,
    formatItemDate,
    formatTemplate,
  };
};
