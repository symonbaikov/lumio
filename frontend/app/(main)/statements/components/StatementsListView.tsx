'use client';

import CreateExpenseDrawer from '@/app/(main)/statements/components/CreateExpenseDrawer';
import { ColumnsDrawer } from '@/app/(main)/statements/components/columns/ColumnsDrawer';
import {
  DEFAULT_STATEMENT_COLUMNS,
  type StatementColumn,
  type StatementColumnId,
  loadStatementColumns,
  reorderStatementColumns,
  saveStatementColumns,
} from '@/app/(main)/statements/components/columns/statement-columns';
import { DateFilterDropdown } from '@/app/(main)/statements/components/filters/DateFilterDropdown';
import { FiltersDrawer } from '@/app/(main)/statements/components/filters/FiltersDrawer';
import { FromFilterDropdown } from '@/app/(main)/statements/components/filters/FromFilterDropdown';
import { StatusFilterDropdown } from '@/app/(main)/statements/components/filters/StatusFilterDropdown';
import { TypeFilterDropdown } from '@/app/(main)/statements/components/filters/TypeFilterDropdown';
import {
  DEFAULT_STATEMENT_FILTERS,
  type StatementFilters,
  applyStatementsFilters,
  loadStatementFilters,
  resetSingleStatementFilter,
  saveStatementFilters,
} from '@/app/(main)/statements/components/filters/statement-filters';
import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { PDFPreviewModal } from '@/app/components/PDFPreviewModal';
import { Checkbox } from '@/app/components/ui/checkbox';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import { AppPagination } from '@/app/components/ui/pagination';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';
import apiClient, { gmailReceiptsApi } from '@/app/lib/api';
import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';
import { type StatementCategoryNode } from '@/app/lib/statement-categories';
import {
  type ManualExpenseDraft,
  type OpenExpenseDrawerEventDetail,
  STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT,
  type StatementExpenseMode,
  type TaxRateOption,
  resolveExpenseDrawerMode,
} from '@/app/lib/statement-expense-drawer';
import {
  areAllVisibleSelected,
  toggleSelectAllVisible,
  toggleStatementSelection,
} from '@/app/lib/statement-selection';
import {
  getStatementDisplayMerchant,
  getStatementMerchantLabel,
  hasProcessingStatements,
  isManualExpenseStatement,
} from '@/app/lib/statement-status';
import {
  type GmailSyncSkeletonMeta,
  STATEMENTS_GMAIL_SYNC_EVENT,
  STATEMENTS_GMAIL_SYNC_STORAGE_KEY,
} from '@/app/lib/statement-upload-actions';
import { type StatementStage, getStatementStage } from '@/app/lib/statement-workflow';
import { resolveBankLogo } from '@bank-logos';
import Skeleton from '@mui/material/Skeleton';
import {
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Columns2,
  Copy,
  Download,
  File,
  GitMerge,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { StatementsListItem } from './StatementsListItem';
import {
  type GmailReceipt,
  hasGmailReceiptAmount,
  mapGmailReceiptsToStatements,
} from './gmail-receipt-mapping';

interface Statement {
  id: string;
  source?: 'statement' | 'gmail';
  fileName: string;
  subject?: string;
  sender?: string;
  status: string;
  totalTransactions: number;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  exported?: boolean | null;
  paid?: boolean | null;
  createdAt: string;
  processedAt?: string;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  bankName: string;
  fileType: string;
  currency?: string | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  errorMessage?: string | null;
  parsingDetails?: {
    logEntries?: Array<{ timestamp: string; level: string; message: string }>;
    detectedBy?: string;
    parserUsed?: string;
    importPreview?: {
      source?: string;
      merchant?: string;
      attachments?: number;
    };
    metadataExtracted?: {
      currency?: string;
      headerDisplay?: {
        currencyDisplay?: string;
      };
    };
  };
  gmailMessageId?: string;
  receivedAt?: string;
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
  };
}

type UnifiedStatement = Statement;

type DuplicateRole = 'primary' | 'suspected';

type DuplicateGroupTone = 'sky' | 'blue' | 'indigo' | 'slate' | 'zinc' | 'stone';

type DuplicateMeta = {
  position: number;
  total: number;
  role: DuplicateRole;
  reason: string;
  groupKey: string;
  groupLabel: string;
  groupTone: DuplicateGroupTone;
  primaryId: string;
};

type DuplicateOverrideState = 'duplicate' | 'not_duplicate';

type StatementCategoryWithEnabled = StatementCategoryNode & {
  isEnabled?: boolean;
  children?: StatementCategoryWithEnabled[];
};

const filterEnabledCategories = (
  categories: StatementCategoryWithEnabled[],
): StatementCategoryNode[] => {
  return categories
    .filter(category => category.isEnabled !== false)
    .map(category => ({
      id: category.id,
      name: category.name,
      children: category.children ? filterEnabledCategories(category.children) : undefined,
    }));
};

const getBankDisplayName = (bankName: string) => {
  const resolved = resolveBankLogo(bankName);
  if (!resolved) return bankName;
  return resolved.key !== 'other' ? resolved.displayName : bankName;
};

const resolveStatementCurrency = (statement: Statement) =>
  (
    statement.parsedData?.currency ||
    statement.currency ||
    statement.parsingDetails?.metadataExtracted?.currency ||
    statement.parsingDetails?.metadataExtracted?.headerDisplay?.currencyDisplay ||
    ''
  ).toString();

const parseAmountValue = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

const formatStatementAmount = (statement: Statement) => {
  if (statement.source === 'gmail') {
    const amount = parseAmountValue(statement.parsedData?.amount ?? null);
    if (amount === null) {
      return '-';
    }
    const currency = resolveStatementCurrency(statement);
    const formatted = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formatted}${currency || ''}`;
  }

  const debit = parseAmountValue(statement.totalDebit);
  const credit = parseAmountValue(statement.totalCredit);
  const rawAmount = (debit && debit > 0 ? debit : credit && credit > 0 ? credit : 0) || 0;
  const currency = resolveStatementCurrency(statement);
  const formatted =
    rawAmount === 0
      ? '0'
      : new Intl.NumberFormat(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(rawAmount);
  return `${formatted}${currency || ''}`;
};

const formatStatementDate = (statement: Statement) => {
  const dateValue =
    statement.source === 'gmail'
      ? statement.parsedData?.date || statement.receivedAt || statement.createdAt
      : statement.statementDateTo || statement.statementDateFrom || statement.createdAt || '';
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const resolveStatementSortDate = (statement: Statement) => {
  const dateValue =
    statement.source === 'gmail'
      ? statement.parsedData?.date || statement.receivedAt || statement.createdAt
      : statement.statementDateTo || statement.statementDateFrom || statement.createdAt || '';
  const date = dateValue ? new Date(dateValue) : null;
  if (!date || Number.isNaN(date.getTime())) return 0;
  return date.getTime();
};

const toDuplicateGroupLabel = (index: number) => {
  let current = index + 1;
  let label = '';

  while (current > 0) {
    const code = (current - 1) % 26;
    label = String.fromCharCode(65 + code) + label;
    current = Math.floor((current - 1) / 26);
  }

  return `Group ${label}`;
};

const DUPLICATE_GROUP_TONES: DuplicateGroupTone[] = [
  'sky',
  'blue',
  'indigo',
  'slate',
  'zinc',
  'stone',
];

const isGmailReceiptProcessing = (statement: Statement) => {
  if (statement.source !== 'gmail') return false;
  const status = (statement.status || '').toLowerCase();
  return status === 'new' || status === 'processing';
};

type Props = {
  stage: StatementStage;
};

export default function StatementsListView({ stage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const isMobile = useIsMobile();
  const t = useIntlayer('statementsPage');
  const PAGE_SIZE = 30;
  const [statements, setStatements] = useState<Statement[]>([]);
  const [gmailReceipts, setGmailReceipts] = useState<GmailReceipt[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailSyncSkeletonKeys, setGmailSyncSkeletonKeys] = useState<string[]>([]);
  const statementsRef = useRef<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [expenseDrawerMode, setExpenseDrawerMode] = useState<StatementExpenseMode>('scan');
  const [manualExpenseCategories, setManualExpenseCategories] = useState<StatementCategoryNode[]>(
    [],
  );
  const [manualExpenseTaxRates, setManualExpenseTaxRates] = useState<TaxRateOption[]>([]);
  const resolveLabel = (value: any, fallback: string) => value?.value ?? value ?? fallback;
  const searchPlaceholder = resolveLabel(t.searchPlaceholder, 'Поиск по выпискам');
  const filterLabels = {
    type: resolveLabel(t.filters?.type, 'Тип'),
    status: resolveLabel(t.filters?.status, 'Статус'),
    date: resolveLabel(t.filters?.date, 'Дата'),
    from: resolveLabel(t.filters?.from, 'От'),
    filters: resolveLabel(t.filters?.filters, 'Фильтры'),
    columns: resolveLabel(t.filters?.columns, 'Колонки'),
  };
  const listHeaderLabels = {
    receipt: resolveLabel(t.listHeader?.receipt, 'Receipt'),
    type: resolveLabel(t.listHeader?.type, 'Type'),
    date: resolveLabel(t.listHeader?.date, 'Date'),
    merchant: resolveLabel(t.listHeader?.merchant, 'Merchant'),
    amount: resolveLabel(t.listHeader?.amount, 'Amount'),
    action: resolveLabel(t.listHeader?.action, 'Action'),
    scanning: resolveLabel(t.listHeader?.scanning, 'Scanning...'),
  };
  const viewLabel = resolveLabel(t.actions?.view, 'View');
  const reviewDuplicateLabel = resolveLabel((t.actions as any)?.reviewDuplicate, 'Review');
  const markDuplicateLabel = resolveLabel((t.actions as any)?.markDuplicate, 'Mark as duplicate');
  const markNotDuplicateLabel = resolveLabel(
    (t.actions as any)?.markNotDuplicate,
    'Mark as not duplicate',
  );
  const dismissDuplicateLabel = resolveLabel(
    (t.actions as any)?.dismissDuplicate,
    markNotDuplicateLabel || 'Dismiss',
  );
  const mergeDuplicatesLabel = resolveLabel(
    (t.actions as any)?.mergeDuplicates,
    'Merge duplicates',
  );
  const selectDuplicatesLabel = resolveLabel(
    (t.actions as any)?.selectDuplicates,
    'Select duplicates',
  );
  const emptyLabels = {
    title: resolveLabel(t.empty?.title, 'No statements yet'),
    description: resolveLabel(t.empty?.description, 'Upload your first statement to get started'),
  };
  const paginationLabels = {
    shown: resolveLabel((t as any)?.pagination?.shown, 'Showing {from}–{to} of {count}'),
    previous: resolveLabel((t as any)?.pagination?.previous, 'Previous'),
    next: resolveLabel((t as any)?.pagination?.next, 'Next'),
    pageOf: resolveLabel((t as any)?.pagination?.pageOf, 'Page {page} of {count}'),
  };
  const filterLinkClassName =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-medium text-primary';
  const formatPaginationLabel = (template: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce(
      (result, [key, value]) => result.replace(`{${key}}`, String(value)),
      template,
    );

  useLockBodyScroll(expenseDrawerOpen);
  const totalPagesCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, page * pageSize);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [previewSource, setPreviewSource] = useState<'statement' | 'gmail'>('statement');
  const [previewAllowAttachFile, setPreviewAllowAttachFile] = useState(false);
  const [selectedStatementIds, setSelectedStatementIds] = useState<string[]>([]);
  const [duplicateOverrides, setDuplicateOverrides] = useState<
    Record<string, DuplicateOverrideState>
  >({});
  const [selectedActionsOpen, setSelectedActionsOpen] = useState(false);
  const selectedActionsRef = useRef<HTMLDivElement | null>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);

  const [draftFilters, setDraftFilters] = useState<StatementFilters>(DEFAULT_STATEMENT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<StatementFilters>(DEFAULT_STATEMENT_FILTERS);
  const [filtersDrawerScreen, setFiltersDrawerScreen] = useState('root');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [columnsDrawerOpen, setColumnsDrawerOpen] = useState(false);
  const [columns, setColumns] = useState<StatementColumn[]>(DEFAULT_STATEMENT_COLUMNS);
  const [draftColumns, setDraftColumns] = useState<StatementColumn[]>(DEFAULT_STATEMENT_COLUMNS);
  const shouldPollStatements = useMemo(() => hasProcessingStatements(statements), [statements]);
  const hasGmailReceipts = useMemo(() => gmailReceipts.length > 0, [gmailReceipts]);

  const filterOptionLabels = {
    apply: resolveLabel((t.filters as any)?.apply, 'Apply'),
    reset: resolveLabel((t.filters as any)?.reset, 'Reset'),
    resetFilters: resolveLabel((t.filters as any)?.resetFilters, 'Reset filters'),
    viewResults: resolveLabel((t.filters as any)?.viewResults, 'View results'),
    save: resolveLabel((t.filters as any)?.save, 'Save'),
    saveSearch: resolveLabel((t.filters as any)?.saveSearch, 'Save search'),
    any: resolveLabel((t.filters as any)?.any, 'Any'),
    yes: resolveLabel((t.filters as any)?.yes, 'Yes'),
    no: resolveLabel((t.filters as any)?.no, 'No'),
    typeExpense: resolveLabel((t.filters as any)?.typeExpense, 'Expense'),
    typeReport: resolveLabel((t.filters as any)?.typeReport, 'Expense Report'),
    typeChat: resolveLabel((t.filters as any)?.typeChat, 'Chat'),
    typeTrip: resolveLabel((t.filters as any)?.typeTrip, 'Trip'),
    typeTask: resolveLabel((t.filters as any)?.typeTask, 'Task'),
    statusUnreported: resolveLabel((t.filters as any)?.statusUnreported, 'Unreported'),
    statusDraft: resolveLabel((t.filters as any)?.statusDraft, 'Draft'),
    statusOutstanding: resolveLabel((t.filters as any)?.statusOutstanding, 'Outstanding'),
    statusApproved: resolveLabel((t.filters as any)?.statusApproved, 'Approved'),
    statusPaid: resolveLabel((t.filters as any)?.statusPaid, 'Paid'),
    statusDone: resolveLabel((t.filters as any)?.statusDone, 'Done'),
    dateThisMonth: resolveLabel((t.filters as any)?.dateThisMonth, 'This month'),
    dateLastMonth: resolveLabel((t.filters as any)?.dateLastMonth, 'Last month'),
    dateYearToDate: resolveLabel((t.filters as any)?.dateYearToDate, 'Year to date'),
    dateOn: resolveLabel((t.filters as any)?.dateOn, 'On'),
    dateAfter: resolveLabel((t.filters as any)?.dateAfter, 'After'),
    dateBefore: resolveLabel((t.filters as any)?.dateBefore, 'Before'),
    drawerTitle: resolveLabel((t.filters as any)?.drawerTitle, 'Filters'),
    drawerGeneral: resolveLabel((t.filters as any)?.drawerGeneral, 'General'),
    drawerExpenses: resolveLabel((t.filters as any)?.drawerExpenses, 'Expenses'),
    drawerReports: resolveLabel((t.filters as any)?.drawerReports, 'Reports'),
    drawerGroupBy: resolveLabel((t.filters as any)?.drawerGroupBy, 'Group by'),
    drawerHas: resolveLabel((t.filters as any)?.drawerHas, 'Has'),
    drawerKeywords: resolveLabel((t.filters as any)?.drawerKeywords, 'Keywords'),
    drawerLimit: resolveLabel((t.filters as any)?.drawerLimit, 'Limit'),
    drawerTo: resolveLabel((t.filters as any)?.drawerTo, 'To'),
    drawerAmount: resolveLabel((t.filters as any)?.drawerAmount, 'Amount'),
    drawerApproved: resolveLabel((t.filters as any)?.drawerApproved, 'Approved'),
    drawerBillable: resolveLabel((t.filters as any)?.drawerBillable, 'Billable'),
    groupByDate: resolveLabel((t.filters as any)?.groupByDate, 'Date'),
    groupByStatus: resolveLabel((t.filters as any)?.groupByStatus, 'Status'),
    groupByType: resolveLabel((t.filters as any)?.groupByType, 'Type'),
    groupByBank: resolveLabel((t.filters as any)?.groupByBank, 'Bank'),
    groupByUser: resolveLabel((t.filters as any)?.groupByUser, 'User'),
    groupByAmount: resolveLabel((t.filters as any)?.groupByAmount, 'Amount'),
    hasErrors: resolveLabel((t.filters as any)?.hasErrors, 'Errors'),
    hasLogs: resolveLabel((t.filters as any)?.hasLogs, 'Logs'),
    hasTransactions: resolveLabel((t.filters as any)?.hasTransactions, 'Transactions'),
    hasDateRange: resolveLabel((t.filters as any)?.hasDateRange, 'Date range'),
    hasCurrency: resolveLabel((t.filters as any)?.hasCurrency, 'Currency'),
    columnReceipt: resolveLabel((t.filters as any)?.columnReceipt, 'Receipt'),
    columnDate: resolveLabel((t.filters as any)?.columnDate, 'Date'),
    columnMerchant: resolveLabel((t.filters as any)?.columnMerchant, 'Merchant'),
    columnFrom: resolveLabel((t.filters as any)?.columnFrom, 'From'),
    columnTo: resolveLabel((t.filters as any)?.columnTo, 'To'),
    columnCategory: resolveLabel((t.filters as any)?.columnCategory, 'Category'),
    columnTag: resolveLabel((t.filters as any)?.columnTag, 'Tag'),
    columnAmount: resolveLabel((t.filters as any)?.columnAmount, 'Amount'),
    columnAction: resolveLabel((t.filters as any)?.columnAction, 'Action'),
    columnApproved: resolveLabel((t.filters as any)?.columnApproved, 'Approved'),
    columnBillable: resolveLabel((t.filters as any)?.columnBillable, 'Billable'),
    columnCard: resolveLabel((t.filters as any)?.columnCard, 'Card'),
    columnDescription: resolveLabel((t.filters as any)?.columnDescription, 'Description'),
    columnExchangeRate: resolveLabel((t.filters as any)?.columnExchangeRate, 'Exchange rate'),
    columnExported: resolveLabel((t.filters as any)?.columnExported, 'Exported'),
    columnExportedTo: resolveLabel((t.filters as any)?.columnExportedTo, 'Exported to'),
    columnsTitle: resolveLabel((t.filters as any)?.columnsTitle, 'Columns'),
  };

  const typeOptions = [
    { value: 'expense', label: filterOptionLabels.typeExpense },
    { value: 'expense_report', label: filterOptionLabels.typeReport },
    { value: 'chat', label: filterOptionLabels.typeChat },
    { value: 'trip', label: filterOptionLabels.typeTrip },
    { value: 'task', label: filterOptionLabels.typeTask },
    { value: 'gmail', label: 'Gmail' },
    { value: 'pdf', label: 'PDF' },
    { value: 'xlsx', label: 'Excel' },
    { value: 'csv', label: 'CSV' },
    { value: 'image', label: 'Image' },
  ];

  const statusOptions = [
    { value: 'unreported', label: filterOptionLabels.statusUnreported },
    { value: 'draft', label: filterOptionLabels.statusDraft },
    { value: 'outstanding', label: filterOptionLabels.statusOutstanding },
    { value: 'approved', label: filterOptionLabels.statusApproved },
    { value: 'paid', label: filterOptionLabels.statusPaid },
    { value: 'done', label: filterOptionLabels.statusDone },
  ];

  const datePresets = [
    { value: 'thisMonth' as const, label: filterOptionLabels.dateThisMonth },
    { value: 'lastMonth' as const, label: filterOptionLabels.dateLastMonth },
    { value: 'yearToDate' as const, label: filterOptionLabels.dateYearToDate },
  ];

  const dateModes = [
    { value: 'on' as const, label: filterOptionLabels.dateOn },
    { value: 'after' as const, label: filterOptionLabels.dateAfter },
    { value: 'before' as const, label: filterOptionLabels.dateBefore },
  ];

  const groupByOptions = [
    { value: 'date', label: filterOptionLabels.groupByDate },
    { value: 'status', label: filterOptionLabels.groupByStatus },
    { value: 'type', label: filterOptionLabels.groupByType },
    { value: 'bank', label: filterOptionLabels.groupByBank },
    { value: 'user', label: filterOptionLabels.groupByUser },
    { value: 'amount', label: filterOptionLabels.groupByAmount },
  ];

  const hasOptions = [
    { value: 'errors', label: filterOptionLabels.hasErrors },
    { value: 'processingDetails', label: filterOptionLabels.hasLogs },
    { value: 'transactions', label: filterOptionLabels.hasTransactions },
    { value: 'dateRange', label: filterOptionLabels.hasDateRange },
    { value: 'currency', label: filterOptionLabels.hasCurrency },
  ];

  const columnLabels = {
    receipt: filterOptionLabels.columnReceipt,
    date: filterOptionLabels.columnDate,
    merchant: filterOptionLabels.columnMerchant,
    from: filterOptionLabels.columnFrom,
    to: filterOptionLabels.columnTo,
    category: filterOptionLabels.columnCategory,
    tag: filterOptionLabels.columnTag,
    amount: filterOptionLabels.columnAmount,
    action: filterOptionLabels.columnAction,
    approved: filterOptionLabels.columnApproved,
    billable: filterOptionLabels.columnBillable,
    card: filterOptionLabels.columnCard,
    description: filterOptionLabels.columnDescription,
    exchangeRate: filterOptionLabels.columnExchangeRate,
    exported: filterOptionLabels.columnExported,
    exportedTo: filterOptionLabels.columnExportedTo,
  };

  const columnsWithLabels = useMemo(() => {
    return draftColumns.map(column => ({
      ...column,
      label: columnLabels[column.id] ?? column.label,
    }));
  }, [draftColumns, columnLabels]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    statementsRef.current = statements;
  }, [statements]);

  const lastAutoOpenedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadStatements({ page, search });
    if (stage === 'submit') {
      loadGmailReceipts({ silent: true, showErrorToast: false });
    }
  }, [user, page, search]);

  const buildGmailSyncSkeletonKeys = (count: number) => {
    return Array.from({ length: count }, (_, index) => `gmail-sync-${Date.now()}-${index}`);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || stage !== 'submit') return;
    const raw = sessionStorage.getItem(STATEMENTS_GMAIL_SYNC_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as GmailSyncSkeletonMeta | null;
      if (parsed && parsed.count > 0) {
        const nextCount = Math.min(parsed.count, PAGE_SIZE);
        setGmailSyncSkeletonKeys(buildGmailSyncSkeletonKeys(nextCount));
      }
    } catch {
      sessionStorage.removeItem(STATEMENTS_GMAIL_SYNC_STORAGE_KEY);
    }
  }, [stage]);

  useEffect(() => {
    if (!user) return;
    loadManualExpenseOptions();
  }, [user]);

  useEffect(() => {
    const storedFilters = loadStatementFilters();
    setDraftFilters(storedFilters);
    setAppliedFilters(storedFilters);
    const storedColumns = loadStatementColumns();
    setColumns(storedColumns);
    setDraftColumns(storedColumns);
  }, []);

  const filteredStatements = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return statements;
    return statements.filter(stmt => stmt.fileName.toLowerCase().includes(query));
  }, [searchInput, statements]);

  const gmailStatements = useMemo<UnifiedStatement[]>(() => {
    if (stage !== 'submit') return [];
    return mapGmailReceiptsToStatements(gmailReceipts);
  }, [gmailReceipts, stage]);

  const stagedStatements = useMemo(() => {
    const baseStatements = filteredStatements.filter(statement => {
      const currentStage = getStatementStage(statement.id);
      return currentStage === stage;
    });

    if (stage !== 'submit') {
      return baseStatements;
    }

    const gmailFiltered = searchInput.trim()
      ? gmailStatements.filter(statement => {
          const query = searchInput.trim().toLowerCase();
          return (
            statement.fileName.toLowerCase().includes(query) ||
            (statement.subject || '').toLowerCase().includes(query) ||
            (statement.sender || '').toLowerCase().includes(query) ||
            (statement.parsedData?.vendor || '').toLowerCase().includes(query)
          );
        })
      : gmailStatements;

    return [...gmailFiltered, ...baseStatements].sort(
      (a, b) => resolveStatementSortDate(b) - resolveStatementSortDate(a),
    );
  }, [filteredStatements, stage, searchInput, gmailStatements]);

  const displayStatements = useMemo(() => {
    return applyStatementsFilters<Statement>(stagedStatements, appliedFilters);
  }, [stagedStatements, appliedFilters]);

  const duplicateMetaById = useMemo(() => {
    const duplicateGroups = new Map<
      string,
      Array<{
        statement: Statement;
        createdAtTimestamp: number;
      }>
    >();
    const duplicateReason = 'Same merchant · same date · same amount';
    const isKnownStatement = new Set(displayStatements.map(statement => statement.id));

    displayStatements.forEach(statement => {
      const isGmail = statement.source === 'gmail';
      const isProcessingGmail = isGmailReceiptProcessing(statement);
      const amountLabel = formatStatementAmount(statement);
      const override = duplicateOverrides[statement.id];

      if (override === 'not_duplicate') {
        return;
      }

      if (
        amountLabel === '-' ||
        amountLabel === '0' ||
        amountLabel === '0.00' ||
        isProcessingGmail ||
        statement.status === 'processing'
      ) {
        return;
      }

      const resolvedName = isGmail
        ? resolveGmailMerchantLabel({
            vendor: statement.parsedData?.vendor,
            sender: statement.sender,
            subject: statement.subject,
            fallback: statement.fileName,
          })
        : getStatementDisplayMerchant(statement, getBankDisplayName(statement.bankName));
      const merchantLabel = isGmail
        ? resolvedName
        : getStatementMerchantLabel(statement.status, resolvedName, listHeaderLabels.scanning);
      const dateLabel = formatStatementDate(statement);
      const signature = `${merchantLabel}::${amountLabel}::${dateLabel}`;
      const existingGroup = duplicateGroups.get(signature);
      const createdAtTimestamp = Number.isFinite(new Date(statement.createdAt).getTime())
        ? new Date(statement.createdAt).getTime()
        : Number.MAX_SAFE_INTEGER;

      if (existingGroup) {
        existingGroup.push({ statement, createdAtTimestamp });
      } else {
        duplicateGroups.set(signature, [{ statement, createdAtTimestamp }]);
      }
    });

    const metaById = new Map<string, DuplicateMeta>();

    let duplicateGroupOrder = 0;

    duplicateGroups.forEach((group, groupKey) => {
      if (group.length < 2) {
        return;
      }

      const sortedGroup = [...group].sort((a, b) => {
        if (a.createdAtTimestamp === b.createdAtTimestamp) {
          return a.statement.id.localeCompare(b.statement.id);
        }
        return a.createdAtTimestamp - b.createdAtTimestamp;
      });

      const primaryId = sortedGroup[0]?.statement.id || '';
      const groupLabel = toDuplicateGroupLabel(duplicateGroupOrder);
      const groupTone = DUPLICATE_GROUP_TONES[duplicateGroupOrder % DUPLICATE_GROUP_TONES.length];
      duplicateGroupOrder += 1;

      sortedGroup.forEach(({ statement }, index) => {
        metaById.set(statement.id, {
          position: index + 1,
          total: sortedGroup.length,
          role: index === 0 ? 'primary' : 'suspected',
          reason: duplicateReason,
          groupKey,
          groupLabel,
          groupTone,
          primaryId,
        });
      });
    });

    Object.entries(duplicateOverrides).forEach(([statementId, override]) => {
      if (override !== 'duplicate') {
        return;
      }

      if (!isKnownStatement.has(statementId) || metaById.has(statementId)) {
        return;
      }

      metaById.set(statementId, {
        position: 1,
        total: 1,
        role: 'suspected',
        reason: 'Marked manually as duplicate',
        groupKey: `manual:${statementId}`,
        groupLabel: 'Group Manual',
        groupTone: 'stone',
        primaryId: statementId,
      });
    });

    return metaById;
  }, [displayStatements, duplicateOverrides, listHeaderLabels.scanning]);

  const selectableStatements = useMemo(() => displayStatements, [displayStatements]);

  const visibleStatementIds = useMemo(
    () => selectableStatements.map(statement => statement.id),
    [selectableStatements],
  );

  const allVisibleSelected = useMemo(
    () => areAllVisibleSelected(selectedStatementIds, visibleStatementIds),
    [selectedStatementIds, visibleStatementIds],
  );

  const duplicateStatementIds = useMemo(
    () =>
      displayStatements
        .filter(statement => duplicateMetaById.has(statement.id))
        .map(statement => statement.id),
    [displayStatements, duplicateMetaById],
  );

  const selectedDuplicateCount = useMemo(
    () => selectedStatementIds.filter(id => duplicateMetaById.has(id)).length,
    [selectedStatementIds, duplicateMetaById],
  );

  const hasSelectedDuplicates = selectedDuplicateCount > 0;

  const selectedCount = selectedStatementIds.length;

  const loadStatements = async (opts?: {
    silent?: boolean;
    notifyOnCompletion?: boolean;
    page?: number;
    search?: string;
    showErrorToast?: boolean;
  }) => {
    const { silent, notifyOnCompletion, page, search, showErrorToast } = opts || {};
    if (!silent) {
      setLoading(true);
    }

    let didLoad = true;
    try {
      const response = await apiClient.get('/statements', {
        params: {
          page,
          pageSize,
          search,
        },
      });

      const rawData = response.data?.data || response.data || [];
      const statementsWithFileType = rawData.map((stmt: Statement) => ({
        ...stmt,
        fileType: stmt.fileName?.toLowerCase().includes('pdf') ? 'pdf' : 'file',
      }));
      setStatements(statementsWithFileType);
      setTotal(response.data?.total || statementsWithFileType.length);

      if (notifyOnCompletion && Array.isArray(statementsWithFileType)) {
        const firstFinished = statementsWithFileType.find(
          (next: Statement) => next.status === 'parsed',
        );
        if (firstFinished && lastAutoOpenedIdRef.current !== firstFinished.id) {
          lastAutoOpenedIdRef.current = firstFinished.id;
          router.push(`/statements/${firstFinished.id}/edit`);
        }
      }
    } catch (error) {
      didLoad = false;
      console.error('Failed to load statements:', error);
      if (showErrorToast !== false) {
        toast.error(resolveLabel(t.loadListError, 'Failed to load statements'));
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }

    return didLoad;
  };

  const loadManualExpenseOptions = async () => {
    try {
      const [categoriesResponse, taxRatesResponse] = await Promise.all([
        apiClient.get('/categories', { params: { type: 'expense' } }),
        apiClient.get('/tax-rates'),
      ]);

      const rawCategories = (categoriesResponse.data?.data ||
        categoriesResponse.data ||
        []) as StatementCategoryWithEnabled[];
      setManualExpenseCategories(filterEnabledCategories(rawCategories));

      const rawTaxRates = (taxRatesResponse.data?.data || taxRatesResponse.data || []) as Array<
        TaxRateOption & { rate: number | string }
      >;

      setManualExpenseTaxRates(
        rawTaxRates.map(taxRate => ({
          ...taxRate,
          rate: Number(taxRate.rate || 0),
          isEnabled: taxRate.isEnabled !== false,
        })),
      );
    } catch (error) {
      console.error('Failed to load manual expense options:', error);
      setManualExpenseCategories([]);
      setManualExpenseTaxRates([]);
    }
  };

  const loadGmailReceipts = async (opts?: { silent?: boolean; showErrorToast?: boolean }) => {
    const { silent, showErrorToast } = opts || {};
    if (!silent) {
      setGmailLoading(true);
    }

    try {
      const response = await gmailReceiptsApi.listReceipts({
        limit: pageSize,
        offset: Math.max(0, (page - 1) * pageSize),
        includeInvalid: false,
      });
      const receipts = Array.isArray(response.data?.receipts) ? response.data.receipts : [];
      setGmailReceipts(receipts.filter(hasGmailReceiptAmount));
    } catch (error) {
      console.error('Failed to load Gmail receipts:', error);
      if (showErrorToast !== false) {
        toast.error(resolveLabel(t.loadListError, 'Failed to load receipts'));
      }
    } finally {
      if (!silent) {
        setGmailLoading(false);
      }
    }
  };

  const refreshActiveStatements = async () => {
    const didLoad = await loadStatements({
      silent: true,
      page,
      search,
      showErrorToast: false,
    });

    if (stage === 'submit') {
      await loadGmailReceipts({ silent: true, showErrorToast: false });
    }

    if (!didLoad) {
      toast.error(resolveLabel(t.refreshFailed, 'Failed to refresh statements'));
    }
  };

  const {
    handlers: pullToRefreshHandlers,
    pullDistance,
    isRefreshing: pullRefreshing,
    isReadyToRefresh,
  } = usePullToRefresh({
    enabled: isMobile,
    isAtTop: () => {
      if (!listScrollRef.current) return true;
      return listScrollRef.current.scrollTop <= 0;
    },
    onRefresh: refreshActiveStatements,
  });

  useEffect(() => {
    if (!user || !shouldPollStatements) return;

    const intervalId = window.setInterval(() => {
      loadStatements({
        silent: true,
        page,
        search,
        showErrorToast: false,
      }).catch(error => {
        console.error('Failed to poll statements:', error);
      });
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user, shouldPollStatements, page, search]);

  useEffect(() => {
    if (!user || stage !== 'submit') return;
    const intervalId = window.setInterval(() => {
      loadGmailReceipts({ silent: true, showErrorToast: false }).catch(error => {
        console.error('Failed to poll Gmail receipts:', error);
      });
    }, 6000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user, stage]);

  useEffect(() => {
    if (typeof window === 'undefined' || stage !== 'submit') return;

    const handleGmailSyncEvent = (event: Event) => {
      const detail = (event as CustomEvent<GmailSyncSkeletonMeta>).detail;
      if (!detail || detail.count <= 0) return;
      const nextCount = Math.min(detail.count, PAGE_SIZE);
      setGmailSyncSkeletonKeys(buildGmailSyncSkeletonKeys(nextCount));
    };

    window.addEventListener(STATEMENTS_GMAIL_SYNC_EVENT, handleGmailSyncEvent);
    return () => {
      window.removeEventListener(STATEMENTS_GMAIL_SYNC_EVENT, handleGmailSyncEvent);
    };
  }, [stage]);

  useEffect(() => {
    const handleOpenExpenseDrawer = (event: Event) => {
      const customEvent = event as CustomEvent<OpenExpenseDrawerEventDetail>;
      setExpenseDrawerMode(resolveExpenseDrawerMode(customEvent.detail?.mode));
      setExpenseDrawerOpen(true);
    };

    window.addEventListener(STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT, handleOpenExpenseDrawer);

    return () => {
      window.removeEventListener(STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT, handleOpenExpenseDrawer);
    };
  }, []);

  useEffect(() => {
    if (stage !== 'submit') return;

    const requestedMode = searchParams.get('openExpenseDrawer');
    if (!requestedMode) return;

    setExpenseDrawerMode(resolveExpenseDrawerMode(requestedMode));
    setExpenseDrawerOpen(true);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('openExpenseDrawer');

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `/statements/submit?${nextQuery}` : '/statements/submit');
  }, [stage, searchParams, router]);

  useEffect(() => {
    const visibleSet = new Set(visibleStatementIds);
    setSelectedStatementIds(prev => prev.filter(id => visibleSet.has(id)));
  }, [visibleStatementIds]);

  useEffect(() => {
    if (!selectedActionsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!selectedActionsRef.current) return;
      if (!selectedActionsRef.current.contains(event.target as Node)) {
        setSelectedActionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [selectedActionsOpen]);

  useEffect(() => {
    if (selectedCount === 0) {
      setSelectedActionsOpen(false);
    }
  }, [selectedCount]);

  const refreshStatementsAfterCreate = async () => {
    setPage(1);
    try {
      const didLoad = await loadStatements({
        page: 1,
        search,
        notifyOnCompletion: false,
        showErrorToast: false,
      });
      if (!didLoad) {
        throw new Error('refresh-failed');
      }
    } catch (error) {
      console.error('Failed to refresh statements:', error);
      toast.error(resolveLabel(t.refreshFailed, 'Failed to refresh statements'));
    }
  };

  const refreshStatementsAfterAttach = () => {
    void loadStatements({
      silent: true,
      page,
      search,
      showErrorToast: false,
    });
  };

  const uploadStatementFiles = async (
    files: File[],
    allowDuplicates: boolean,
    requireManualCategorySelection = false,
  ) => {
    if (files.length === 0) {
      throw new Error(resolveLabel(t.uploadModal?.pickAtLeastOne, 'Select at least one file'));
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('allowDuplicates', allowDuplicates ? 'true' : 'false');
    formData.append(
      'requireManualCategorySelection',
      requireManualCategorySelection ? 'true' : 'false',
    );

    try {
      await apiClient.post('/statements/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(resolveLabel(t.uploadModal?.uploadedProcessing, 'Files uploaded'));
      await refreshStatementsAfterCreate();
    } catch (error) {
      console.error('Failed to upload statements:', error);
      throw new Error(resolveLabel(t.uploadModal?.uploadFailed, 'Failed to upload files'));
    }
  };

  const handleCreateManualExpense = async (payload: {
    draft: ManualExpenseDraft;
    date: string;
    files: File[];
    allowDuplicates: boolean;
  }) => {
    const fallbackDefaultTaxRateId =
      manualExpenseTaxRates.find(taxRate => taxRate.isEnabled && taxRate.isDefault)?.id || '';
    const resolvedTaxRateId = payload.draft.taxRateId || fallbackDefaultTaxRateId;

    const buildPayload = () => {
      const formData = new FormData();
      formData.append('amount', payload.draft.amount.trim());
      formData.append('currency', payload.draft.currency.trim());
      formData.append('merchant', payload.draft.merchant.trim());
      formData.append('description', payload.draft.description.trim());
      formData.append('categoryId', payload.draft.categoryId);
      if (resolvedTaxRateId) {
        formData.append('taxRateId', resolvedTaxRateId);
      }
      formData.append('date', payload.date);
      formData.append('allowDuplicates', payload.allowDuplicates ? 'true' : 'false');
      payload.files.forEach(file => {
        formData.append('files', file);
      });
      return formData;
    };

    const candidateEndpoints = ['/statements/manual-expense', '/expenses/manual', '/expenses'];

    for (const endpoint of candidateEndpoints) {
      try {
        await apiClient.post(endpoint, buildPayload(), {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Manual expense created');
        await refreshStatementsAfterCreate();
        return;
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404 || status === 405) {
          continue;
        }

        console.error('Failed to create manual expense:', error);
        throw new Error('Failed to create manual expense');
      }
    }

    throw new Error('Manual expense creation is not available yet');
  };

  const handleView = (statement: Statement) => {
    if (statement.source === 'gmail') {
      router.push(`/storage/gmail-receipts/${statement.id}`);
      return;
    }

    if (
      statement.status === 'completed' ||
      statement.status === 'parsed' ||
      statement.status === 'validated'
    ) {
      router.push(`/statements/${statement.id}/edit`);
    } else {
      router.push(`/storage/${statement.id}`);
    }
  };

  const handleToggleStatement = (statementId: string) => {
    setSelectedStatementIds(prev => toggleStatementSelection(prev, statementId));
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedStatementIds(prev => toggleSelectAllVisible(prev, visibleStatementIds, checked));
  };

  const handleExportSelected = async () => {
    if (selectedStatementIds.length === 0) return;

    try {
      const selectedStatements = displayStatements.filter(statement =>
        selectedStatementIds.includes(statement.id),
      );
      const exportableStatements = selectedStatements.filter(
        statement => statement.source !== 'gmail',
      );

      if (exportableStatements.length === 0) {
        toast.error('Selected receipts cannot be exported from this menu');
        return;
      }

      for (const statement of exportableStatements) {
        const response = await apiClient.get(`/statements/${statement.id}/file`, {
          responseType: 'blob',
        });
        const blob = response.data as Blob;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = statement.fileName || `${statement.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`Exported ${exportableStatements.length} statement(s)`);
      setSelectedActionsOpen(false);
    } catch (error) {
      console.error('Failed to export selected statements:', error);
      toast.error('Failed to export selected statements');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedStatementIds.length === 0) return;

    const selectedStatements = displayStatements.filter(statement =>
      selectedStatementIds.includes(statement.id),
    );
    const deletableStatements = selectedStatements.filter(
      statement => statement.source !== 'gmail',
    );

    if (deletableStatements.length === 0) {
      toast.error('Selected receipts cannot be deleted from this menu');
      return;
    }

    const confirmed = window.confirm(
      `Move ${deletableStatements.length} selected statement(s) to trash?`,
    );
    if (!confirmed) return;

    try {
      await Promise.all(
        deletableStatements.map(statement => apiClient.delete(`/statements/${statement.id}`)),
      );
      setSelectedStatementIds(prev =>
        prev.filter(id => !deletableStatements.some(statement => statement.id === id)),
      );
      setSelectedActionsOpen(false);
      await loadStatements({ page, search, showErrorToast: false });
      toast.success('Selected statements moved to trash');
    } catch (error) {
      console.error('Failed to delete selected statements:', error);
      toast.error('Failed to delete selected statements');
    }
  };

  const handleMarkSelectedAsDuplicate = () => {
    if (selectedStatementIds.length === 0) return;

    setDuplicateOverrides(prev => {
      const next = { ...prev };
      selectedStatementIds.forEach(statementId => {
        next[statementId] = 'duplicate';
      });
      return next;
    });

    toast.success(`Marked ${selectedStatementIds.length} item(s) as duplicate`);
    setSelectedActionsOpen(false);
  };

  const handleDismissSelectedDuplicates = () => {
    if (selectedStatementIds.length === 0) return;

    setDuplicateOverrides(prev => {
      const next = { ...prev };
      selectedStatementIds.forEach(statementId => {
        next[statementId] = 'not_duplicate';
      });
      return next;
    });

    toast.success(`Dismissed duplicate flags for ${selectedStatementIds.length} item(s)`);
    setSelectedActionsOpen(false);
  };

  const handleSelectDetectedDuplicates = () => {
    if (duplicateStatementIds.length === 0) {
      toast.error('No duplicates detected in current list');
      return;
    }

    setSelectedStatementIds(prev => Array.from(new Set([...prev, ...duplicateStatementIds])));
    toast.success(`Selected ${duplicateStatementIds.length} duplicate item(s)`);
  };

  const handleMergeSelectedDuplicates = async () => {
    if (selectedStatementIds.length < 2) {
      toast.error('Select at least 2 items to merge duplicates');
      return;
    }

    const selectedStatements = displayStatements.filter(statement =>
      selectedStatementIds.includes(statement.id),
    );
    const selectedDuplicateStatements = selectedStatements.filter(statement =>
      duplicateMetaById.has(statement.id),
    );

    if (selectedDuplicateStatements.length < 2) {
      toast.error('Select at least 2 detected duplicates to merge');
      return;
    }

    const statementById = new Map(displayStatements.map(statement => [statement.id, statement]));
    const statementsToDelete = new Set<string>();
    const gmailToMark = new Map<string, string>();
    let skippedGmailCount = 0;

    selectedDuplicateStatements.forEach(statement => {
      const meta = duplicateMetaById.get(statement.id);
      if (!meta || statement.id === meta.primaryId) {
        return;
      }

      if (statement.source === 'gmail') {
        const primaryStatement = statementById.get(meta.primaryId);
        if (primaryStatement?.source === 'gmail') {
          gmailToMark.set(statement.id, primaryStatement.id);
        } else {
          skippedGmailCount += 1;
        }
        return;
      }

      statementsToDelete.add(statement.id);
    });

    if (statementsToDelete.size === 0 && gmailToMark.size === 0) {
      toast.error('No mergeable duplicates found in selected items');
      return;
    }

    const confirmMessage = `Merge selected duplicates? Keep primary records, merge ${gmailToMark.size} receipt(s) and move ${statementsToDelete.size} statement(s) to trash.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await Promise.all([
        ...Array.from(statementsToDelete).map(statementId =>
          apiClient.delete(`/statements/${statementId}`),
        ),
        ...Array.from(gmailToMark.entries()).map(([receiptId, originalReceiptId]) =>
          gmailReceiptsApi.markDuplicate(receiptId, originalReceiptId),
        ),
      ]);

      setDuplicateOverrides(prev => {
        const next = { ...prev };
        Array.from(gmailToMark.keys()).forEach(receiptId => {
          next[receiptId] = 'duplicate';
        });
        return next;
      });

      const processedIds = new Set([
        ...Array.from(statementsToDelete),
        ...Array.from(gmailToMark.keys()),
      ]);
      setSelectedStatementIds(prev => prev.filter(id => !processedIds.has(id)));
      setSelectedActionsOpen(false);

      await loadStatements({ silent: true, page, search, showErrorToast: false });
      if (stage === 'submit') {
        await loadGmailReceipts({ silent: true, showErrorToast: false });
      }

      const skipHint = skippedGmailCount
        ? ` ${skippedGmailCount} Gmail item(s) skipped because primary record is not Gmail.`
        : '';
      toast.success(
        `Merged duplicates: ${gmailToMark.size} receipt(s), ${statementsToDelete.size} statement(s).${skipHint}`,
      );
    } catch (error) {
      console.error('Failed to merge selected duplicates:', error);
      toast.error('Failed to merge selected duplicates');
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.type) count += 1;
    if (appliedFilters.statuses.length > 0) count += 1;
    if (appliedFilters.date?.preset || appliedFilters.date?.mode) count += 1;
    if (appliedFilters.from.length > 0) count += 1;
    if (appliedFilters.to.length > 0) count += 1;
    if (appliedFilters.keywords.trim()) count += 1;
    if (appliedFilters.amountMin !== null || appliedFilters.amountMax !== null) count += 1;
    if (appliedFilters.approved !== null) count += 1;
    if (appliedFilters.billable !== null) count += 1;
    if (appliedFilters.groupBy) count += 1;
    if (appliedFilters.has.length > 0) count += 1;
    if (appliedFilters.currencies.length > 0) count += 1;
    if (appliedFilters.exported !== null) count += 1;
    if (appliedFilters.paid !== null) count += 1;
    if (appliedFilters.limit !== null) count += 1;
    return count;
  }, [appliedFilters]);

  const updateFilter = (next: Partial<StatementFilters>) => {
    setDraftFilters(prev => ({ ...prev, ...next }));
  };

  const applyFilterChanges = () => {
    setAppliedFilters(draftFilters);
    saveStatementFilters(draftFilters);
  };

  const applyAndClose = (close: () => void) => {
    applyFilterChanges();
    close();
  };

  const resetAndClose = (key: keyof StatementFilters, close: () => void) => {
    const next = resetSingleStatementFilter(draftFilters, key);
    setDraftFilters(next);
    setAppliedFilters(next);
    saveStatementFilters(next);
    close();
  };

  const resetAllFilters = () => {
    setDraftFilters(DEFAULT_STATEMENT_FILTERS);
    setAppliedFilters(DEFAULT_STATEMENT_FILTERS);
    saveStatementFilters(DEFAULT_STATEMENT_FILTERS);
  };

  const updateColumnsToggle = (id: StatementColumnId, visible: boolean) => {
    setDraftColumns(prev =>
      prev.map(column =>
        column.id === id
          ? {
              ...column,
              visible,
            }
          : column,
      ),
    );
  };

  const handleReorderColumns = (activeId: StatementColumnId, overId: StatementColumnId) => {
    setDraftColumns(prev => reorderStatementColumns(prev, activeId, overId));
  };

  const handleSaveColumns = () => {
    const next = draftColumns.map((column, index) => ({ ...column, order: index }));
    setColumns(next);
    saveStatementColumns(next);
    setColumnsDrawerOpen(false);
  };

  const handleColumnsOpen = () => {
    setDraftColumns(columns);
    setColumnsDrawerOpen(true);
  };

  const fromOptions = useMemo(() => {
    const seen = new Map<
      string,
      {
        id: string;
        label: string;
        description?: string | null;
        avatarUrl?: string | null;
        iconUrl?: string | null;
        bankName?: string | null;
      }
    >();
    const addOption = (
      id: string,
      option: {
        id: string;
        label: string;
        description?: string | null;
        avatarUrl?: string | null;
        iconUrl?: string | null;
        bankName?: string | null;
      },
    ) => {
      if (!seen.has(id)) {
        seen.set(id, option);
      }
    };

    stagedStatements.forEach(statement => {
      if (statement.user?.id) {
        addOption(`user:${statement.user.id}`, {
          id: `user:${statement.user.id}`,
          label: statement.user.name || statement.user.email || 'User',
          description: statement.user.email ? `@${statement.user.email.split('@')[0]}` : null,
          avatarUrl: statement.user.avatarUrl || null,
        });
      }
      if (statement.bankName) {
        addOption(`bank:${statement.bankName}`, {
          id: `bank:${statement.bankName}`,
          label: statement.bankName === 'gmail' ? 'Gmail' : getBankDisplayName(statement.bankName),
          description: null,
          iconUrl: statement.bankName === 'gmail' ? '/icons/gmail.png' : null,
          bankName: statement.bankName,
        });
      }
    });

    return Array.from(seen.values());
  }, [stagedStatements]);

  useEffect(() => {
    if (stage !== 'submit' || gmailSyncSkeletonKeys.length === 0) return;
    if (gmailReceipts.length === 0) return;
    setGmailSyncSkeletonKeys([]);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STATEMENTS_GMAIL_SYNC_STORAGE_KEY);
    }
  }, [stage, gmailReceipts.length, gmailSyncSkeletonKeys.length]);

  const toOptions = fromOptions;

  const currencyOptions = useMemo(() => {
    const unique = new Set<string>();
    stagedStatements.forEach(statement => {
      const currency = resolveStatementCurrency(statement);
      if (currency) {
        unique.add(currency);
      }
    });
    return Array.from(unique.values());
  }, [stagedStatements]);

  return (
    <div
      className="container-shared flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8"
      {...pullToRefreshHandlers}
    >
      {isMobile && (pullDistance > 0 || pullRefreshing) ? (
        <div className="pointer-events-none mb-2 flex justify-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
              isReadyToRefresh || pullRefreshing
                ? 'border-primary/40 text-primary'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${pullRefreshing ? 'animate-spin' : ''}`} />
            <span>
              {pullRefreshing
                ? 'Refreshing...'
                : isReadyToRefresh
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mb-6 shrink-0 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1" data-tour-id="search-bar">
            <Search className="h-4 w-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full rounded-md border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </div>
        {selectedCount > 0 ? (
          <>
            <div className="relative hidden md:block" ref={selectedActionsRef}>
              <button
                type="button"
                onClick={() => setSelectedActionsOpen(prev => !prev)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
              >
                {selectedCount} selected
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {selectedActionsOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[280px] max-w-[calc(100vw-64px)] rounded-xl border border-[#dedad2] bg-white p-1.5 shadow-[0_10px_20px_rgba(17,24,39,0.1)]">
                  {hasSelectedDuplicates ? (
                    <>
                      <button
                        type="button"
                        onClick={handleMergeSelectedDuplicates}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#f8fbff]"
                      >
                        <span className="flex items-center gap-2.5">
                          <GitMerge className="h-4 w-4 text-primary" />
                          <span className="text-[16px] font-semibold leading-none text-primary">
                            {mergeDuplicatesLabel}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-[#c4cac4]" />
                      </button>

                      <button
                        type="button"
                        onClick={handleMarkSelectedAsDuplicate}
                        className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#f8fbff]"
                      >
                        <span className="flex items-center gap-2.5">
                          <Copy className="h-4 w-4 text-primary" />
                          <span className="text-[16px] font-semibold leading-none text-primary">
                            {markDuplicateLabel}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-[#c4cac4]" />
                      </button>

                      <button
                        type="button"
                        onClick={handleDismissSelectedDuplicates}
                        className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#f7f7f4]"
                      >
                        <span className="flex items-center gap-2.5">
                          <X className="h-4 w-4 text-[#99a39d]" />
                          <span className="text-[16px] font-semibold leading-none text-[#0f3428]">
                            {dismissDuplicateLabel}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-[#c4cac4]" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleExportSelected}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#f7f7f4]"
                      >
                        <span className="flex items-center gap-2.5">
                          <Download className="h-4 w-4 text-[#99a39d]" />
                          <span className="text-[16px] font-semibold leading-none text-[#0f3428]">
                            Export
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-[#c4cac4]" />
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteSelected}
                        className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#fff5f4]"
                      >
                        <span className="flex items-center gap-2.5">
                          <Trash2 className="h-4 w-4 text-[#dc2626]" />
                          <span className="text-[16px] font-semibold leading-none text-[#991b1b]">
                            Delete
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-[#f0b5b5]" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg md:hidden">
              <span className="text-sm font-medium text-gray-700">{selectedCount} selected</span>
              <div className="flex items-center gap-2">
                {hasSelectedDuplicates ? (
                  <>
                    <button
                      type="button"
                      onClick={handleMergeSelectedDuplicates}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary transition hover:border-primary hover:bg-primary/5"
                    >
                      <GitMerge className="h-3.5 w-3.5" />
                      {mergeDuplicatesLabel}
                    </button>
                    <button
                      type="button"
                      onClick={handleMarkSelectedAsDuplicate}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary transition hover:border-primary hover:bg-primary/5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {markDuplicateLabel}
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissSelectedDuplicates}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:border-primary hover:text-primary"
                    >
                      <X className="h-3.5 w-3.5" />
                      {dismissDuplicateLabel}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleExportSelected}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:border-primary hover:text-primary"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:border-red-400 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            <TypeFilterDropdown
              open={typeDropdownOpen}
              onOpenChange={setTypeDropdownOpen}
              options={typeOptions}
              value={draftFilters.type}
              onChange={value => updateFilter({ type: value })}
              onApply={() => applyAndClose(() => setTypeDropdownOpen(false))}
              onReset={() => resetAndClose('type', () => setTypeDropdownOpen(false))}
              trigger={
                <FilterChipButton active={Boolean(draftFilters.type)}>
                  {draftFilters.type
                    ? typeOptions.find(option => option.value === draftFilters.type)?.label ||
                      filterLabels.type
                    : filterLabels.type}
                  <ChevronDown className="h-3.5 w-3.5" />
                </FilterChipButton>
              }
              applyLabel={filterOptionLabels.apply}
              resetLabel={filterOptionLabels.reset}
            />

            <StatusFilterDropdown
              open={statusDropdownOpen}
              onOpenChange={setStatusDropdownOpen}
              options={statusOptions}
              values={draftFilters.statuses}
              onChange={values => updateFilter({ statuses: values })}
              onApply={() => applyAndClose(() => setStatusDropdownOpen(false))}
              onReset={() => resetAndClose('statuses', () => setStatusDropdownOpen(false))}
              trigger={
                <FilterChipButton active={draftFilters.statuses.length > 0}>
                  {draftFilters.statuses.length > 0
                    ? `${filterLabels.status} (${draftFilters.statuses.length})`
                    : filterLabels.status}
                  <ChevronDown className="h-3.5 w-3.5" />
                </FilterChipButton>
              }
              applyLabel={filterOptionLabels.apply}
              resetLabel={filterOptionLabels.reset}
            />

            <DateFilterDropdown
              open={dateDropdownOpen}
              onOpenChange={setDateDropdownOpen}
              presets={datePresets}
              modes={dateModes}
              value={draftFilters.date}
              onChange={value => updateFilter({ date: value })}
              onApply={() => applyAndClose(() => setDateDropdownOpen(false))}
              onReset={() => resetAndClose('date', () => setDateDropdownOpen(false))}
              trigger={
                <FilterChipButton active={Boolean(draftFilters.date)}>
                  {draftFilters.date?.preset
                    ? datePresets.find(option => option.value === draftFilters.date?.preset)?.label
                    : draftFilters.date?.mode
                      ? dateModes.find(option => option.value === draftFilters.date?.mode)?.label
                      : filterLabels.date}
                  <ChevronDown className="h-3.5 w-3.5" />
                </FilterChipButton>
              }
              applyLabel={filterOptionLabels.apply}
              resetLabel={filterOptionLabels.reset}
            />

            <FromFilterDropdown
              open={fromDropdownOpen}
              onOpenChange={setFromDropdownOpen}
              options={fromOptions}
              values={draftFilters.from}
              onChange={values => updateFilter({ from: values })}
              onApply={() => applyAndClose(() => setFromDropdownOpen(false))}
              onReset={() => resetAndClose('from', () => setFromDropdownOpen(false))}
              trigger={
                <FilterChipButton active={draftFilters.from.length > 0}>
                  {draftFilters.from.length > 0
                    ? `${filterLabels.from} (${draftFilters.from.length})`
                    : filterLabels.from}
                  <ChevronDown className="h-3.5 w-3.5" />
                </FilterChipButton>
              }
              applyLabel={filterOptionLabels.apply}
              resetLabel={filterOptionLabels.reset}
            />

            {duplicateStatementIds.length > 0 ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-[13px] font-medium text-orange-700 transition-colors hover:border-orange-300 hover:bg-orange-100"
                onClick={handleSelectDetectedDuplicates}
              >
                <Copy className="h-3.5 w-3.5" />
                {selectDuplicatesLabel}
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-semibold text-orange-700">
                  {duplicateStatementIds.length}
                </span>
              </button>
            ) : null}

            <button
              type="button"
              className={filterLinkClassName}
              onClick={() => {
                setDraftFilters(appliedFilters);
                setFiltersDrawerScreen('root');
                setFiltersDrawerOpen(true);
              }}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {filterLabels.filters}
              {activeFilterCount > 0 ? (
                <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <button type="button" className={filterLinkClassName} onClick={handleColumnsOpen}>
              <Columns2 className="h-3.5 w-3.5" />
              {filterLabels.columns}
            </button>
          </div>
        )}
      </div>

      <div
        ref={listScrollRef}
        data-tour-id="statements-table"
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 ${selectedCount > 0 ? 'pb-24 md:pb-0' : ''}`}
      >
        {loading && gmailSyncSkeletonKeys.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <LoadingAnimation size="lg" />
          </div>
        ) : displayStatements.length === 0 && gmailSyncSkeletonKeys.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="mx-auto h-16 w-16 text-gray-300 mb-4 bg-gray-50 rounded-full flex items-center justify-center">
              <File className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">{emptyLabels.title}</h3>
            <p className="mt-1 text-gray-500">{emptyLabels.description}</p>
            {stage === 'submit' && hasGmailReceipts ? (
              <p className="mt-2 text-sm text-gray-500">Gmail receipts are loaded</p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-4 md:hidden">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={selectedCount > 0 && !allVisibleSelected}
                  onCheckedChange={handleToggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  aria-label="Select all statements"
                />
                <span className="text-sm font-medium text-gray-600">Select all</span>
              </div>
              <div className="hidden md:flex items-center gap-4 px-4 pb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                <div className="flex items-center flex-1 min-w-0">
                  <div className="flex items-center gap-3 shrink-0 mr-4">
                    <div className="w-4 flex justify-center opacity-70">
                      <Checkbox
                        checked={allVisibleSelected}
                        indeterminate={selectedCount > 0 && !allVisibleSelected}
                        onCheckedChange={handleToggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        aria-label="Select all statements"
                      />
                    </div>
                    <div className="w-8 flex items-center justify-center text-gray-400">
                      <span className="sr-only">{listHeaderLabels.receipt}</span>
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-gray-400">
                      {listHeaderLabels.merchant}
                      <span className="px-1 text-gray-300">•</span>
                      <div className="flex items-center gap-1 cursor-pointer hover:text-gray-600 transition">
                        {listHeaderLabels.date}
                        <ArrowDown className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-6 shrink-0 w-[420px] pl-4">
                  <div className="w-32 text-right text-gray-400 pr-1">
                    {listHeaderLabels.amount}
                  </div>
                  <div className="w-36 text-right text-gray-400">{listHeaderLabels.action}</div>
                </div>
              </div>
              {gmailSyncSkeletonKeys.length > 0
                ? gmailSyncSkeletonKeys.map(key => (
                    <div
                      key={key}
                      data-testid="gmail-sync-skeleton-row"
                      className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-3 md:py-2.5 md:px-4"
                    >
                      <div className="md:hidden">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 rounded border border-gray-200 bg-gray-100" />
                          <div className="w-10">
                            <Skeleton variant="rounded" width={34} height={34} />
                          </div>
                          <div className="flex-1">
                            <Skeleton variant="text" width="60%" height={16} />
                            <div className="mt-1 flex items-center justify-between">
                              <Skeleton variant="text" width={80} height={14} />
                              <Skeleton variant="text" width={70} height={14} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-4">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="flex items-center gap-3 shrink-0 mr-4">
                            <div className="w-4 flex justify-center">
                              <div className="h-4 w-4 rounded border border-gray-200 bg-gray-100" />
                            </div>
                            <div className="w-8 flex items-center justify-center">
                              <Skeleton variant="rounded" width={28} height={28} />
                            </div>
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <Skeleton variant="text" width="45%" height={18} />
                            <Skeleton variant="text" width="25%" height={14} />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-6 shrink-0 w-[420px] pl-4">
                          <div className="w-32 text-right">
                            <Skeleton variant="text" width={90} height={20} />
                          </div>
                          <div className="w-36 flex justify-end">
                            <Skeleton variant="rounded" width={72} height={30} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                : null}
              {displayStatements.map(statement => {
                const isGmail = statement.source === 'gmail';
                const resolvedName = isGmail
                  ? resolveGmailMerchantLabel({
                      vendor: statement.parsedData?.vendor,
                      sender: statement.sender,
                      subject: statement.subject,
                      fallback: statement.fileName,
                    })
                  : getStatementDisplayMerchant(statement, getBankDisplayName(statement.bankName));
                const merchantLabel = isGmail
                  ? resolvedName
                  : getStatementMerchantLabel(
                      statement.status,
                      resolvedName,
                      listHeaderLabels.scanning,
                    );
                const isManualExpense = !isGmail && isManualExpenseStatement(statement);
                const manualAttachmentCount = Number(
                  statement.parsingDetails?.importPreview?.attachments ?? 0,
                );
                const allowAttachFallback =
                  isManualExpense &&
                  !isGmail &&
                  (manualAttachmentCount === 0 ||
                    statement.fileName.toLowerCase().startsWith('manual-expense-'));
                const isProcessingGmail = isGmailReceiptProcessing(statement);
                const amountLabel = formatStatementAmount(statement);
                const dateLabel = formatStatementDate(statement);
                const duplicateMeta = duplicateMetaById.get(statement.id);
                const isPossibleDuplicate = Boolean(duplicateMeta);

                return (
                  <StatementsListItem
                    key={statement.id}
                    statement={statement}
                    viewLabel={viewLabel}
                    isGmail={isGmail}
                    isProcessing={isProcessingGmail}
                    merchantLabel={merchantLabel}
                    amountLabel={amountLabel}
                    dateLabel={dateLabel}
                    isPossibleDuplicate={isPossibleDuplicate}
                    duplicatePosition={duplicateMeta?.position}
                    duplicateGroupSize={duplicateMeta?.total}
                    duplicateRole={duplicateMeta?.role}
                    duplicateGroupLabel={duplicateMeta?.groupLabel}
                    duplicateGroupTone={duplicateMeta?.groupTone}
                    duplicateReason={duplicateMeta?.reason}
                    duplicateActionLabel={reviewDuplicateLabel}
                    typeLabel={isGmail ? 'PDF' : statement.fileType}
                    isManualExpense={isManualExpense}
                    onView={() => handleView(statement)}
                    onIconClick={() => {
                      if (isGmail) {
                        setPreviewAllowAttachFile(false);
                        setPreviewSource('gmail');
                        setPreviewFileId(statement.id);
                        setPreviewFileName(statement.fileName || 'receipt.pdf');
                        setPreviewModalOpen(true);
                        return;
                      }
                      setPreviewAllowAttachFile(allowAttachFallback);
                      setPreviewSource('statement');
                      setPreviewFileId(statement.id);
                      setPreviewFileName(statement.fileName);
                      setPreviewModalOpen(true);
                    }}
                    onToggleSelect={() => handleToggleStatement(statement.id)}
                    selected={selectedStatementIds.includes(statement.id)}
                  />
                );
              })}
            </div>
            <div className="mt-6 flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="text-sm text-gray-500">
                {formatPaginationLabel(paginationLabels.shown, {
                  from: rangeStart,
                  to: rangeEnd,
                  count: total,
                })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 min-w-[120px] text-center">
                  {formatPaginationLabel(paginationLabels.pageOf, {
                    page,
                    count: totalPagesCount,
                  })}
                </span>
                <AppPagination page={page} total={totalPagesCount} onChange={setPage} />
              </div>
            </div>
          </>
        )}
      </div>

      {previewFileId && (
        <PDFPreviewModal
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setPreviewAllowAttachFile(false);
          }}
          fileId={previewFileId}
          fileName={previewFileName}
          source={previewSource}
          allowAttachFile={previewAllowAttachFile}
          onFileAttached={refreshStatementsAfterAttach}
          onParsingStarted={refreshStatementsAfterAttach}
        />
      )}

      <FiltersDrawer
        open={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        filters={draftFilters}
        screen={filtersDrawerScreen}
        onBack={() => setFiltersDrawerScreen('root')}
        onSelect={field => setFiltersDrawerScreen(field)}
        onUpdateFilters={updateFilter}
        onResetAll={resetAllFilters}
        onViewResults={() => {
          applyFilterChanges();
          setFiltersDrawerOpen(false);
        }}
        typeOptions={typeOptions}
        statusOptions={statusOptions}
        datePresets={datePresets}
        dateModes={dateModes}
        fromOptions={fromOptions}
        toOptions={toOptions}
        groupByOptions={groupByOptions}
        hasOptions={hasOptions}
        currencyOptions={currencyOptions}
        labels={{
          title: filterOptionLabels.drawerTitle,
          viewResults: filterOptionLabels.viewResults,
          saveSearch: filterOptionLabels.saveSearch,
          resetFilters: filterOptionLabels.resetFilters,
          general: filterOptionLabels.drawerGeneral,
          expenses: filterOptionLabels.drawerExpenses,
          reports: filterOptionLabels.drawerReports,
          type: filterLabels.type,
          from: filterLabels.from,
          groupBy: filterOptionLabels.drawerGroupBy,
          has: filterOptionLabels.drawerHas,
          keywords: filterOptionLabels.drawerKeywords,
          limit: filterOptionLabels.drawerLimit,
          status: filterLabels.status,
          to: filterOptionLabels.drawerTo,
          amount: filterOptionLabels.drawerAmount,
          approved: filterOptionLabels.drawerApproved,
          billable: filterOptionLabels.drawerBillable,
          currency: filterOptionLabels.hasCurrency,
          date: filterLabels.date,
          exported: filterOptionLabels.columnExported,
          paid: filterOptionLabels.statusPaid,
          any: filterOptionLabels.any,
          yes: filterOptionLabels.yes,
          no: filterOptionLabels.no,
        }}
        activeCount={activeFilterCount}
      />

      <ColumnsDrawer
        open={columnsDrawerOpen}
        onClose={() => setColumnsDrawerOpen(false)}
        columns={columnsWithLabels}
        onToggle={updateColumnsToggle}
        onReorder={handleReorderColumns}
        onSave={handleSaveColumns}
        labels={{
          title: filterOptionLabels.columnsTitle,
          save: filterOptionLabels.save,
        }}
      />

      <CreateExpenseDrawer
        open={expenseDrawerOpen}
        initialMode={expenseDrawerMode}
        defaultCurrency={currentWorkspace?.currency ?? null}
        categories={manualExpenseCategories}
        taxRates={manualExpenseTaxRates}
        onClose={() => setExpenseDrawerOpen(false)}
        onSubmitScan={payload =>
          uploadStatementFiles(
            payload.files,
            payload.allowDuplicates,
            payload.requireManualCategorySelection,
          )
        }
        onSubmitManual={handleCreateManualExpense}
      />
    </div>
  );
}
