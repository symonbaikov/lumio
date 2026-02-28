import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import './test-setup';
import { type FinancialKpi, FinancialOverview } from './FinancialOverview';

const formatAmount = (v: number) => `${v}`;

describe('FinancialOverview', () => {
  const items: FinancialKpi[] = [
    { key: 'income', label: 'Income', value: 12000, delta: 5.2 },
    { key: 'expense', label: 'Expense', value: 8000, delta: -3.1 },
  ];

  it('renders KPIs with labels and values', () => {
    render(
      <FinancialOverview
        items={items}
        periodLabel="Last 30d"
        formatAmount={formatAmount}
        emptyLabel="Empty"
      />,
    );
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('12000')).toBeInTheDocument();
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByText('8000')).toBeInTheDocument();
  });

  it('renders deltas with correct sign', () => {
    render(
      <FinancialOverview
        items={items}
        periodLabel="Last 30d"
        formatAmount={formatAmount}
        emptyLabel="Empty"
      />,
    );
    expect(screen.getByText('+5.2% vs prev')).toBeInTheDocument();
    expect(screen.getByText('-3.1% vs prev')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(
      <FinancialOverview
        items={[]}
        periodLabel="Last 30d"
        formatAmount={formatAmount}
        emptyLabel="Empty"
      />,
    );
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });
});
