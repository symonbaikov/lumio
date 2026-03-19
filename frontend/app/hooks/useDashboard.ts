'use client';

import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useRef, useState } from 'react';

export type DashboardRange = '7d' | '30d' | '90d';

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

export interface DashboardRecentActivity {
  id: string;
  type:
    | 'statement_upload'
    | 'payment'
    | 'categorization'
    | 'transaction'
    | 'import'
    | 'delete'
    | 'update';
  title: string;
  description: string | null;
  amount: number | null;
  timestamp: string;
  href: string;
}

export interface DashboardTopCategory {
  id: string | null;
  name: string;
  amount: number;
  transactions: number;
  percentage: number;
  count?: number;
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
  recentActivity: DashboardRecentActivity[];
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
  categories: Array<{ name: string; amount: number; count: number }>;
  counterparties: Array<{ name: string; amount: number; count: number }>;
  sources: {
    statements: { income: number; expense: number; rows: number };
  };
  effectiveEndDate?: string;
  effectiveSince?: string;
}

export function useDashboardTrends(days = 30) {
  const [data, setData] = useState<DashboardTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/dashboard/trends', { params: { days } });
      setData(res.data?.data || res.data);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError?.response?.data?.message || 'Failed to load trends');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, refresh: load };
}

export function useDashboard(controlledRange: DashboardRange = '30d', controlledDate?: string) {
  const [range, setRange] = useState<DashboardRange>(controlledRange);
  const [targetDate, setTargetDate] = useState<string | null>(controlledDate ?? null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (r: DashboardRange = range, date: string | null = targetDate) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const params: Record<string, string> = { range: r };
        if (date) {
          params.date = date;
        }
        const response = await apiClient.get('/dashboard', { params });
        const payload = response.data?.data || response.data;

        if (requestId !== requestIdRef.current) {
          return;
        }

        setData(payload);
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        const apiError = err as { response?: { data?: { message?: string } } };
        setError(apiError?.response?.data?.message || 'Failed to load dashboard');
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [range, targetDate],
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

  const changeRange = useCallback(
    (newRange: DashboardRange) => {
      setRange(newRange);
    },
    [],
  );

  const changeTargetDate = useCallback(
    (newDate: string | null) => {
      setTargetDate(newDate);
    },
    [],
  );

  return {
    data,
    loading,
    error,
    refresh: () => load(range, targetDate),
    range,
    changeRange,
    targetDate,
    changeTargetDate,
  };
}
