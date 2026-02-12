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
import {
  type TopBankSender,
  type TopCategoryPreviewItem,
  getTopBankSenders,
  getTopCategoriesPreview,
} from '@/app/lib/statement-insights';
import {
  type CloudImportProvider,
  type ConnectedCloudProviders,
} from '@/app/lib/statement-upload-actions';
import { countStatementStages, getStatementStageMap } from '@/app/lib/statement-workflow';
import { Banknote, Folder, Pencil, ThumbsUp, User } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import StatementsCircularUploadMenu from './StatementsCircularUploadMenu';

type ActiveItem = 'submit' | 'approve' | 'pay' | 'top-spenders' | 'top-categories';

type Props = {
  activeItem: ActiveItem;
};

type StatementListItem = {
  id?: string;
  bankName?: string | null;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default function StatementsSidePanel({ activeItem }: Props) {
  const router = useRouter();
  const t = useIntlayer('statementsPage');
  const { user } = useAuth();
  const [counts, setCounts] = useState({ submit: 0, approve: 0, pay: 0 });
  const [topSenders, setTopSenders] = useState<TopBankSender[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategoryPreviewItem[]>([]);
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
              pageSize,
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
        const summaryResponse = await apiClient.get('/reports/statements/summary', {
          params: { days: 90 },
        });
        const summaryCategories = Array.isArray(summaryResponse.data?.categories)
          ? summaryResponse.data.categories
          : [];
        const categoriesPreview = getTopCategoriesPreview(summaryCategories, 5);

        if (isMounted) {
          setCounts(stageCounts);
          setTopSenders(topBankSenders);
          setTopCategories(categoriesPreview);
        }
      } catch {
        if (isMounted) {
          setCounts({ submit: 0, approve: 0, pay: 0 });
          setTopSenders([]);
          setTopCategories([]);
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
          const jobsCreated = response.data?.jobsCreated ?? 0;
          toast.success(
            jobsCreated > 0 ? `Gmail sync started (${jobsCreated} receipts)` : 'Gmail sync started',
          );
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
              icon: Pencil,
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
              badge: topCategories.length,
              href: '/statements/top-categories',
              active: activeItem === 'top-categories',
              children:
                topCategories.length > 0
                  ? topCategories.map((category, index) => ({
                      id: `top-category-${category.name}-${index}`,
                      label: `${index + 1}. ${category.name} (${category.rows})`,
                      badge: formatMoney(category.amount),
                      badgeVariant: 'primary' as const,
                      disabled: true,
                    }))
                  : [
                      {
                        id: 'top-categories-empty',
                        label: (t as any)?.sidePanel?.topSpendersEmpty?.value ?? 'No data',
                        disabled: true,
                      },
                    ],
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
      topCategories,
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
