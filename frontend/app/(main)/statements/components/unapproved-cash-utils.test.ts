import { describe, expect, it } from 'vitest';
import {
  type UnapprovedQueueFilters,
  buildUnapprovedQueueItem,
  matchesUnapprovedFilters,
  resolveUnapprovedReasons,
  resolveUnapprovedSource,
} from './unapproved-cash-utils';

describe('resolveUnapprovedReasons', () => {
  it('marks missing category and requires confirmation', () => {
    const reasons = resolveUnapprovedReasons({
      id: 'tx-1',
      counterpartyName: 'Kaspi',
      transactionType: 'expense',
      currency: 'KZT',
      isVerified: false,
    });

    expect(reasons).toEqual(['missing-category', 'requires-confirmation']);
  });

  it('collects data quality reasons from transaction and statement context', () => {
    const reasons = resolveUnapprovedReasons(
      {
        id: 'tx-2',
        counterpartyName: 'Unknown merchant',
        isDuplicate: true,
        transactionType: null,
        currency: '',
        isVerified: false,
      },
      {
        id: 'statement-1',
        status: 'error',
      },
    );

    expect(reasons).toEqual([
      'missing-category',
      'duplicate-detected',
      'unknown-merchant',
      'missing-type',
      'missing-currency',
      'ocr-issues',
      'requires-confirmation',
    ]);
  });
});

describe('resolveUnapprovedSource', () => {
  it('prefers explicit source hint', () => {
    expect(
      resolveUnapprovedSource({
        id: 'statement-1',
        sourceHint: 'gmail',
        fileType: 'csv',
      }),
    ).toBe('gmail');
  });

  it('falls back to file type when source hint is missing', () => {
    expect(
      resolveUnapprovedSource({
        id: 'statement-2',
        fileType: 'pdf',
      }),
    ).toBe('pdf');
  });
});

describe('matchesUnapprovedFilters', () => {
  const filters: UnapprovedQueueFilters = {
    reasons: ['missing-category'],
    source: 'bank',
    amountMin: 1000,
    amountMax: 3000,
    dateFrom: '2026-01-01',
    dateTo: '2026-01-31',
    search: 'coffee',
  };

  it('matches item that satisfies all active filters', () => {
    const item = buildUnapprovedQueueItem(
      {
        id: 'tx-3',
        statementId: 'statement-3',
        counterpartyName: 'Coffee Point',
        transactionType: 'expense',
        currency: 'KZT',
        amount: 1500,
        transactionDate: '2026-01-10',
        isVerified: false,
      },
      {
        id: 'statement-3',
        fileType: 'csv',
      },
    );

    expect(matchesUnapprovedFilters(item, filters)).toBe(true);
  });

  it('does not match item with different source', () => {
    const item = buildUnapprovedQueueItem(
      {
        id: 'tx-4',
        statementId: 'statement-4',
        counterpartyName: 'Coffee Point',
        transactionType: 'expense',
        currency: 'KZT',
        amount: 1500,
        transactionDate: '2026-01-10',
        isVerified: false,
      },
      {
        id: 'statement-4',
        sourceHint: 'gmail',
      },
    );

    expect(matchesUnapprovedFilters(item, filters)).toBe(false);
  });
});
