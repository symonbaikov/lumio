'use client';

import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useState } from 'react';

export type DashboardRange = '7d' | '30d' | '90d';

export interface DashboardFinancialSnapshot {
  totalBalance: number;
  income30d: number;
  expense30d: number;
  netFlow30d: number;
  totalPayable: number;
  totalOverdue: number;
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
  type: 'statement_upload' | 'payment' | 'categorization' | 'transaction';
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

export interface DashboardData {
  snapshot: DashboardFinancialSnapshot;
  actions: DashboardActionItem[];
  cashFlow: DashboardCashFlowPoint[];
  topMerchants: DashboardTopMerchant[];
  topCategories: DashboardTopCategory[];
  recentActivity: DashboardRecentActivity[];
  role: 'owner' | 'admin' | 'member' | 'viewer';
  range: DashboardRange;
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

export function useDashboard(initialRange: DashboardRange = '30d') {
  const [range, setRange] = useState<DashboardRange>(initialRange);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (r: DashboardRange = range) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get('/dashboard', { params: { range: r } });
        const payload = response.data?.data || response.data;
        setData(payload);
      } catch (err: unknown) {
        const apiError = err as { response?: { data?: { message?: string } } };
        setError(apiError?.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    },
    [range],
  );

  useEffect(() => {
    load();
  }, [load]);

  const changeRange = useCallback(
    (newRange: DashboardRange) => {
      setRange(newRange);
      void load(newRange);
    },
    [load],
  );

  return { data, loading, error, refresh: load, range, changeRange };
}
