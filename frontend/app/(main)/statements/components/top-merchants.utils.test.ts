import { describe, expect, it } from 'vitest';

import {
  type AggregateSortKey,
  type TopMerchantAggregateRow,
  buildPreviousPeriodRange,
  getComparisonDelta,
  resolveMerchantFlow,
  resolveSourceChannel,
  sortAggregateRows,
} from './top-merchants.utils';

describe('top merchants helpers', () => {
  it('resolves merchant flow using debit, credit and transaction type', () => {
    expect(
      resolveMerchantFlow({
        sourceType: 'statement',
        debit: 320,
        credit: 0,
        amount: 0,
        transactionType: 'expense',
      }),
    ).toEqual({ flowType: 'spend', amount: 320 });

    expect(
      resolveMerchantFlow({
        sourceType: 'statement',
        debit: 0,
        credit: 150,
        amount: 0,
        transactionType: 'income',
      }),
    ).toEqual({ flowType: 'income', amount: 150 });

    expect(
      resolveMerchantFlow({
        sourceType: 'statement',
        debit: 0,
        credit: 0,
        amount: 95,
        transactionType: 'income',
      }),
    ).toEqual({ flowType: 'income', amount: 95 });
  });

  it('maps source channels for icon rendering', () => {
    expect(resolveSourceChannel({ sourceType: 'gmail', fileType: 'gmail' })).toBe('gmail');
    expect(resolveSourceChannel({ sourceType: 'statement', fileType: 'pdf' })).toBe('receipt');
    expect(resolveSourceChannel({ sourceType: 'statement', fileType: 'expense' })).toBe('bank');
  });

  it('sorts aggregate rows by selected metric', () => {
    const rows: TopMerchantAggregateRow[] = [
      {
        id: 'a',
        merchant: 'A',
        sourceType: 'statement',
        sourceChannel: 'bank',
        flowType: 'spend',
        count: 7,
        total: 800,
        average: 114.28,
        lastDate: '2026-02-10',
        currency: 'EUR',
      },
      {
        id: 'b',
        merchant: 'B',
        sourceType: 'statement',
        sourceChannel: 'receipt',
        flowType: 'spend',
        count: 2,
        total: 1100,
        average: 550,
        lastDate: '2026-02-11',
        currency: 'EUR',
      },
      {
        id: 'c',
        merchant: 'C',
        sourceType: 'gmail',
        sourceChannel: 'gmail',
        flowType: 'spend',
        count: 15,
        total: 900,
        average: 60,
        lastDate: '2026-02-12',
        currency: 'EUR',
      },
    ];

    const sortBy = (key: AggregateSortKey) => sortAggregateRows(rows, key).map(row => row.id);

    expect(sortBy('amount')).toEqual(['b', 'c', 'a']);
    expect(sortBy('average')).toEqual(['b', 'a', 'c']);
    expect(sortBy('operations')).toEqual(['c', 'a', 'b']);
  });

  it('builds previous period boundaries and computes deltas', () => {
    const range = buildPreviousPeriodRange(
      new Date('2026-02-10T00:00:00.000Z'),
      new Date('2026-02-19T00:00:00.000Z'),
    );
    expect(range?.start.toISOString()).toBe('2026-01-31T00:00:00.000Z');
    expect(range?.end.toISOString()).toBe('2026-02-09T00:00:00.000Z');

    expect(getComparisonDelta(500, 400)).toEqual({ delta: 100, percentage: 25, trend: 'up' });
    expect(getComparisonDelta(400, 500)).toEqual({ delta: -100, percentage: -20, trend: 'down' });
  });
});
