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
} from '@/app/lib/statement-upload-actions';
import { countStatementStages, getStatementStageMap } from '@/app/lib/statement-workflow';
import { Banknote, CalendarRange, Folder, Pencil, Send, ThumbsUp, User } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import StatementsCircularUploadMenu from './StatementsCircularUploadMenu';

type ActiveItem =
  | 'submit'
  | 'approve'
  | 'pay'
  | 'spend-over-time'
  | 'top-spenders'
  | 'top-categories';

type Props = {
  activeItem: ActiveItem;
};

type StatementListItem = {
  id?: string;
  bankName?: string | null;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
};

export default function StatementsSidePanel({ activeItem }: Props) {
  const router = useRouter();
  const t = useIntlayer('statementsPage');
  const { user } = useAuth();
  const [counts, setCounts] = useState({ submit: 0, approve: 0, pay: 0 });
  const [topSenders, setTopSenders] = useState<TopBankSender[]>([]);
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
          setCounts(stageCounts);
          setTopSenders(topBankSenders);
          setTopCategoriesCount(topCategories.length);
        }
      } catch {
        if (isMounted) {
          setCounts({ submit: 0, approve: 0, pay: 0 });
          setTopSenders([]);
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

  const handleScanClick = useCallback(() => {
    openExpenseDrawer('scan');
  }, [openExpenseDrawer]);

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
      } catch {
        toast.error(
          provider === 'dropbox'
            ? 'Failed to import from Dropbox'
            : 'Failed to import from Google Drive',
        );
      }
    },
    [router],
  );

  const handleGmailClick = useCallback(() => {
    if (connectedCloudProviders.gmailConnected) {
      apiClient
        .post('/integrations/gmail/sync')
        .then(response => {
          const messagesFound = Number(response.data?.messagesFound ?? 0);
          const jobsCreated = Number(response.data?.jobsCreated ?? 0);
          const skipped = Number(response.data?.skipped ?? 0);

          if (jobsCreated > 0) {
            toast.success(`Gmail sync started (${jobsCreated} receipts)`);
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
        })
        .catch(() => {
          toast.error('Failed to sync Gmail');
        });
      return;
    }

    router.push('/integrations/gmail');
  }, [connectedCloudProviders.gmailConnected, router]);

  const sidePanelConfig = useMemo<SidePanelPageConfig>(
    () => ({
      pageId: 'statements',
      header: {
        title: 'Statements',
        subtitle: 'Overview',
      },
      sections: [
        {
          id: 'todo',
          type: 'navigation',
          title: (t as any)?.sidePanel?.todoTitle?.value ?? 'To-do',
          items: [
            {
              id: 'submit',
              label: (t as any)?.sidePanel?.submit?.value ?? 'Submit',
              icon: Send,
              badge: counts.submit,
              badgeVariant: 'default',
              active: activeItem === 'submit',
              href: '/statements/submit',
            },
            {
              id: 'approve',
              label: (t as any)?.sidePanel?.approve?.value ?? 'Approve',
              icon: ThumbsUp,
              badge: counts.approve,
              badgeVariant: 'default',
              active: activeItem === 'approve',
              href: '/statements/approve',
            },
            {
              id: 'pay',
              label: (t as any)?.sidePanel?.pay?.value ?? 'Pay',
              icon: Banknote,
              badge: counts.pay,
              badgeVariant: 'default',
              active: activeItem === 'pay',
              href: '/statements/pay',
            },
          ],
        },
        {
          id: 'accounting',
          type: 'navigation',
          title: (t as any)?.sidePanel?.accountingTitle?.value ?? 'Accounting',
          items: [
            {
              id: 'unapproved-cash',
              label: (t as any)?.sidePanel?.unapprovedCash?.value ?? 'Unapproved cash',
              icon: Banknote,
            },
          ],
        },
        {
          id: 'insights',
          type: 'navigation',
          title: (t as any)?.sidePanel?.insightsTitle?.value ?? 'Insights',
          items: [
            {
              id: 'spend-over-time',
              label: (t as any)?.sidePanel?.spendOverTime?.value ?? 'Spend over time',
              icon: CalendarRange,
              href: '/statements/spend-over-time',
              active: activeItem === 'spend-over-time',
            },
            {
              id: 'top-spenders',
              label: (t as any)?.sidePanel?.topSpenders?.value ?? 'Top spenders',
              icon: User,
              badge: topSenders.length,
              href: '/statements/top-spenders',
              active: activeItem === 'top-spenders',
            },
            {
              id: 'top-categories',
              label: (t as any)?.sidePanel?.topCategories?.value ?? 'Top categories',
              icon: Folder,
              badge: topCategoriesCount,
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
            onLocalUpload={() => openExpenseDrawer('manual')}
          />
        ),
      },
    }),
    [
      t,
      activeItem,
      counts,
      topSenders,
      topCategoriesCount,
      connectedCloudProviders,
      handleCloudImport,
      handleGmailClick,
      handleScanClick,
      openExpenseDrawer,
    ],
  );

  useSidePanelConfig({ config: sidePanelConfig, autoRegister: true });

  return null;
}
