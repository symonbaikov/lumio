import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import './test-setup';
import { RecentActivity } from './RecentActivity';

const formatAmount = (v: number) => `${v}`;

type Activity = import('@/app/hooks/useDashboard').DashboardRecentActivity;

const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: `id-${Math.random()}`,
  type: 'statement_upload',
  title: '71686bc8-617f-42c0-99ca-d5e7c005c614',
  description: null,
  amount: null,
  timestamp: new Date().toISOString(),
  href: '/test',
  ...overrides,
});

describe('RecentActivity', () => {
  it('shows empty state when no activities', () => {
    render(
      <RecentActivity
        activities={[]}
        formatAmount={formatAmount}
        title="Recent activity"
        emptyLabel="No activity"
      />,
    );
    expect(screen.getByText('No activity')).toBeInTheDocument();
  });

  it('groups activities by date bucket and strips UUID titles', () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    render(
      <RecentActivity
        activities={[
          makeActivity({
            timestamp: today,
            type: 'import',
            description: 'Kaspi statement – 15 tx',
          }),
          makeActivity({
            timestamp: yesterday,
            type: 'delete',
            description: 'File: bereke-bank.pdf',
          }),
        ]}
        formatAmount={formatAmount}
        title="Recent activity"
        emptyLabel="No activity"
      />,
    );

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('Import completed')).toBeInTheDocument();
    expect(screen.getByText('Item deleted')).toBeInTheDocument();
    expect(screen.getByText('Kaspi statement – 15 tx')).toBeInTheDocument();
    expect(screen.getByText('File: bereke-bank.pdf')).toBeInTheDocument();
  });
});
