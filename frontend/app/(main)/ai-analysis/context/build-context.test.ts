import { describe, expect, it } from 'vitest';
import { type ContextInput, buildContextPacket } from './build-context';
import { contextBudgetTokens, estimateTokens } from './token-budget';

function amounts(prefix: string, count: number) {
  return Array.from({ length: count }, (_unused, index) => ({
    name: `${prefix} ${index + 1}`,
    amount: 1000 * (count - index),
    count: index + 1,
  }));
}

const INPUT: ContextInput = {
  snapshot: {
    totalBalance: 1_250_000,
    income30d: 400_000,
    expense30d: 310_000,
    netFlow30d: 90_000,
    currency: 'KZT',
  },
  topCategories: amounts('Продукты', 15),
  topMerchants: amounts('Магазин', 12),
  incomeSources: amounts('Клиент', 9),
  cashFlow: [
    { date: '2026-06-04', income: 100, expense: 50 },
    { date: '2026-06-20', income: 200, expense: 80 },
    { date: '2026-07-11', income: 150, expense: 90 },
    { date: '2026-08-02', income: 120, expense: 60 },
  ],
  uncategorizedTransactions: 7,
};

describe('estimateTokens', () => {
  it('charges Cyrillic more per character than Latin', () => {
    expect(estimateTokens('ААААААААААА')).toBeGreaterThan(estimateTokens('aaaaaaaaaaa'));
  });

  it('grows with length', () => {
    expect(estimateTokens('abc abc abc')).toBeGreaterThan(estimateTokens('abc'));
  });
});

describe('contextBudgetTokens', () => {
  it('leaves room for the answer inside a 4k window', () => {
    const budget = contextBudgetTokens(4096);

    expect(budget).toBeGreaterThan(0);
    expect(budget).toBeLessThan(4096);
  });

  it('reports no room rather than a negative budget on a tiny window', () => {
    expect(contextBudgetTokens(512)).toBe(0);
  });
});

describe('buildContextPacket', () => {
  it('stays within the budget it is given', () => {
    for (const budget of [200, 400, 800, 1500, 3000]) {
      const packet = buildContextPacket(INPUT, budget);

      expect(packet.usedTokens).toBeLessThanOrEqual(budget);
      expect(estimateTokens(packet.text)).toBeLessThanOrEqual(budget);
    }
  });

  it('keeps the snapshot first when space is tight', () => {
    const packet = buildContextPacket(INPUT, 120);

    expect(packet.text.startsWith('Workspace summary')).toBe(true);
  });

  it('reports what was dropped instead of implying the data is complete', () => {
    const tight = buildContextPacket(INPUT, 120);
    const roomy = buildContextPacket(INPUT, 4000);

    expect(tight.droppedSections.length).toBeGreaterThan(0);
    expect(roomy.droppedSections).toEqual([]);
  });

  it('shows every row when the budget allows it', () => {
    const packet = buildContextPacket(INPUT, 4000);

    expect(packet.trimmedSections).toEqual([]);
    expect(packet.text).toContain('Продукты 15');
  });

  it('reports trimming when a list is longer than the widest rendering', () => {
    const packet = buildContextPacket({ ...INPUT, topCategories: amounts('Продукты', 30) }, 4000);

    expect(packet.trimmedSections).toContain('categories');
    expect(packet.text).toContain('Продукты 25');
    expect(packet.text).not.toContain('Продукты 26');
  });

  it('collapses daily cash flow into months', () => {
    const packet = buildContextPacket(INPUT, 4000);

    expect(packet.text).toContain('2026-06');
    expect(packet.text).toContain('2026-07');
    // Individual days must not survive — they would swamp the budget.
    expect(packet.text).not.toContain('2026-06-04');
  });

  it('sums both entries of a month into one line', () => {
    const packet = buildContextPacket(INPUT, 4000);

    expect(packet.text).toContain('2026-06: +300 KZT / -130 KZT');
  });

  it('warns the model when category totals are incomplete', () => {
    const packet = buildContextPacket(INPUT, 4000);

    expect(packet.text).toContain('uncategorised');
  });

  it('omits the caveat when everything is categorised', () => {
    const packet = buildContextPacket({ ...INPUT, uncategorizedTransactions: 0 }, 4000);

    expect(packet.text).not.toContain('uncategorised');
  });

  it('omits the retrieved section when nothing was retrieved', () => {
    expect(buildContextPacket(INPUT, 4000).text).not.toContain('matching the question');
  });

  it('places retrieved rows ahead of the general aggregates', () => {
    const packet = buildContextPacket(
      {
        ...INPUT,
        retrieved: [
          {
            transactionId: 't1',
            counterpartyName: 'Аптека Европа',
            paymentPurpose: 'Лекарства',
            transactionDate: '2026-07-14',
            amount: 4300,
            currency: 'KZT',
          },
        ],
      },
      4000,
    );

    expect(packet.text).toContain('Аптека Европа');
    expect(packet.text.indexOf('matching the question')).toBeLessThan(
      packet.text.indexOf('Top expense categories'),
    );
  });

  it('keeps retrieved rows when the budget is too small for everything', () => {
    const packet = buildContextPacket(
      {
        ...INPUT,
        retrieved: [
          {
            transactionId: 't1',
            counterpartyName: 'Аптека',
            paymentPurpose: '',
            transactionDate: '2026-07-14',
            amount: 4300,
            currency: 'KZT',
          },
        ],
      },
      160,
    );

    expect(packet.text).toContain('Аптека');
    // Something had to go, but not the rows chosen for this question.
    expect(packet.droppedSections.length).toBeGreaterThan(0);
    expect(packet.droppedSections).not.toContain('retrieved');
  });

  it('renders a missing amount without inventing a number', () => {
    const packet = buildContextPacket(
      {
        ...INPUT,
        retrieved: [
          {
            transactionId: 't1',
            counterpartyName: 'Перевод',
            paymentPurpose: '',
            transactionDate: '2026-07-14',
            amount: null,
            currency: 'KZT',
          },
        ],
      },
      4000,
    );

    expect(packet.text).toContain('Перевод: n/a');
  });

  it('produces nothing when there is no room at all', () => {
    const packet = buildContextPacket(INPUT, 0);

    expect(packet.text).toBe('');
    expect(packet.droppedSections.length).toBeGreaterThan(0);
  });

  it('handles an empty workspace without inventing sections', () => {
    const packet = buildContextPacket(
      {
        snapshot: {
          totalBalance: 0,
          income30d: 0,
          expense30d: 0,
          netFlow30d: 0,
          currency: 'USD',
        },
        topCategories: [],
        topMerchants: [],
        incomeSources: [],
        cashFlow: [],
        uncategorizedTransactions: 0,
      },
      2000,
    );

    expect(packet.text).toContain('Workspace summary');
    expect(packet.text).not.toContain('Top expense categories');
    expect(packet.droppedSections).toEqual([]);
  });
});
