'use client';

import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError } from '../utils/pasteUtils';
import type { AggregateFn, AggregateSelection } from './useTableAggregates';

export interface TableGroup {
  key: string | null;
  count: number;
  aggregates: Array<{ col: string; fn: AggregateFn; value: number | string | null }>;
}

interface UseTableGroupsParams {
  tableId: string | null;
  isAuthenticated: boolean;
  /** Пусто — группировка выключена, запрос не идёт. */
  groupBy: string | null;
  /** Те же фильтры, что у грида: группы обязаны совпадать с выборкой. */
  combinedFiltersParam: string | undefined;
  /** Итоги считаются внутри каждой группы теми же функциями, что и в подвале. */
  aggregates: AggregateSelection;
  refreshToken?: number;
}

export interface UseTableGroupsReturn {
  groups: TableGroup[];
  loading: boolean;
}

function parseGroupItems(responseData: unknown): TableGroup[] {
  const root = (responseData ?? {}) as Record<string, unknown>;
  const nested = (root.data ?? {}) as Record<string, unknown>;
  const items = root.items ?? nested.items ?? [];
  return Array.isArray(items) ? (items as TableGroup[]) : [];
}

export function useTableGroups({
  tableId,
  isAuthenticated,
  groupBy,
  combinedFiltersParam,
  aggregates,
  refreshToken = 0,
}: UseTableGroupsParams): UseTableGroupsReturn {
  const [groups, setGroups] = useState<TableGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const aggsKey = Object.entries(aggregates)
    .map(([col, fn]) => ({ col, fn }))
    .sort((a, b) => a.col.localeCompare(b.col));
  const aggsParam = aggsKey.length ? JSON.stringify(aggsKey) : undefined;

  const load = useCallback(async () => {
    if (!(tableId && isAuthenticated && groupBy)) {
      setGroups([]);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const response = await apiClient.get(`/custom-tables/${tableId}/groups`, {
        signal: controller.signal,
        params: { groupBy, aggs: aggsParam, filters: combinedFiltersParam },
      });
      if (controller.signal.aborted) {
        return;
      }
      setGroups(parseGroupItems(response.data));
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('Failed to load table groups:', error);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, [tableId, isAuthenticated, groupBy, aggsParam, combinedFiltersParam]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { groups, loading };
}
