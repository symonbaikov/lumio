'use client';

import {
  Ban,
  Banknote,
  CalendarRange,
  Folder,
  PiggyBank,
  Send,
  ShoppingCart,
  ThumbsUp,
  User,
} from '@/app/components/icons';
import { type SidePanelPageConfig, useSidePanelConfig } from '@/app/components/side-panel';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { payablesApi } from '@/app/lib/payables-api';
import { getNestedValue, resolveLabel } from '@/app/lib/side-panel-utils';
import {
  type OpenExpenseDrawerEventDetail,
  STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT,
  type StatementExpenseMode,
  resolveExpenseDrawerMode,
} from '@/app/lib/statement-expense-drawer';
import { type TopBankSender, getTopBankSenders } from '@/app/lib/statement-insights';
import {
  type CloudImportProvider,
  type ConnectedCloudProviders,
} from '@/app/lib/statement-upload-actions';
import { countStatementStages, getStatementStageMap } from '@/app/lib/statement-workflow';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import StatementsCircularUploadMenu from './StatementsCircularUploadMenu';
import { buildUnapprovedStatementQueue } from './unapproved-cash-utils';

type ActiveItem =
  | 'submit'
  | 'approve'
  | 'pay'
  | 'receive'
  | 'unapproved-cash'
  | 'spend-over-time'
  | 'top-spenders'
  | 'top-merchants'
  | 'top-categories'
  | 'transactions';

type Props = {
  activeItem: ActiveItem;
};

type StatementListItem = {
  id?: string;
  bankName?: string | null;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  status?: string | null;
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

type SidePanelData = {
  counts: { submit: number; approve: number; unapprovedCash: number };
  topSenders: TopBankSender[];
  topMerchantsCount: number;
  topCategoriesCount: number;
};

async function loadSidePanelData(): Promise<SidePanelData> {
  const allStatements = await fetchAllPaginated<StatementListItem>('/statements');

  const statementIds = allStatements
    .map(statement => statement.id)
    .filter((id): id is string => Boolean(id));

  const stageCounts = countStatementStages(statementIds, getStatementStageMap());
  const topBankSenders = getTopBankSenders(allStatements, 5);

  const topMerchantsItems = await fetchAllPaginated<TransactionListItem>('/transactions');

  const uniqueMerchants = new Set(
    topMerchantsItems
      .map(item => (item.counterpartyName || '').trim().toLowerCase())
      .filter(Boolean),
  );

  const statementMetaById = buildStatementMetaMap(allStatements);

  const unapprovedCashCount = buildUnapprovedStatementQueue({
    statements: Array.from(statementMetaById.values()),
    transactions: topMerchantsItems,
  }).length;

  const topCategoriesResponse = await apiClient.get('/reports/top-categories', {
    params: { type: 'expense', limit: 100 },
  });

  const topCategories = Array.isArray(topCategoriesResponse.data?.categories)
    ? topCategoriesResponse.data.categories
    : [];

  return {
    counts: { ...stageCounts, unapprovedCash: unapprovedCashCount },
    topSenders: topBankSenders,
    topMerchantsCount: uniqueMerchants.size,
    topCategoriesCount: topCategories.length,
  };
}

export default function StatementsSidePanel({ activeItem }: Props) {
  const router = useRouter();
  const t = useIntlayer('statementsPage');
  const tx = useCallback(
    (path: string[], fallback: string) => resolveLabel(getNestedValue(t, path), fallback),
    [t],
  );
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [counts, setCounts] = useState({
    submit: 0,
    approve: 0,
    unapprovedCash: 0,
  });
  const [countsLoading, setCountsLoading] = useState(true);
  const [payCount, setPayCount] = useState(0);
  const [payCountLoading, setPayCountLoading] = useState(true);
  const [topSenders, setTopSenders] = useState<TopBankSender[]>([]);
  const [topMerchantsCount, setTopMerchantsCount] = useState(0);
  const [topCategoriesCount, setTopCategoriesCount] = useState(0);
  const [connectedCloudProviders, setConnectedCloudProviders] = useState<ConnectedCloudProviders>({
    googleDriveConnected: false,
    dropboxConnected: false,
    gmailConnected: false,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: deps are intentionally constrained
  useEffect(() => {
    let isMounted = true;

    const loadCounts = async () => {
      if (!user) {
        setCountsLoading(false);
        return;
      }

      try {
        const data = await loadSidePanelData();
        if (isMounted) {
          setCounts(data.counts);
          setTopSenders(data.topSenders);
          setTopMerchantsCount(data.topMerchantsCount);
          setTopCategoriesCount(data.topCategoriesCount);
          setCountsLoading(false);
        }
      } catch {
        if (isMounted) {
          setCounts({ submit: 0, approve: 0, unapprovedCash: 0 });
          setTopSenders([]);
          setTopMerchantsCount(0);
          setTopCategoriesCount(0);
          setCountsLoading(false);
        }
      }
    };

    setCountsLoading(true);
    void loadCounts();

    return () => {
      isMounted = false;
    };
  }, [user, activeItem]);

  useEffect(() => {
    let isMounted = true;

    const loadPayCount = async () => {
      if (!user) {
        setPayCount(0);
        setPayCountLoading(false);
        return;
      }

      setPayCountLoading(true);

      try {
        const summary = await payablesApi.getSummary();

        if (isMounted) {
          setPayCount((summary.toPayCount || 0) + (summary.overdueCount || 0));
          setPayCountLoading(false);
        }
      } catch {
        if (isMounted) {
          setPayCountLoading(false);
        }
      }
    };

    void loadPayCount();

    return () => {
      isMounted = false;
    };
  }, [user, currentWorkspace?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadCloudProviders = async () => {
      if (!user) {
        return;
      }

      const [dropboxStatus, googleDriveStatus, inboxStatus] = await Promise.allSettled([
        apiClient.get('/integrations/dropbox/status'),
        apiClient.get('/integrations/google-drive/status'),
        apiClient.get('/integrations/imap/status'),
      ]);

      const isDropboxConnected =
        dropboxStatus.status === 'fulfilled' &&
        Boolean(dropboxStatus.value?.data?.connected ?? dropboxStatus.value?.data?.active);
      const isGoogleDriveConnected =
        googleDriveStatus.status === 'fulfilled' &&
        Boolean(googleDriveStatus.value?.data?.connected ?? googleDriveStatus.value?.data?.active);
      const isInboxConnected =
        inboxStatus.status === 'fulfilled' &&
        Boolean(inboxStatus.value?.data?.connected ?? inboxStatus.value?.data?.active);

      if (isMounted) {
        setConnectedCloudProviders({
          dropboxConnected: isDropboxConnected,
          googleDriveConnected: isGoogleDriveConnected,
          gmailConnected: isInboxConnected,
        });
      }
    };

    loadCloudProviders();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const openExpenseDrawer = useCallback((mode: StatementExpenseMode) => {
    if (typeof window === 'undefined') {
      return;
    }
    const detail: OpenExpenseDrawerEventDetail = {
      mode: resolveExpenseDrawerMode(mode),
    };
    window.dispatchEvent(new CustomEvent(STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT, { detail }));
  }, []);

  const navigateToSubmit = useCallback(
    (mode?: StatementExpenseMode) => {
      if (activeItem === 'submit') {
        if (mode) {
          openExpenseDrawer(mode);
        }
        return;
      }

      const query = mode ? `?openExpenseDrawer=${mode}` : '';
      router.push(`/statements/submit${query}`);
    },
    [activeItem, openExpenseDrawer, router],
  );

  const handleScanClick = useCallback(() => {
    navigateToSubmit('scan');
  }, [navigateToSubmit]);

  const handleCloudImport = useCallback(
    async (provider: CloudImportProvider | null) => {
      if (!provider) {
        router.push('/integrations');
        return;
      }

      const endpoint =
        provider === 'dropbox' ? '/integrations/dropbox/sync' : '/integrations/google-drive/sync';

      try {
        await apiClient.post(endpoint);
        toast.success(
          provider === 'dropbox' ? 'Dropbox import started' : 'Google Drive import started',
        );
        navigateToSubmit();
      } catch {
        toast.error(
          provider === 'dropbox'
            ? 'Failed to import from Dropbox'
            : 'Failed to import from Google Drive',
        );
      }
    },
    [navigateToSubmit, router],
  );

  const handleGmailClick = useCallback(() => {
    if (connectedCloudProviders.gmailConnected) {
      apiClient
        .post('/integrations/imap/sync')
        .then(response => {
          const scanned = Number(response.data?.scanned ?? 0);
          const imported = Number(response.data?.imported ?? 0);

          if (imported > 0) {
            toast.success(`Inbox sync imported ${imported} receipt${imported === 1 ? '' : 's'}`);
            navigateToSubmit();
            return;
          }

          if (scanned === 0) {
            toast.error('No unread emails found in IMAP inbox');
            return;
          }

          toast.error('No new receipt attachments found in IMAP inbox');
          navigateToSubmit();
        })
        .catch(() => {
          toast.error('Failed to sync inbox');
        });
      return;
    }

    router.push('/integrations/imap');
  }, [connectedCloudProviders.gmailConnected, navigateToSubmit, router]);

  const sidePanelConfig = useMemo<SidePanelPageConfig>(() => {
    const workQueueTitle = tx(
      ['sidePanel', 'workQueueTitle'],
      tx(['sidePanel', 'todoTitle'], 'Work queue'),
    );
    const getQueueBadgeVariant = (count: number) => (count > 0 ? 'primary' : 'default');

    return {
      pageId: 'statements',
      sections: [
        {
          id: 'work-queue',
          type: 'navigation',
          title: workQueueTitle,
          titleClassName:
            'text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-600 dark:text-gray-300',
          className:
            'rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] px-1 pt-1',
          items: [
            {
              id: 'submit',
              label: tx(['sidePanel', 'submit'], 'Submit'),
              icon: Send,
              badge: counts.submit,
              badgeLoading: countsLoading,
              badgeVariant: getQueueBadgeVariant(counts.submit),
              emphasis: 'high',
              active: activeItem === 'submit',
              href: '/statements/submit',
            },
            {
              id: 'approve',
              label: tx(['sidePanel', 'approve'], 'Approve'),
              icon: ThumbsUp,
              badge: counts.approve,
              badgeLoading: countsLoading,
              badgeVariant: getQueueBadgeVariant(counts.approve),
              emphasis: 'high',
              active: activeItem === 'approve',
              href: '/statements/approve',
            },
            {
              id: 'pay',
              label: tx(['sidePanel', 'pay'], 'Pay'),
              icon: Banknote,
              badge: payCount,
              badgeLoading: payCountLoading,
              badgeVariant: getQueueBadgeVariant(payCount),
              emphasis: 'high',
              active: activeItem === 'pay',
              href: '/statements/pay',
            },
            {
              id: 'receive',
              label: tx(['sidePanel', 'receive'], 'Receive'),
              icon: PiggyBank,
              emphasis: 'high',
              active: activeItem === 'receive',
              href: '/statements/receive',
            },
          ],
        },
        {
          id: 'accounting',
          type: 'navigation',
          title: tx(['sidePanel', 'accountingTitle'], 'Accounting'),
          titleClassName: 'text-[13px] font-medium text-gray-400 dark:text-gray-500',
          items: [
            {
              id: 'unapproved-cash',
              label: tx(['sidePanel', 'unapprovedCash'], 'Unapproved cash'),
              icon: <Ban size={20} />,
              badge: counts.unapprovedCash,
              badgeLoading: countsLoading,
              badgeVariant: getQueueBadgeVariant(counts.unapprovedCash),
              emphasis: 'high',
              href: '/statements/unapproved-cash',
              active: activeItem === 'unapproved-cash',
            },
          ],
        },
        {
          id: 'insights',
          type: 'navigation',
          title: tx(['sidePanel', 'insightsTitle'], 'Insights'),
          titleClassName: 'text-[13px] font-medium text-gray-400 dark:text-gray-500',
          items: [
            {
              id: 'spend-over-time',
              label: tx(['sidePanel', 'spendOverTime'], 'Spend over time'),
              icon: CalendarRange,
              emphasis: 'low',
              href: '/statements/spend-over-time',
              active: activeItem === 'spend-over-time',
            },
            {
              id: 'top-spenders',
              label: tx(['sidePanel', 'topSpenders'], 'Top spenders'),
              icon: User,
              badge: topSenders.length,
              badgeLoading: countsLoading,
              badgeVariant: 'default',
              emphasis: 'low',
              href: '/statements/top-spenders',
              active: activeItem === 'top-spenders',
            },
            {
              id: 'top-merchants',
              label: tx(['sidePanel', 'topMerchants'], 'Top merchants'),
              icon: <ShoppingCart size={20} />,
              badge: topMerchantsCount,
              badgeLoading: countsLoading,
              badgeVariant: 'default',
              emphasis: 'low',
              href: '/statements/top-merchants',
              active: activeItem === 'top-merchants',
            },
            {
              id: 'top-categories',
              label: tx(['sidePanel', 'topCategories'], 'Top categories'),
              icon: Folder,
              badge: topCategoriesCount,
              badgeLoading: countsLoading,
              badgeVariant: 'default',
              emphasis: 'low',
              href: '/statements/top-categories',
              active: activeItem === 'top-categories',
            },
          ],
        },
      ],
      footer: {
        content: (
          <StatementsCircularUploadMenu
            providers={connectedCloudProviders}
            onScan={handleScanClick}
            onCloudImport={handleCloudImport}
            onGmail={handleGmailClick}
            onLocalUpload={() => navigateToSubmit('manual')}
          />
        ),
      },
    };
  }, [
    tx,
    activeItem,
    counts,
    payCount,
    payCountLoading,
    topSenders,
    topMerchantsCount,
    topCategoriesCount,
    connectedCloudProviders,
    handleCloudImport,
    handleGmailClick,
    handleScanClick,
    navigateToSubmit,
  ]);

  useSidePanelConfig({ config: sidePanelConfig, autoRegister: true });

  return null;
}
