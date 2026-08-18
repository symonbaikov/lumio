import type { DashboardData } from '@/app/hooks/useDashboard';
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../test-setup';
import { OverviewTab } from '../OverviewTab';

// Mirrors react-intlayer's renderIntlayerNode: a Proxy over a rendered
// Fragment whose `.value` is intercepted to return the plain string, so the
// mock is usable both as a JSX child and via `.value` string access.
const value = (v: string) =>
  // biome-ignore lint/complexity/noUselessFragments: Proxy needs an object target — a bare string can't be proxied
  new Proxy(<>{v}</>, {
    get(target, prop, receiver) {
      if (prop === 'value') return v;
      return Reflect.get(target, prop, receiver);
    },
  });

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    emptyTitle: value('Upload your first statement'),
    emptyDescription: value(
      "Start tracking your finances by uploading a bank statement. We'll parse it automatically and show your cash flow, categories, and insights.",
    ),
    emptyCta: value('Parse statement'),
    periodBanner: value('Showing latest available period: {period}'),
    cashFlowTitle: value('Cash flow'),
    cashFlowSubtitle: value('Income vs. expenses · {range}'),
    cashFlowEmpty: value('No cash flow data yet'),
    income: value('Income'),
    expense: value('Expense'),
    spentLabel: value('Spent'),
    netLabel: value('Net'),
    savingsRateLabel: value('Savings rate'),
    topCategoriesTitle: value('Top categories'),
    viewAll: value('View all'),
    quickActionsTitle: value('Quick actions'),
    noActionsNeeded: value('No actions needed'),
    itemsToReview: value('{count} items to review'),
    parsingIssuesFound: value('Parsing issues found'),
    uploadDropTitle: value('Drop a statement here'),
    uploadDropSub: value('PDF, CSV, XLSX up to 10 MB'),
    noCategoryData: value('No category data'),
    uncategorized: value('Uncategorized'),
    other: value('Other'),
    title: value('Recent transactions'),
    empty: value('No transactions this period'),
  }),
  useLocale: () => ({ locale: 'en' }),
}));

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
  recentTransactions: [],
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
        displayMonth={new Date('2026-03-15')}
        changeMonth={() => {}}
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
        displayMonth={new Date('2026-03-15')}
        changeMonth={() => {}}
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
        displayMonth={new Date('2026-03-15')}
        changeMonth={() => {}}
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
              color: '#3b82f6',
              icon: null,
              amount: 100,
              percent: 100,
              count: 1,
            },
          ],
        }}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
        displayMonth={new Date('2026-03-15')}
        changeMonth={() => {}}
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
        displayMonth={new Date('2026-03-15')}
        changeMonth={() => {}}
      />,
    );

    const root = document.documentElement;
    root.classList.add('dark');

    const cashFlowTitle = screen.getByText('CASH FLOW (30D)');
    const cashFlowCard = cashFlowTitle.closest('[class*="dark:bg-card"]');

    expect(cashFlowCard?.className).toContain('dark:bg-card');
    expect(cashFlowCard?.className).toContain('dark:border-border');
    expect(cashFlowCard?.className).not.toContain('bg-white/40');
    expect(cashFlowCard?.className).not.toContain('border-white/60');

    root.classList.remove('dark');
  });

  it('renders enlarged lower analytics panels like trends layout', () => {
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
        displayMonth={new Date('2026-03-15')}
        changeMonth={() => {}}
      />,
    );

    const actionRequiredTitle = screen.getByText('ACTION REQUIRED');
    const actionRequiredPanel = actionRequiredTitle.closest('div[class*="bg-"]');
    const cashFlowTitle = screen.getByText('CASH FLOW (30D)');
    const cashFlowPanel = cashFlowTitle.closest('div[class*="bg-"]');
    const analyticsGrid = actionRequiredPanel?.parentElement;

    expect(analyticsGrid?.className).toContain('lg:grid-cols-12');
    expect(actionRequiredPanel?.className).toContain('lg:col-span-4');
    expect(actionRequiredPanel?.className).toContain('min-h-[320px]');
    expect(cashFlowPanel?.className).toContain('lg:col-span-8');
    expect(cashFlowPanel?.className).toContain('min-h-[320px]');
  });

  it('deep-links the recent-transactions "view all" link to the selected month, not today', () => {
    render(
      <OverviewTab
        data={{
          ...emptyDashboardData,
          snapshot: { ...emptyDashboardData.snapshot, totalBalance: 100 },
        }}
        formatAmount={value => String(value)}
        range="month"
        isLoading={false}
        displayMonth={new Date('2026-02-15')}
        changeMonth={() => {}}
      />,
    );

    const links = screen.getAllByRole('link', { name: /view all/i });
    const recentTransactionsLink = links.find(link =>
      link.getAttribute('href')?.startsWith('/statements/transactions'),
    );
    expect(recentTransactionsLink?.getAttribute('href')).toBe(
      '/statements/transactions?startDate=2026-02-01&endDate=2026-02-28',
    );
  });
});
