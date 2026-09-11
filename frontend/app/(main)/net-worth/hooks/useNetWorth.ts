'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import apiClient from '@/app/lib/api';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';

export type NetWorthRange = '30d' | '90d' | '1y' | '5y' | 'all';

export const NET_WORTH_RANGES: NetWorthRange[] = ['30d', '90d', '1y', '5y', 'all'];

export interface NetWorthPoint {
  date: string;
  value: number;
}

export interface NetWorthBreakdownItem {
  code: string;
  name: string;
  amount: number;
  percent: number;
}

export type CapitalRole = 'income' | 'neutral' | 'drain';
export type RiskLevel = 'low' | 'medium' | 'high';

export const CAPITAL_ROLES: CapitalRole[] = ['income', 'neutral', 'drain'];
export const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high'];

/** The share of assets above which the 80/20 rule is considered broken. */
export const RISKY_ALLOCATION_THRESHOLD = 20;

export interface NetWorthClassificationItem {
  key: string | null;
  amount: number;
  percent: number;
}

export interface NetWorthAssetLine {
  id: string;
  code: string;
  name: string;
  amount: number;
  capitalRole: CapitalRole | null;
  riskLevel: RiskLevel | null;
  isClassifiable: boolean;
}

export interface NetWorthData {
  range: NetWorthRange;
  currency: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number | null;
  assetsTotal: number;
  liabilitiesTotal: number;
  series: NetWorthPoint[];
  breakdown: NetWorthBreakdownItem[];
  byRisk: NetWorthClassificationItem[];
  byRole: NetWorthClassificationItem[];
  riskyPercent: number;
  assetLines: NetWorthAssetLine[];
}

export type ClassificationPatch = {
  capitalRole?: CapitalRole | null;
  riskLevel?: RiskLevel | null;
};

interface NetWorthState {
  data: NetWorthData | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: boolean;
  range: NetWorthRange;
  setRange: (range: NetWorthRange) => void;
  refetch: () => void;
  classify: (accountId: string, patch: ClassificationPatch) => void;
}

function applyPatch(
  data: NetWorthData,
  accountId: string,
  patch: ClassificationPatch,
): NetWorthData {
  return {
    ...data,
    assetLines: data.assetLines.map(line => (line.id === accountId ? { ...line, ...patch } : line)),
  };
}

export function useNetWorth(initialRange: NetWorthRange = '90d'): NetWorthState {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<NetWorthRange>(initialRange);

  const queryKey = queryKeys.netWorth({ workspaceId, range });

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      apiQuery<NetWorthData>({ url: '/reports/net-worth', params: { range }, signal }),
    // Смена периода не должна гасить карточки: данные прошлого запроса живут
    // на экране до прихода новых, но только внутри того же воркспейса.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === workspaceId ? previous : undefined,
  });

  const classifyMutation = useMutation({
    mutationFn: (variables: { accountId: string; patch: ClassificationPatch }) =>
      apiClient.patch(
        `/reports/balance/accounts/${variables.accountId}/classification`,
        variables.patch,
      ),
    // Выбор в селекте применяется сразу, иначе он «откатывается» на время
    // запроса; проценты и сводки пересчитывает сервер — их ждём.
    onMutate: (variables: { accountId: string; patch: ClassificationPatch }) => {
      queryClient.setQueryData<NetWorthData>(queryKey, previous =>
        previous ? applyPatch(previous, variables.accountId, variables.patch) : previous,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['net-worth', workspaceId] }),
  });

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  const classify = useCallback(
    (accountId: string, patch: ClassificationPatch): void => {
      classifyMutation.mutate({ accountId, patch });
    },
    [classifyMutation.mutate],
  );

  return {
    data: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching || classifyMutation.isPending,
    error: query.isError || classifyMutation.isError,
    range,
    setRange,
    refetch,
    classify,
  };
}
