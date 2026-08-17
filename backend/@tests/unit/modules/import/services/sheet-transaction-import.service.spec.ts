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
    update: jest.fn(async () => ({ affected: 1 })),
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
  let queryRunner: any;
  let dataSource: any;
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

    queryRunner = {
      connect: jest.fn(async () => undefined),
      startTransaction: jest.fn(async () => undefined),
      commitTransaction: jest.fn(async () => undefined),
      rollbackTransaction: jest.fn(async () => undefined),
      release: jest.fn(async () => undefined),
      manager: {
        create: jest.fn((_entity: unknown, data: unknown) => data),
        save: jest.fn(async (data: any) => ({ ...data, id: 'stmt-1' }) as Statement),
      },
    };
    dataSource = { createQueryRunner: jest.fn(() => queryRunner) };

    sheetSourceLoader = { load: jest.fn(async () => buildLoadedSheet()) };

    importSessionService = {
      createSession: jest.fn(async (_ws, _u, _statementId, _mode, fileHash) => ({
        id: 'session-1',
        fileHash,
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
              { index: 1, status: 'matched' },
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
      dataSource,
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
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
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

      expect(queryRunner.manager.save).toHaveBeenCalledTimes(1);
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
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('throws BadRequestException and creates no statement when there are zero valid rows', async () => {
      sheetSourceLoader.load = jest.fn(async () =>
        buildLoadedSheet({ values: [['Date', 'Amount', 'Description']] }),
      );

      await expect(service.runCommit(workspaceId, userId, commitDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('rolls back the transaction (not commits) when processImport throws', async () => {
      importSessionService.processImport = jest.fn(async () => {
        throw new Error('boom');
      });

      await expect(service.runCommit(workspaceId, userId, commitDto)).rejects.toThrow('boom');
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
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
  });
});
