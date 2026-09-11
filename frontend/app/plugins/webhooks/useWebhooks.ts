'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import apiClient from '@/app/lib/api';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';

export interface WebhookEndpoint {
  id: string;
  name: string;
  tokenPreview: string;
  isActive: boolean;
  defaultWalletId: string | null;
  defaultBranchId: string | null;
  createdAt: string;
}

export interface WebhookEndpointFull extends WebhookEndpoint {
  token: string; // only on creation
}

export interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export function useWebhookEndpoints() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const [newToken, setNewToken] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.webhookEndpoints(workspaceId),
    queryFn: ({ signal }) => apiQuery<WebhookEndpoint[]>({ url: '/webhook-endpoints', signal }),
  });

  const invalidate = useCallback((): Promise<void> => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.webhookEndpoints(workspaceId) });
  }, [queryClient, workspaceId]);

  const createMutation = useMutation({
    mutationFn: (name: string) => apiClient.post('/webhook-endpoints', { name }),
    onSuccess: response => {
      setNewToken((response.data as WebhookEndpointFull).token);
      toast.success('Webhook endpoint created');
    },
    onError: () => toast.error('Failed to create webhook endpoint'),
    onSettled: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/webhook-endpoints/${id}`),
    onSuccess: () => toast.success('Webhook endpoint deleted'),
    onError: () => toast.error('Failed to delete webhook endpoint'),
    onSettled: invalidate,
  });

  const toggleMutation = useMutation({
    mutationFn: (variables: { id: string; isActive: boolean }) =>
      apiClient.patch(`/webhook-endpoints/${variables.id}`, { isActive: !variables.isActive }),
    onError: () => toast.error('Failed to update webhook endpoint'),
    onSettled: invalidate,
  });

  const load = useCallback(async () => {
    await invalidate();
  }, [invalidate]);

  const create = useCallback(
    async (name: string) => {
      createMutation.mutate(name);
    },
    [createMutation.mutate],
  );

  const remove = useCallback(
    async (id: string) => {
      removeMutation.mutate(id);
    },
    [removeMutation.mutate],
  );

  const toggle = useCallback(
    async (id: string, isActive: boolean) => {
      toggleMutation.mutate({ id, isActive });
    },
    [toggleMutation.mutate],
  );

  return {
    endpoints: query.data ?? [],
    loading: query.isPending,
    newToken,
    setNewToken,
    load,
    create,
    remove,
    toggle,
  };
}

export function useWebhookSubscriptions() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.webhookSubscriptions(workspaceId),
    queryFn: ({ signal }) =>
      apiQuery<WebhookSubscription[]>({ url: '/webhook-subscriptions', signal }),
  });

  const invalidate = useCallback((): Promise<void> => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.webhookSubscriptions(workspaceId),
    });
  }, [queryClient, workspaceId]);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; url: string; secret: string; events: string[] }) =>
      apiClient.post('/webhook-subscriptions', data),
    onSuccess: () => toast.success('Webhook subscription created'),
    onError: () => toast.error('Failed to create webhook subscription'),
    onSettled: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/webhook-subscriptions/${id}`),
    onSuccess: () => toast.success('Webhook subscription deleted'),
    onError: () => toast.error('Failed to delete webhook subscription'),
    onSettled: invalidate,
  });

  const load = useCallback(async () => {
    await invalidate();
  }, [invalidate]);

  const create = useCallback(
    async (data: { name: string; url: string; secret: string; events: string[] }) => {
      createMutation.mutate(data);
    },
    [createMutation.mutate],
  );

  const remove = useCallback(
    async (id: string) => {
      removeMutation.mutate(id);
    },
    [removeMutation.mutate],
  );

  const testPing = useCallback(async (id: string) => {
    await (async () => {
      await apiClient.post(`/webhook-subscriptions/${id}/test`);
      toast.success('Test delivery queued');
    })().catch(async () => {
      toast.error('Failed to send test ping');
    });
  }, []);

  return {
    subscriptions: query.data ?? [],
    loading: query.isPending,
    load,
    create,
    remove,
    testPing,
  };
}
