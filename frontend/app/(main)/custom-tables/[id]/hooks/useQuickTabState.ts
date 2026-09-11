'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildQuickTabs,
  getActiveTabFilter,
  normalizeActiveTabId,
  type QuickTab,
} from '../utils/quickTabs';
import { tx } from '../utils/tableHelpers';
import type { TabCounts } from './useTabStats';

interface UseQuickTabStateParams {
  paidColKey: string | null;
  t: unknown;
  tabCounts: TabCounts;
  columnsTabId: string;
}

export interface UseQuickTabStateReturn {
  quickTabs: QuickTab[];
  normalizedActiveTabId: string;
  activeTabFilter: ReturnType<typeof getActiveTabFilter>;
  activeTabId: string;
  setActiveTabId: React.Dispatch<React.SetStateAction<string>>;
}

function buildTabLabels(t: unknown): { all: string; paid: string; unpaid: string } {
  return {
    all: tx(t, ['tabs', 'all'], 'All'),
    paid: tx(t, ['tabs', 'paid'], 'Paid'),
    unpaid: tx(t, ['tabs', 'unpaid'], 'Unpaid'),
  };
}

export function useQuickTabState({
  paidColKey,
  t,
  tabCounts,
  columnsTabId,
}: UseQuickTabStateParams): UseQuickTabStateReturn {
  const [activeTabId, setActiveTabId] = useState('all');

  const quickTabs = useMemo<QuickTab[]>(() => {
    const labels = buildTabLabels(t);
    const counts = { paid: tabCounts.paid ?? 0, unpaid: tabCounts.unpaid ?? 0 };
    return buildQuickTabs({ labels, paidColKey, tabCounts: counts });
  }, [paidColKey, t, tabCounts.paid, tabCounts.unpaid]);

  const normalizedActiveTabId = useMemo(
    () => normalizeActiveTabId(activeTabId, quickTabs, columnsTabId),
    [activeTabId, quickTabs, columnsTabId],
  );

  useEffect(() => {
    if (normalizedActiveTabId !== activeTabId) {
      setActiveTabId(normalizedActiveTabId);
    }
  }, [activeTabId, normalizedActiveTabId]);

  const activeTabFilter = useMemo(
    () => getActiveTabFilter(normalizedActiveTabId, quickTabs, columnsTabId),
    [normalizedActiveTabId, quickTabs, columnsTabId],
  );

  return { quickTabs, normalizedActiveTabId, activeTabFilter, activeTabId, setActiveTabId };
}
