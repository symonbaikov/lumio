'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/app/lib/api';
import toast from 'react-hot-toast';

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
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/webhook-endpoints');
      setEndpoints(res.data as WebhookEndpoint[]);
    } catch {
      toast.error('Failed to load webhook endpoints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (name: string) => {
    try {
      const res = await apiClient.post('/webhook-endpoints', { name });
      setNewToken((res.data as WebhookEndpointFull).token);
      await load();
      toast.success('Webhook endpoint created');
    } catch {
      toast.error('Failed to create webhook endpoint');
    }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/webhook-endpoints/${id}`);
      await load();
      toast.success('Webhook endpoint deleted');
    } catch {
      toast.error('Failed to delete webhook endpoint');
    }
  }, [load]);

  const toggle = useCallback(async (id: string, isActive: boolean) => {
    try {
      await apiClient.patch(`/webhook-endpoints/${id}`, { isActive: !isActive });
      await load();
    } catch {
      toast.error('Failed to update webhook endpoint');
    }
  }, [load]);

  return { endpoints, loading, newToken, setNewToken, load, create, remove, toggle };
}

export function useWebhookSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/webhook-subscriptions');
      setSubscriptions(res.data as WebhookSubscription[]);
    } catch {
      toast.error('Failed to load webhook subscriptions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (data: { name: string; url: string; secret: string; events: string[] }) => {
    try {
      await apiClient.post('/webhook-subscriptions', data);
      await load();
      toast.success('Webhook subscription created');
    } catch {
      toast.error('Failed to create webhook subscription');
    }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/webhook-subscriptions/${id}`);
      await load();
      toast.success('Webhook subscription deleted');
    } catch {
      toast.error('Failed to delete webhook subscription');
    }
  }, [load]);

  const testPing = useCallback(async (id: string) => {
    try {
      await apiClient.post(`/webhook-subscriptions/${id}/test`);
      toast.success('Test delivery queued');
    } catch {
      toast.error('Failed to send test ping');
    }
  }, []);

  return { subscriptions, loading, load, create, remove, testPing };
}
