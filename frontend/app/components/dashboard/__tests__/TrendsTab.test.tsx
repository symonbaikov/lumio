// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
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
        data={{} as TrendsTabData}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    expect(
      screen.getByText('Showing latest available period: 2025-05-01 - 2025-05-31'),
    ).toBeInTheDocument();
  });

  it('renders spend trend surface without translucent white classes', () => {
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
        data={{} as TrendsTabData}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    const spendTrendHeading = screen.getByText(/spend trend/i);
    const spendTrendCard = spendTrendHeading.parentElement;
    const className = String(spendTrendCard?.className ?? '');

    expect(spendTrendCard).not.toBeNull();
    expect(className).not.toContain('bg-white/40');
    expect(className).not.toContain('border-white/60');
  });
});
