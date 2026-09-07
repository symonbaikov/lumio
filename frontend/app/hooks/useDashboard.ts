'use client';

import { getApiErrorMessage } from '@/app/lib/api-error';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { DashboardData, DashboardRange, DashboardTrends } from './useDashboard.types';
import { useWorkspaceId } from './useWorkspaceId';

export type {
  DashboardActionItem,
  DashboardCashFlowPoint,
  DashboardData,
  DashboardDataHealth,
  DashboardFinancialSnapshot,
  DashboardNotification,
  DashboardRange,
  DashboardRecentTransaction,
  DashboardTopCategory,
  DashboardTopMerchant,
  DashboardTrends,
} from './useDashboard.types';

interface TrendsState {
  data: DashboardTrends | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
}

interface DashboardState {
  data: DashboardData | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
  range: DashboardRange;
  changeRange: (newRange: DashboardRange) => void;
  targetDate: string | null;
  changeTargetDate: (newDate: string | null) => void;
}

/**
 * Данные предыдущего запроса переживают смену ключа только внутри одного
 * воркспейса: перезагрузка того же воркспейса (смена месяца, refresh) оставляет
 * графики на экране, а переключение воркспейса обнуляет их.
 *
 * Голый keepPreviousData здесь недопустим — он на кадр показал бы балансы
 * воркспейса A под названием воркспейса B (workspaceId — второй сегмент ключа).
 */

export function useDashboardTrends(days = 30): TrendsState {
  const workspaceId = useWorkspaceId();
  const query = useQuery({
    queryKey: queryKeys.dashboardTrends({ workspaceId, days }),
    queryFn: ({ signal }) =>
      apiQuery<DashboardTrends>({ url: '/dashboard/trends', params: { days }, signal }),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === workspaceId ? previous : undefined,
  });

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  return {
    data: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.isError ? getApiErrorMessage(query.error, 'Failed to load trends') : null,
    refetch,
  };
}

export function useDashboard(
  controlledRange: DashboardRange = '30d',
  controlledDate?: string,
): DashboardState {
  const workspaceId = useWorkspaceId();
  const [range, setRange] = useState<DashboardRange>(controlledRange);
  const [targetDate, setTargetDate] = useState<string | null>(controlledDate ?? null);

  // Controlled props win over local state, but are adopted during render
  // rather than in an effect so a month change costs one render, not three.
  const [seenControlled, setSeenControlled] = useState({ controlledRange, controlledDate });
  if (
    seenControlled.controlledRange !== controlledRange ||
    seenControlled.controlledDate !== controlledDate
  ) {
    setSeenControlled({ controlledRange, controlledDate });
    setRange(controlledRange);
    setTargetDate(controlledDate ?? null);
  }

  const query = useQuery({
    queryKey: queryKeys.dashboard({ workspaceId, range, date: targetDate }),
    queryFn: ({ signal }) => {
      const params: Record<string, string> = { range };
      if (targetDate) params.date = targetDate;
      return apiQuery<DashboardData>({ url: '/dashboard', params, signal });
    },
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === workspaceId ? previous : undefined,
  });

  const changeRange = useCallback((newRange: DashboardRange): void => {
    setRange(newRange);
  }, []);
  const changeTargetDate = useCallback((newDate: string | null): void => {
    setTargetDate(newDate);
  }, []);
  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  return {
    data: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.isError ? getApiErrorMessage(query.error, 'Failed to load dashboard') : null,
    refetch,
    range,
    changeRange,
    targetDate,
    changeTargetDate,
  };
}
