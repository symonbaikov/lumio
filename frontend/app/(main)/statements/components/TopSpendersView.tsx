'use client';

import { DateFilterDropdown } from '@/app/(main)/statements/components/filters/DateFilterDropdown';
import { FiltersDrawer } from '@/app/(main)/statements/components/filters/FiltersDrawer';
import { FromFilterDropdown } from '@/app/(main)/statements/components/filters/FromFilterDropdown';
import { StatusFilterDropdown } from '@/app/(main)/statements/components/filters/StatusFilterDropdown';
import { TypeFilterDropdown } from '@/app/(main)/statements/components/filters/TypeFilterDropdown';
import {
  DEFAULT_STATEMENT_FILTERS,
  type StatementFilterItem,
  type StatementFilters,
  applyStatementsFilters,
  resetSingleStatementFilter,
} from '@/app/(main)/statements/components/filters/statement-filters';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient, { gmailReceiptsApi } from '@/app/lib/api';
import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';
import { resolveBankLogo } from '@bank-logos';
import { ArrowDown, ArrowUp, ChartPie, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type Statement = {
  id: string;
  source?: 'statement' | 'gmail';
  fileName: string;
  status: string;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  createdAt?: string | null;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  bankName?: string | null;
  fileType?: string | null;
  currency?: string | null;
  exported?: boolean | null;
  paid?: boolean | null;
  parsingDetails?: {
    metadataExtracted?: {
      currency?: string;
      headerDisplay?: {
        currencyDisplay?: string;
      };
    };
  } | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  parsedData?: {
    vendor?: string | null;
    amount?: number;
    currency?: string;
    date?: string;
  } | null;
  subject?: string | null;
  sender?: string | null;
  receivedAt?: string | null;
};

type GmailReceipt = {
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  status: string;
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
  };
  gmailMessageId?: string;
};

type TopSpenderRecord = StatementFilterItem & {
  sourceType: 'statement' | 'gmail';
  company: string;
  amount: number;
  currencyValue: string;
  dateValue: string;
};

type AggregateRow = {
  id: string;
  company: string;
  sourceType: 'statement' | 'gmail';
  count: number;
  total: number;
  average: number;
  lastDate: string;
  currency: string;
};

const STORAGE_KEY = 'finflow-top-spenders-filters';

const loadTopSpendersFilters = (): StatementFilters => {
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

const saveTopSpendersFilters = (filters: StatementFilters) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
};

const parseAmountValue = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

const getStatementAmount = (statement: Statement) => {
  if (statement.source === 'gmail') {
    return parseAmountValue(statement.parsedData?.amount ?? null);
  }
  const debit = parseAmountValue(statement.totalDebit);
  const credit = parseAmountValue(statement.totalCredit);
  if (debit > 0) return debit;
  if (credit > 0) return credit;
  return 0;
};

const getStatementDate = (statement: Statement) => {
  if (statement.source === 'gmail') {
    return statement.parsedData?.date || statement.receivedAt || statement.createdAt || '';
  }
  return statement.statementDateTo || statement.statementDateFrom || statement.createdAt || '';
};

const resolveCurrencyCode = (currency: string | null | undefined, fallback = 'KZT') => {
  const normalized = String(currency || '')
    .trim()
    .toUpperCase();

  if (/^[A-Z]{3}$/.test(normalized)) {
    return normalized;
  }

  return fallback;
};

const getStatementCurrency = (statement: Statement, fallbackCurrency: string) => {
  return (
    statement.parsedData?.currency ||
    statement.currency ||
    statement.parsingDetails?.metadataExtracted?.currency ||
    statement.parsingDetails?.metadataExtracted?.headerDisplay?.currencyDisplay ||
    fallbackCurrency
  );
};

const getBankDisplayName = (bankName?: string | null) => {
  const raw = (bankName || '').trim();
  if (!raw) return 'Unknown';
  if (raw.toLowerCase() === 'gmail') return 'Gmail';
  const resolved = resolveBankLogo(raw);
  if (!resolved) return raw;
  return resolved.key !== 'other' ? resolved.displayName : raw;
};

const mapGmailReceiptToStatement = (
  receipt: GmailReceipt,
  fallbackCurrency: string,
): Statement => ({
  id: receipt.id,
  source: 'gmail',
  fileName: resolveGmailMerchantLabel({
    vendor: receipt.parsedData?.vendor,
    sender: receipt.sender,
    subject: receipt.subject,
    fallback: 'Gmail receipt',
  }),
  subject: receipt.subject,
  sender: receipt.sender,
  status: receipt.status,
  totalDebit: receipt.parsedData?.amount ?? null,
  totalCredit: null,
  exported: null,
  paid: null,
  createdAt: receipt.receivedAt,
  statementDateFrom: receipt.parsedData?.date || receipt.receivedAt,
  statementDateTo: null,
  bankName: 'gmail',
  fileType: 'gmail',
  currency: resolveCurrencyCode(receipt.parsedData?.currency, fallbackCurrency),
  user: null,
  receivedAt: receipt.receivedAt,
  parsedData: receipt.parsedData,
});

const resolveLocale = (locale?: string) => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

const formatMoney = (value: number, currency: string, locale = 'ru') =>
  new Intl.NumberFormat(resolveLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default function TopSpendersView() {
  const t = useIntlayer('statementsPage');
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { resolvedTheme } = useTheme();
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);
  const [loading, setLoading] = useState(true);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [gmailReceipts, setGmailReceipts] = useState<GmailReceipt[]>([]);
  const [searchInput, setSearchInput] = useState('');

  const [draftFilters, setDraftFilters] = useState<StatementFilters>(DEFAULT_STATEMENT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<StatementFilters>(DEFAULT_STATEMENT_FILTERS);
  const [filtersDrawerScreen, setFiltersDrawerScreen] = useState('root');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  const resolveLabel = (value: any, fallback: string) => value?.value ?? value ?? fallback;

  const labels = {
    title: resolveLabel((t as any)?.topSpenders?.title, 'Top spenders'),
    subtitle: resolveLabel(
      (t as any)?.topSpenders?.subtitle,
      'See where money goes by receipts, statements and dates.',
    ),
    searchPlaceholder: resolveLabel(
      (t as any)?.topSpenders?.searchPlaceholder,
      'Search company, bank or sender',
    ),
    totalSpend: resolveLabel((t as any)?.topSpenders?.totalSpend, 'Total spend'),
    statementsSpend: resolveLabel((t as any)?.topSpenders?.statementsSpend, 'Statements'),
    receiptsSpend: resolveLabel((t as any)?.topSpenders?.receiptsSpend, 'Receipts'),
    totalOperations: resolveLabel((t as any)?.topSpenders?.totalOperations, 'Operations'),
    topCompanies: resolveLabel((t as any)?.topSpenders?.topCompanies, 'Top companies'),
    sourceSplit: resolveLabel((t as any)?.topSpenders?.sourceSplit, 'Source split'),
    spendTrend: resolveLabel((t as any)?.topSpenders?.spendTrend, 'Spending trend'),
    leaderboard: resolveLabel((t as any)?.topSpenders?.leaderboard, 'Top spenders list'),
    noData: resolveLabel((t as any)?.topSpenders?.noData, 'No data for selected filters'),
    source: resolveLabel((t as any)?.topSpenders?.source, 'Source'),
    company: resolveLabel((t as any)?.topSpenders?.company, 'Company'),
    amount: resolveLabel((t as any)?.topSpenders?.amount, 'Amount'),
    operations: resolveLabel((t as any)?.topSpenders?.operations, 'Operations'),
    average: resolveLabel((t as any)?.topSpenders?.average, 'Average'),
    lastOperation: resolveLabel((t as any)?.topSpenders?.lastOperation, 'Last operation'),
    sourceStatement: resolveLabel((t as any)?.topSpenders?.sourceStatement, 'Statement'),
    sourceGmail: resolveLabel((t as any)?.topSpenders?.sourceGmail, 'Receipt'),
    filters: resolveLabel((t as any)?.filters?.filters, 'Filters'),
    type: resolveLabel((t as any)?.filters?.type, 'Type'),
    status: resolveLabel((t as any)?.filters?.status, 'Status'),
    date: resolveLabel((t as any)?.filters?.date, 'Date'),
    from: resolveLabel((t as any)?.filters?.from, 'From'),
    apply: resolveLabel((t as any)?.filters?.apply, 'Apply'),
    reset: resolveLabel((t as any)?.filters?.reset, 'Reset'),
  };

  const filterOptionLabels = {
    apply: resolveLabel((t as any)?.filters?.apply, 'Apply'),
    reset: resolveLabel((t as any)?.filters?.reset, 'Reset'),
    resetFilters: resolveLabel((t as any)?.filters?.resetFilters, 'Reset filters'),
    viewResults: resolveLabel((t as any)?.filters?.viewResults, 'View results'),
    saveSearch: resolveLabel((t as any)?.filters?.saveSearch, 'Save search'),
    any: resolveLabel((t as any)?.filters?.any, 'Any'),
    yes: resolveLabel((t as any)?.filters?.yes, 'Yes'),
    no: resolveLabel((t as any)?.filters?.no, 'No'),
    typeExpense: resolveLabel((t as any)?.filters?.typeExpense, 'Expense'),
    typeReport: resolveLabel((t as any)?.filters?.typeReport, 'Expense Report'),
    typeChat: resolveLabel((t as any)?.filters?.typeChat, 'Chat'),
    typeTrip: resolveLabel((t as any)?.filters?.typeTrip, 'Trip'),
    typeTask: resolveLabel((t as any)?.filters?.typeTask, 'Task'),
    statusUnreported: resolveLabel((t as any)?.filters?.statusUnreported, 'Unreported'),
    statusDraft: resolveLabel((t as any)?.filters?.statusDraft, 'Draft'),
    statusOutstanding: resolveLabel((t as any)?.filters?.statusOutstanding, 'Outstanding'),
    statusApproved: resolveLabel((t as any)?.filters?.statusApproved, 'Approved'),
    statusPaid: resolveLabel((t as any)?.filters?.statusPaid, 'Paid'),
    statusDone: resolveLabel((t as any)?.filters?.statusDone, 'Done'),
    dateThisMonth: resolveLabel((t as any)?.filters?.dateThisMonth, 'This month'),
    dateLastMonth: resolveLabel((t as any)?.filters?.dateLastMonth, 'Last month'),
    dateYearToDate: resolveLabel((t as any)?.filters?.dateYearToDate, 'Year to date'),
    dateOn: resolveLabel((t as any)?.filters?.dateOn, 'On'),
    dateAfter: resolveLabel((t as any)?.filters?.dateAfter, 'After'),
    dateBefore: resolveLabel((t as any)?.filters?.dateBefore, 'Before'),
    drawerTitle: resolveLabel((t as any)?.filters?.drawerTitle, 'Filters'),
    drawerGeneral: resolveLabel((t as any)?.filters?.drawerGeneral, 'General'),
    drawerExpenses: resolveLabel((t as any)?.filters?.drawerExpenses, 'Expenses'),
    drawerReports: resolveLabel((t as any)?.filters?.drawerReports, 'Reports'),
    drawerGroupBy: resolveLabel((t as any)?.filters?.drawerGroupBy, 'Group by'),
    drawerHas: resolveLabel((t as any)?.filters?.drawerHas, 'Has'),
    drawerKeywords: resolveLabel((t as any)?.filters?.drawerKeywords, 'Keywords'),
    drawerLimit: resolveLabel((t as any)?.filters?.drawerLimit, 'Limit'),
    drawerTo: resolveLabel((t as any)?.filters?.drawerTo, 'To'),
    drawerAmount: resolveLabel((t as any)?.filters?.drawerAmount, 'Amount'),
    drawerApproved: resolveLabel((t as any)?.filters?.drawerApproved, 'Approved'),
    drawerBillable: resolveLabel((t as any)?.filters?.drawerBillable, 'Billable'),
    groupByDate: resolveLabel((t as any)?.filters?.groupByDate, 'Date'),
    groupByStatus: resolveLabel((t as any)?.filters?.groupByStatus, 'Status'),
    groupByType: resolveLabel((t as any)?.filters?.groupByType, 'Type'),
    groupByBank: resolveLabel((t as any)?.filters?.groupByBank, 'Bank'),
    groupByUser: resolveLabel((t as any)?.filters?.groupByUser, 'User'),
    groupByAmount: resolveLabel((t as any)?.filters?.groupByAmount, 'Amount'),
    hasErrors: resolveLabel((t as any)?.filters?.hasErrors, 'Errors'),
    hasLogs: resolveLabel((t as any)?.filters?.hasLogs, 'Logs'),
    hasTransactions: resolveLabel((t as any)?.filters?.hasTransactions, 'Transactions'),
    hasDateRange: resolveLabel((t as any)?.filters?.hasDateRange, 'Date range'),
    hasCurrency: resolveLabel((t as any)?.filters?.hasCurrency, 'Currency'),
  };

  const filterLinkClassName =
    'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-primary';

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

  useEffect(() => {
    const storedFilters = loadTopSpendersFilters();
    setDraftFilters(storedFilters);
    setAppliedFilters(storedFilters);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const allStatements: Statement[] = [];
        const statementsPageSize = 500;
        let statementsPage = 1;
        let statementsTotal = Number.POSITIVE_INFINITY;

        while (allStatements.length < statementsTotal) {
          const response = await apiClient.get('/statements', {
            params: {
              page: statementsPage,
              pageSize: statementsPageSize,
            },
          });

          const items = response.data?.data || response.data || [];
          const batch = Array.isArray(items) ? items : [];
          allStatements.push(...batch);
          statementsTotal = Number(response.data?.total ?? allStatements.length);

          if (batch.length < statementsPageSize) break;
          statementsPage += 1;
        }

        const allReceipts: GmailReceipt[] = [];
        const receiptsLimit = 100;
        let receiptsOffset = 0;
        let receiptsTotal = Number.POSITIVE_INFINITY;

        while (allReceipts.length < receiptsTotal) {
          const response = await gmailReceiptsApi.listReceipts({
            limit: receiptsLimit,
            offset: receiptsOffset,
          });
          const payload = response.data || {};
          const batch = Array.isArray(payload?.receipts) ? payload.receipts : [];
          allReceipts.push(...batch);
          receiptsTotal = Number(payload?.total ?? allReceipts.length);

          if (batch.length < receiptsLimit) break;
          receiptsOffset += receiptsLimit;
        }

        if (!isMounted) return;
        setStatements(allStatements);
        setGmailReceipts(allReceipts);
      } catch (error) {
        console.error('Failed to load top spenders data', error);
        if (isMounted) {
          toast.error(resolveLabel((t as any)?.loadListError, 'Failed to load spending data'));
          setStatements([]);
          setGmailReceipts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user, t]);

  const allRecords = useMemo<TopSpenderRecord[]>(() => {
    const mappedStatements: TopSpenderRecord[] = statements.map(item => {
      const sourceType: 'statement' | 'gmail' = item.source === 'gmail' ? 'gmail' : 'statement';
      const company =
        sourceType === 'gmail'
          ? resolveGmailMerchantLabel({
              vendor: item.parsedData?.vendor || undefined,
              sender: item.sender || undefined,
              subject: item.subject || undefined,
              fallback: item.fileName,
            })
          : getBankDisplayName(item.bankName);

      const dateValue = getStatementDate(item);
      const amount = getStatementAmount(item);
      const currency = getStatementCurrency(item, workspaceCurrency);

      return {
        id: item.id,
        source: sourceType,
        fileName: company,
        subject: item.subject || null,
        sender: item.sender || null,
        status: item.status || null,
        fileType: (item.fileType || '').toLowerCase() || null,
        createdAt: item.createdAt || null,
        statementDateFrom: item.statementDateFrom || null,
        statementDateTo: item.statementDateTo || null,
        bankName: item.bankName || null,
        totalDebit: amount,
        totalCredit: null,
        currency,
        exported: item.exported ?? null,
        paid: item.paid ?? null,
        parsingDetails: item.parsingDetails || null,
        user: item.user || null,
        receivedAt: item.receivedAt || null,
        parsedData: {
          vendor: item.parsedData?.vendor || (sourceType === 'gmail' ? company : null),
          date: item.parsedData?.date || dateValue,
        },
        company,
        amount,
        currencyValue: currency,
        dateValue,
        sourceType,
      };
    });

    const mappedReceipts: TopSpenderRecord[] = gmailReceipts.map(receipt => {
      const mapped = mapGmailReceiptToStatement(receipt, workspaceCurrency);
      const company = resolveGmailMerchantLabel({
        vendor: receipt.parsedData?.vendor,
        sender: receipt.sender,
        subject: receipt.subject,
        fallback: mapped.fileName,
      });
      const amount = getStatementAmount(mapped);
      const dateValue = getStatementDate(mapped);
      const currency = getStatementCurrency(mapped, workspaceCurrency);

      return {
        id: mapped.id,
        source: 'gmail',
        fileName: company,
        subject: mapped.subject || null,
        sender: mapped.sender || null,
        status: mapped.status || null,
        fileType: 'gmail',
        createdAt: mapped.createdAt || null,
        statementDateFrom: mapped.statementDateFrom || null,
        statementDateTo: mapped.statementDateTo || null,
        bankName: 'gmail',
        totalDebit: amount,
        totalCredit: null,
        currency,
        exported: null,
        paid: null,
        parsingDetails: null,
        user: null,
        receivedAt: mapped.receivedAt || null,
        parsedData: {
          vendor: receipt.parsedData?.vendor || company,
          date: receipt.parsedData?.date || mapped.receivedAt || mapped.createdAt || null,
        },
        company,
        amount,
        currencyValue: currency,
        dateValue,
        sourceType: 'gmail',
      };
    });

    const existingReceiptIds = new Set(
      mappedStatements.filter(r => r.sourceType === 'gmail').map(r => r.id),
    );
    const uniqueMappedReceipts = mappedReceipts.filter(
      receipt => !existingReceiptIds.has(receipt.id),
    );

    return [...mappedStatements, ...uniqueMappedReceipts];
  }, [statements, gmailReceipts, workspaceCurrency]);

  const fromOptions = useMemo(() => {
    const seen = new Map<
      string,
      {
        id: string;
        label: string;
        description?: string | null;
        avatarUrl?: string | null;
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
        bankName?: string | null;
      },
    ) => {
      if (!seen.has(id)) {
        seen.set(id, option);
      }
    };

    allRecords.forEach(record => {
      if (record.user?.id) {
        addOption(`user:${record.user.id}`, {
          id: `user:${record.user.id}`,
          label: record.user.name || record.user.email || 'User',
          description: record.user.email ? `@${record.user.email.split('@')[0]}` : null,
        });
      }

      if (record.bankName) {
        addOption(`bank:${record.bankName}`, {
          id: `bank:${record.bankName}`,
          label: record.bankName === 'gmail' ? 'Gmail' : getBankDisplayName(record.bankName),
          description: null,
          bankName: record.bankName,
        });
      }
    });

    return Array.from(seen.values());
  }, [allRecords]);

  const currencyOptions = useMemo(() => {
    const unique = new Set<string>();
    allRecords.forEach(record => {
      if (record.currencyValue) {
        unique.add(record.currencyValue);
      }
    });
    return Array.from(unique.values());
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    const filtered = applyStatementsFilters<TopSpenderRecord>(allRecords, appliedFilters);
    const query = searchInput.trim().toLowerCase();
    if (!query) return filtered;

    return filtered.filter(record => {
      return (
        record.company.toLowerCase().includes(query) ||
        (record.sender || '').toLowerCase().includes(query) ||
        (record.subject || '').toLowerCase().includes(query) ||
        (record.bankName || '').toLowerCase().includes(query)
      );
    });
  }, [allRecords, appliedFilters, searchInput]);

  const aggregatedRows = useMemo<AggregateRow[]>(() => {
    const aggregate = new Map<string, AggregateRow>();

    filteredRecords.forEach(record => {
      const normalizedCompany = (record.company || '').trim() || 'Unknown';
      const key = `${record.sourceType}:${normalizedCompany.toLowerCase()}`;
      const existing = aggregate.get(key);
      const date = record.dateValue || record.createdAt || '';

      if (!existing) {
        aggregate.set(key, {
          id: key,
          company: normalizedCompany,
          sourceType: record.sourceType,
          count: 1,
          total: record.amount,
          average: record.amount,
          lastDate: date,
          currency: resolveCurrencyCode(record.currencyValue, workspaceCurrency),
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
    });

    return Array.from(aggregate.values()).sort((a, b) => b.total - a.total);
  }, [filteredRecords, workspaceCurrency]);

  const totals = useMemo(() => {
    const statementTotal = filteredRecords
      .filter(record => record.sourceType === 'statement')
      .reduce((sum, record) => sum + record.amount, 0);
    const receiptTotal = filteredRecords
      .filter(record => record.sourceType === 'gmail')
      .reduce((sum, record) => sum + record.amount, 0);

    return {
      total: statementTotal + receiptTotal,
      statementTotal,
      receiptTotal,
      operations: filteredRecords.length,
    };
  }, [filteredRecords]);

  const topCompaniesChart = useMemo(() => {
    const top = aggregatedRows.slice(0, 12).reverse();
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 120, right: 20, top: 20, bottom: 20 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: top.map(item => item.company),
      },
      series: [
        {
          type: 'bar',
          data: top.map(item => Number(item.total.toFixed(2))),
          itemStyle: {
            color: resolvedTheme === 'dark' ? '#38BDF8' : '#0EA5E9',
            borderRadius: [4, 4, 4, 4],
          },
        },
      ],
    };
  }, [aggregatedRows, resolvedTheme]);

  const sourceChart = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: { top: 'bottom' },
      series: [
        {
          type: 'pie',
          radius: ['35%', '72%'],
          data: [
            { name: labels.sourceStatement, value: Number(totals.statementTotal.toFixed(2)) },
            { name: labels.sourceGmail, value: Number(totals.receiptTotal.toFixed(2)) },
          ],
        },
      ],
    };
  }, [labels.sourceGmail, labels.sourceStatement, totals.receiptTotal, totals.statementTotal]);

  const trendChart = useMemo(() => {
    const points = new Map<string, number>();
    filteredRecords.forEach(record => {
      const rawDate = record.dateValue || record.createdAt || '';
      if (!rawDate) return;
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) return;
      const dateKey = parsed.toISOString().split('T')[0];
      points.set(dateKey, (points.get(dateKey) || 0) + record.amount);
    });

    const sorted = Array.from(points.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 30, right: 30, bottom: 30, top: 30 },
      xAxis: { type: 'category', data: sorted.map(point => point.date) },
      yAxis: { type: 'value' },
      series: [
        {
          name: labels.totalSpend,
          type: 'line',
          smooth: true,
          data: sorted.map(point => Number(point.amount.toFixed(2))),
          areaStyle: {
            color: resolvedTheme === 'dark' ? 'rgba(56,189,248,0.16)' : 'rgba(14,165,233,0.14)',
          },
          lineStyle: { color: resolvedTheme === 'dark' ? '#38BDF8' : '#0EA5E9' },
          itemStyle: { color: resolvedTheme === 'dark' ? '#38BDF8' : '#0EA5E9' },
        },
      ],
    };
  }, [filteredRecords, labels.totalSpend, resolvedTheme]);

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
    saveTopSpendersFilters(draftFilters);
  };

  const applyAndClose = (close: () => void) => {
    applyFilterChanges();
    close();
  };

  const resetAndClose = (key: keyof StatementFilters, close: () => void) => {
    const next = resetSingleStatementFilter(draftFilters, key);
    setDraftFilters(next);
    setAppliedFilters(next);
    saveTopSpendersFilters(next);
    close();
  };

  const resetAllFilters = () => {
    setDraftFilters(DEFAULT_STATEMENT_FILTERS);
    setAppliedFilters(DEFAULT_STATEMENT_FILTERS);
    saveTopSpendersFilters(DEFAULT_STATEMENT_FILTERS);
  };

  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <div className="container-shared flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 shrink-0 space-y-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{labels.title}</h1>
          <p className="text-sm text-gray-500">{labels.subtitle}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder={labels.searchPlaceholder}
              aria-label={labels.searchPlaceholder}
              className="w-full rounded-md border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
                    labels.type
                  : labels.type}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
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
                  ? `${labels.status} (${draftFilters.statuses.length})`
                  : labels.status}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
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
                    : labels.date}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
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
                  ? `${labels.from} (${draftFilters.from.length})`
                  : labels.from}
                <ChevronDown className="h-3.5 w-3.5" />
              </FilterChipButton>
            }
            applyLabel={labels.apply}
            resetLabel={labels.reset}
          />

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
            {labels.filters}
            {activeFilterCount > 0 ? (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingAnimation size="lg" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
            {labels.noData}
          </div>
        ) : (
          <div className="space-y-4 pb-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {labels.totalSpend}
                  </span>
                  <ArrowDown className="h-4 w-4 text-red-500" />
                </div>
                <div className="mt-2 text-lg font-semibold text-red-600">
                  {formatMoney(totals.total, workspaceCurrency)}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {labels.statementsSpend}
                  </span>
                  <ChartPie className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 text-lg font-semibold text-primary">
                  {formatMoney(totals.statementTotal, workspaceCurrency)}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {labels.receiptsSpend}
                  </span>
                  <ArrowUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-2 text-lg font-semibold text-emerald-600">
                  {formatMoney(totals.receiptTotal, workspaceCurrency)}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {labels.totalOperations}
                  </span>
                  <span className="text-xs font-medium text-gray-500">#</span>
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900">{totals.operations}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{labels.spendTrend}</h3>
                </div>
                <ReactECharts
                  style={{ height: 300 }}
                  option={trendChart}
                  notMerge
                  lazyUpdate
                  theme={chartTheme}
                />
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{labels.sourceSplit}</h3>
                </div>
                <ReactECharts
                  style={{ height: 300 }}
                  option={sourceChart}
                  notMerge
                  lazyUpdate
                  theme={chartTheme}
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{labels.topCompanies}</h3>
              </div>
              <ReactECharts
                style={{ height: 320 }}
                option={topCompaniesChart}
                notMerge
                lazyUpdate
                theme={chartTheme}
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{labels.leaderboard}</h3>
                <span className="text-xs text-gray-500">{aggregatedRows.length}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-4">{labels.company}</th>
                      <th className="py-2 pr-4">{labels.source}</th>
                      <th className="py-2 pr-4 text-right">{labels.operations}</th>
                      <th className="py-2 pr-4 text-right">{labels.average}</th>
                      <th className="py-2 pr-4 text-right">{labels.amount}</th>
                      <th className="py-2 text-right">{labels.lastOperation}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {aggregatedRows.slice(0, 60).map(row => (
                      <tr key={row.id} className="text-gray-700">
                        <td className="py-2 pr-4 font-medium text-gray-900">{row.company}</td>
                        <td className="py-2 pr-4">
                          {row.sourceType === 'gmail' ? labels.sourceGmail : labels.sourceStatement}
                        </td>
                        <td className="py-2 pr-4 text-right">{row.count}</td>
                        <td className="py-2 pr-4 text-right">
                          {formatMoney(row.average, workspaceCurrency)}
                        </td>
                        <td className="py-2 pr-4 text-right font-semibold text-gray-900">
                          {formatMoney(row.total, workspaceCurrency)}
                        </td>
                        <td className="py-2 text-right text-gray-500">
                          {row.lastDate && !Number.isNaN(new Date(row.lastDate).getTime())
                            ? new Date(row.lastDate).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <FiltersDrawer
        open={filtersDrawerOpen}
        onClose={() => {
          setFiltersDrawerOpen(false);
          setFiltersDrawerScreen('root');
        }}
        filters={draftFilters}
        screen={filtersDrawerScreen}
        onBack={() => setFiltersDrawerScreen('root')}
        onSelect={screen => setFiltersDrawerScreen(screen)}
        onUpdateFilters={updateFilter}
        onResetAll={resetAllFilters}
        onViewResults={() => {
          applyFilterChanges();
          setFiltersDrawerOpen(false);
          setFiltersDrawerScreen('root');
        }}
        typeOptions={typeOptions}
        statusOptions={statusOptions}
        datePresets={datePresets}
        dateModes={dateModes}
        fromOptions={fromOptions}
        toOptions={fromOptions}
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
          type: labels.type,
          from: labels.from,
          groupBy: filterOptionLabels.drawerGroupBy,
          has: filterOptionLabels.drawerHas,
          keywords: filterOptionLabels.drawerKeywords,
          limit: filterOptionLabels.drawerLimit,
          status: labels.status,
          to: filterOptionLabels.drawerTo,
          amount: filterOptionLabels.drawerAmount,
          approved: filterOptionLabels.drawerApproved,
          billable: filterOptionLabels.drawerBillable,
          currency: filterOptionLabels.hasCurrency,
          date: labels.date,
          exported: 'Exported',
          paid: 'Paid',
          any: filterOptionLabels.any,
          yes: filterOptionLabels.yes,
          no: filterOptionLabels.no,
        }}
        activeCount={activeFilterCount}
      />
    </div>
  );
}
