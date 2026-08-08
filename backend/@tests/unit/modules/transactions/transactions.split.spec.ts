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
  comments: 'original note',
  currency: 'KZT',
  transactionType: TransactionType.EXPENSE,
  amount: 12000,
  debit: 12000,
  credit: null,
  amountForeign: null,
  exchangeRate: null,
  categoryId: 'cat-food',
  categoryHint: 'groceries',
  transactionNature: 'operational',
  taxDetected: true,
  enrichmentConfidence: 0.9,
  isDuplicate: false,
  fingerprint: 'fp-of-12000',
  splitGroupId: null,
  splitIndex: null,
};

describe('TransactionsService.split', () => {
  let service: TransactionsService;
  let savedRows: any[];
  let transactionRepository: any;
  let auditService: any;
  let cacheManager: any;
  let lockedFindOne: jest.Mock;
  // When set, the in-transaction locked re-read returns this instead of a fresh
  // copy of the outer findOne result. Lets a test simulate a concurrent writer
  // landing between the two reads.
  let lockedRow: any;

  const makeManager = () => {
    const repo = {
      findOne: lockedFindOne,
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (row: any) => {
        const stored = { ...row, id: row.id ?? `new-${savedRows.length}` };
        savedRows.push(stored);
        return stored;
      }),
    };
    return { transaction: jest.fn(async (cb: any) => cb({ getRepository: () => repo })) };
  };

  beforeEach(() => {
    savedRows = [];
    lockedRow = undefined;
    auditService = { createEvent: jest.fn() };
    cacheManager = { set: jest.fn() };
    // Always a FRESH object, never the same instance twice: the unlocked read and
    // the locked read must not alias, or a bug that derives from the stale read
    // would pass unnoticed.
    lockedFindOne = jest.fn(
      async () => lockedRow ?? { ...(await transactionRepository.findOne()) },
    );
    transactionRepository = {
      findOne: jest.fn(async () => ({ ...ORIGINAL })),
      manager: makeManager(),
    };
    service = new TransactionsService(
      transactionRepository,
      {} as any,
      { findOne: jest.fn(async () => ({ id: 'u-1', role: 'admin' })) } as any,
      { findOne: jest.fn(async () => ({ permissions: { canEditStatements: true } })) } as any,
      cacheManager as any,
      auditService as any,
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
    expect(parts.map(p => Number(p.amount))).toEqual([8000, 4000]);
    // Must equal the ORIGINAL row's amount, not merely the DTO echoed back.
    expect(parts.reduce((s, p) => s + Number(p.amount), 0)).toBe(Number(ORIGINAL.amount));
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
    transactionRepository.findOne.mockImplementation(async () => ({
      ...ORIGINAL,
      transactionType: TransactionType.INCOME,
      debit: null,
      credit: 12000,
    }));

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
    transactionRepository.findOne.mockImplementation(async () => ({
      ...ORIGINAL,
      splitGroupId: 'grp-1',
    }));

    await expect(
      service.split('tx-1', 'ws-1', 'u-1', { parts: [{ amount: 8000 }, { amount: 4000 }] }),
    ).rejects.toThrow(/already part of a split/i);
  });

  it('prorates amountForeign across the parts', async () => {
    transactionRepository.findOne.mockImplementation(async () => ({
      ...ORIGINAL,
      amountForeign: 24,
      exchangeRate: 500,
    }));

    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    expect(parts.map(p => p.amountForeign)).toEqual([16, 8]);
  });

  it('rejects splitting a transaction marked as a duplicate', async () => {
    transactionRepository.findOne.mockImplementation(async () => ({
      ...ORIGINAL,
      isDuplicate: true,
    }));

    await expect(
      service.split('tx-1', 'ws-1', 'u-1', { parts: [{ amount: 8000 }, { amount: 4000 }] }),
    ).rejects.toThrow(/marked as a duplicate/i);
  });

  it('rejects splitting a transaction without a positive amount', async () => {
    transactionRepository.findOne.mockImplementation(async () => ({
      ...ORIGINAL,
      amount: 0,
      debit: null,
      credit: null,
    }));

    await expect(
      service.split('tx-1', 'ws-1', 'u-1', { parts: [{ amount: 1 }, { amount: 1 }] }),
    ).rejects.toThrow(/positive amount/i);
  });

  it('clears the fingerprint on every part so backfill recomputes them', async () => {
    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    for (const part of parts) {
      expect(part.fingerprint).toBeNull();
    }
  });

  it('re-checks under the pessimistic lock and rejects a concurrent split', async () => {
    // Outer read sees a clean row; by the time the lock is taken another request
    // has already split it.
    lockedRow = { ...ORIGINAL, splitGroupId: 'grp-concurrent' };

    await expect(
      service.split('tx-1', 'ws-1', 'u-1', { parts: [{ amount: 8000 }, { amount: 4000 }] }),
    ).rejects.toThrow(/already part of a split/i);
    expect(savedRows).toHaveLength(0);
  });

  it('takes the lock scoped to both the id and the workspace', async () => {
    await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    expect(lockedFindOne).toHaveBeenCalledWith({
      where: { id: 'tx-1', workspaceId: 'ws-1' },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('re-checks the duplicate flag under the lock', async () => {
    lockedRow = { ...ORIGINAL, isDuplicate: true };

    await expect(
      service.split('tx-1', 'ws-1', 'u-1', { parts: [{ amount: 8000 }, { amount: 4000 }] }),
    ).rejects.toThrow(/marked as a duplicate/i);
    expect(savedRows).toHaveLength(0);
  });

  it('derives debit/credit from the locked row when a concurrent update flipped the type', async () => {
    // Unlocked read still says EXPENSE; by the time the lock is taken the row is
    // INCOME. Deriving from the stale read would write debit instead of credit.
    lockedRow = {
      ...ORIGINAL,
      transactionType: TransactionType.INCOME,
      debit: null,
      credit: 12000,
    };

    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    for (const part of parts) {
      expect(part.credit).toBe(Number(part.amount));
      expect(part.debit).toBeNull();
    }
  });

  it('rejects when a concurrent update changed the amount before the lock', async () => {
    // Parts were validated against 12000 by the fast path, but the locked row is
    // now 10000. Silently absorbing the 2000 into the last part would be wrong.
    lockedRow = { ...ORIGINAL, amount: 10000, debit: 10000 };

    await expect(
      service.split('tx-1', 'ws-1', 'u-1', { parts: [{ amount: 8000 }, { amount: 4000 }] }),
    ).rejects.toThrow(/must sum to 10000/i);
    expect(savedRows).toHaveLength(0);
  });

  it('prorates amountForeign from the locked row, not the stale read', async () => {
    lockedRow = { ...ORIGINAL, amountForeign: 24, exchangeRate: 500 };

    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    expect(parts.map(p => p.amountForeign)).toEqual([16, 8]);
  });

  it('makes the last part absorb penny drift so parts sum exactly to the original', async () => {
    transactionRepository.findOne.mockImplementation(async () => ({
      ...ORIGINAL,
      amount: 100,
      debit: 100,
    }));

    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 50 }, { amount: 49.99 }],
    });

    expect(parts.reduce((s, p) => s + Number(p.amount), 0)).toBe(100);
    expect(parts.map(p => Number(p.amount))).toEqual([50, 50]);
  });

  it('makes amountForeign of the parts sum exactly to the original amountForeign', async () => {
    transactionRepository.findOne.mockImplementation(async () => ({
      ...ORIGINAL,
      amountForeign: 10,
      exchangeRate: 1200,
    }));

    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 4000 }, { amount: 4000 }, { amount: 4000 }],
    });

    expect(parts.map(p => Number(p.amountForeign))).toEqual([3.33, 3.33, 3.34]);
    expect(parts.reduce((s, p) => s + Number(p.amountForeign), 0)).toBe(10);
  });

  it('handles decimal columns returned by Postgres as strings', async () => {
    transactionRepository.findOne.mockImplementation(async () => ({
      ...ORIGINAL,
      amount: '12000.00',
      debit: '12000.00',
      amountForeign: '24.00',
    }));

    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    expect(parts.map(p => Number(p.amount))).toEqual([8000, 4000]);
    expect(parts.map(p => Number(p.debit))).toEqual([8000, 4000]);
    expect(parts.map(p => Number(p.amountForeign))).toEqual([16, 8]);
  });

  it('applies per-part overrides and leaves omitted fields inherited', async () => {
    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [
        {
          amount: 8000,
          categoryId: 'cat-household',
          paymentPurpose: 'Cleaning supplies',
          comments: 'part one',
        },
        { amount: 4000 },
      ],
    });

    expect(parts[0].categoryId).toBe('cat-household');
    expect(parts[0].paymentPurpose).toBe('Cleaning supplies');
    expect(parts[0].comments).toBe('part one');

    expect(parts[1].categoryId).toBe('cat-food');
    expect(parts[1].paymentPurpose).toBe('Groceries');
    expect(parts[1].comments).toBe('original note');
  });

  it('records an audit event and invalidates the reports cache', async () => {
    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    expect(cacheManager.set).toHaveBeenCalledWith('reports:version:u-1', expect.any(String), 0);
    expect(auditService.createEvent).toHaveBeenCalledTimes(1);
    expect(auditService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-1',
        entityId: 'tx-1',
        meta: expect.objectContaining({
          operation: 'split',
          partCount: 2,
          splitGroupId: parts[0].splitGroupId,
        }),
      }),
    );
  });

  it('gives every part the same enrichment metadata as the row it came from', async () => {
    const parts = await service.split('tx-1', 'ws-1', 'u-1', {
      parts: [{ amount: 8000 }, { amount: 4000 }],
    });

    // These describe the underlying charge, which is the same charge for each
    // part. Part 0 keeps them by virtue of being the mutated original, so the
    // siblings must inherit them or one split group holds two different answers.
    for (const part of parts) {
      expect(part.categoryHint).toBe('groceries');
      expect(part.transactionNature).toBe('operational');
      expect(part.taxDetected).toBe(true);
      expect(part.enrichmentConfidence).toBe(0.9);
    }
  });
});

describe('TransactionsService.allocateParts', () => {
  // The highest-risk arithmetic in split(), exercised directly rather than
  // through eight mocked constructor dependencies.
  const allocate = (total: number, foreignTotal: number | null, amounts: number[]) =>
    (TransactionsService.prototype as any).allocateParts.call(
      TransactionsService.prototype,
      total,
      foreignTotal,
      amounts.map(amount => ({ amount })),
    );

  it('returns the requested amounts when they already sum exactly', () => {
    const { amounts, foreignAmounts } = allocate(12000, null, [8000, 4000]);

    expect(amounts).toEqual([8000, 4000]);
    expect(foreignAmounts).toEqual([null, null]);
  });

  it('makes the last part absorb the residual', () => {
    const { amounts } = allocate(100, null, [50, 49.99]);

    expect(amounts).toEqual([50, 50]);
    expect(amounts.reduce((s: number, a: number) => s + a, 0)).toBe(100);
  });

  it('absorbs the residual in the other direction too', () => {
    const { amounts } = allocate(100, null, [50, 50.01]);

    expect(amounts).toEqual([50, 50]);
  });

  it('prorates and reconciles a 3-way foreign split that does not divide evenly', () => {
    const { foreignAmounts } = allocate(12000, 10, [4000, 4000, 4000]);

    expect(foreignAmounts).toEqual([3.33, 3.33, 3.34]);
    expect(foreignAmounts.reduce((s: number, a: number) => s + a, 0)).toBe(10);
  });

  it('prorates unequal parts', () => {
    const { amounts, foreignAmounts } = allocate(12000, 24, [8000, 4000]);

    expect(amounts).toEqual([8000, 4000]);
    expect(foreignAmounts).toEqual([16, 8]);
  });

  it('rounds requested amounts to cents', () => {
    const { amounts } = allocate(30, null, [10.005, 10, 9.99]);

    expect(amounts).toEqual([10.01, 10, 9.99]);
    expect(amounts.reduce((s: number, a: number) => s + a, 0)).toBe(30);
  });
});
