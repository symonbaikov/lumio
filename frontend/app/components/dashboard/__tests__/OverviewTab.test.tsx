import type { DashboardData } from '@/app/hooks/useDashboard';
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../test-setup';
import { OverviewTab } from '../OverviewTab';

const emptyDashboardData: DashboardData = {
  snapshot: {
    totalBalance: 0,
    income30d: 0,
    expense30d: 0,
    netFlow30d: 0,
    totalPayable: 0,
    totalOverdue: 0,
    unapprovedCash: 0,
    currency: 'KZT',
  },
  actions: [],
  cashFlow: [],
  topMerchants: [],
  topCategories: [],
  recentActivity: [],
  role: 'owner',
  range: '30d',
  dataHealth: {
    uncategorizedTransactions: 0,
    statementsWithErrors: 0,
    statementsPendingReview: 0,
    statementsPendingSubmit: 0,
    receiptsPendingReview: 0,
    unapprovedCash: 0,
    lastUploadDate: null,
    parsingWarnings: 0,
  },
};

describe('OverviewTab', () => {
  it('renders formatted snapshot amounts without duplicating currency code', () => {
    render(
      <OverviewTab
        data={{
          ...emptyDashboardData,
          snapshot: {
            ...emptyDashboardData.snapshot,
            totalBalance: 1025215,
          },
        }}
        formatAmount={() => 'KZT 1,025,215'}
        range="30d"
        isLoading={false}
      />,
    );

    expect(document.body.textContent).toContain('KZT 1,025,215');
    expect(document.body.textContent).not.toContain('KZT KZT 1,025,215');
  });

  it('links parse statement CTA to statements with scan drawer', () => {
    render(
      <OverviewTab
        data={emptyDashboardData}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    const parseLink = screen.getByRole('link', { name: /parse statement/i });

    expect(parseLink).toBeTruthy();
    expect(parseLink?.getAttribute('href')).toBe('/statements?openExpenseDrawer=scan');
  });

  it('shows the effective period banner when backend auto-shifts the window', () => {
    render(
      <OverviewTab
        data={{
          ...emptyDashboardData,
          effectiveSince: '2025-05-01',
          effectiveEndDate: '2025-05-31',
          snapshot: {
            ...emptyDashboardData.snapshot,
            totalBalance: 100,
          },
        }}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
        effectivePeriod="2025-05-01 - 2025-05-31"
      />,
    );

    expect(
      screen.getByText('Showing latest available period: 2025-05-01 - 2025-05-31'),
    ).toBeInTheDocument();
  });

  it('does not render the spending categories section', () => {
    render(
      <OverviewTab
        data={{
          ...emptyDashboardData,
          snapshot: {
            ...emptyDashboardData.snapshot,
            totalBalance: 100,
          },
          topCategories: [
            {
              id: 'cat-1',
              name: 'Office',
              amount: 100,
              transactions: 1,
              percentage: 100,
              count: 1,
            },
          ],
        }}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    expect(screen.queryByText('SPENDING CATEGORIES')).not.toBeInTheDocument();
  });

  it('renders the cash flow panel inside the dashboard card layout', () => {
    render(
      <OverviewTab
        data={{
          ...emptyDashboardData,
          snapshot: {
            ...emptyDashboardData.snapshot,
            totalBalance: 100,
          },
        }}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    const cashFlowTitle = screen.getByText('Cash flow');
    const cashFlowCard = cashFlowTitle.closest('.lumio-dashboard__card');

    expect(cashFlowCard).toBeInTheDocument();
    expect(cashFlowCard?.className).toContain('lumio-dashboard__cashflow');
    expect(cashFlowCard?.className).not.toContain('bg-white/40');
    expect(cashFlowCard?.className).not.toContain('border-white/60');
  });

  it('renders lower dashboard panels in the dashboard grid', () => {
    render(
      <OverviewTab
        data={{
          ...emptyDashboardData,
          snapshot: {
            ...emptyDashboardData.snapshot,
            totalBalance: 100,
          },
        }}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    const quickActionsTitle = screen.getByText('Quick actions');
    const quickActionsPanel = quickActionsTitle.closest('.lumio-dashboard__card');
    const cashFlowTitle = screen.getByText('Cash flow');
    const cashFlowPanel = cashFlowTitle.closest('.lumio-dashboard__card');
    const dashboardGrid = cashFlowPanel?.parentElement;

    expect(dashboardGrid?.className).toContain('lumio-dashboard__grid');
    expect(quickActionsPanel?.className).toContain('lumio-dashboard__actions');
    expect(cashFlowPanel?.className).toContain('lumio-dashboard__cashflow');
  });
});
