// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { FinancialSnapshot } from '../FinancialSnapshot';
import { snapshotMock } from './__mocks__/snapshot';

describe('FinancialSnapshot', () => {
  it('renders six snapshot cards with values', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    const labels = {
      totalBalance: 'Total Balance',
      income: 'Income (30d)',
      expense: 'Expense (30d)',
      netFlow: 'Net Flow',
      toPay: 'To Pay',
      overdue: 'Overdue',
    };

    await act(async () => {
      root.render(
        <FinancialSnapshot
          snapshot={snapshotMock}
          formatAmount={value => `${value}`}
          labels={labels}
        />,
      );
    });

    expect(container.textContent).toContain('Total Balance');
    expect(container.textContent).toContain('Income (30d)');
    expect(container.textContent).toContain('Expense (30d)');
    expect(container.textContent).toContain('Net Flow');
    expect(container.textContent).toContain('To Pay');
    expect(container.textContent).toContain('Overdue');
    expect(container.textContent).toContain('1500');
    expect(container.textContent).toContain('2400');
    expect(container.textContent).toContain('900');
  });
});
