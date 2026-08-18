import { render, screen } from '@testing-library/react';
// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@/app/test/setup';
import DashboardPage from './page';

const replace = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@mui/material', () => ({
  Tabs: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tab: ({ label }: { label: React.ReactNode }) => <button type="button">{label}</button>,
}));

vi.mock('@/app/components/icons', () => ({
  CheckCircle2: () => <span data-testid="check-circle-icon" />,
  CircleAlert: () => <span data-testid="circle-alert-icon" />,
  ExternalLink: () => <span data-testid="external-link-icon" />,
  ListChecks: () => <span data-testid="list-checks-icon" />,
  RefreshCcw: () => <span data-testid="refresh-icon" />,
}));

vi.mock('@/app/components/ui/spinner', () => ({
  Spinner: () => <div>spinner</div>,
}));

vi.mock('@/app/components/dashboard/FinanceOpsTab', () => ({
  FinanceOpsTab: () => <div>Finance ops tab</div>,
}));

vi.mock('@/app/components/dashboard/OverviewTab', () => ({
  OverviewTab: () => <div>Overview tab</div>,
}));

vi.mock('@/app/components/dashboard/TrendsTab', () => ({
  TrendsTab: () => <div>Trends tab</div>,
}));

vi.mock('@/app/components/dashboard/DataHealthTab', () => ({
  DataHealthTab: () => <div>Data health tab</div>,
}));

vi.mock('@/app/components/dashboard/ExportDropdown', () => ({
  ExportDropdown: ({ t }: { t: { button: { value: string } } }) => (
    <div data-testid="export-dropdown">{t.button.value}</div>
  ),
}));

vi.mock('@/app/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    currentWorkspace: { id: 'workspace-1' },
    loading: false,
  }),
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      name: 'Symon',
      onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
    },
    loading: false,
  }),
}));

vi.mock('@/app/hooks/useDashboard', () => ({
  useDashboard: () => ({
    data: {
      snapshot: {
        currency: 'KZT',
      },
      dataHealth: {
        statementsPendingReview: 0,
        lastUploadDate: '2026-01-01T00:00:00.000Z',
      },
      effectiveSince: null,
      effectiveEndDate: null,
    },
    loading: false,
    error: null,
    refresh,
    range: '30d',
  }),
}));

vi.mock('@/app/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/app/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    handlers: {},
    pullDistance: 0,
    isRefreshing: false,
    isReadyToRefresh: false,
  }),
}));

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    greeting: {
      fallbackName: { value: 'User' },
      upToDate: {
        subtitle: { value: 'Hello {name}' },
      },
    },
    statusHeading: {
      allClear: { value: 'All good' },
    },
    refresh: {
      loading: { value: 'Loading' },
      ready: { value: 'Ready' },
      idle: { value: 'Idle' },
    },
    exportMenu: {
      button: { value: 'Export' },
    },
    tabs: {
      financeOps: { value: 'Finance Ops' },
      overview: { value: 'Overview' },
      trends: { value: 'Trends' },
      dataHealth: { value: 'Data Health' },
    },
    uploadStatement: { value: 'Upload statement' },
  }),
  useLocale: () => ({ locale: 'en' }),
}));

vi.mock('@/app/lib/dashboard-effective-window', () => ({
  resolveDashboardEffectivePeriod: () => null,
}));

vi.mock('@/app/lib/dashboard-status-heading', () => ({
  resolveDashboardStatusHeading: () => 'allClear',
}));

describe('DashboardPage', () => {
  it('renders the export dropdown in the header actions', () => {
    render(<DashboardPage />);

    expect(screen.getByTestId('export-dropdown')).toHaveTextContent('Export');
  });

  it('links Upload statement to statements with the scan drawer open', () => {
    render(<DashboardPage />);

    const link = screen.getByRole('link', { name: /upload statement/i });

    expect(link.getAttribute('href')).toBe('/statements?openExpenseDrawer=scan');
  });

  it('renders the Upload statement action with rounded corners', () => {
    render(<DashboardPage />);

    const link = screen.getByRole('link', { name: /upload statement/i });

    expect(link.getAttribute('style')).toContain('border-radius');
  });
});
