import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_STATEMENT_COLUMNS,
  STATEMENT_COLUMNS_STORAGE_KEY,
  loadStatementColumns,
  reorderStatementColumns,
  saveStatementColumns,
  type StatementColumn,
} from './statement-columns';

describe('statement column storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when storage is empty', () => {
    const result = loadStatementColumns();
    expect(result).toEqual(DEFAULT_STATEMENT_COLUMNS);
  });

  it('merges stored columns with defaults', () => {
    const stored = [
      { id: 'amount', visible: false, order: 0 },
      { id: 'date', visible: true, order: 1 },
    ];
    localStorage.setItem(STATEMENT_COLUMNS_STORAGE_KEY, JSON.stringify(stored));

    const result = loadStatementColumns();
    const amount = result.find((column: StatementColumn) => column.id === 'amount');
    const receipt = result.find((column: StatementColumn) => column.id === 'receipt');

    expect(amount?.visible).toBe(false);
    expect(receipt).toBeTruthy();
    expect(result.map((column: StatementColumn) => column.id)).toContain('date');
  });

  it('saves columns to storage', () => {
    saveStatementColumns(DEFAULT_STATEMENT_COLUMNS);
    const stored = localStorage.getItem(STATEMENT_COLUMNS_STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored || '[]')).toEqual(DEFAULT_STATEMENT_COLUMNS);
  });

  it('reorders columns and updates order values', () => {
    const columns = [
      { id: 'receipt', label: 'Receipt', visible: true, order: 0 },
      { id: 'date', label: 'Date', visible: true, order: 1 },
      { id: 'amount', label: 'Amount', visible: true, order: 2 },
    ] as StatementColumn[];

    const result = reorderStatementColumns(columns, 'amount', 'receipt');

    expect(result.map((column: StatementColumn) => column.id)).toEqual([
      'amount',
      'receipt',
      'date',
    ]);
    expect(result.map((column: StatementColumn) => column.order)).toEqual([0, 1, 2]);
  });
});
