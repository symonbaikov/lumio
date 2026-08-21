'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useState } from 'react';

export interface CryptoWallet {
  id: string;
  address: string;
  chainId: number;
  chainName: string;
  label: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  transactionCount: number;
}

export interface CryptoHolding {
  asset: string;
  amount: string;
  value: number;
}

export interface CryptoSummary {
  currency: string;
  portfolioValue: number;
  income: number;
  expense: number;
  walletCount: number;
  holdings: CryptoHolding[];
}

export const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

interface UseCryptoState {
  wallets: CryptoWallet[];
  summary: CryptoSummary | null;
  loading: boolean;
  error: string | null;
  busyWalletId: string | null;
  connecting: boolean;
  reload: () => Promise<void>;
  connectWallet: (address: string, label?: string) => Promise<boolean>;
  syncWallet: (id: string) => Promise<void>;
  removeWallet: (id: string) => Promise<void>;
}

export function useCrypto(): UseCryptoState {
  const { currentWorkspace } = useWorkspace();
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [summary, setSummary] = useState<CryptoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyWalletId, setBusyWalletId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [walletsResponse, summaryResponse] = await Promise.all([
        apiClient.get('/crypto/wallets'),
        apiClient.get('/crypto/summary'),
      ]);
      setWallets(walletsResponse.data?.data ?? walletsResponse.data ?? []);
      setSummary(summaryResponse.data?.data ?? summaryResponse.data ?? null);
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
    // Crypto wallets are workspace-scoped, so switching workspaces must refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const connectWallet = useCallback(
    async (address: string, label?: string) => {
      setConnecting(true);
      setError(null);
      try {
        await apiClient.post('/crypto/wallets', {
          address,
          label: label?.trim() ? label.trim() : undefined,
        });
        await load();
        return true;
      } catch (caught) {
        // A duplicate address is the one failure worth naming: the user can fix it.
        const status = (caught as { response?: { status?: number } })?.response?.status;
        setError(status === 409 ? 'duplicate' : 'failed');
        return false;
      } finally {
        setConnecting(false);
      }
    },
    [load],
  );

  const runForWallet = useCallback(
    async (id: string, request: () => Promise<unknown>) => {
      setBusyWalletId(id);
      setError(null);
      try {
        await request();
        await load();
      } catch {
        setError('failed');
      } finally {
        setBusyWalletId(null);
      }
    },
    [load],
  );

  const syncWallet = useCallback(
    (id: string) => runForWallet(id, () => apiClient.post(`/crypto/wallets/${id}/sync`)),
    [runForWallet],
  );

  const removeWallet = useCallback(
    (id: string) => runForWallet(id, () => apiClient.delete(`/crypto/wallets/${id}`)),
    [runForWallet],
  );

  return {
    wallets,
    summary,
    loading,
    error,
    busyWalletId,
    connecting,
    reload: load,
    connectWallet,
    syncWallet,
    removeWallet,
  };
}
