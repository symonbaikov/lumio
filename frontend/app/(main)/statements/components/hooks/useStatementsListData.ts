import apiClient, { gmailReceiptsApi } from '@/app/lib/api';
import { resolveLabel } from '@/app/lib/side-panel-utils';
import { hasProcessingStatements } from '@/app/lib/statement-status';
import {
  type GmailSyncSkeletonMeta,
  STATEMENTS_GMAIL_SYNC_EVENT,
  STATEMENTS_GMAIL_SYNC_STORAGE_KEY,
} from '@/app/lib/statement-upload-actions';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { buildStatementRequestParams } from '../StatementsListView.utils';
import type { StatementFilters } from '../filters/statement-filters';
import { type GmailReceipt, hasGmailReceiptAmount } from '../gmail-receipt-mapping';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal shape required by the data-loading hook. */
interface StatementRecord {
  id: string;
  fileName: string;
  status: string;
}

interface UseStatementsListDataParams {
  appliedFilters: StatementFilters;
  search: string;
  stage: string;
  user: unknown;
  page: number;
  pageSize: number;
  router: AppRouterInstance;
  /** resolveLabel(t.loadListError, 'Failed to load statements') */
  loadListErrorLabel: string;
  /** resolveLabel(t.refreshFailed, 'Failed to refresh statements') */
  refreshFailedLabel: string;
}

export interface UseStatementsListDataResult<T extends StatementRecord = StatementRecord> {
  statements: T[];
  setStatements: React.Dispatch<React.SetStateAction<T[]>>;
  gmailReceipts: GmailReceipt[];
  loading: boolean;
  gmailLoading: boolean;
  gmailSyncSkeletonKeys: string[];
  setGmailSyncSkeletonKeys: React.Dispatch<React.SetStateAction<string[]>>;
  loadStatements: (opts?: {
    silent?: boolean;
    notifyOnCompletion?: boolean;
    search?: string;
    showErrorToast?: boolean;
  }) => Promise<boolean>;
  loadGmailReceipts: (opts?: { silent?: boolean; showErrorToast?: boolean }) => Promise<void>;
  refreshActiveStatements: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStatementsListData<T extends StatementRecord = StatementRecord>({
  appliedFilters,
  search,
  stage,
  user,
  page,
  pageSize,
  router,
  loadListErrorLabel,
  refreshFailedLabel,
}: UseStatementsListDataParams): UseStatementsListDataResult<T> {
  const [statements, setStatements] = useState<T[]>([]);
  const [gmailReceipts, setGmailReceipts] = useState<GmailReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailSyncSkeletonKeys, setGmailSyncSkeletonKeys] = useState<string[]>([]);

  const statementsRef = useRef<T[]>([]);
  const lastAutoOpenedIdRef = useRef<string | null>(null);

  const shouldPollStatements = useMemo(
    () =>
      hasProcessingStatements(
        statements as unknown as Parameters<typeof hasProcessingStatements>[0],
      ),
    [statements],
  );

  // Keep ref in sync for external callers that need non-stale access
  useEffect(() => {
    statementsRef.current = statements;
  }, [statements]);

  const buildGmailSyncSkeletonKeys = (count: number) =>
    Array.from({ length: count }, (_, index) => `gmail-sync-${Date.now()}-${index}`);

  const loadStatements = async (opts?: {
    silent?: boolean;
    notifyOnCompletion?: boolean;
    search?: string;
    showErrorToast?: boolean;
  }): Promise<boolean> => {
    const { silent, notifyOnCompletion, search: searchOverride, showErrorToast } = opts || {};
    if (!silent) setLoading(true);

    let didLoad = true;
    try {
      const response = await apiClient.get('/statements', {
        params: buildStatementRequestParams({ appliedFilters, search: searchOverride }),
      });

      const rawData = response.data?.data || response.data || [];
      const statementsWithFileType = rawData.map((stmt: StatementRecord) => ({
        ...stmt,
        fileType: stmt.fileName?.toLowerCase().includes('pdf') ? 'pdf' : 'file',
      })) as T[];
      setStatements(statementsWithFileType);

      if (notifyOnCompletion && Array.isArray(statementsWithFileType)) {
        const firstFinished = statementsWithFileType.find(s => s.status === 'parsed');
        if (firstFinished && lastAutoOpenedIdRef.current !== firstFinished.id) {
          lastAutoOpenedIdRef.current = firstFinished.id;
          router.push(`/statements/${firstFinished.id}/edit`);
        }
      }
    } catch (error) {
      didLoad = false;
      console.error('Failed to load statements:', error);
      if (showErrorToast !== false) {
        toast.error(loadListErrorLabel);
      }
    } finally {
      if (!silent) setLoading(false);
    }

    return didLoad;
  };

  const loadGmailReceipts = async (opts?: {
    silent?: boolean;
    showErrorToast?: boolean;
  }): Promise<void> => {
    const { silent, showErrorToast } = opts || {};
    if (!silent) setGmailLoading(true);

    try {
      const response = await gmailReceiptsApi.listReceipts({
        limit: pageSize,
        offset: Math.max(0, (page - 1) * pageSize),
        includeInvalid: false,
      });
      const receipts = Array.isArray(response.data?.receipts) ? response.data.receipts : [];
      const filtered = receipts.filter(hasGmailReceiptAmount);
      setGmailReceipts(filtered);
    } catch (error) {
      console.error('Failed to load Gmail receipts:', error);
      if (showErrorToast !== false) {
        toast.error(loadListErrorLabel);
      }
    } finally {
      if (!silent) setGmailLoading(false);
    }
  };

  const refreshActiveStatements = async (): Promise<void> => {
    const didLoad = await loadStatements({ silent: true, search, showErrorToast: false });

    if (stage === 'submit') {
      await loadGmailReceipts({ silent: true, showErrorToast: false });
    }

    if (!didLoad) {
      toast.error(refreshFailedLabel);
    }
  };

  // Initial load when user/search/filters/stage change
  useEffect(() => {
    if (!user) return;
    void loadStatements({ search });
    if (stage === 'submit') {
      void loadGmailReceipts({ silent: true, showErrorToast: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, search, appliedFilters, stage]);

  // Read gmail sync skeleton count from sessionStorage on mount/stage change
  useEffect(() => {
    if (typeof window === 'undefined' || stage !== 'submit') return;
    const raw = sessionStorage.getItem(STATEMENTS_GMAIL_SYNC_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as GmailSyncSkeletonMeta | null;
      if (parsed && parsed.count > 0) {
        setGmailSyncSkeletonKeys(buildGmailSyncSkeletonKeys(Math.min(parsed.count, pageSize)));
      }
    } catch {
      sessionStorage.removeItem(STATEMENTS_GMAIL_SYNC_STORAGE_KEY);
    }
  }, [stage]);

  // Listen for live gmail sync events to show skeleton placeholders
  useEffect(() => {
    if (typeof window === 'undefined' || stage !== 'submit') return;

    const handleGmailSyncEvent = (event: Event) => {
      const detail = (event as CustomEvent<GmailSyncSkeletonMeta>).detail;
      if (!detail || detail.count <= 0) return;
      setGmailSyncSkeletonKeys(buildGmailSyncSkeletonKeys(Math.min(detail.count, pageSize)));
    };

    window.addEventListener(STATEMENTS_GMAIL_SYNC_EVENT, handleGmailSyncEvent);
    return () => {
      window.removeEventListener(STATEMENTS_GMAIL_SYNC_EVENT, handleGmailSyncEvent);
    };
  }, [stage]);

  // Poll statements when any are processing
  useEffect(() => {
    if (!user || !shouldPollStatements) return;

    const intervalId = window.setInterval(() => {
      void loadStatements({ silent: true, search, showErrorToast: false }).catch(err => {
        console.error('Failed to poll statements:', err);
      });
    }, 4000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, shouldPollStatements, search, appliedFilters]);

  // Poll gmail receipts when on submit stage
  useEffect(() => {
    if (!user || stage !== 'submit') return;

    const intervalId = window.setInterval(() => {
      void loadGmailReceipts({ silent: true, showErrorToast: false }).catch(err => {
        console.error('Failed to poll Gmail receipts:', err);
      });
    }, 6000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, stage]);

  return {
    statements,
    setStatements,
    gmailReceipts,
    loading,
    gmailLoading,
    gmailSyncSkeletonKeys,
    setGmailSyncSkeletonKeys,
    loadStatements,
    loadGmailReceipts,
    refreshActiveStatements,
  };
}
