import { describe, expect, it } from 'vitest';

import { getTopBankSenders, getTopCategoriesPreview } from '../statement-insights';

describe('statement insights', () => {
  it('builds bank ranking by number of statements', () => {
    expect(
      getTopBankSenders([
        { bankName: 'Kaspi', totalDebit: 100 },
        { bankName: 'Kaspi', totalCredit: 10 },
        { bankName: 'Halyk', totalDebit: 999 },
      ]),
    ).toEqual([
      {
        bankName: 'Kaspi',
        statementsCount: 2,
        totalAmount: 110,
      },
      {
        bankName: 'Halyk',
        statementsCount: 1,
        totalAmount: 999,
      },
    ]);
  });

  it('handles string amounts and skips empty bank names', () => {
    expect(
      getTopBankSenders([
        { bankName: ' ', totalDebit: '200.5' },
        { bankName: 'Freedom', totalDebit: '42' },
        { bankName: 'Freedom', totalCredit: '8.5' },
      ]),
    ).toEqual([
      {
        bankName: 'Freedom',
        statementsCount: 2,
        totalAmount: 50.5,
      },
    ]);
  });

  it('supports top limit', () => {
    expect(
      getTopBankSenders(
        [
          { bankName: 'A', totalDebit: 1 },
          { bankName: 'B', totalDebit: 2 },
          { bankName: 'C', totalDebit: 3 },
        ],
        2,
      ),
    ).toHaveLength(2);
  });

  it('builds top categories preview from report categories', () => {
    expect(
      getTopCategoriesPreview(
        [
          { name: 'Software', amount: 1200, rows: 3 },
          { name: 'Travel', amount: 600, rows: 2 },
        ],
        1,
      ),
    ).toEqual([
      {
        name: 'Software',
        amount: 1200,
        rows: 3,
      },
    ]);
  });
});
