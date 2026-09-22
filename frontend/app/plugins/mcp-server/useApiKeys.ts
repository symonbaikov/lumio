'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import apiClient from '@/app/lib/api';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreatedApiKey {
  id: string;
  key: string;
  prefix: string;
  name: string;
  createdAt: string;
}

export function useApiKeys() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [newKey, setNewKey] = useState<CreatedApiKey | null>(null);
  // Эндпоинт закрыт правом api_key.manage (есть только у admin), а хук висит в
  // топбаре на каждой странице — без права запрос давал бы 403 при каждой загрузке.
  const canManageKeys = hasPermission('api_key.manage');

  const query = useQuery({
    queryKey: queryKeys.apiKeys(workspaceId),
    // Ошибка не показывается отдельно — индикатор статуса и так станет красным.
    queryFn: ({ signal }) => apiQuery<ApiKeyItem[]>({ url: '/api-keys', signal }),
    enabled: canManageKeys,
  });

  const keys = query.data ?? [];

  const createMutation = useMutation({
    mutationFn: (name: string) => apiClient.post('/api-keys', { name }),
    onSuccess: response => {
      setNewKey(response.data as CreatedApiKey);
      toast.success('API key created');
    },
    onError: () => toast.error('Failed to create API key'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys(workspaceId) }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api-keys/${id}`),
    onSuccess: (_response, id) => {
      queryClient.setQueryData<ApiKeyItem[]>(queryKeys.apiKeys(workspaceId), previous =>
        (previous ?? []).filter(k => k.id !== id),
      );
      toast.success('API key revoked');
    },
    onError: () => toast.error('Failed to revoke API key'),
  });

  const create = useCallback(
    async (name: string) => {
      createMutation.mutate(name);
    },
    [createMutation.mutate],
  );

  const revoke = useCallback(
    async (id: string) => {
      revokeMutation.mutate(id);
    },
    [revokeMutation.mutate],
  );

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys(workspaceId) });
  }, [queryClient, workspaceId]);

  const clearNewKey = useCallback(() => setNewKey(null), []);

  const isActive = keys.length > 0;

  return {
    keys,
    // Без права запрос не стартует, и query навсегда остался бы в pending.
    loading: canManageKeys && query.isPending,
    newKey,
    isActive,
    create,
    revoke,
    clearNewKey,
    reload,
  };
}
