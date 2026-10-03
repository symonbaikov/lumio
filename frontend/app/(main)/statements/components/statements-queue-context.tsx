'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { openAppPanel } from '@/app/components/panels/app-panels-store';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { payablesApi } from '@/app/lib/payables-api';
import {
  type OpenExpenseDrawerEventDetail,
  resolveExpenseDrawerMode,
  STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT,
  type StatementExpenseMode,
} from '@/app/lib/statement-expense-drawer';
import {
  type CloudImportProvider,
  type ConnectedCloudProviders,
} from '@/app/lib/statement-upload-actions';
import {
  countStatementStages,
  migrateLocalStatementStages,
  type StatementStage,
} from '@/app/lib/statement-workflow';
import { buildUnapprovedStatementQueue } from './unapproved-cash-utils';

type StatementListItem = {
  id?: string;
  bankName?: string | null;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  status?: string | null;
  stage?: StatementStage | null;
  errorMessage?: string | null;
  fileType?: string | null;
  parsingDetails?: {
    importPreview?: {
      source?: string | null;
    } | null;
  } | null;
};

type TransactionListItem = {
  id: string;
  statementId?: string | null;
  counterpartyName?: string | null;
  transactionType?: string | null;
  currency?: string | null;
  isVerified?: boolean | null;
  isDuplicate?: boolean | null;
  duplicateOfId?: string | null;
  categoryId?: string | null;
  category?: {
    id?: string | null;
  } | null;
  transactionDate?: string | Date | null;
  amount?: number | string | null;
  debit?: number | string | null;
  credit?: number | string | null;
};

async function fetchAllPaginated<T>(endpoint: string, pageSize = 500): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (allItems.length < total) {
    // eslint-disable-next-line no-await-in-loop -- sequential by design (pagination)
    const response = await apiClient.get(endpoint, {
      params: { page, limit: pageSize },
    });
    const raw = response.data?.data || response.data || [];
    const batch: T[] = Array.isArray(raw) ? raw : [];
    allItems.push(...batch);
    total = Number(response.data?.total ?? allItems.length);
    if (batch.length < pageSize) {
      break;
    }
    page += 1;
  }

  return allItems;
}

function buildStatementMetaMap(allStatements: StatementListItem[]) {
  return new Map(
    allStatements
      .filter(statement => Boolean(statement.id))
      .map(statement => [
        statement.id as string,
        {
          id: statement.id as string,
          fileName: null,
          bankName: statement.bankName ?? null,
          status: statement.status,
          errorMessage: statement.errorMessage,
          fileType: statement.fileType,
          currency: null,
          totalDebit: statement.totalDebit ?? null,
          totalCredit: statement.totalCredit ?? null,
          statementDateFrom: null,
          statementDateTo: null,
          createdAt: null,
          sourceHint: statement.parsingDetails?.importPreview?.source ?? null,
        },
      ]),
  );
}

export type StatementsQueueCounts = {
  submit: number;
  approve: number;
  unapprovedCash: number;
};

const EMPTY_COUNTS: StatementsQueueCounts = { submit: 0, approve: 0, unapprovedCash: 0 };

async function loadQueueCounts(): Promise<StatementsQueueCounts> {
  await migrateLocalStatementStages();
  const allStatements = await fetchAllPaginated<StatementListItem>('/statements');

  const stageCounts = countStatementStages(allStatements);
  const transactions = await fetchAllPaginated<TransactionListItem>('/transactions');
  const statementMetaById = buildStatementMetaMap(allStatements);

  const unapprovedCashCount = buildUnapprovedStatementQueue({
    statements: Array.from(statementMetaById.values()),
    transactions,
  }).length;

  return { ...stageCounts, unapprovedCash: unapprovedCashCount };
}

export type StatementsQueueValue = {
  counts: StatementsQueueCounts;
  countsLoading: boolean;
  payCount: number;
  payCountLoading: boolean;
  providers: ConnectedCloudProviders;
  onScan: () => void;
  onCloudImport: (provider: CloudImportProvider | null) => void;
  onGmail: () => void;
  onLocalUpload: () => void;
};

// Rendered outside the statements layout (tests, storybook-style mounts) the
// tabs and the upload button still render; they just have nothing to count.
const FALLBACK_VALUE: StatementsQueueValue = {
  counts: EMPTY_COUNTS,
  countsLoading: false,
  payCount: 0,
  payCountLoading: false,
  providers: { googleDriveConnected: false, dropboxConnected: false, gmailConnected: false },
  onScan: () => undefined,
  onCloudImport: () => undefined,
  onGmail: () => undefined,
  onLocalUpload: () => undefined,
};

const StatementsQueueContext = createContext<StatementsQueueValue>(FALLBACK_VALUE);

export function useStatementsQueue(): StatementsQueueValue {
  return useContext(StatementsQueueContext);
}

function useQueueCounts(user: unknown): { counts: StatementsQueueCounts; loading: boolean } {
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setLoading(false);
      return;
    }

    // Only the first load shows spinners; refreshes swap the numbers in place
    // so the tab strip doesn't flicker.
    loadQueueCounts()
      .then(next => {
        if (isMounted) {
          setCounts(next);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCounts(EMPTY_COUNTS);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  return { counts, loading };
}

function usePayCount(
  user: unknown,
  workspaceId: string | undefined,
): {
  payCount: number;
  loading: boolean;
} {
  const [payCount, setPayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // The workspace id is not read here: payablesApi takes it from the request headers.
  // biome-ignore lint/correctness/useExhaustiveDependencies: it is the signal to refetch, not an input.
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
  }, [user, workspaceId]);

  return { payCount, loading };
}

function useCloudProviders(user: unknown): ConnectedCloudProviders {
  const [providers, setProviders] = useState<ConnectedCloudProviders>(FALLBACK_VALUE.providers);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      return;
    }

    void Promise.allSettled([
      apiClient.get('/integrations/dropbox/status'),
      apiClient.get('/integrations/google-drive/status'),
      apiClient.get('/integrations/imap/status'),
    ]).then(([dropbox, googleDrive, inbox]) => {
      const isConnected = (result: PromiseSettledResult<{ data?: unknown }>): boolean => {
        if (result.status !== 'fulfilled') {
          return false;
        }
        const data = result.value?.data as { connected?: boolean; active?: boolean } | undefined;
        return Boolean(data?.connected ?? data?.active);
      };

      if (isMounted) {
        setProviders({
          dropboxConnected: isConnected(dropbox),
          googleDriveConnected: isConnected(googleDrive),
          gmailConnected: isConnected(inbox),
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  return providers;
}

type UploadActions = Pick<
  StatementsQueueValue,
  'onScan' | 'onCloudImport' | 'onGmail' | 'onLocalUpload'
>;

function useUploadActions(gmailConnected: boolean): UploadActions {
  const router = useRouter();
  const tSync = useIntlayer('statementsSidePanelSync');

  const navigateToSubmit = useCallback(
    (mode?: StatementExpenseMode): void => {
      if (typeof window === 'undefined') {
        return;
      }
      if (window.location.pathname.startsWith('/statements/submit')) {
        if (mode) {
          const detail: OpenExpenseDrawerEventDetail = { mode: resolveExpenseDrawerMode(mode) };
          window.dispatchEvent(new CustomEvent(STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT, { detail }));
        }
        return;
      }
      router.push(`/statements/submit${mode ? `?openExpenseDrawer=${mode}` : ''}`);
    },
    [router],
  );

  const onCloudImport = useCallback(
    (provider: CloudImportProvider | null): void => {
      if (!provider) {
        openAppPanel('integrations');
        return;
      }

      const endpoint =
        provider === 'dropbox' ? '/integrations/dropbox/sync' : '/integrations/google-drive/sync';

      apiClient
        .post(endpoint)
        .then(() => {
          toast.success(
            provider === 'dropbox'
              ? tSync.dropboxImportStarted.value
              : tSync.googleDriveImportStarted.value,
          );
          navigateToSubmit();
        })
        .catch(() => {
          toast.error(
            provider === 'dropbox'
              ? tSync.dropboxImportFailed.value
              : tSync.googleDriveImportFailed.value,
          );
        });
    },
    [navigateToSubmit, tSync],
  );

  const onGmail = useCallback((): void => {
    if (!gmailConnected) {
      openAppPanel('integrations', 'imap');
      return;
    }

    apiClient
      .post('/integrations/imap/sync')
      .then(response => {
        const scanned = Number(response.data?.scanned ?? 0);
        const imported = Number(response.data?.imported ?? 0);

        if (imported > 0) {
          toast.success(
            imported === 1
              ? tSync.inboxImportedOne.value
              : tSync.inboxImportedMany.value.replace('{count}', String(imported)),
          );
          navigateToSubmit();
          return;
        }

        if (scanned === 0) {
          toast.error(tSync.noUnreadEmails.value);
          return;
        }

        toast.error(tSync.noNewAttachments.value);
        navigateToSubmit();
      })
      .catch(() => {
        toast.error(tSync.syncInboxFailed.value);
      });
  }, [gmailConnected, navigateToSubmit, tSync]);

  return {
    onScan: useCallback(() => navigateToSubmit('scan'), [navigateToSubmit]),
    onLocalUpload: useCallback(() => navigateToSubmit('manual'), [navigateToSubmit]),
    onCloudImport,
    onGmail,
  };
}

/**
 * Counts, connected cloud providers and the upload actions the statements tab
 * strip and its upload button need. Mounted once by the statements layout, so
 * switching tabs neither remounts it nor reloads the counts.
 */
export function StatementsQueueProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { counts, loading: countsLoading } = useQueueCounts(user);
  const { payCount, loading: payCountLoading } = usePayCount(user, currentWorkspace?.id);
  const providers = useCloudProviders(user);
  const actions = useUploadActions(providers.gmailConnected);

  const value = useMemo<StatementsQueueValue>(
    () => ({ counts, countsLoading, payCount, payCountLoading, providers, ...actions }),
    [counts, countsLoading, payCount, payCountLoading, providers, actions],
  );

  return (
    <StatementsQueueContext.Provider value={value}>{children}</StatementsQueueContext.Provider>
  );
}
