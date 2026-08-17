import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ImportSessionMode } from '@/entities/import-session.entity';
import type { Statement } from '@/entities/statement.entity';
import type { Transaction } from '@/entities/transaction.entity';
import type { Wallet } from '@/entities/wallet.entity';
import type {
  SheetTransactionCommitInput,
  SheetTransactionPreviewInput,
} from '@/modules/import/services/sheet-transaction-import.service';
import { SheetTransactionImportService } from '@/modules/import/services/sheet-transaction-import.service';

function createRepoMock<T>() {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(),
    create: jest.fn((data: unknown) => data),
    save: jest.fn(async (data: any) => ({ ...data, id: 'stmt-1' })),
    update: jest.fn(async () => ({ affected: 1 })),
    delete: jest.fn(async () => ({ affected: 1 })),
  } as unknown as Repository<T> & Record<string, any>;
}

const FLAT_VALUES = [
  ['Date', 'Amount', 'Description'],
  ['2026-01-01', '-100', 'Groceries'],
  ['2026-01-02', '2000', 'Salary'],
];

const buildLoadedSheet = (overrides: Partial<Record<string, unknown>> = {}) => ({
  spreadsheetId: 'ss1',
  worksheetName: 'Sheet1',
  values: FLAT_VALUES,
  effectiveRange: "'Sheet1'!A1:C3",
  bounds: { sheetName: 'Sheet1', startRow: 1, startCol: 1, endRow: 3, endCol: 3 },
  sourceUrl: 'https://docs.google.com/spreadsheets/d/ss1/edit',
  ...overrides,
});

const emptyImportSummary = () => ({
  totalTransactions: 0,
  newCount: 0,
  matchedCount: 0,
  skippedCount: 0,
  conflictedCount: 0,
  failedCount: 0,
  conflicts: [] as Array<{ transactionIndex: number; reason: string; confidence: number }>,
  warnings: [] as string[],
  errors: [] as string[],
});

describe('SheetTransactionImportService', () => {
  let transactionRepository: ReturnType<typeof createRepoMock<Transaction>>;
  let walletRepository: ReturnType<typeof createRepoMock<Wallet>>;
  let statementRepository: ReturnType<typeof createRepoMock<Statement>>;
  let importSessionRepository: ReturnType<typeof createRepoMock<unknown>>;
  let sheetSourceLoader: any;
  let importSessionService: any;
  let sheetReferenceResolver: any;
  let sheetCurrencyService: any;
  let classificationService: any;
  let customTableImportJobsService: any;
  let fingerprintService: any;
  let service: SheetTransactionImportService;

  const workspaceId = 'ws-1';
  const userId = 'user-1';

  const basePreviewDto: SheetTransactionPreviewInput = {
    googleSheetId: 'gs-1',
    defaultCurrency: 'USD',
    roles: ['date', 'amount', 'description'],
    name: 'My sheet',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    transactionRepository = createRepoMock<Transaction>();
    walletRepository = createRepoMock<Wallet>();
    statementRepository = createRepoMock<Statement>();
    importSessionRepository = createRepoMock<unknown>();

    sheetSourceLoader = { load: jest.fn(async () => buildLoadedSheet()) };

    importSessionService = {
      // Mirrors ImportSessionService.createSession's real contract: it returns the
      // statementId it was actually given (the "brand-new session" case). Tests that
      // need to exercise the idempotent-reuse case override this per-test.
      createSession: jest.fn(async (_ws, _u, statementId, _mode, fileHash) => ({
        id: 'session-1',
        fileHash,
        statementId,
      })),
      processImport: jest.fn(async () => ({
        sessionId: 'session-1',
        status: 'preview',
        summary: { ...emptyImportSummary(), totalTransactions: 2, newCount: 2 },
      })),
      getSession: jest.fn(async () => ({
        id: 'session-1',
        sessionMetadata: {
          ...emptyImportSummary(),
          previewData: {
            classifications: [
              { index: 0, status: 'new' },
              { index: 1, status: 'matched', existingTransactionId: 'existing-txn-1' },
            ],
          },
        },
      })),
    };

    sheetReferenceResolver = {
      resolveCategories: jest.fn(async () => new Map()),
      resolveWallets: jest.fn(async () => ({ resolved: new Map(), warnings: [] })),
    };
    sheetCurrencyService = {
      convertRows: jest.fn(async (rows: unknown) => ({ rows, warnings: [] })),
    };
    classificationService = { classifyTransactionsBatch: jest.fn(async () => new Map()) };
    customTableImportJobsService = {
      createSheetTransactionsJob: jest.fn(async () => ({ id: 'job-1' })),
    };
    fingerprintService = {
      generateFingerprint: jest.fn(
        (tx: any) => `${tx.counterpartyName}-${tx.transactionDate.getTime()}`,
      ),
    };

    service = new SheetTransactionImportService(
      transactionRepository as any,
      walletRepository as any,
      statementRepository as any,
      importSessionRepository as any,
      sheetSourceLoader,
      importSessionService,
      sheetReferenceResolver,
      sheetCurrencyService,
      classificationService,
      customTableImportJobsService,
      fingerprintService,
    );
  });

  describe('preview', () => {
    it('returns the same sessionId when called twice with identical sheet content', async () => {
      const first = await service.preview(workspaceId, userId, basePreviewDto);
      const second = await service.preview(workspaceId, userId, basePreviewDto);

      expect(first.sessionId).toBe('session-1');
      expect(second.sessionId).toBe('session-1');
      expect(importSessionService.createSession).toHaveBeenCalledTimes(2);
      const firstFileHash = importSessionService.createSession.mock.calls[0][4];
      const secondFileHash = importSessionService.createSession.mock.calls[1][4];
      expect(firstFileHash).toBe(secondFileHash);
    });

    it('rejects a matrix layout before creating any session', async () => {
      const header = [
        'Category',
        ...Array.from({ length: 14 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`),
      ];
      const rows = Array.from({ length: 10 }, (_, r) => [
        `Row ${r}`,
        ...Array.from({ length: 14 }, () => '10'),
      ]);
      sheetSourceLoader.load = jest.fn(async () => buildLoadedSheet({ values: [header, ...rows] }));

      await expect(service.preview(workspaceId, userId, basePreviewDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(importSessionService.createSession).not.toHaveBeenCalled();
    });

    it('merges per-row session classifications back onto the mapped rows by index', async () => {
      const result = await service.preview(workspaceId, userId, basePreviewDto);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].status).toBe('ok');
      expect((result.rows[0] as any).sessionStatus).toBe('new');
      expect((result.rows[1] as any).sessionStatus).toBe('matched');
    });

    it('threads existingTransactionId onto a matched/conflicted row from its classification', async () => {
      const result = await service.preview(workspaceId, userId, basePreviewDto);

      expect(result.rows[0].existingTransactionId).toBeUndefined();
      expect(result.rows[1].existingTransactionId).toBe('existing-txn-1');
    });

    it('builds summary totals and date range from the ok rows', async () => {
      const result = await service.preview(workspaceId, userId, basePreviewDto);

      expect(result.summary.ok).toBe(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.newCount).toBe(2);
      expect(result.summary.dateRange).toEqual({ from: '2026-01-01', to: '2026-01-02' });
      expect(result.summary.totals).toEqual({ debit: 100, credit: 2000, currency: 'USD' });
    });
  });

  describe('commit', () => {
    it('stays thin: enqueues a job without loading the sheet or creating a statement', async () => {
      const dto: SheetTransactionCommitInput = { ...basePreviewDto, name: 'My sheet' };

      const result = await service.commit(workspaceId, userId, dto);

      expect(result).toEqual({ jobId: 'job-1' });
      expect(sheetSourceLoader.load).not.toHaveBeenCalled();
      expect(statementRepository.save).not.toHaveBeenCalled();
      expect(customTableImportJobsService.createSheetTransactionsJob).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ workspaceId }),
      );
    });
  });

  describe('runCommit', () => {
    const commitDto: SheetTransactionCommitInput = {
      ...basePreviewDto,
      name: 'My sheet',
    };

    it('creates exactly one statement and passes its id into createSession', async () => {
      const result = await service.runCommit(workspaceId, userId, commitDto);

      expect(statementRepository.save).toHaveBeenCalledTimes(1);
      expect(importSessionService.createSession).toHaveBeenCalledTimes(1);
      expect(importSessionService.createSession).toHaveBeenCalledWith(
        workspaceId,
        userId,
        'stmt-1',
        ImportSessionMode.COMMIT,
        expect.any(String),
        expect.any(String),
        0,
      );
      expect(result.statementId).toBe('stmt-1');
      // Default createSession mock echoes back the statementId it was given, so this
      // is the "brand-new session" path — no fixup update should have been needed.
      expect(importSessionRepository.update).not.toHaveBeenCalled();
    });

    it('reassociates a reused (preview) session with the new statement before committing', async () => {
      // Simulates ImportSessionService.createSession's real idempotent-reuse behavior:
      // when a session already exists for this fileHash (created during a prior preview()
      // call), it is returned UNCHANGED — the statementId argument passed here is ignored.
      // See import-session.service.ts:188-221.
      importSessionService.createSession = jest.fn(async () => ({
        id: 'session-1',
        statementId: null,
      }));

      const callOrder: string[] = [];
      importSessionRepository.update = jest.fn(async () => {
        callOrder.push('update');
        return { affected: 1 };
      });
      importSessionService.processImport = jest.fn(async () => {
        callOrder.push('processImport');
        return {
          sessionId: 'session-1',
          status: 'completed',
          summary: { ...emptyImportSummary(), newCount: 2 },
        };
      });

      await service.runCommit(workspaceId, userId, commitDto);

      expect(importSessionRepository.update).toHaveBeenCalledWith(
        { id: 'session-1' },
        { statementId: 'stmt-1' },
      );
      expect(callOrder).toEqual(['update', 'processImport']);
    });

    it('throws BadRequestException and creates no statement when there are zero valid rows', async () => {
      sheetSourceLoader.load = jest.fn(async () =>
        buildLoadedSheet({ values: [['Date', 'Amount', 'Description']] }),
      );

      await expect(service.runCommit(workspaceId, userId, commitDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(statementRepository.save).not.toHaveBeenCalled();
      expect(importSessionService.createSession).not.toHaveBeenCalled();
    });

    it('compensates by deleting the statement (and does not swallow the error) when processImport throws', async () => {
      importSessionService.processImport = jest.fn(async () => {
        throw new Error('boom');
      });

      await expect(service.runCommit(workspaceId, userId, commitDto)).rejects.toThrow('boom');
      expect(statementRepository.delete).toHaveBeenCalledWith('stmt-1');
    });

    it('resets the session statementId back to null on failure, only if it had been fixed up', async () => {
      importSessionService.createSession = jest.fn(async () => ({
        id: 'session-1',
        statementId: null,
      }));
      importSessionService.processImport = jest.fn(async () => {
        throw new Error('boom');
      });

      await expect(service.runCommit(workspaceId, userId, commitDto)).rejects.toThrow('boom');

      expect(importSessionRepository.update).toHaveBeenCalledWith(
        { id: 'session-1' },
        { statementId: 'stmt-1' },
      );
      expect(importSessionRepository.update).toHaveBeenCalledWith(
        { id: 'session-1' },
        { statementId: null },
      );
      expect(statementRepository.delete).toHaveBeenCalledWith('stmt-1');
    });

    it('resolves wallet currency for FX conversion when walletName is provided', async () => {
      sheetReferenceResolver.resolveWallets = jest.fn(async () => ({
        resolved: new Map([['savings', 'wallet-1']]),
        warnings: [],
      }));
      walletRepository.findOne = jest.fn(async () => ({ id: 'wallet-1', currency: 'EUR' }) as any);

      await service.runCommit(workspaceId, userId, { ...commitDto, walletName: 'Savings' });

      expect(sheetCurrencyService.convertRows).toHaveBeenCalledWith(expect.any(Array), 'EUR');
    });

    it('classifies persisted transactions whose category did not resolve from the sheet', async () => {
      transactionRepository.find = jest.fn(async () => [
        { id: 'tx-1', fingerprint: 'Groceries-1767225600000', categoryId: null },
        { id: 'tx-2', fingerprint: 'Salary-1767312000000', categoryId: null },
      ]);
      classificationService.classifyTransactionsBatch = jest.fn(
        async () => new Map([[0, { categoryId: 'cat-groceries' }]]),
      );

      await service.runCommit(workspaceId, userId, commitDto);

      expect(classificationService.classifyTransactionsBatch).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ index: 0 })]),
        workspaceId,
        userId,
      );
      expect(transactionRepository.update).toHaveBeenCalledWith(
        { id: 'tx-1' },
        { categoryId: 'cat-groceries' },
      );
    });

    it('does not misapply a category across two rows that collide on fingerprint', async () => {
      // TransactionFingerprintService normalizes counterparty case-insensitively, but
      // mapSheetRows' in-file dedup key is case-sensitive on counterpartyName -- so two
      // rows differing only by counterparty casing both survive as distinct 'ok' rows,
      // yet collide on fingerprint once persisted. Realistic scenario: inconsistent
      // casing for the same merchant across two same-day, same-amount sheet rows.
      const collidingValues = [
        ['Date', 'Counterparty', 'Amount', 'Category'],
        ['2026-01-01', 'Магнит', '-450', 'Groceries'],
        ['2026-01-01', 'МАГНИТ', '-450', 'Transport'],
      ];
      sheetSourceLoader.load = jest.fn(async () => buildLoadedSheet({ values: collidingValues }));
      fingerprintService.generateFingerprint = jest.fn(
        (tx: any) => `${tx.counterpartyName.toLowerCase()}-${tx.transactionDate.getTime()}`,
      );
      sheetReferenceResolver.resolveCategories = jest.fn(
        async () =>
          new Map([
            ['expense:groceries', 'cat-groceries'],
            ['expense:transport', 'cat-transport'],
          ]),
      );
      // Both persisted rows genuinely share the same fingerprint in the DB too (same
      // algorithm, same collision), which is exactly what makes them unattributable.
      transactionRepository.find = jest.fn(async () => [
        { id: 'tx-1', fingerprint: 'магнит-1767225600000', categoryId: null },
        { id: 'tx-2', fingerprint: 'магнит-1767225600000', categoryId: null },
      ]);

      await service.runCommit(workspaceId, userId, {
        ...commitDto,
        roles: ['date', 'counterparty', 'amount', 'category'],
      });

      expect(transactionRepository.update).not.toHaveBeenCalledWith(
        { id: 'tx-1' },
        expect.objectContaining({ categoryId: expect.anything() }),
      );
      expect(transactionRepository.update).not.toHaveBeenCalledWith(
        { id: 'tx-2' },
        expect.objectContaining({ categoryId: expect.anything() }),
      );
      // Queuing them for AI classification and applying results by fingerprint later
      // would reintroduce the exact same ambiguity, so they're excluded up front.
      expect(classificationService.classifyTransactionsBatch).not.toHaveBeenCalled();
    });

    it('isolates a post-commit classification failure: runCommit still resolves with a warning, no compensating rollback', async () => {
      transactionRepository.find = jest.fn(async () => [
        { id: 'tx-1', fingerprint: 'Groceries-1767225600000', categoryId: null },
        { id: 'tx-2', fingerprint: 'Salary-1767312000000', categoryId: null },
      ]);
      classificationService.classifyTransactionsBatch = jest.fn(async () => {
        throw new Error('AI outage');
      });

      const result = await service.runCommit(workspaceId, userId, commitDto);

      expect(result.statementId).toBe('stmt-1');
      expect(result.warnings).toContain('category_classification_failed');
      expect(statementRepository.delete).not.toHaveBeenCalled();
      expect(importSessionRepository.update).not.toHaveBeenCalled();
    });
  });
});
