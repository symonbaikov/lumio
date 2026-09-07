'use client';

import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import api from '@/app/lib/api';
import { queryKeys } from '@/app/lib/query-keys';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

export interface BulkUpdateCategoryVariables {
  txIds: string[];
  categoryId: string;
}

/**
 * Массовая смена категории. Инвалидация по префиксу ['transactions'] заменяет
 * ручной refetch() и заодно обновляет любой другой смонтированный список
 * транзакций, а не только тот, из которого пришёл вызов.
 */
export function useBulkUpdateCategory(): UseMutationResult<
  unknown,
  Error,
  BulkUpdateCategoryVariables
> {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: ({ txIds, categoryId }: BulkUpdateCategoryVariables) =>
      api.post('/transactions/bulk-update', {
        items: txIds.map(id => ({ id, updates: { categoryId } })),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories(workspaceId) });
    },
  });
}
