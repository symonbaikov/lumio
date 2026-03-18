import { describe, expect, it } from 'vitest';
import {
  type UnapprovedQueueFilters,
  buildUnapprovedQueueItem,
  buildUnapprovedStatementQueue,
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

describe('buildUnapprovedStatementQueue', () => {
  it('returns one queue item per statement with statement total amount', () => {
    const queue = buildUnapprovedStatementQueue({
      statements: [
        {
          id: 'statement-1',
          fileName: 'kaspi-2026-01.pdf',
          bankName: 'Kaspi Bank',
          fileType: 'pdf',
          totalDebit: 4947.03,
          totalCredit: 0,
          currency: 'KZT',
          statementDateTo: '2026-01-31',
        },
      ],
      transactions: [
        {
          id: 'tx-1',
          statementId: 'statement-1',
          counterpartyName: 'Coffee Point',
          transactionType: 'expense',
          currency: 'KZT',
          amount: 1500,
          isVerified: false,
        },
        {
          id: 'tx-2',
          statementId: 'statement-1',
          counterpartyName: 'Taxi',
          transactionType: 'expense',
          currency: 'KZT',
          amount: 3447.03,
          isVerified: false,
          categoryId: 'category-1',
        },
      ],
    });

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      statement: expect.objectContaining({
        id: 'statement-1',
        fileName: 'kaspi-2026-01.pdf',
      }),
      transactionIds: ['tx-1', 'tx-2'],
      amount: 4947.03,
      source: 'pdf',
      reasons: ['missing-category', 'requires-confirmation'],
    });
  });

  it('includes errored statements without creating one row per transaction', () => {
    const queue = buildUnapprovedStatementQueue({
      statements: [
        {
          id: 'statement-err',
          fileName: 'broken.pdf',
          bankName: 'Kaspi Bank',
          fileType: 'pdf',
          status: 'error',
          errorMessage: 'OCR failed',
          totalDebit: 180000,
          totalCredit: 0,
          currency: 'KZT',
          statementDateTo: '2026-02-01',
        },
      ],
      transactions: [],
    });

    expect(queue).toHaveLength(1);
    expect(queue[0]?.reasons).toEqual(['ocr-issues']);
    expect(queue[0]?.transactionIds).toEqual([]);
    expect(queue[0]?.amount).toBe(180000);
  });
});
