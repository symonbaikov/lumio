import { TransactionType } from '@/entities/transaction.entity';
import { TransactionsService } from '@/modules/transactions/transactions.service';

const ORIGINAL = {
  id: 'tx-1',
  workspaceId: 'ws-1',
  statementId: 'stmt-1',
  walletId: 'wallet-1',
  transactionDate: new Date('2026-08-01'),
  counterpartyName: 'Magnum',
  paymentPurpose: 'Groceries',
  currency: 'KZT',
  transactionType: TransactionType.EXPENSE,
  amount: 12000,
  debit: 12000,
  credit: null,
  amountForeign: null,
  exchangeRate: null,
  categoryId: 'cat-food',
  splitGroupId: null,
  splitIndex: null,
};

describe('TransactionsService.split', () => {
  let service: TransactionsService;
  let savedRows: any[];
  let transactionRepository: any;

  const makeManager = () => ({
    transaction: jest.fn(async (cb: any) =>
      cb({
        getRepository: () => ({
          create: jest.fn((data: any) => ({ ...data })),
          save: jest.fn(async (row: any) => {
            const stored = { ...row, id: row.id ?? `new-${savedRows.length}` };
            savedRows.push(stored);
            return stored;
          }),
          remove: jest.fn(async () => undefined),
        }),
      }),
    ),
  });

  beforeEach(() => {
    savedRows = [];
    transactionRepository = {
      findOne: jest.fn(async () => ({ ...ORIGINAL })),
      find: jest.fn(),
      manager: makeManager(),
    };
    service = new TransactionsService(
      transactionRepository,
      {} as any,
      { findOne: jest.fn(async () => ({ id: 'u-1', role: 'admin' })) } as any,
      { findOne: jest.fn(async () => ({ permissions: { canEditStatements: true } })) } as any,
      { set: jest.fn() } as any,
      { createEvent: jest.fn() } as any,
      { learnFromCorrection: jest.fn() } as any,
      { bulkConvert: jest.fn() } as any,
    );
    // ensureCanEditStatements is a private permission check with its own coverage;
    // stub it so these tests stay focused on split arithmetic.
    (service as any).ensureCanEditStatements = jest.fn();
  });

  it('splits an expense into parts whose amounts sum to the original', async () => {
    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [
        { amount: 8000, categoryId: 'cat-food' },
        { amount: 4000, categoryId: 'cat-household' },
      ],
    });

    expect(parts).toHaveLength(2);
    expect(parts.reduce((s, p) => s + Number(p.amount), 0)).toBe(12000);
  });

  it('writes amount, debit and credit consistently for an expense', async () => {
    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    for (const part of parts) {
      expect(part.debit).toBe(Number(part.amount));
      expect(part.credit).toBeNull();
    }
  });

  it('writes credit instead of debit for an income transaction', async () => {
    transactionRepository.findOne.mockResolvedValue({
      ...ORIGINAL,
      transactionType: TransactionType.INCOME,
      debit: null,
      credit: 12000,
    });

    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    for (const part of parts) {
      expect(part.credit).toBe(Number(part.amount));
      expect(part.debit).toBeNull();
    }
  });

  it('makes every part inherit statementId so dashboard innerJoin still sees them', async () => {
    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    for (const part of parts) {
      expect(part.statementId).toBe('stmt-1');
      expect(part.walletId).toBe('wallet-1');
    }
  });

  it('assigns one shared splitGroupId and sequential splitIndex', async () => {
    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    expect(new Set(parts.map(p => p.splitGroupId)).size).toBe(1);
    expect(parts[0].splitGroupId).toEqual(expect.any(String));
    expect(parts.map(p => p.splitIndex)).toEqual([0, 1]);
    expect(parts[0].id).toBe('tx-1');
  });

  it('rejects parts that do not sum to the original amount', async () => {
    await expect(
      service.split('tx-1', 'ws-1', 'u-1', { parts: [{ amount: 8000 }, { amount: 3000 }] }),
    ).rejects.toThrow(/must sum to/i);
  });

  it('rejects splitting a transaction that is already split', async () => {
    transactionRepository.findOne.mockResolvedValue({ ...ORIGINAL, splitGroupId: 'grp-1' });

    await expect(
      service.split('tx-1', 'ws-1', 'u-1', { parts: [{ amount: 8000 }, { amount: 4000 }] }),
    ).rejects.toThrow(/already part of a split/i);
  });

  it('prorates amountForeign across the parts', async () => {
    transactionRepository.findOne.mockResolvedValue({
      ...ORIGINAL,
      amountForeign: 24,
      exchangeRate: 500,
    });

    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    expect(parts.map(p => p.amountForeign)).toEqual([16, 8]);
  });
});
