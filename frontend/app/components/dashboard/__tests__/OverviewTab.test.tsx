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

  it('uses the updated cash flow panel background color', () => {
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

    const cashFlowTitle = screen.getByText('Cash Flow (30d)');
    const cashFlowPanel = cashFlowTitle.closest('div[class*="bg-"]');

    expect(cashFlowPanel?.className).toContain('bg-[#E9E4DC]');
    expect(cashFlowPanel?.className).not.toContain('bg-[#F5F3EF]');
    expect(cashFlowPanel?.className).not.toContain('border');
  });
});
