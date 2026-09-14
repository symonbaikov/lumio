// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../test-setup';
import { DATA_HEALTH_HISTORY_METRICS, MonthlyHistoryCard } from '../MonthlyHistoryCard';

const chartProps = vi.hoisted(() => vi.fn<(props: Record<string, unknown>) => void>());
const hooksMock = vi.hoisted(() => ({ useDashboardHealthHistory: vi.fn() }));

vi.mock('next/dynamic', () => ({
  default: () => (props: Record<string, unknown>) => {
    chartProps(props);
    return React.createElement('div', { 'data-testid': 'mock-chart' });
  },
}));

vi.mock('@/app/hooks/useDashboard', () => ({
  useDashboardHealthHistory: hooksMock.useDashboardHealthHistory,
}));

// Mirrors react-intlayer's renderIntlayerNode: usable as a JSX child and via `.value`.
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
    title: value('By month'),
    subtitle: value('{year} · {transactions} transactions · {statements} statements'),
    empty: value('No activity in {year}'),
    uncategorized: value('Uncategorized'),
    statementErrors: value('Statement errors'),
    statementsPendingReview: value('Awaiting review'),
    statementsPendingSubmit: value('Not submitted'),
    receiptsPendingReview: value('Receipts to review'),
    parsingWarnings: value('Parsing warnings'),
    overduePayments: value('Overdue payments'),
  }),
  useLocale: () => ({ locale: 'en' }),
}));

const month = (key: string, counts: Record<string, number> = {}) => ({
  month: key,
  transactions: 0,
  uncategorized: 0,
  statementsUploaded: 0,
  statementErrors: 0,
  statementsPendingReview: 0,
  statementsPendingSubmit: 0,
  parsingWarnings: 0,
  receiptsPendingReview: 0,
  overduePayments: 0,
  ...counts,
});

const loaded = (months: ReturnType<typeof month>[]) => ({
  data: { year: 2026, months },
  isPending: false,
  error: null,
});

describe('MonthlyHistoryCard', () => {
  beforeEach(() => {
    chartProps.mockClear();
    hooksMock.useDashboardHealthHistory.mockReset();
  });

  it('sums the year and charts every month with the picked month active', () => {
    hooksMock.useDashboardHealthHistory.mockReturnValue(
      loaded([
        month('2026-01', { transactions: 5, statementsUploaded: 1, uncategorized: 2, statementErrors: 1 }),
        month('2026-02', { transactions: 3, uncategorized: 1 }),
      ]),
    );

    render(
      <MonthlyHistoryCard
        displayMonth={new Date(2026, 1, 1)}
        metrics={DATA_HEALTH_HISTORY_METRICS}
        onSelectMonth={vi.fn()}
      />,
    );

    expect(hooksMock.useDashboardHealthHistory).toHaveBeenCalledWith(2026);
    expect(screen.getByText('2026 · 8 transactions · 1 statements')).toBeInTheDocument();
    expect(screen.getByText('Uncategorized').parentElement).toHaveTextContent('Uncategorized3');
    expect(screen.getByText('Statement errors').parentElement).toHaveTextContent(
      'Statement errors1',
    );
    const [props] = chartProps.mock.calls.at(-1) ?? [];
    expect(props?.activeMonth).toBe('2026-02');
    expect((props?.series as Array<{ key: string }>).map(item => item.key)).toEqual(
      DATA_HEALTH_HISTORY_METRICS,
    );
    expect(props?.points).toHaveLength(2);
  });

  it('opens a month picked on the chart', () => {
    hooksMock.useDashboardHealthHistory.mockReturnValue(
      loaded([month('2026-01', { transactions: 1 })]),
    );
    const onSelectMonth = vi.fn();

    render(
      <MonthlyHistoryCard
        displayMonth={new Date(2026, 1, 1)}
        metrics={DATA_HEALTH_HISTORY_METRICS}
        onSelectMonth={onSelectMonth}
      />,
    );
    const [props] = chartProps.mock.calls.at(-1) ?? [];
    (props?.onSelectMonth as (month: string) => void)('2026-01');

    expect(onSelectMonth).toHaveBeenCalledWith(2026, 0);
  });

  it('shows the empty state for a year without activity', () => {
    hooksMock.useDashboardHealthHistory.mockReturnValue(loaded([month('2026-01')]));

    render(
      <MonthlyHistoryCard
        displayMonth={new Date(2026, 0, 1)}
        metrics={DATA_HEALTH_HISTORY_METRICS}
        onSelectMonth={vi.fn()}
      />,
    );

    expect(screen.getByText('No activity in 2026')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument();
  });
});
