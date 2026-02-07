'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntlayer } from 'next-intlayer';
import { Banknote, Folder, Pencil, ThumbsUp, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import { getTopBankSenders, type TopBankSender } from '@/app/lib/statement-insights';
import {
  STATEMENTS_OPEN_UPLOAD_MODAL_EVENT,
  type CloudImportProvider,
  type ConnectedCloudProviders,
} from '@/app/lib/statement-upload-actions';
import { countStatementStages, getStatementStageMap } from '@/app/lib/statement-workflow';
import { useSidePanelConfig, type SidePanelPageConfig } from '@/app/components/side-panel';
import StatementsCircularUploadMenu from './StatementsCircularUploadMenu';

type ActiveItem = 'submit' | 'approve' | 'pay';

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
  const t = useIntlayer('statementsPage');
  const { user } = useAuth();
  const [counts, setCounts] = useState({ submit: 0, approve: 0, pay: 0 });
  const [topSenders, setTopSenders] = useState<TopBankSender[]>([]);
  const [connectedCloudProviders, setConnectedCloudProviders] = useState<ConnectedCloudProviders>({
    googleDriveConnected: false,
    dropboxConnected: false,
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

        if (isMounted) {
          setCounts(stageCounts);
          setTopSenders(topBankSenders);
        }
      } catch {
        if (isMounted) {
          setCounts({ submit: 0, approve: 0, pay: 0 });
          setTopSenders([]);
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

      const [dropboxStatus, googleDriveStatus] = await Promise.allSettled([
        apiClient.get('/integrations/dropbox/status'),
        apiClient.get('/integrations/google-drive/status'),
      ]);

      const isDropboxConnected =
        dropboxStatus.status === 'fulfilled' &&
        Boolean(dropboxStatus.value?.data?.connected ?? dropboxStatus.value?.data?.active);
      const isGoogleDriveConnected =
        googleDriveStatus.status === 'fulfilled' &&
        Boolean(googleDriveStatus.value?.data?.connected ?? googleDriveStatus.value?.data?.active);

      if (isMounted) {
        setConnectedCloudProviders({
          dropboxConnected: isDropboxConnected,
          googleDriveConnected: isGoogleDriveConnected,
        });
      }
    };

    loadCloudProviders();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const openLocalUploadModal = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(STATEMENTS_OPEN_UPLOAD_MODAL_EVENT));
  }, []);

  const handleScanClick = useCallback(() => {
    toast('Scan is coming soon');
  }, []);

  const handleCloudImport = useCallback(async (provider: CloudImportProvider | null) => {
    if (!provider) {
      toast.error('Connect Dropbox or Google Drive first');
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
  }, []);

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
              children:
                topSenders.length > 0
                  ? topSenders.map((sender, index) => ({
                      id: `top-spender-${sender.bankName}-${index}`,
                      label: `${index + 1}. ${sender.bankName} (${sender.statementsCount})`,
                      badge: formatMoney(sender.totalAmount),
                      badgeVariant: 'primary' as const,
                      disabled: true,
                    }))
                  : [
                      {
                        id: 'top-spenders-empty',
                        label: (t as any)?.sidePanel?.topSpendersEmpty?.value ?? 'No data',
                        disabled: true,
                      },
                    ],
            },
            {
              id: 'top-categories',
              label: (t as any)?.sidePanel?.topCategories?.value ?? 'Top categories',
              icon: Folder,
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
            onLocalUpload={openLocalUploadModal}
          />
        ),
      },
    }),
    [
      t,
      activeItem,
      counts,
      topSenders,
      connectedCloudProviders,
      handleCloudImport,
      handleScanClick,
      openLocalUploadModal,
    ],
  );

  useSidePanelConfig({ config: sidePanelConfig, autoRegister: true });

  return null;
}
