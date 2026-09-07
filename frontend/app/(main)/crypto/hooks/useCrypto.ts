'use client';

import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import apiClient from '@/app/lib/api';
import { getApiErrorStatus } from '@/app/lib/api-error';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

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
  isPending: boolean;
  error: CryptoError;
  busyWalletId: string | null;
  connecting: boolean;
  refetch: () => void;
  connectWallet: (address: string, label?: string) => Promise<boolean>;
  syncWallet: (id: string) => void;
  removeWallet: (id: string) => void;
}

/** Доменный словарь страницы: дубликат адреса пользователь может исправить сам. */
type CryptoError = 'duplicate' | 'failed' | null;

function resolveConnectError(error: unknown): CryptoError {
  if (!error) return null;
  return getApiErrorStatus(error) === 409 ? 'duplicate' : 'failed';
}

/** Вложенные тернарники запрещены Biome — отсюда отдельный хелпер. */
function resolveBusyWalletId(
  sync: { isPending: boolean; variables?: string },
  remove: { isPending: boolean; variables?: string },
): string | null {
  if (sync.isPending) return sync.variables ?? null;
  if (remove.isPending) return remove.variables ?? null;
  return null;
}

export function useCrypto(): UseCryptoState {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  const walletsQuery = useQuery({
    queryKey: queryKeys.cryptoWallets(workspaceId),
    queryFn: ({ signal }) => apiQuery<CryptoWallet[]>({ url: '/crypto/wallets', signal }),
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.cryptoSummary(workspaceId),
    queryFn: ({ signal }) => apiQuery<CryptoSummary>({ url: '/crypto/summary', signal }),
  });

  // Общий префикс ключа: одна инвалидация сметает и кошельки, и сводку.
  const invalidateCrypto = useCallback((): Promise<void> => {
    return queryClient.invalidateQueries({ queryKey: ['crypto'] });
  }, [queryClient]);

  const connectMutation = useMutation({
    mutationFn: (variables: { address: string; label?: string }) =>
      apiClient.post('/crypto/wallets', {
        address: variables.address,
        label: variables.label?.trim() ? variables.label.trim() : undefined,
      }),
    onSuccess: invalidateCrypto,
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/crypto/wallets/${id}/sync`),
    onSuccess: invalidateCrypto,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/crypto/wallets/${id}`),
    onSuccess: invalidateCrypto,
  });

  const connectWallet = useCallback(
    async (address: string, label?: string): Promise<boolean> => {
      return await connectMutation
        .mutateAsync({ address, label })
        .then(() => true)
        .catch(() => false);
    },
    [connectMutation.mutateAsync],
  );

  const syncWallet = useCallback(
    (id: string): void => {
      syncMutation.mutate(id);
    },
    [syncMutation.mutate],
  );

  const removeWallet = useCallback(
    (id: string): void => {
      removeMutation.mutate(id);
    },
    [removeMutation.mutate],
  );

  const refetch = useCallback((): void => {
    void walletsQuery.refetch();
    void summaryQuery.refetch();
  }, [walletsQuery.refetch, summaryQuery.refetch]);

  const loadFailed = walletsQuery.isError || summaryQuery.isError;
  const mutationFailed = syncMutation.isError || removeMutation.isError;

  return {
    wallets: walletsQuery.data ?? [],
    summary: summaryQuery.data ?? null,
    isPending: walletsQuery.isPending || summaryQuery.isPending,
    error:
      resolveConnectError(connectMutation.error) ??
      (loadFailed || mutationFailed ? 'failed' : null),
    busyWalletId: resolveBusyWalletId(syncMutation, removeMutation),
    connecting: connectMutation.isPending,
    refetch,
    connectWallet,
    syncWallet,
    removeWallet,
  };
}
