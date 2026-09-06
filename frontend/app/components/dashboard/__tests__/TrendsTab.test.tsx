// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../test-setup';
import { TrendsTab } from '../TrendsTab';

type TrendsTabData = React.ComponentProps<typeof TrendsTab>['data'];

const hooksMock = vi.hoisted(() => ({
  useDashboardTrends: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="mock-echarts" />,
}));

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));

vi.mock('@/app/hooks/useDashboard', async () => {
  const actual = await vi.importActual('@/app/hooks/useDashboard');
  return {
    ...actual,
    useDashboardTrends: hooksMock.useDashboardTrends,
  };
});

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
    title: value('TRENDS DASHBOARD'),
    showingPeriodPrefix: value('Showing latest available period:'),
    noTrendDataForPeriod: value('No trend data available for this period.'),
    dataSourcesTitle: value('Data sources'),
    statementsTitle: value('STATEMENTS'),
    netFlowTitle: value('NET FLOW'),
    counterpartiesTitle: value('COUNTERPARTIES'),
    income: value('Income'),
    expense: value('Expense'),
    net: value('Net'),
    categories: value('Categories'),
    totalFound: value('Total found'),
    syncedBadge: value('Synced'),
    activeBadge: value('Active'),
    readyBadge: value('Ready'),
    spendTrendTitle: value('Spend trend'),
    categoryBreakdownTitle: value('Category breakdown'),
    noTrendDataForRange: value('No trend data available for selected range'),
    noCategorizedTransactions: value('No categorized transactions to visualize'),
    forecastSuffix: value(' (forecast)'),
    forecastLabel: value('Forecast →'),
    expenseCategoriesSeriesName: value('Expense categories'),
    subtitle: value('Income vs. expenses · {range}'),
    empty: value('No cash flow data yet'),
  }),
  useLocale: () => ({ locale: 'en' }),
}));

describe('TrendsTab', () => {
  it('shows the effective period banner when trends use an auto-shifted window', () => {
    hooksMock.useDashboardTrends.mockReturnValue({
      data: {
        dailyTrend: [{ date: '2025-05-10', income: 100, expense: 40 }],
        forecast: [],
        categories: [{ name: 'Office', amount: 40, count: 1 }],
        counterparties: [{ name: 'Client', amount: 100, count: 1 }],
        sources: {
          statements: { income: 100, expense: 40, rows: 2 },
        },
        effectiveSince: '2025-05-01',
        effectiveEndDate: '2025-05-31',
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <TrendsTab
        data={{ cashFlow: [] } as unknown as TrendsTabData}
        formatAmount={value => String(value)}
        displayMonth={new Date(2026, 2, 1)}
      />,
    );

    expect(
      screen.getByText('Showing latest available period: 2025-05-01 - 2025-05-31'),
    ).toBeInTheDocument();
  });

  it('renders the month-scoped cash flow card above the rolling-window sections', () => {
    hooksMock.useDashboardTrends.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <TrendsTab
        data={{ cashFlow: [] } as unknown as TrendsTabData}
        formatAmount={value => String(value)}
        displayMonth={new Date(2026, 2, 1)}
      />,
    );

    expect(screen.getByText('Income vs. expenses · March 2026')).toBeInTheDocument();
    expect(screen.getByText('No cash flow data yet')).toBeInTheDocument();
  });

  it('switches the rolling window with the 7D/30D/90D chips', () => {
    hooksMock.useDashboardTrends.mockReturnValue({
      data: {
        dailyTrend: [{ date: '2025-05-10', income: 100, expense: 40 }],
        forecast: [],
        categories: [{ name: 'Office', amount: 40, count: 1 }],
        counterparties: [{ name: 'Client', amount: 100, count: 1 }],
        sources: { statements: { income: 100, expense: 40, rows: 2 } },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <TrendsTab
        data={{ cashFlow: [] } as unknown as TrendsTabData}
        formatAmount={value => String(value)}
        displayMonth={new Date(2026, 2, 1)}
      />,
    );

    expect(screen.getByRole('button', { name: '30D' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '7D' }));
    expect(hooksMock.useDashboardTrends).toHaveBeenLastCalledWith(7);
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('lists top categories with amounts next to the rose chart', () => {
    hooksMock.useDashboardTrends.mockReturnValue({
      data: {
        dailyTrend: [{ date: '2025-05-10', income: 100, expense: 40 }],
        forecast: [],
        categories: [
          { name: 'Office', amount: 40, count: 1 },
          { name: 'Rent', amount: 25, count: 1 },
        ],
        counterparties: [{ name: 'Client', amount: 100, count: 1 }],
        sources: { statements: { income: 100, expense: 40, rows: 2 } },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <TrendsTab
        data={{ cashFlow: [] } as unknown as TrendsTabData}
        formatAmount={value => `$${value}`}
        displayMonth={new Date(2026, 2, 1)}
      />,
    );

    expect(screen.getByText('Office')).toBeInTheDocument();
    expect(screen.getByText('$40')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
    expect(screen.getAllByTestId('mock-echarts').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('+$60').className).toContain('lumio-dashboard__stat-value--positive');
  });
});
