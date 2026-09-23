'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  closeAppPanel,
  closeAppPanelItem,
  openAppPanelItem,
  useAppPanelState,
} from '@/app/components/panels/app-panels-store';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import apiClient from '@/app/lib/api';
import { queryKeys } from '@/app/lib/query-keys';
import { IntegrationDetailDrawer } from './IntegrationDetailDrawer';
import { IntegrationsListDrawer } from './IntegrationsListDrawer';
import { findIntegrationEntry, INTEGRATION_CATALOG } from './integration-catalog';

/** Different endpoints answer with `connected` or with a `status` string. */
async function readConnected(statusPath: string): Promise<boolean> {
  return apiClient
    .get(statusPath)
    .then(response => {
      const data = response.data ?? {};
      return Boolean(data?.connected) || String(data?.status).toLowerCase() === 'connected';
    })
    .catch(() => false);
}

function useConnectionStatuses(enabled: boolean): {
  statuses: Record<string, boolean>;
  refresh: () => void;
} {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.integrationCatalogStatuses(workspaceId);

  const query = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const entries = INTEGRATION_CATALOG.filter(entry => entry.statusPath);
      const pairs = await Promise.all(
        entries.map(
          async entry => [entry.key, await readConnected(entry.statusPath ?? '')] as const,
        ),
      );
      return Object.fromEntries(pairs) as Record<string, boolean>;
    },
  });

  const refresh = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return { statuses: query.data ?? {}, refresh };
}

export function IntegrationsPanel(): React.JSX.Element {
  const { panel, item } = useAppPanelState();
  const open = panel === 'integrations';
  const { statuses, refresh } = useConnectionStatuses(open);

  return (
    <>
      <IntegrationsListDrawer
        open={open}
        statuses={statuses}
        onSelect={openAppPanelItem}
        onClose={closeAppPanel}
      />
      <IntegrationDetailDrawer
        entry={open ? findIntegrationEntry(item) : undefined}
        onBack={closeAppPanelItem}
        onClose={closeAppPanel}
        onConnectionChange={refresh}
      />
    </>
  );
}
