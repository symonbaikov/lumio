import { DEFAULT_STATEMENT_FILTERS } from '@/app/(main)/statements/components/filters/statement-filters';
import { describe, expect, it } from 'vitest';
import { buildSpendOverTimeQuery } from '../spend-over-time-api';

describe('spend over time api query builder', () => {
  it('maps net flow to all transaction types', () => {
    const query = buildSpendOverTimeQuery(
      {
        ...DEFAULT_STATEMENT_FILTERS,
        type: 'net',
      },
      'month',
    );

    expect(query).toEqual({
      type: 'all',
      groupBy: 'month',
    });
  });

  it('keeps extended grouping options', () => {
    const query = buildSpendOverTimeQuery(DEFAULT_STATEMENT_FILTERS, 'year');

    expect(query).toEqual({
      type: 'all',
      groupBy: 'year',
      dateFrom: expect.any(String),
      dateTo: expect.any(String),
    });
  });
});
