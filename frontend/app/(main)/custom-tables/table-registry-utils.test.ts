// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  type TableRegistryItem,
  formatRowsCount,
  resolveCreatedFromBadge,
  resolveHumanTableName,
  resolveSourceSummary,
  resolveTablePurpose,
} from './table-registry-utils';

const baseItem: TableRegistryItem = {
  id: 'table-1',
  name: 'Expenses export - February',
  source: 'statement_export',
  createdAt: '2026-02-02T10:00:00.000Z',
  updatedAt: '2026-02-08T10:00:00.000Z',
};

describe('table-registry-utils', () => {
  it('resolves table purpose from source and naming', () => {
    expect(resolveTablePurpose(baseItem)).toBe('Export');

    expect(
      resolveTablePurpose({
        ...baseItem,
        name: 'Monthly reconciliation',
        source: 'manual',
      }),
    ).toBe('Reconciliation');

    expect(
      resolveTablePurpose({
        ...baseItem,
        name: 'Category map',
        description: 'categories mapping for 1C upload',
        source: 'manual',
      }),
    ).toBe('Categories mapping');
  });

  it('formats source summary labels', () => {
    expect(resolveSourceSummary(baseItem)).toBe('Statements');
    expect(resolveSourceSummary({ ...baseItem, source: 'google_sheets_import' })).toBe(
      'Google Sheets',
    );
    expect(resolveSourceSummary({ ...baseItem, source: 'manual' })).toBe('Manual');
  });

  it('builds created-from statements badge text', () => {
    expect(resolveCreatedFromBadge(baseItem)).toBe('Created from Statements (Feb 2026)');
    expect(resolveCreatedFromBadge({ ...baseItem, source: 'manual' })).toBeNull();
  });

  it('formats rows count with separators', () => {
    expect(formatRowsCount(1248)).toBe('1,248');
    expect(formatRowsCount(undefined)).toBe('—');
  });

  it('normalizes generic table names into human readable titles', () => {
    expect(resolveHumanTableName({ ...baseItem, name: '1' })).toBe(
      'Bank statements export - Feb 2026',
    );
    expect(
      resolveHumanTableName({ ...baseItem, name: 'Table 2', source: 'google_sheets_import' }),
    ).toBe('Google Sheets export - Feb 2026');
    expect(
      resolveHumanTableName({ ...baseItem, name: 'VAT reconciliation - Q1', source: 'manual' }),
    ).toBe('VAT reconciliation - Q1');
  });
});
