import Image from 'next/image';
import type React from 'react';

/**
 * Decorative illustrations shown when a page has no user content yet.
 * Sources: unDraw (https://undraw.co) — free for commercial use, no attribution required.
 * Recolored to the Lumio palette so they read on both light and dark themes.
 */
const ILLUSTRATIONS = {
  activity: { src: '/images/empty-states/activity.svg', width: 929, height: 744 },
  dashboard: { src: '/images/empty-states/dashboard.svg', width: 792, height: 399 },
  integrations: { src: '/images/empty-states/integrations.svg', width: 867, height: 673 },
  'no-data': { src: '/images/empty-states/no-data.svg', width: 648, height: 632 },
  'no-results': { src: '/images/empty-states/no-results.svg', width: 619, height: 800 },
  notifications: { src: '/images/empty-states/notifications.svg', width: 812, height: 800 },
  payables: { src: '/images/empty-states/payables.svg', width: 960, height: 617 },
  plugins: { src: '/images/empty-states/plugins.svg', width: 960, height: 644 },
  reports: { src: '/images/empty-states/reports.svg', width: 800, height: 590 },
  'spend-over-time': { src: '/images/empty-states/spend-over-time.svg', width: 711, height: 611 },
  statements: { src: '/images/empty-states/statements.svg', width: 778, height: 613 },
  storage: { src: '/images/empty-states/storage.svg', width: 858, height: 610 },
  subscriptions: { src: '/images/empty-states/subscriptions.svg', width: 567, height: 517 },
  tables: { src: '/images/empty-states/tables.svg', width: 800, height: 513 },
  'top-categories': { src: '/images/empty-states/top-categories.svg', width: 866, height: 576 },
  'top-merchants': { src: '/images/empty-states/top-merchants.svg', width: 709, height: 516 },
  'top-spenders': { src: '/images/empty-states/top-spenders.svg', width: 776, height: 764 },
  transactions: { src: '/images/empty-states/transactions.svg', width: 799, height: 618 },
  trash: { src: '/images/empty-states/trash.svg', width: 960, height: 727 },
  'unapproved-cash': { src: '/images/empty-states/unapproved-cash.svg', width: 961, height: 880 },
  workspaces: { src: '/images/empty-states/workspaces.svg', width: 525, height: 531 },
} as const;

export type EmptyStateIllustrationName = keyof typeof ILLUSTRATIONS;

interface EmptyStateIllustrationProps {
  name: EmptyStateIllustrationName;
  /** Controls the rendered max width: sm 120px, md 180px, lg 240px. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmptyStateIllustration({
  name,
  size = 'md',
  className,
}: EmptyStateIllustrationProps): React.JSX.Element {
  const illustration = ILLUSTRATIONS[name];

  return (
    <Image
      src={illustration.src}
      alt=""
      aria-hidden="true"
      width={illustration.width}
      height={illustration.height}
      unoptimized
      className={['lumio-empty-illustration', `lumio-empty-illustration--${size}`, className ?? '']
        .filter(Boolean)
        .join(' ')}
    />
  );
}
