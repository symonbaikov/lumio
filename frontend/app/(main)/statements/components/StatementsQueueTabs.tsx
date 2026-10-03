'use client';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sharedMuiTabsSx } from '@/app/components/ui/mui-tabs';
import { useIntlayer } from '@/app/i18n';
import { getNestedValue, resolveLabel } from '@/app/lib/side-panel-utils';
import { useStatementsQueue } from './statements-queue-context';

type TabId = 'submit' | 'approve' | 'pay' | 'receive' | 'unapproved-cash';

type QueueTab = {
  id: TabId;
  label: string;
  href: string;
  badge: number | null;
  badgeLoading: boolean;
};

// The tab for a URL: /statements/<tab>[/...]; nothing elsewhere.
export function getStatementsActiveTab(pathname: string | null): TabId | undefined {
  const segment = pathname?.match(/^\/statements\/([^/]+)/)?.[1];
  return (['submit', 'approve', 'pay', 'receive', 'unapproved-cash'] as const).find(
    tab => tab === segment,
  );
}

// A count still loading is left off the label rather than swapped for a spinner,
// which would make the tab width jump as the counts land.
function tabLabel(tab: QueueTab): string {
  if (tab.badge === null || tab.badgeLoading) {
    return tab.label;
  }
  return `${tab.label} (${tab.badge})`;
}

/**
 * The statements work queue, as tabs on the page itself: Submit, Approve, Pay,
 * Receive and Unapproved cash. Each tab is its own route, so deep links and the
 * back button keep working; switching tabs only swaps the view below.
 */
export function StatementsQueueTabs(): React.JSX.Element {
  const t = useIntlayer('statementsPage');
  const pathname = usePathname();
  const activeTab = getStatementsActiveTab(pathname);
  const { counts, countsLoading, payCount, payCountLoading } = useStatementsQueue();

  const tx = (path: string[], fallback: string): string =>
    resolveLabel(getNestedValue(t, path), fallback);

  const tabs: QueueTab[] = [
    {
      id: 'submit',
      label: tx(['sidePanel', 'submit'], 'Submit'),
      href: '/statements/submit',
      badge: counts.submit,
      badgeLoading: countsLoading,
    },
    {
      id: 'approve',
      label: tx(['sidePanel', 'approve'], 'Approve'),
      href: '/statements/approve',
      badge: counts.approve,
      badgeLoading: countsLoading,
    },
    {
      id: 'pay',
      label: tx(['sidePanel', 'pay'], 'Pay'),
      href: '/statements/pay',
      badge: payCount,
      badgeLoading: payCountLoading,
    },
    {
      id: 'receive',
      label: tx(['sidePanel', 'receive'], 'Receive'),
      href: '/statements/receive',
      badge: null,
      badgeLoading: false,
    },
    {
      id: 'unapproved-cash',
      label: tx(['sidePanel', 'unapprovedCash'], 'Unapproved cash'),
      href: '/statements/unapproved-cash',
      badge: counts.unapprovedCash,
      badgeLoading: countsLoading,
    },
  ];

  return (
    <Tabs
      value={activeTab ?? false}
      variant="scrollable"
      scrollButtons={false}
      aria-label={tx(['sidePanel', 'workQueueTitle'], 'Work queue')}
      data-tour-id="statements-queue-tabs"
      sx={{ ...sharedMuiTabsSx, mb: 0 }}
    >
      {tabs.map(tab => (
        <Tab key={tab.id} value={tab.id} component={Link} href={tab.href} label={tabLabel(tab)} />
      ))}
    </Tabs>
  );
}
