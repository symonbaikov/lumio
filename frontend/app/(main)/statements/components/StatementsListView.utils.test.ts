import { describe, expect, it } from 'vitest';
import {
  buildStatementRequestParams,
  deriveVisibleFilterScreens,
  paginateStatements,
  reconcileFiltersWithColumns,
} from './StatementsListView.utils';
import { DEFAULT_STATEMENT_FILTERS } from './filters/statement-filters';

describe('StatementsListView utils', () => {
  it('builds statement request params from search and applied filters without server pagination', () => {
    const result = buildStatementRequestParams({
      appliedFilters: {
        ...DEFAULT_STATEMENT_FILTERS,
        type: 'pdf',
        statuses: ['processing'],
        date: { mode: 'on', date: '2026-03-01' },
        keywords: 'alex',
        amountMin: 10,
        approved: true,
        groupBy: 'amount',
        has: ['errors'],
        currencies: ['KZT'],
        exported: false,
        limit: 25,
      },
      search: '',
    });

    expect(result).toEqual({
      type: 'pdf',
      statuses: ['processing'],
      dateMode: 'on',
      dateFrom: '2026-03-01',
      keywords: 'alex',
      amountMin: 10,
      limit: 25,
      approved: true,
      groupBy: 'amount',
      has: ['errors'],
      currencies: ['KZT'],
      exported: false,
    });
  });

  it('paginates filtered statements on the client', () => {
    const result = paginateStatements(
      [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }],
      2,
      2,
    );

    expect(result).toEqual([{ id: '3' }, { id: '4' }]);
  });

  it('derives visible filter screens from currently visible columns', () => {
    const result = deriveVisibleFilterScreens([
      { id: 'receipt', visible: true },
      { id: 'date', visible: true },
      { id: 'amount', visible: true },
      { id: 'approved', visible: false },
    ]);

    expect(result).toEqual([
      'amount',
      'date',
      'groupBy',
      'has',
      'keywords',
      'limit',
      'status',
      'type',
    ]);
  });

  it('reconciles applied and draft filters when columns hide optional filters', () => {
    const result = reconcileFiltersWithColumns({
      columns: [
        { id: 'receipt', label: 'Receipt', visible: true, order: 0 },
        { id: 'date', label: 'Date', visible: true, order: 1 },
        { id: 'amount', label: 'Amount', visible: false, order: 2 },
        { id: 'approved', label: 'Approved', visible: false, order: 3 },
      ],
      appliedFilters: {
        ...DEFAULT_STATEMENT_FILTERS,
        amountMin: 10,
        amountMax: 100,
        approved: true,
        keywords: 'keep',
      },
      draftFilters: {
        ...DEFAULT_STATEMENT_FILTERS,
        amountMin: 10,
        amountMax: 100,
        approved: true,
        keywords: 'keep',
      },
    });

    expect(result.allowedFilterKeys).toEqual([
      'date',
      'exported',
      'groupBy',
      'has',
      'keywords',
      'limit',
      'paid',
      'statuses',
      'type',
    ]);
    expect(result.nextAppliedFilters).toEqual({
      ...DEFAULT_STATEMENT_FILTERS,
      keywords: 'keep',
    });
    expect(result.nextDraftFilters).toEqual({
      ...DEFAULT_STATEMENT_FILTERS,
      keywords: 'keep',
    });
  });
});
