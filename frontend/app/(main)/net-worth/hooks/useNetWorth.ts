'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useState } from 'react';

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

interface NetWorthState {
  data: NetWorthData | null;
  loading: boolean;
  error: string | null;
  range: NetWorthRange;
  setRange: (range: NetWorthRange) => void;
  refresh: () => void;
  classify: (
    accountId: string,
    patch: { capitalRole?: CapitalRole | null; riskLevel?: RiskLevel | null },
  ) => Promise<void>;
}

export function useNetWorth(initialRange: NetWorthRange = '90d'): NetWorthState {
  const { currentWorkspace } = useWorkspace();
  const [range, setRange] = useState<NetWorthRange>(initialRange);
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/reports/net-worth', { params: { range } });
      setData(response.data?.data ?? response.data);
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
    // currentWorkspace is a dependency because the report is workspace-scoped
    // and switching workspaces must refetch rather than show stale numbers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, currentWorkspace?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const classify = useCallback(
    async (
      accountId: string,
      patch: { capitalRole?: CapitalRole | null; riskLevel?: RiskLevel | null },
    ) => {
      // Reloading rather than patching locally: the change moves every
      // percentage on the page, not just the row that was edited.
      await apiClient.patch(`/reports/balance/accounts/${accountId}/classification`, patch);
      await load();
    },
    [load],
  );

  return { data, loading, error, range, setRange, refresh: load, classify };
}
