// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../test-setup';
import { TrendsTab } from '../TrendsTab';

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

describe('TrendsTab', () => {
  it('shows the effective period banner when trends use an auto-shifted window', () => {
    hooksMock.useDashboardTrends.mockReturnValue({
      data: {
        dailyTrend: [{ date: '2025-05-10', income: 100, expense: 40 }],
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
        data={{} as any}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    expect(
      screen.getByText('Showing latest available period: 2025-05-01 - 2025-05-31'),
    ).toBeInTheDocument();
  });
});
