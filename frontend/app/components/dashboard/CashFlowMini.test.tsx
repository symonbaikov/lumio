// @vitest-environment jsdom
import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const chartPropsSpy = vi.hoisted(() => vi.fn<(props: Record<string, unknown>) => void>());

vi.mock('next/dynamic', () => ({
  default: (loader: unknown) => {
    void loader;
    return (props: Record<string, unknown>) => {
      chartPropsSpy(props);
      return React.createElement('div', { 'data-testid': 'cash-flow-mini-chart' });
    };
  },
}));

const themeMock = vi.hoisted(() => ({
  resolvedTheme: 'dark',
}));

vi.mock('next-themes', () => ({
  useTheme: () => themeMock,
}));

describe('CashFlowMini', () => {
  beforeEach(() => {
    chartPropsSpy.mockClear();
  });

  it('hides y-axis labels to avoid tiny overlapping numbers', async () => {
    const { CashFlowMini } = await import('./CashFlowMini');

    render(
      <CashFlowMini
        emptyLabel="No data"
        incomeLabel="Income"
        expenseLabel="Expense"
        data={[
          { date: '2025-12-08', income: 500000, expense: 300000 },
          { date: '2025-12-09', income: 320000, expense: 180000 },
        ]}
      />,
    );

    expect(chartPropsSpy).toHaveBeenCalled();
    const [props] = chartPropsSpy.mock.calls.at(-1) ?? [];
    const option = props?.option as { yAxis?: { axisLabel?: { show?: boolean } } } | undefined;

    expect(option?.yAxis?.axisLabel?.show).toBe(false);
  });

  it('does not render a duplicate large chart title inside the card', async () => {
    const { CashFlowMini } = await import('./CashFlowMini');

    const { container } = render(
      <CashFlowMini
        emptyLabel="No data"
        incomeLabel="Income"
        expenseLabel="Expense"
        data={[
          { date: '2025-12-08', income: 500000, expense: 300000 },
          { date: '2025-12-09', income: 320000, expense: 180000 },
        ]}
      />,
    );

    expect(container.textContent).not.toContain('Cash Flow (30d)');
  });

  it('uses dark-theme chart colors with muted labels and non-white grid lines', async () => {
    const { CashFlowMini } = await import('./CashFlowMini');

    render(
      <CashFlowMini
        emptyLabel="No data"
        incomeLabel="Income"
        expenseLabel="Expense"
        data={[
          { date: '2025-12-08', income: 500000, expense: 300000 },
          { date: '2025-12-09', income: 320000, expense: 180000 },
        ]}
      />,
    );

    const [props] = chartPropsSpy.mock.calls.at(-1) ?? [];
    const option = props?.option as
      | {
          legend?: { textStyle?: { color?: string } };
          xAxis?: { axisLabel?: { color?: string }; axisLine?: { lineStyle?: { color?: string } } };
          yAxis?: { splitLine?: { lineStyle?: { color?: string } } };
          series?: Array<{ lineStyle?: { color?: string } }>;
        }
      | undefined;

    expect(option?.legend?.textStyle?.color).toBe('#8899AA');
    expect(option?.xAxis?.axisLabel?.color).toBe('#8899AA');
    expect(option?.xAxis?.axisLine?.lineStyle?.color).toBe('#2A3442');
    expect(option?.yAxis?.splitLine?.lineStyle?.color).toBe('#2A3442');
    expect(option?.series?.[0]?.lineStyle?.color).toBe('#34D399');
  });

  it('shows point symbols when the series is too sparse to draw a visible line', async () => {
    const { CashFlowMini } = await import('./CashFlowMini');

    render(
      <CashFlowMini
        emptyLabel="No data"
        incomeLabel="Income"
        expenseLabel="Expense"
        data={[{ date: '2026-05-06', income: 0, expense: 100 }]}
      />,
    );

    const [props] = chartPropsSpy.mock.calls.at(-1) ?? [];
    const option = props?.option as
      | { series?: Array<{ symbol?: string; showSymbol?: boolean; symbolSize?: number }> }
      | undefined;

    expect(option?.series?.[0]).toMatchObject({
      symbol: 'circle',
      showSymbol: true,
      symbolSize: 7,
    });
    expect(option?.series?.[1]).toMatchObject({
      symbol: 'circle',
      showSymbol: true,
      symbolSize: 7,
    });
  });
});
