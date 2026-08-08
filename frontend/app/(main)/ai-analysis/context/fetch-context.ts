import apiClient from '@/app/lib/api';
import type { ContextInput } from './build-context';

/**
 * Reads the workspace summary from the existing dashboard endpoints.
 *
 * These are already workspace-scoped and covered by tests, so the AI feature
 * adds no new query surface over financial data — it reuses the same aggregates
 * the dashboard renders.
 */

interface DashboardResponse {
  snapshot: {
    totalBalance: number;
    income30d: number;
    expense30d: number;
    netFlow30d: number;
    currency: string;
  };
  cashFlow: Array<{ date: string; income: number; expense: number }>;
  topMerchants: Array<{ name: string; amount: number; count: number }>;
  topCategories: Array<{ name: string; amount: number; count: number }>;
  dataHealth?: { uncategorizedTransactions?: number };
}

interface TrendsResponse {
  counterparties: Array<{ name: string; amount: number; count: number }>;
}

const RANGE = '90d';
const TREND_DAYS = 90;

export async function fetchContextInput(): Promise<ContextInput> {
  const [dashboard, trends] = await Promise.all([
    apiClient.get<DashboardResponse>('/dashboard', { params: { range: RANGE } }),
    apiClient.get<TrendsResponse>('/dashboard/trends', { params: { days: TREND_DAYS } }),
  ]);

  return {
    snapshot: dashboard.data.snapshot,
    topCategories: dashboard.data.topCategories ?? [],
    topMerchants: dashboard.data.topMerchants ?? [],
    incomeSources: trends.data.counterparties ?? [],
    cashFlow: dashboard.data.cashFlow ?? [],
    uncategorizedTransactions: dashboard.data.dataHealth?.uncategorizedTransactions ?? 0,
  };
}

export interface SearchHit {
  transactionId: string;
  counterpartyName: string;
  paymentPurpose: string;
  transactionDate: string;
  amount: number | null;
  currency: string;
  score: number;
}

export interface SearchResult {
  hits: SearchHit[];
  truncated: boolean;
  pendingEmbeddings: number;
}

/**
 * Pulls the transactions most similar to the question.
 *
 * Aggregates answer "how much on food", but not "when did I last pay the
 * pharmacy" — that needs the individual rows.
 */
export async function searchTransactions(query: string, limit = 8): Promise<SearchResult> {
  const response = await apiClient.post<SearchResult>('/ai-analysis/search', { query, limit });
  return response.data;
}
