/**
 * Data-loading and action hooks for StatementsSidePanel.
 * Lives in .ts (not .tsx) so max-params rule allows up to 3 params.
 */
import apiClient from '@/app/lib/api';
import { payablesApi } from '@/app/lib/payables-api';
import {
  type OpenExpenseDrawerEventDetail,
  STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT,
  type StatementExpenseMode,
  resolveExpenseDrawerMode,
} from '@/app/lib/statement-expense-drawer';
import type { TopBankSender } from '@/app/lib/statement-insights';
import {
  type CloudImportProvider,
  type ConnectedCloudProviders,
} from '@/app/lib/statement-upload-actions';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { executeCloudImport, handleGmailSyncResponse } from './side-panel-actions';
import {
  EMPTY_STAGE_COUNTS,
  type StageCounts,
  loadStageCounts,
  resolveCloudConnectionStatus,
} from './side-panel-data';

export type StageData = {
  counts: StageCounts;
  topSenders: TopBankSender[];
  merchants: number;
  categories: number;
};

export const EMPTY_STAGE_DATA: StageData = {
  counts: EMPTY_STAGE_COUNTS,
  topSenders: [],
  merchants: 0,
  categories: 0,
};

type ActiveItem =
  | 'submit'
  | 'approve'
  | 'pay'
  | 'unapproved-cash'
  | 'spend-over-time'
  | 'top-spenders'
  | 'top-merchants'
  | 'top-categories'
  | 'transactions';

type StageCountsLoaderParams = {
  user: unknown;
  activeItem: ActiveItem;
  setData: (d: StageData) => void;
  setLoading: (v: boolean) => void;
};

export function useStageCountsLoader(p: StageCountsLoaderParams): void {
  const { user, activeItem, setData, setLoading } = p;
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    if (!user) {
      setLoading(false);
      return;
    }
    loadStageCounts()
      .then(result => {
        if (!isMounted) {
          return;
        }
        setData({
          counts: { ...result.counts, unapprovedCash: result.unapprovedCashCount },
          topSenders: result.topBankSenders,
          merchants: result.uniqueMerchantsCount,
          categories: result.topCategoriesCount,
        });
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setData(EMPTY_STAGE_DATA);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeItem]);
}

type PayCountLoaderParams = {
  user: unknown;
  workspaceId: string | undefined;
  setPayCount: (n: number) => void;
  setLoading: (v: boolean) => void;
};

export function usePayCountLoader(p: PayCountLoaderParams): void {
  const { user, workspaceId, setPayCount, setLoading } = p;
  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setPayCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    payablesApi
      .getSummary()
      .then(summary => {
        if (isMounted) {
          setPayCount((summary.toPayCount || 0) + (summary.overdueCount || 0));
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, workspaceId]);
}

type CloudProvidersLoaderParams = {
  user: unknown;
  setProviders: (v: ConnectedCloudProviders) => void;
};

export function useCloudProvidersLoader(p: CloudProvidersLoaderParams): void {
  const { user, setProviders } = p;
  useEffect(() => {
    let isMounted = true;
    if (!user) {
      return;
    }
    void Promise.allSettled([
      apiClient.get('/integrations/dropbox/status'),
      apiClient.get('/integrations/google-drive/status'),
      apiClient.get('/integrations/imap/status'),
    ]).then(([dropbox, gdrive, inbox]) => {
      if (!isMounted) {
        return;
      }
      setProviders({
        dropboxConnected: resolveCloudConnectionStatus(dropbox),
        googleDriveConnected: resolveCloudConnectionStatus(gdrive),
        gmailConnected: resolveCloudConnectionStatus(inbox),
      });
    });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
}

type PanelActionsParams = { activeItem: ActiveItem; connectedGmail: boolean };

export type PanelActions = {
  navigateToSubmit: (mode?: StatementExpenseMode) => void;
  handleScanClick: () => void;
  handleCloudImport: (provider: CloudImportProvider | null) => Promise<void>;
  handleGmailClick: () => void;
};

export function useStatementsPanelActions(p: PanelActionsParams): PanelActions {
  const { activeItem, connectedGmail } = p;
  const router = useRouter();

  const openExpenseDrawer = useCallback((mode: StatementExpenseMode): void => {
    if (typeof window === 'undefined') {
      return;
    }
    const detail: OpenExpenseDrawerEventDetail = { mode: resolveExpenseDrawerMode(mode) };
    window.dispatchEvent(new CustomEvent(STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT, { detail }));
  }, []);

  const navigateToSubmit = useCallback(
    (mode?: StatementExpenseMode): void => {
      if (activeItem === 'submit') {
        if (mode) {
          openExpenseDrawer(mode);
        }
        return;
      }
      router.push(`/statements/submit${mode ? `?openExpenseDrawer=${mode}` : ''}`);
    },
    [activeItem, openExpenseDrawer, router],
  );

  const handleScanClick = useCallback((): void => {
    navigateToSubmit('scan');
  }, [navigateToSubmit]);

  const handleCloudImport = useCallback(
    async (provider: CloudImportProvider | null): Promise<void> => {
      if (!provider) {
        router.push('/integrations');
        return;
      }
      await executeCloudImport(provider, navigateToSubmit);
    },
    [navigateToSubmit, router],
  );

  const handleGmailClick = useCallback((): void => {
    if (!connectedGmail) {
      router.push('/integrations/imap');
      return;
    }
    void apiClient
      .post('/integrations/imap/sync')
      .then(response => handleGmailSyncResponse(response, navigateToSubmit))
      .catch(() => toast.error('Failed to sync inbox'));
  }, [connectedGmail, navigateToSubmit, router]);

  return { navigateToSubmit, handleScanClick, handleCloudImport, handleGmailClick };
}
