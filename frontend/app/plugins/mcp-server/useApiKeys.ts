'use client';

import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

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
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<CreatedApiKey | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api-keys');
      setKeys(res.data as ApiKeyItem[]);
    } catch {
      // silently fail — status indicator will show red
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (name: string) => {
      try {
        const res = await apiClient.post('/api-keys', { name });
        setNewKey(res.data as CreatedApiKey);
        await load();
        toast.success('API key created');
      } catch {
        toast.error('Failed to create API key');
      }
    },
    [load],
  );

  const revoke = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/api-keys/${id}`);
      setKeys(prev => prev.filter(k => k.id !== id));
      toast.success('API key revoked');
    } catch {
      toast.error('Failed to revoke API key');
    }
  }, []);

  const clearNewKey = useCallback(() => setNewKey(null), []);

  const isActive = keys.length > 0;

  return { keys, loading, newKey, isActive, create, revoke, clearNewKey, reload: load };
}
