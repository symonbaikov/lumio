'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useState } from 'react';

export type InsightSeverity = 'info' | 'warn' | 'critical';

export interface Insight {
  id: string;
  type: string;
  category: string;
  severity: InsightSeverity;
  title: string;
  message: string;
  messageKey: string | null;
  messageParams: Record<string, string | number> | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

interface UseInsightsOptions {
  /** Which severities to keep. Alerts and advice are the same feed, split here. */
  severities: InsightSeverity[];
  /**
   * Recompute before reading. Reserved for the page a user opens on purpose —
   * running the analyzers on every page view would be wasted work.
   */
  refreshFirst?: boolean;
}

interface UseInsightsState {
  items: Insight[];
  loading: boolean;
  dismiss: (id: string) => Promise<void>;
  reload: () => void;
}

export function useInsights({
  severities,
  refreshFirst = false,
}: UseInsightsOptions): UseInsightsState {
  const { currentWorkspace } = useWorkspace();
  const [items, setItems] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const key = severities.join(',');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (refreshFirst) {
        await apiClient.post('/insights/refresh');
      }
      const response = await apiClient.get('/insights', { params: { limit: 50 } });
      const payload = response.data?.data ?? response.data;
      const wanted = new Set(key.split(','));
      setItems((payload?.items ?? []).filter((item: Insight) => wanted.has(item.severity)));
    } catch {
      // Insights are advisory. A failure here must not take a page down with
      // it, so the feed simply stays empty.
      setItems([]);
    } finally {
      setLoading(false);
    }
    // Workspace id is a real dependency — the feed is workspace-scoped, so
    // switching must refetch — but the linter cannot see it in the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshFirst, currentWorkspace?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const dismiss = useCallback(async (id: string) => {
    setItems(current => current.filter(item => item.id !== id));
    try {
      await apiClient.post(`/insights/${id}/dismiss`);
    } catch {
      // Already removed from view; the next load will bring it back if the
      // server disagreed.
    }
  }, []);

  return { items, loading, dismiss, reload: load };
}
