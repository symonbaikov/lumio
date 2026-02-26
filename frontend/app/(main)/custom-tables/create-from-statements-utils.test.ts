// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  buildStatementSelectionOptions,
  filterStatementSelectionOptions,
  getSelectedStatementsSummary,
} from './create-from-statements-utils';

describe('create-from-statements-utils', () => {
  it('deduplicates repeated uploads by signature and keeps newest as representative', () => {
    const options = buildStatementSelectionOptions([
      {
        id: 'old',
        fileName: 'bereke-2.pdf',
        status: 'processed',
        totalTransactions: 11,
        statementDateFrom: '2026-02-01',
        statementDateTo: '2026-02-28',
        createdAt: '2026-02-15T08:00:00.000Z',
        bankName: 'Bereke',
      },
      {
        id: 'new',
        fileName: 'bereke-2.pdf',
        status: 'processed',
        totalTransactions: 11,
        statementDateFrom: '2026-02-01',
        statementDateTo: '2026-02-28',
        createdAt: '2026-02-16T08:00:00.000Z',
        bankName: 'Bereke',
      },
      {
        id: 'unique',
        fileName: 'kaspi.pdf',
        status: 'processed',
        totalTransactions: 14,
        statementDateFrom: '2026-01-01',
        statementDateTo: '2026-01-31',
        createdAt: '2026-01-31T08:00:00.000Z',
        bankName: 'Kaspi',
      },
    ]);

    expect(options).toHaveLength(2);

    const grouped = options.find(option => option.representativeId === 'new');
    expect(grouped?.duplicateCount).toBe(2);
    expect(grouped?.statementIds).toEqual(['new', 'old']);
  });

  it('builds readable labels and explains rows value', () => {
    const [option] = buildStatementSelectionOptions([
      {
        id: 'statement-1',
        fileName: 'Vypiska_po_schetu_KZ17722S000023921191-154.pdf',
        status: 'processed',
        totalTransactions: 14,
        statementDateFrom: '2026-02-01',
        statementDateTo: '2026-02-28',
        createdAt: '2026-02-28T08:00:00.000Z',
        bankName: 'Kaspi',
      },
    ]);

    expect(option.title).toBe('Bank statement - Feb 2026');
    expect(option.sourceLabel).toBe('Kaspi');
    expect(option.rows).toBe(14);
    expect(option.rowsLabel).toBe('Rows: 14');
    expect(option.fileLabel.length).toBeLessThan(
      'Vypiska_po_schetu_KZ17722S000023921191-154.pdf'.length,
    );
  });

  it('filters options by search query and source', () => {
    const options = buildStatementSelectionOptions([
      {
        id: 'bereke',
        fileName: 'bereke-feb.pdf',
        status: 'processed',
        totalTransactions: 11,
        statementDateFrom: '2026-02-01',
        statementDateTo: '2026-02-28',
        createdAt: '2026-02-28T08:00:00.000Z',
        bankName: 'Bereke',
      },
      {
        id: 'kaspi',
        fileName: 'kaspi-feb.pdf',
        status: 'processed',
        totalTransactions: 14,
        statementDateFrom: '2026-02-01',
        statementDateTo: '2026-02-28',
        createdAt: '2026-02-28T08:00:00.000Z',
        bankName: 'Kaspi',
      },
    ]);

    expect(filterStatementSelectionOptions(options, { source: 'Kaspi' })).toHaveLength(1);
    expect(filterStatementSelectionOptions(options, { query: 'bereke-feb' })).toHaveLength(1);
  });

  it('builds selected rows summary for preview', () => {
    const options = buildStatementSelectionOptions([
      {
        id: 'first',
        fileName: 'first.pdf',
        status: 'processed',
        totalTransactions: 10,
        statementDateFrom: '2026-02-01',
        statementDateTo: '2026-02-28',
        createdAt: '2026-02-28T08:00:00.000Z',
      },
      {
        id: 'second',
        fileName: 'second.pdf',
        status: 'processed',
        totalTransactions: 20,
        statementDateFrom: '2026-02-01',
        statementDateTo: '2026-02-28',
        createdAt: '2026-02-27T08:00:00.000Z',
      },
    ]);

    expect(getSelectedStatementsSummary(options, ['first', 'second'])).toEqual({
      selectedCount: 2,
      totalRows: 30,
    });
  });
});
