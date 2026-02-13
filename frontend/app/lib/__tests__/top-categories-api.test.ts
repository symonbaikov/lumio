import { DEFAULT_STATEMENT_FILTERS } from '@/app/(main)/statements/components/filters/statement-filters';
import { describe, expect, it } from 'vitest';
import { buildTopCategoriesQuery } from '../top-categories-api';

describe('top categories api query builder', () => {
  it('maps statement filters into report query', () => {
    const filters = {
      ...DEFAULT_STATEMENT_FILTERS,
      type: 'pdf',
      statuses: ['completed', 'processing'],
      date: { mode: 'after' as const, date: '2026-01-01' },
      amountMin: 100,
      amountMax: 5000,
      keywords: 'github',
      currencies: ['USD', 'KZT'],
      from: ['bank:Kaspi'],
      limit: 15,
    };

    const query = buildTopCategoriesQuery(filters);

    expect(query).toMatchObject({
      type: 'expense',
      statuses: 'completed,processing',
      dateFrom: '2026-01-01',
      amountMin: 100,
      amountMax: 5000,
      keywords: 'github',
      currencies: 'USD,KZT',
      bankName: 'Kaspi',
      limit: 15,
    });
  });

  it('omits empty filters from query', () => {
    const query = buildTopCategoriesQuery(DEFAULT_STATEMENT_FILTERS);

    expect(query).toEqual({ type: 'expense', limit: 20 });
  });
});
