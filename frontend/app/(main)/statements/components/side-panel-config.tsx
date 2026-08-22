'use client';

import {
  Ban,
  Banknote,
  CalendarRange,
  Folder,
  Send,
  ShoppingCart,
  ThumbsUp,
  User,
} from '@/app/components/icons';
import type { NavigationItem, SidePanelPageConfig } from '@/app/components/side-panel';
import type { TopBankSender } from '@/app/lib/statement-insights';
import type { ConnectedCloudProviders } from '@/app/lib/statement-upload-actions';
import StatementsCircularUploadMenu from './StatementsCircularUploadMenu';

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

// eslint-disable-next-line max-params -- tx is a translation function with a standard 2-arg signature
export type TxFn = (path: string[], fallback: string) => string;

export interface SidePanelConfigParams {
  tx: TxFn;
  activeItem: ActiveItem;
  counts: { submit: number; approve: number; unapprovedCash: number };
  payCount: number;
  payCountLoading: boolean;
  countsLoading: boolean;
  topSenders: TopBankSender[];
  topMerchantsCount: number;
  topCategoriesCount: number;
  connectedCloudProviders: ConnectedCloudProviders;
  handleCloudImport: (
    provider: Parameters<Parameters<typeof StatementsCircularUploadMenu>[0]['onCloudImport']>[0],
  ) => Promise<void>;
  handleGmailClick: () => void;
  handleScanClick: () => void;
  navigateToSubmit: (mode?: string) => void;
}

const asPrimary = (count: number): 'primary' | 'default' => (count > 0 ? 'primary' : 'default');

const buildWorkQueueItems = (p: SidePanelConfigParams): NavigationItem[] => [
  {
    id: 'submit',
    label: p.tx(['sidePanel', 'submit'], 'Submit'),
    icon: Send,
    badge: p.counts.submit,
    badgeLoading: p.countsLoading,
    badgeVariant: asPrimary(p.counts.submit),
    emphasis: 'high',
    active: p.activeItem === 'submit',
    href: '/statements/submit',
  },
  {
    id: 'approve',
    label: p.tx(['sidePanel', 'approve'], 'Approve'),
    icon: ThumbsUp,
    badge: p.counts.approve,
    badgeLoading: p.countsLoading,
    badgeVariant: asPrimary(p.counts.approve),
    emphasis: 'high',
    active: p.activeItem === 'approve',
    href: '/statements/approve',
  },
  {
    id: 'pay',
    label: p.tx(['sidePanel', 'pay'], 'Pay'),
    icon: Banknote,
    badge: p.payCount,
    badgeLoading: p.payCountLoading,
    badgeVariant: asPrimary(p.payCount),
    emphasis: 'high',
    active: p.activeItem === 'pay',
    href: '/statements/pay',
  },
];

const buildInsightItems = (p: SidePanelConfigParams): NavigationItem[] => [
  {
    id: 'spend-over-time',
    label: p.tx(['sidePanel', 'spendOverTime'], 'Spend over time'),
    icon: CalendarRange,
    emphasis: 'low',
    href: '/statements/spend-over-time',
    active: p.activeItem === 'spend-over-time',
  },
  {
    id: 'top-spenders',
    label: p.tx(['sidePanel', 'topSpenders'], 'Top spenders'),
    icon: User,
    badge: p.topSenders.length,
    badgeLoading: p.countsLoading,
    badgeVariant: 'default',
    emphasis: 'low',
    href: '/statements/top-spenders',
    active: p.activeItem === 'top-spenders',
  },
  {
    id: 'top-merchants',
    label: p.tx(['sidePanel', 'topMerchants'], 'Top merchants'),
    icon: <ShoppingCart size={20} />,
    badge: p.topMerchantsCount,
    badgeLoading: p.countsLoading,
    badgeVariant: 'default',
    emphasis: 'low',
    href: '/statements/top-merchants',
    active: p.activeItem === 'top-merchants',
  },
  {
    id: 'top-categories',
    label: p.tx(['sidePanel', 'topCategories'], 'Top categories'),
    icon: Folder,
    badge: p.topCategoriesCount,
    badgeLoading: p.countsLoading,
    badgeVariant: 'default',
    emphasis: 'low',
    href: '/statements/top-categories',
    active: p.activeItem === 'top-categories',
  },
];

const buildSections = (p: SidePanelConfigParams): SidePanelPageConfig['sections'] => [
  {
    id: 'work-queue',
    type: 'navigation',
    title: p.tx(['sidePanel', 'workQueueTitle'], p.tx(['sidePanel', 'todoTitle'], 'Work queue')),
    titleClassName:
      'text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-600 dark:text-gray-300',
    className: 'rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] px-1 pt-1',
    items: buildWorkQueueItems(p),
  },
  {
    id: 'accounting',
    type: 'navigation',
    title: p.tx(['sidePanel', 'accountingTitle'], 'Accounting'),
    titleClassName: 'text-[13px] font-medium text-gray-400 dark:text-gray-500',
    items: [
      {
        id: 'unapproved-cash',
        label: p.tx(['sidePanel', 'unapprovedCash'], 'Unapproved cash'),
        icon: <Ban size={20} />,
        badge: p.counts.unapprovedCash,
        badgeLoading: p.countsLoading,
        badgeVariant: asPrimary(p.counts.unapprovedCash),
        emphasis: 'high',
        href: '/statements/unapproved-cash',
        active: p.activeItem === 'unapproved-cash',
      },
    ],
  },
  {
    id: 'insights',
    type: 'navigation',
    title: p.tx(['sidePanel', 'insightsTitle'], 'Insights'),
    titleClassName: 'text-[13px] font-medium text-gray-400 dark:text-gray-500',
    items: buildInsightItems(p),
  },
];

export const buildSidePanelConfig = (p: SidePanelConfigParams): SidePanelPageConfig => ({
  pageId: 'statements',
  sections: buildSections(p),
  footer: {
    content: (
      <StatementsCircularUploadMenu
        providers={p.connectedCloudProviders}
        onScan={p.handleScanClick}
        onCloudImport={p.handleCloudImport}
        onGmail={p.handleGmailClick}
        onLocalUpload={() => p.navigateToSubmit('manual')}
      />
    ),
  },
});
