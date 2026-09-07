'use client';

import apiClient from '@/app/lib/api';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { IntegrationStatus, IntegrationStatusMessages } from '../types';

export type UseIntegrationStatusConfig = {
  /** The API route segment, e.g. 'gmail', 'dropbox', 'google-drive' */
  apiPath: string;
  /** User object — status is loaded only when truthy (checked for truthiness only) */
  user: object | null | undefined;
  messages: IntegrationStatusMessages;
};

export type UseIntegrationStatusResult = {
  status: IntegrationStatus | null;
  loading: boolean;
  saving: boolean;
  syncing: boolean;
  loadStatus: () => Promise<void>;
  handleConnect: () => Promise<void>;
  handleDisconnect: () => Promise<void>;
  handleSync: () => Promise<void>;
};

// eslint-disable-next-line max-lines-per-function
export function useIntegrationStatus({
  apiPath,
  user,
  messages,
}: UseIntegrationStatusConfig): UseIntegrationStatusResult {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const base = `/integrations/${apiPath}`;

  const loadStatus = useCallback(async () => {
    await (async () => {
      setLoading(true);
      const response = await apiClient.get(`${base}/status`);
      setStatus(response.data);
    })()
      .catch(async () => {
        toast.error(messages.errors.loadStatus);
      })
      .finally(async () => {
        setLoading(false);
      });
  }, [base, messages.errors.loadStatus]);

  useEffect(() => {
    if (user) {
      void loadStatus();
    }
  }, [user, loadStatus]);

  useEffect(() => {
    // eslint-disable-next-line complexity
    const handleCallback = (): void => {
      const successParam = messages.successCallbackParam ?? 'connected';
      const statusParam = searchParams.get('status');
      if (statusParam === successParam || statusParam === 'success') {
        toast.success(messages.toasts.connected);
      }
      if (statusParam === 'error') {
        if (messages.onCallbackError) {
          const reason = searchParams.get('reason') ?? undefined;
          messages.onCallbackError(reason);
        } else {
          toast.error(messages.errors.connectFailed);
        }
      }
    };
    handleCallback();
  }, [searchParams, messages]);

  const handleConnect = useCallback(async () => {
    return await (async () => {
      toast.success(messages.toasts.connecting);
      const response = await apiClient.get(`${base}/connect`);
      const url = response.data?.url as string | undefined;
      if (!url) {
        toast.error(messages.errors.connectFailed);
        return;
      }
      window.location.href = url;
    })().catch(async () => {
      toast.error(messages.errors.connectFailed);
    });
  }, [base, messages]);

  const handleDisconnect = useCallback(async () => {
    await (async () => {
      setSaving(true);
      await apiClient.post(`${base}/disconnect`);
      toast.success(messages.toasts.disconnected);
      await loadStatus();
    })()
      .catch(async () => {
        toast.error(messages.errors.disconnectFailed);
      })
      .finally(async () => {
        setSaving(false);
      });
  }, [base, messages, loadStatus]);

  const handleSync = useCallback(async () => {
    await (async () => {
      setSyncing(true);
      await apiClient.post(`${base}/sync`);
      toast.success(messages.toasts.syncStarted);
      await loadStatus();
    })()
      .catch(async () => {
        toast.error(messages.errors.syncFailed);
      })
      .finally(async () => {
        setSyncing(false);
      });
  }, [base, messages, loadStatus]);

  return {
    status,
    loading,
    saving,
    syncing,
    loadStatus,
    handleConnect,
    handleDisconnect,
    handleSync,
  };
}
