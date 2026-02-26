import { describe, expect, it } from 'vitest';

import {
  type AggregateSortKey,
  type TopSpenderAggregateRow,
  buildPreviousPeriodRange,
  getComparisonDelta,
  resolveSourceChannel,
  resolveSpenderFlow,
  sortAggregateRows,
} from './top-spenders.utils';

describe('top spenders helpers', () => {
  it('resolves spender flow from debit and credit values', () => {
    expect(
      resolveSpenderFlow({ sourceType: 'statement', totalDebit: 320, totalCredit: 0 }),
    ).toEqual({
      flowType: 'spend',
      amount: 320,
    });

    expect(
      resolveSpenderFlow({ sourceType: 'statement', totalDebit: 0, totalCredit: 150 }),
    ).toEqual({
      flowType: 'income',
      amount: 150,
    });

    expect(resolveSpenderFlow({ sourceType: 'gmail', totalDebit: 90, totalCredit: 0 })).toEqual({
      flowType: 'spend',
      amount: 90,
    });
  });

  it('maps source channel for icon rendering', () => {
    expect(resolveSourceChannel({ sourceType: 'gmail', fileType: 'gmail' })).toBe('gmail');
    expect(resolveSourceChannel({ sourceType: 'statement', fileType: 'pdf' })).toBe('receipt');
    expect(resolveSourceChannel({ sourceType: 'statement', fileType: 'expense' })).toBe('bank');
  });

  it('sorts aggregate rows by selected metric', () => {
    const rows: TopSpenderAggregateRow[] = [
      {
        id: 'a',
        company: 'A',
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
        company: 'B',
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
        company: 'C',
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

    expect(getComparisonDelta(500, 400)).toEqual({
      delta: 100,
      percentage: 25,
      trend: 'up',
    });
    expect(getComparisonDelta(400, 500)).toEqual({
      delta: -100,
      percentage: -20,
      trend: 'down',
    });
  });
});
