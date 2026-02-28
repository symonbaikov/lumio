'use client';

import { type SidePanelPageConfig, useSidePanelConfig } from '@/app/components/side-panel';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
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
  type GmailSyncSkeletonMeta,
  STATEMENTS_GMAIL_SYNC_EVENT,
  STATEMENTS_GMAIL_SYNC_STORAGE_KEY,
} from '@/app/lib/statement-upload-actions';
import { countStatementStages, getStatementStageMap } from '@/app/lib/statement-workflow';
import NearbyErrorIcon from '@mui/icons-material/NearbyError';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { Banknote, CalendarRange, Folder, Pencil, Send, ThumbsUp, User } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import StatementsCircularUploadMenu from './StatementsCircularUploadMenu';
import { buildUnapprovedQueueItem } from './unapproved-cash-utils';

type ActiveItem =
  | 'submit'
  | 'approve'
  | 'pay'
  | 'unapproved-cash'
  | 'spend-over-time'
  | 'top-spenders'
  | 'top-merchants'
  | 'top-categories';

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

export default function StatementsSidePanel({ activeItem }: Props) {
  const router = useRouter();
  const t = useIntlayer('statementsPage');
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    submit: 0,
    approve: 0,
    pay: 0,
    unapprovedCash: 0,
  });
  const [topSenders, setTopSenders] = useState<TopBankSender[]>([]);
  const [topMerchantsCount, setTopMerchantsCount] = useState(0);
  const [topCategoriesCount, setTopCategoriesCount] = useState(0);
  const [connectedCloudProviders, setConnectedCloudProviders] = useState<ConnectedCloudProviders>({
    googleDriveConnected: false,
    dropboxConnected: false,
    gmailConnected: false,
  });

  useEffect(() => {
    let isMounted = true;

    const loadStageCounts = async () => {
      if (!user) return;

      try {
        const allStatements: StatementListItem[] = [];
        const pageSize = 500;
        let page = 1;
        let total = Number.POSITIVE_INFINITY;

        while (allStatements.length < total) {
          const response = await apiClient.get('/statements', {
            params: {
              page,
              limit: pageSize,
            },
          });

          const items = response.data?.data || response.data || [];
          const batch = Array.isArray(items) ? items : [];
          allStatements.push(...batch);
          total = Number(response.data?.total ?? allStatements.length);

          if (batch.length < pageSize) {
            break;
          }

          page += 1;
        }

        const statementIds = allStatements
          .map(statement => statement.id)
          .filter((id): id is string => Boolean(id));

        const stageCounts = countStatementStages(statementIds, getStatementStageMap());
        const topBankSenders = getTopBankSenders(allStatements, 5);

        const topMerchantsItems: TransactionListItem[] = [];
        const topMerchantsPageSize = 500;
        let topMerchantsPage = 1;
        let topMerchantsTotal = Number.POSITIVE_INFINITY;

        while (topMerchantsItems.length < topMerchantsTotal) {
          const topMerchantsResponse = await apiClient.get('/transactions', {
            params: {
              page: topMerchantsPage,
              limit: topMerchantsPageSize,
            },
          });
          const items = Array.isArray(topMerchantsResponse.data?.data)
            ? topMerchantsResponse.data.data
            : [];
          topMerchantsItems.push(...items);
          topMerchantsTotal = Number(topMerchantsResponse.data?.total ?? topMerchantsItems.length);

          if (items.length < topMerchantsPageSize) {
            break;
          }

          topMerchantsPage += 1;
        }

        const uniqueMerchants = new Set(
          topMerchantsItems
            .map(item => (item.counterpartyName || '').trim().toLowerCase())
            .filter(Boolean),
        );

        const statementMetaById = new Map(
          allStatements
            .filter(statement => Boolean(statement.id))
            .map(statement => [
              statement.id as string,
              {
                id: statement.id as string,
                status: statement.status,
                errorMessage: statement.errorMessage,
                fileType: statement.fileType,
                sourceHint: statement.parsingDetails?.importPreview?.source ?? null,
              },
            ]),
        );

        const unapprovedCashCount = topMerchantsItems.reduce((total, transaction) => {
          const statementMeta = transaction.statementId
            ? (statementMetaById.get(transaction.statementId) ?? null)
            : null;
          const queueItem = buildUnapprovedQueueItem(transaction, statementMeta);
          return queueItem.reasons.length > 0 ? total + 1 : total;
        }, 0);

        const topCategoriesResponse = await apiClient.get('/reports/top-categories', {
          params: {
            type: 'expense',
            limit: 100,
          },
        });
        const topCategories = Array.isArray(topCategoriesResponse.data?.categories)
          ? topCategoriesResponse.data.categories
          : [];

        if (isMounted) {
          setCounts({
            ...stageCounts,
            unapprovedCash: unapprovedCashCount,
          });
          setTopSenders(topBankSenders);
          setTopMerchantsCount(uniqueMerchants.size);
          setTopCategoriesCount(topCategories.length);
        }
      } catch {
        if (isMounted) {
          setCounts({ submit: 0, approve: 0, pay: 0, unapprovedCash: 0 });
          setTopSenders([]);
          setTopMerchantsCount(0);
          setTopCategoriesCount(0);
        }
      }
    };

    loadStageCounts();

    return () => {
      isMounted = false;
    };
  }, [user, activeItem]);

  useEffect(() => {
    let isMounted = true;

    const loadCloudProviders = async () => {
      if (!user) return;

      const [dropboxStatus, googleDriveStatus, gmailStatus] = await Promise.allSettled([
        apiClient.get('/integrations/dropbox/status'),
        apiClient.get('/integrations/google-drive/status'),
        apiClient.get('/integrations/gmail/status'),
      ]);

      const isDropboxConnected =
        dropboxStatus.status === 'fulfilled' &&
        Boolean(dropboxStatus.value?.data?.connected ?? dropboxStatus.value?.data?.active);
      const isGoogleDriveConnected =
        googleDriveStatus.status === 'fulfilled' &&
        Boolean(googleDriveStatus.value?.data?.connected ?? googleDriveStatus.value?.data?.active);
      const isGmailConnected =
        gmailStatus.status === 'fulfilled' &&
        Boolean(gmailStatus.value?.data?.connected ?? gmailStatus.value?.data?.active);

      if (isMounted) {
        setConnectedCloudProviders({
          dropboxConnected: isDropboxConnected,
          googleDriveConnected: isGoogleDriveConnected,
          gmailConnected: isGmailConnected,
        });
      }
    };

    loadCloudProviders();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const openExpenseDrawer = useCallback((mode: StatementExpenseMode) => {
    if (typeof window === 'undefined') return;
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
        .post('/integrations/gmail/sync')
        .then(response => {
          const messagesFound = Number(response.data?.messagesFound ?? 0);
          const jobsCreated = Number(response.data?.jobsCreated ?? 0);
          const skipped = Number(response.data?.skipped ?? 0);

          if (jobsCreated > 0 && typeof window !== 'undefined') {
            const payload: GmailSyncSkeletonMeta = {
              count: jobsCreated,
              timestamp: Date.now(),
            };
            sessionStorage.setItem(STATEMENTS_GMAIL_SYNC_STORAGE_KEY, JSON.stringify(payload));
            window.dispatchEvent(new CustomEvent(STATEMENTS_GMAIL_SYNC_EVENT, { detail: payload }));
          }

          if (jobsCreated > 0) {
            toast.success(`Gmail sync started (${jobsCreated} receipts)`);
            navigateToSubmit();
            return;
          }

          if (messagesFound === 0) {
            toast.error('No matching emails found in Gmail');
            return;
          }

          if (messagesFound > 0 && skipped >= messagesFound) {
            toast.error('All receipts available in Gmail are already synced');
            return;
          }

          toast.error('Gmail sync finished with no new receipts');
          navigateToSubmit();
        })
        .catch(() => {
          toast.error('Failed to sync Gmail');
        });
      return;
    }

    router.push('/integrations/gmail');
  }, [connectedCloudProviders.gmailConnected, navigateToSubmit, router]);

  const sidePanelConfig = useMemo<SidePanelPageConfig>(() => {
    const workQueueTitle =
      (t as any)?.sidePanel?.workQueueTitle?.value ??
      (t as any)?.sidePanel?.todoTitle?.value ??
      'Work queue';
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
          className: 'rounded-2xl border border-gray-100 bg-[#f7f9fb] px-1 pt-1',
          items: [
            {
              id: 'submit',
              label: (t as any)?.sidePanel?.submit?.value ?? 'Submit',
              icon: Send,
              badge: counts.submit,
              badgeVariant: getQueueBadgeVariant(counts.submit),
              emphasis: 'high',
              active: activeItem === 'submit',
              href: '/statements/submit',
            },
            {
              id: 'approve',
              label: (t as any)?.sidePanel?.approve?.value ?? 'Approve',
              icon: ThumbsUp,
              badge: counts.approve,
              badgeVariant: getQueueBadgeVariant(counts.approve),
              emphasis: 'high',
              active: activeItem === 'approve',
              href: '/statements/approve',
            },
            {
              id: 'pay',
              label: (t as any)?.sidePanel?.pay?.value ?? 'Pay',
              icon: Banknote,
              badge: counts.pay,
              badgeVariant: getQueueBadgeVariant(counts.pay),
              emphasis: 'high',
              active: activeItem === 'pay',
              href: '/statements/pay',
            },
          ],
        },
        {
          id: 'accounting',
          type: 'navigation',
          title: (t as any)?.sidePanel?.accountingTitle?.value ?? 'Accounting',
          titleClassName: 'text-[13px] font-medium text-gray-400 dark:text-gray-500',
          items: [
            {
              id: 'unapproved-cash',
              label: (t as any)?.sidePanel?.unapprovedCash?.value ?? 'Unapproved cash',
              icon: <NearbyErrorIcon sx={{ fontSize: 20 }} />,
              badge: counts.unapprovedCash,
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
          title: (t as any)?.sidePanel?.insightsTitle?.value ?? 'Insights',
          titleClassName: 'text-[13px] font-medium text-gray-400 dark:text-gray-500',
          items: [
            {
              id: 'spend-over-time',
              label: (t as any)?.sidePanel?.spendOverTime?.value ?? 'Spend over time',
              icon: CalendarRange,
              emphasis: 'low',
              href: '/statements/spend-over-time',
              active: activeItem === 'spend-over-time',
            },
            {
              id: 'top-spenders',
              label: (t as any)?.sidePanel?.topSpenders?.value ?? 'Top spenders',
              icon: User,
              badge: topSenders.length,
              badgeVariant: 'default',
              emphasis: 'low',
              href: '/statements/top-spenders',
              active: activeItem === 'top-spenders',
            },
            {
              id: 'top-merchants',
              label: (t as any)?.sidePanel?.topMerchants?.value ?? 'Top merchants',
              icon: <PointOfSaleIcon sx={{ fontSize: 20 }} />,
              badge: topMerchantsCount,
              badgeVariant: 'default',
              emphasis: 'low',
              href: '/statements/top-merchants',
              active: activeItem === 'top-merchants',
            },
            {
              id: 'top-categories',
              label: (t as any)?.sidePanel?.topCategories?.value ?? 'Top categories',
              icon: Folder,
              badge: topCategoriesCount,
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
    t,
    activeItem,
    counts,
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
