import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TopCategoryAggregateRow } from '@/app/(main)/statements/components/top-categories.utils';
import { TopCategoriesLeaderboard } from './TopCategoriesLeaderboard';

vi.mock('@/app/lib/user-format-store', () => ({
  formatStoredDate: (value: string) => value,
}));

function row(overrides: Partial<TopCategoryAggregateRow>): TopCategoryAggregateRow {
  return {
    id: 'spend:statement:EUR:marketing and advertising',
    category: 'Marketing and advertising',
    sourceType: 'statement',
    sourceChannel: 'statement',
    flowType: 'spend',
    count: 3,
    total: 210,
    average: 70,
    lastDate: '2026-09-20',
    currency: 'EUR',
    ...overrides,
  } as TopCategoryAggregateRow;
}

function renderLeaderboard(rows: TopCategoryAggregateRow[]) {
  return render(
    <TopCategoriesLeaderboard
      rows={rows}
      sortKey="amount"
      onSortChange={vi.fn()}
      onRowClick={vi.fn()}
      title="Top categories"
      currency="EUR"
      sourceLabels={{
        sourceBank: 'Bank',
        sourceReceipt: 'Receipt',
        sourceGmailInbox: 'Gmail',
        sourceCrypto: 'Crypto',
      }}
      sortLabels={{ sortByAmount: 'Amount', sortByAverage: 'Average', sortByOperations: 'Ops' }}
      columnLabels={{
        category: 'Category',
        source: 'Source',
        operations: 'Operations',
        average: 'Average',
        amount: 'Amount',
        lastOperation: 'Last',
      }}
      emptyLabel="No data"
    />,
  );
}

describe('TopCategoriesLeaderboard', () => {
  it('marks each row as a focus target keyed by category name', () => {
    // `?focus=category:<name>` from an insight has to find the row; aggregate
    // row ids carry no category id, so the name is the only shared handle.
    const { container } = renderLeaderboard([row({}), row({ id: 'b', category: 'Travel' })]);

    expect(
      container.querySelector('tr[data-attention="category:marketing and advertising"]'),
    ).not.toBeNull();
    expect(container.querySelector('tr[data-attention="category:travel"]')).not.toBeNull();
  });

  it('puts the larger row first so the deep link lands on it', () => {
    // The hook takes the first match in document order.
    const { container } = renderLeaderboard([
      row({ id: 'big', total: 900 }),
      row({ id: 'small', sourceChannel: 'gmail', total: 40 }),
    ]);

    const matches = container.querySelectorAll(
      'tr[data-attention="category:marketing and advertising"]',
    );
    expect(matches).toHaveLength(2);
    expect(matches[0]?.textContent).toContain('900');
  });
});
