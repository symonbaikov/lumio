'use client';

import apiClient from '@/app/lib/api';
import { type MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';

export type DashboardRange = '7d' | '30d' | '90d' | 'month';

export interface DashboardFinancialSnapshot {
  totalBalance: number;
  income30d: number;
  expense30d: number;
  netFlow30d: number;
  totalPayable: number;
  totalOverdue: number;
  unapprovedCash: number;
  currency: string;
}

export interface DashboardActionItem {
  type: string;
  count: number;
  label: string;
  href: string;
}

export interface DashboardCashFlowPoint {
  date: string;
  income: number;
  expense: number;
}

export interface DashboardRecentTransaction {
  id: string;
  description: string;
  /** Signed: positive for income, negative for expense. */
  amount: number;
  currency: string;
  /** Calendar date (YYYY-MM-DD), no time component. */
  date: string;
  /** e.g. "Kaspi •••• 4821" — bank name plus masked account number. */
  account: string;
  categoryId: string | null;
  /** `null` means uncategorized — render the localized "Uncategorized" label. */
  categoryName: string | null;
  categoryColor: string;
  categoryIcon: string | null;
}

export interface DashboardTopCategory {
  id: string | null;
  /** `null` means uncategorized — render the localized "Uncategorized" label. */
  name: string | null;
  /** True only for the synthetic rollup of everything past the top categories. */
  isOther?: boolean;
  color: string;
  icon: string | null;
  amount: number;
  /** Share of total spend for the period, 0-100. Sums to 100 across the array. */
  percent: number;
  count: number;
}

export interface DashboardTopMerchant {
  name: string;
  amount: number;
  count: number;
}

export interface DashboardDataHealth {
  uncategorizedTransactions: number;
  statementsWithErrors: number;
  statementsPendingReview: number;
  statementsPendingSubmit: number;
  receiptsPendingReview: number;
  unapprovedCash: number;
  lastUploadDate: string | null;
  parsingWarnings: number;
}

export interface DashboardData {
  snapshot: DashboardFinancialSnapshot;
  actions: DashboardActionItem[];
  cashFlow: DashboardCashFlowPoint[];
  topMerchants: DashboardTopMerchant[];
  topCategories: DashboardTopCategory[];
  recentTransactions: DashboardRecentTransaction[];
  role: 'owner' | 'admin' | 'member' | 'viewer';
  range: DashboardRange;
  dataHealth: DashboardDataHealth;
  effectiveEndDate?: string;
  effectiveSince?: string;
}

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  severity: 'info' | 'warn' | 'error';
  isRead: boolean;
  type: string;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
}

export interface DashboardTrends {
  dailyTrend: Array<{ date: string; income: number; expense: number }>;
  forecast: Array<{ date: string; income: number; expense: number }>;
  categories: Array<{ name: string; amount: number; count: number }>;
  counterparties: Array<{ name: string; amount: number; count: number }>;
  sources: {
    statements: { income: number; expense: number; rows: number };
  };
  effectiveEndDate?: string;
  effectiveSince?: string;
}

interface TrendsState {
  data: DashboardTrends | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  range: DashboardRange;
  changeRange: (newRange: DashboardRange) => void;
  targetDate: string | null;
  changeTargetDate: (newDate: string | null) => void;
}

const extractApiError = (err: unknown): string => {
  const apiError = err as { response?: { data?: { message?: string } } };
  return apiError?.response?.data?.message ?? 'Failed to load data';
};

export function useDashboardTrends(days = 30): TrendsState {
  const { currentWorkspace } = useWorkspace();
  const [data, setData] = useState<DashboardTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await apiClient.get('/dashboard/trends', { params: { days } });
      setData(res.data?.data || res.data);
    } catch (err: unknown) {
      setError(extractApiError(err).replace('Failed to load data', 'Failed to load trends'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, currentWorkspace?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, refresh: load };
}

async function fetchDashboardData(
  range: DashboardRange,
  date: string | null,
): Promise<DashboardData> {
  const params: Record<string, string> = { range };
  if (date) params.date = date;
  const response = await apiClient.get('/dashboard', { params });
  return response.data?.data || response.data;
}

interface DashboardLoadSetters {
  setData: (v: DashboardData | null) => void;
  setError: (v: string | null) => void;
  setLoading: (v: boolean) => void;
  requestIdRef: MutableRefObject<number>;
}

async function executeDashboardLoad(
  r: DashboardRange,
  date: string | null,
  setters: DashboardLoadSetters,
): Promise<void> {
  const { setData, setError, setLoading, requestIdRef } = setters;
  const requestId = ++requestIdRef.current;
  setLoading(true);
  setError(null);
  setData(null);
  try {
    const payload = await fetchDashboardData(r, date);
    if (requestId === requestIdRef.current) setData(payload);
  } catch (err: unknown) {
    if (requestId === requestIdRef.current) {
      setError(extractApiError(err).replace('Failed to load data', 'Failed to load dashboard'));
    }
  } finally {
    if (requestId === requestIdRef.current) setLoading(false);
  }
}

export function useDashboard(
  controlledRange: DashboardRange = '30d',
  controlledDate?: string,
): DashboardState {
  const { currentWorkspace } = useWorkspace();
  const [range, setRange] = useState<DashboardRange>(controlledRange);
  const [targetDate, setTargetDate] = useState<string | null>(controlledDate ?? null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const setters: DashboardLoadSetters = { setData, setError, setLoading, requestIdRef };

  const load = useCallback(
    (r: DashboardRange = range, date: string | null = targetDate): void => {
      void executeDashboardLoad(r, date, setters);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range, targetDate, currentWorkspace?.id],
  );

  useEffect(() => {
    setRange(controlledRange);
  }, [controlledRange]);
  useEffect(() => {
    setTargetDate(controlledDate ?? null);
  }, [controlledDate]);
  useEffect(() => {
    load(range, targetDate);
  }, [load, range, targetDate]);

  const changeRange = useCallback((newRange: DashboardRange): void => {
    setRange(newRange);
  }, []);
  const changeTargetDate = useCallback((newDate: string | null): void => {
    setTargetDate(newDate);
  }, []);

  return {
    data,
    loading,
    error,
    refresh: (): void => {
      load(range, targetDate);
    },
    range,
    changeRange,
    targetDate,
    changeTargetDate,
  };
}
