'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import apiClient from '@/app/lib/api';
import { getApiErrorStatus } from '@/app/lib/api-error';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';

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
  /** Current price of one unit, in the summary currency. */
  price: number;
  value: number;
}

export interface CryptoSummary {
  currency: string;
  portfolioValue: number;
  income: number;
  expense: number;
  walletCount: number;
  holdings: CryptoHolding[];
  /** Percent move against yesterday's prices; null when a price is missing. */
  portfolioChangeSinceYesterday: number | null;
}

export interface CryptoTransaction {
  id: string;
  date: string;
  walletId: string;
  walletLabel: string | null;
  walletAddress: string | null;
  walletChainName: string | null;
  direction: 'in' | 'out';
  asset: string | null;
  cryptoAmount: string | null;
  amount: number;
  currency: string;
  counterparty: string | null;
  txHash: string | null;
}

export type ChainFamily = 'evm' | 'tron' | 'bitcoin' | 'solana';

export interface CryptoNetwork {
  chainId: number;
  name: string;
  family: ChainFamily;
  nativeAsset: string;
}

const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const TRON_ADDRESS_PATTERN = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const BITCOIN_BECH32_PATTERN = /^(bc1[02-9ac-hj-np-z]{11,71}|BC1[02-9AC-HJ-NP-Z]{11,71})$/;
const BITCOIN_BASE58_PATTERN = /^[13][1-9A-HJ-NP-Za-km-z]{25,33}$/;
const SOLANA_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * The network family an address looks like, for the connect form. It goes by shape
 * only; the server has the final word (it checks Bitcoin and Tron checksums and
 * the length of a Solana key), so a rare look-alike is rejected there, not booked.
 */
export function addressFamily(address: string): ChainFamily | null {
  if (EVM_ADDRESS_PATTERN.test(address)) {
    return 'evm';
  }
  if (TRON_ADDRESS_PATTERN.test(address)) {
    return 'tron';
  }
  if (BITCOIN_BECH32_PATTERN.test(address) || BITCOIN_BASE58_PATTERN.test(address)) {
    return 'bitcoin';
  }
  if (SOLANA_PATTERN.test(address)) {
    return 'solana';
  }
  return null;
}

export function isSupportedAddress(address: string): boolean {
  return addressFamily(address) !== null;
}

interface UseCryptoState {
  wallets: CryptoWallet[];
  summary: CryptoSummary | null;
  transactions: CryptoTransaction[];
  networks: CryptoNetwork[];
  isPending: boolean;
  error: CryptoError;
  busyWalletId: string | null;
  connecting: boolean;
  refetch: () => void;
  connectWallet: (address: string, label?: string, chainIds?: number[]) => Promise<boolean>;
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

  const transactionsQuery = useQuery({
    queryKey: queryKeys.cryptoTransactions(workspaceId),
    queryFn: ({ signal }) => apiQuery<CryptoTransaction[]>({ url: '/crypto/transactions', signal }),
  });

  // Список сетей статичен на сервере — один запрос на сессию.
  const networksQuery = useQuery({
    queryKey: queryKeys.cryptoNetworks(workspaceId),
    queryFn: ({ signal }) => apiQuery<CryptoNetwork[]>({ url: '/crypto/networks', signal }),
    staleTime: Number.POSITIVE_INFINITY,
  });

  // Общий префикс ключа: одна инвалидация сметает и кошельки, и сводку.
  const invalidateCrypto = useCallback((): Promise<void> => {
    return queryClient.invalidateQueries({ queryKey: ['crypto'] });
  }, [queryClient]);

  const connectMutation = useMutation({
    mutationFn: (variables: { address: string; label?: string; chainIds?: number[] }) =>
      apiClient.post('/crypto/wallets', {
        address: variables.address,
        chainIds: variables.chainIds,
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
    async (address: string, label?: string, chainIds?: number[]): Promise<boolean> => {
      return await connectMutation
        .mutateAsync({ address, label, chainIds })
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

  // «Повторить» снимает и ошибку упавшего синка/удаления: иначе плашка висела бы
  // над уже перезагруженными данными.
  const refetch = useCallback((): void => {
    syncMutation.reset();
    removeMutation.reset();
    void walletsQuery.refetch();
    void summaryQuery.refetch();
    void transactionsQuery.refetch();
  }, [
    syncMutation.reset,
    removeMutation.reset,
    walletsQuery.refetch,
    summaryQuery.refetch,
    transactionsQuery.refetch,
  ]);

  const loadFailed = walletsQuery.isError || summaryQuery.isError;
  const mutationFailed = syncMutation.isError || removeMutation.isError;

  return {
    wallets: walletsQuery.data ?? [],
    summary: summaryQuery.data ?? null,
    transactions: transactionsQuery.data ?? [],
    networks: networksQuery.data ?? [],
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
