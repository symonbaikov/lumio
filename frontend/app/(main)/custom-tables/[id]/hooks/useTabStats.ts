'use client';

import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError } from '../utils/pasteUtils';

function readRowsTotal(response: unknown): number {
  const data =
    response !== null &&
    typeof response === 'object' &&
    'data' in response &&
    typeof (response as Record<string, unknown>).data === 'object'
      ? ((response as Record<string, unknown>).data as Record<string, unknown>)
      : null;
  const meta =
    data !== null && typeof data === 'object' && 'meta' in data
      ? (data.meta as Record<string, unknown>)
      : null;
  const itemsLength =
    data !== null &&
    typeof data === 'object' &&
    'items' in data &&
    Array.isArray((data as Record<string, unknown>).items)
      ? ((data as Record<string, unknown>).items as unknown[]).length
      : undefined;
  const totalCandidate =
    meta?.total ?? (data as Record<string, unknown> | null)?.total ?? itemsLength;
  return typeof totalCandidate === 'number' ? totalCandidate : 0;
}

export interface TabCounts {
  total: number;
  paid: number | null;
  unpaid: number | null;
}

export interface UseTabStatsReturn {
  tabCounts: TabCounts;
  refreshStats: () => Promise<void>;
}

interface UseTabStatsParams {
  tableId: string | null;
  isAuthenticated: boolean;
  paidColKey: string | null;
}

export function useTabStats({
  tableId,
  isAuthenticated,
  paidColKey,
}: UseTabStatsParams): UseTabStatsReturn {
  const [tabCounts, setTabCounts] = useState<TabCounts>({
    total: 0,
    paid: null,
    unpaid: null,
  });
  const statsRequestSeqRef = useRef(0);
  const statsAbortControllerRef = useRef<AbortController | null>(null);

  const fetchTotalOnly = async (signal: AbortSignal): Promise<TabCounts> => {
    const response = await apiClient.get(`/custom-tables/${tableId}/rows`, {
      signal,
      params: { limit: 1 },
    });
    return { total: readRowsTotal(response), paid: null, unpaid: null };
  };

  const fetchAllStats = async (signal: AbortSignal, colKey: string): Promise<TabCounts> => {
    const [totalRes, paidRes, unpaidRes] = await Promise.all([
      apiClient.get(`/custom-tables/${tableId}/rows`, { signal, params: { limit: 1 } }),
      apiClient.get(`/custom-tables/${tableId}/rows`, {
        signal,
        params: { limit: 1, filters: JSON.stringify([{ col: colKey, op: 'eq', value: true }]) },
      }),
      apiClient.get(`/custom-tables/${tableId}/rows`, {
        signal,
        params: { limit: 1, filters: JSON.stringify([{ col: colKey, op: 'eq', value: false }]) },
      }),
    ]);
    return {
      total: readRowsTotal(totalRes),
      paid: readRowsTotal(paidRes),
      unpaid: readRowsTotal(unpaidRes),
    };
  };

  const refreshStats = useCallback(async () => {
    if (!(tableId && isAuthenticated)) {
      return;
    }
    statsRequestSeqRef.current += 1;
    const requestId = statsRequestSeqRef.current;
    statsAbortControllerRef.current?.abort();
    const controller = new AbortController();
    statsAbortControllerRef.current = controller;
    const fetchCounts = paidColKey
      ? () => fetchAllStats(controller.signal, paidColKey)
      : () => fetchTotalOnly(controller.signal);

    await (async () => {
      const counts = await fetchCounts();
      if (requestId === statsRequestSeqRef.current) {
        setTabCounts(counts);
      }
    })()
      .catch(async error => {
        if (!isAbortError(error)) {
          console.error('Failed to fetch table stats:', error);
        }
      })
      .finally(async () => {
        if (statsAbortControllerRef.current === controller) {
          statsAbortControllerRef.current = null;
        }
      });
  }, [paidColKey, tableId, isAuthenticated, fetchAllStats, fetchTotalOnly]);

  // Auto-refresh when params change
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Abort in-flight requests on unmount
  useEffect(() => {
    return () => {
      statsAbortControllerRef.current?.abort();
    };
  }, []);

  return { tabCounts, refreshStats };
}
