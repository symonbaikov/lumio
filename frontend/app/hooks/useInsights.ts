'use client';

import apiClient from '@/app/lib/api';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';
import {
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { useWorkspaceId } from './useWorkspaceId';

export type InsightSeverity = 'info' | 'warn' | 'critical';

export interface Insight {
  id: string;
  type: string;
  category: string;
  severity: InsightSeverity;
  title: string;
  message: string;
  messageKey: string | null;
  messageParams: Record<string, string | number> | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

interface InsightsPayload {
  items?: Insight[];
}

interface UseInsightsOptions {
  /** Which severities to keep. Alerts and advice are the same feed, split here. */
  severities: InsightSeverity[];
}

interface UseInsightsState {
  items: Insight[];
  isPending: boolean;
  dismiss: (id: string) => void;
  refetch: () => void;
}

/**
 * Один ключ на всех потребителей: AlertBanner (на каждом маршруте) и страница
 * советов запрашивают один и тот же GET /insights?limit=50 и различаются только
 * клиентским фильтром по severity — поэтому фильтр живёт в select, а не в ключе.
 */
export function useInsights({ severities }: UseInsightsOptions): UseInsightsState {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const key = severities.join(',');

  // select обязан быть референциально стабильным: инлайн-стрелка пересчитывала бы
  // фильтр на каждый рендер и отдавала новый массив, отменяя structural sharing.
  const selectBySeverity = useCallback(
    (payload: InsightsPayload): Insight[] => {
      const wanted = new Set(key.split(','));
      return (payload?.items ?? []).filter(item => wanted.has(item.severity));
    },
    [key],
  );

  const query = useQuery({
    queryKey: queryKeys.insights(workspaceId),
    queryFn: ({ signal }) =>
      apiQuery<InsightsPayload>({ url: '/insights', params: { limit: 50 }, signal }),
    select: selectBySeverity,
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/insights/${id}/dismiss`),
    onMutate: async (id: string) => {
      const queryKey = queryKeys.insights(workspaceId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<InsightsPayload>(queryKey);
      queryClient.setQueryData<InsightsPayload>(queryKey, current =>
        current ? { ...current, items: (current.items ?? []).filter(i => i.id !== id) } : current,
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.insights(workspaceId), context.previous);
      }
    },
    onSettled: () => {
      // Уже убрано из вида; следующая загрузка вернёт элемент, если сервер не согласен.
      void queryClient.invalidateQueries({ queryKey: queryKeys.insights(workspaceId) });
    },
  });

  const dismiss = useCallback(
    (id: string): void => {
      dismissMutation.mutate(id);
    },
    [dismissMutation.mutate],
  );

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  // Инсайты — вспомогательные. Сбой не должен ронять страницу, поэтому ошибка
  // наружу не отдаётся и лента просто остаётся пустой.
  return { items: query.data ?? [], isPending: query.isPending, dismiss, refetch };
}

/**
 * Пересчёт аналитики перед чтением. Вынесен из запроса: внутри queryFn он делал
 * бы её нечистой и потребовал бы положить флаг в ключ, разделив общий кэш.
 * Дёргается только на странице, которую пользователь открыл намеренно.
 */
export function useRefreshInsights(): UseMutationResult<unknown, Error, void> {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/insights/refresh'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.insights(workspaceId) }),
  });
}
