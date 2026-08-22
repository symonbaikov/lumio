/**
 * Data-loading helpers for StatementsSidePanel.
 */
import apiClient from '@/app/lib/api';
import { getTopBankSenders } from '@/app/lib/statement-insights';
import { countStatementStages, getStatementStageMap } from '@/app/lib/statement-workflow';
import { buildUnapprovedStatementQueue } from './unapproved-cash-utils';

export interface StageCounts {
  submit: number;
  approve: number;
  unapprovedCash: number;
}

export const EMPTY_STAGE_COUNTS: StageCounts = { submit: 0, approve: 0, unapprovedCash: 0 };

export interface StatementListItem {
  id?: string;
  bankName?: string | null;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  status?: string | null;
  errorMessage?: string | null;
  fileType?: string | null;
  parsingDetails?: { importPreview?: { source?: string | null } | null } | null;
}

export interface TransactionListItem {
  id: string;
  counterpartyName?: string | null;
  transactionType?: string | null;
  currency?: string | null;
  isVerified?: boolean | null;
  isDuplicate?: boolean | null;
  duplicateOfId?: string | null;
  categoryId?: string | null;
  category?: { id?: string | null } | null;
  transactionDate?: string | Date | null;
  amount?: number | string | null;
  debit?: number | string | null;
  credit?: number | string | null;
}

export const resolveCloudConnectionStatus = (
  result: PromiseSettledResult<{ data?: { connected?: unknown; active?: unknown } }>,
): boolean => {
  if (result.status !== 'fulfilled') {
    return false;
  }
  const data = result.value?.data;
  return Boolean(data?.connected ?? data?.active);
};

type PageResult = { batch: unknown[]; total: number };

const extractPageData = (responseData: { data?: unknown; total?: unknown }): {
  items: unknown;
  total: number | undefined;
} => ({
  items: responseData?.data || responseData,
  total: responseData?.total as number | undefined,
});

const fetchPage = async (endpoint: string, page: number, pageSize: number): Promise<PageResult> => {
  const response = await apiClient.get(endpoint, { params: { page, limit: pageSize } });
  const { items, total: rawTotal } = extractPageData(response.data);
  const batch = Array.isArray(items) ? items : [];
  const total = Number(rawTotal ?? batch.length);
  return { batch, total };
};

type FetchState = { acc: unknown[]; page: number; pageSize: number; total: number };

const fetchNextPages = async (endpoint: string, state: FetchState): Promise<unknown[]> => {
  if (state.acc.length >= state.total) {
    return state.acc;
  }
  const { batch, total: newTotal } = await fetchPage(endpoint, state.page, state.pageSize);
  const next = [...state.acc, ...batch];
  if (batch.length < state.pageSize) {
    return next;
  }
  return fetchNextPages(endpoint, {
    acc: next,
    page: state.page + 1,
    pageSize: state.pageSize,
    total: newTotal,
  });
};

export const fetchAllPages = async (endpoint: string): Promise<unknown[]> => {
  const pageSize = 500;
  const { batch, total } = await fetchPage(endpoint, 1, pageSize);
  if (batch.length >= total || batch.length < pageSize) {
    return batch;
  }
  return fetchNextPages(endpoint, { acc: batch, page: 2, pageSize, total });
};

type StatementMeta = {
  id: string;
  fileName: null;
  bankName: string | null;
  status: string | null | undefined;
  errorMessage: string | null | undefined;
  fileType: string | null | undefined;
  currency: null;
  totalDebit: number | string | null;
  totalCredit: number | string | null;
  statementDateFrom: null;
  statementDateTo: null;
  createdAt: null;
  sourceHint: string | null;
};

const getSourceHint = (s: StatementListItem): string | null =>
  s.parsingDetails?.importPreview?.source ?? null;

const toStatementMeta = (s: StatementListItem): StatementMeta => ({
  id: s.id as string,
  fileName: null,
  bankName: s.bankName ?? null,
  status: s.status,
  errorMessage: s.errorMessage,
  fileType: s.fileType,
  currency: null,
  totalDebit: s.totalDebit ?? null,
  totalCredit: s.totalCredit ?? null,
  statementDateFrom: null,
  statementDateTo: null,
  createdAt: null,
  sourceHint: getSourceHint(s),
});

export const buildUnapprovedCount = (
  allStatements: StatementListItem[],
  transactions: TransactionListItem[],
): number => {
  const statements = allStatements.filter(s => Boolean(s.id)).map(toStatementMeta);
  return buildUnapprovedStatementQueue({ statements, transactions }).length;
};

type StageCountsResult = {
  counts: StageCounts;
  topBankSenders: ReturnType<typeof getTopBankSenders>;
  uniqueMerchantsCount: number;
  topCategoriesCount: number;
  unapprovedCashCount: number;
};

const loadTopCategoriesCount = async (): Promise<number> => {
  const res = await apiClient.get('/reports/top-categories', {
    params: { type: 'expense', limit: 100 },
  });
  return Array.isArray(res.data?.categories) ? res.data.categories.length : 0;
};

const loadMerchantsAndUnapproved = async (
  allStatements: StatementListItem[],
): Promise<{ uniqueMerchantsCount: number; unapprovedCashCount: number }> => {
  const transactions = (await fetchAllPages('/transactions')) as TransactionListItem[];
  const uniqueMerchantsCount = new Set(
    transactions.map(item => (item.counterpartyName || '').trim().toLowerCase()).filter(Boolean),
  ).size;
  const unapprovedCashCount = buildUnapprovedCount(allStatements, transactions);
  return { uniqueMerchantsCount, unapprovedCashCount };
};

export const loadStageCounts = async (): Promise<StageCountsResult> => {
  const allStatements = (await fetchAllPages('/statements')) as StatementListItem[];
  const statementIds = allStatements.map(s => s.id).filter((id): id is string => Boolean(id));
  const counts = countStatementStages(
    statementIds,
    getStatementStageMap(),
  ) as unknown as StageCounts;
  const topBankSenders = getTopBankSenders(allStatements, 5);
  const [{ uniqueMerchantsCount, unapprovedCashCount }, topCategoriesCount] = await Promise.all([
    loadMerchantsAndUnapproved(allStatements),
    loadTopCategoriesCount(),
  ]);
  return { counts, topBankSenders, uniqueMerchantsCount, topCategoriesCount, unapprovedCashCount };
};
