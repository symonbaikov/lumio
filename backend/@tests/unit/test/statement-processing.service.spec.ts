jest.mock('franc', () => ({
  franc: () => 'und',
}));

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BankName, FileType, type Statement, StatementStatus } from '@/entities/statement.entity';
import type { Transaction } from '@/entities/transaction.entity';
import type { ParsedStatement } from '@/modules/parsing/interfaces/parsed-statement.interface';
import { StatementProcessingService } from '@/modules/parsing/services/statement-processing.service';

describe('StatementProcessingService', () => {
  const tempFilePath = path.join(os.tmpdir(), 'sample.pdf');
  const statement: Statement = {
    id: 'stmt-1',
    userId: 'user-1',
    user: null as any,
    workspaceId: 'ws-1',
    fileName: 'sample.pdf',
    filePath: tempFilePath,
    fileType: FileType.PDF,
    fileSize: 1024,
    fileHash: 'hash',
    bankName: BankName.OTHER,
    accountNumber: null,
    statementDateFrom: null,
    statementDateTo: null,
    balanceStart: null,
    balanceEnd: null,
    status: StatementStatus.UPLOADED,
    errorMessage: null,
    totalTransactions: 0,
    totalDebit: 0,
    totalCredit: 0,
    currency: 'KZT',
    googleSheet: null,
    googleSheetId: null,
    transactions: [] as Transaction[],
    createdAt: new Date(),
    updatedAt: new Date(),
    processedAt: null,
    parsingDetails: null,
  } as unknown as Statement;

  const savedTransactions: Transaction[] = [];

  const statementRepository = {
    findOne: jest.fn(async ({ where: { id } }) => (id === statement.id ? statement : null)),
    save: jest.fn(async (entity: Partial<Statement>) => {
      Object.assign(statement, entity);
      return statement;
    }),
  };

  const transactionRepository = {
    create: jest.fn((data: Partial<Transaction>) => data as Transaction),
    save: jest.fn(async (data: Partial<Transaction>) => {
      const saved = { id: `tx-${savedTransactions.length + 1}`, ...data } as Transaction;
      savedTransactions.push(saved);
      return saved;
    }),
    count: jest.fn(async () => 0),
  };

  const classificationService = {
    classifyTransaction: jest.fn(async () => ({ categoryId: 'cat-1' })),
    determineMajorityCategory: jest.fn(async () => ({
      categoryId: 'cat-1',
      type: 'expense' as any,
    })),
  };

  const metadataExtractionService = {
    extractMetadata: jest.fn(async () => null),
    createDisplayInfo: jest.fn(() => ({
      title: 'Statement',
      subtitle: '',
      periodDisplay: '',
      accountDisplay: '',
      institutionDisplay: '',
      currencyDisplay: '',
    })),
    convertToParsedStatementMetadata: jest.fn(() => ({})),
  };

  const importSessionService = {
    createSession: jest.fn(async () => ({ id: 'session-1' })),
    processImport: jest.fn(async () => ({ summary: {} })),
    getSession: jest.fn(async () => ({ id: 'session-1', sessionMetadata: {} })),
  };

  const transactionFingerprintService = {
    bulkGenerateFingerprints: jest.fn(() => new Map()),
  };

  const parsedStatement: ParsedStatement = {
    metadata: {
      accountNumber: '',
      dateFrom: null as unknown as Date,
      dateTo: null as unknown as Date,
      balanceStart: undefined,
      balanceEnd: undefined,
      currency: '',
    },
    transactions: [
      {
        transactionDate: new Date('2024-01-05'),
        documentNumber: 'DOC-1',
        counterpartyName: 'Supplier LLC',
        counterpartyBin: '123456789012',
        counterpartyAccount: 'KZACC123',
        counterpartyBank: 'Bereke',
        debit: 100,
        credit: undefined,
        paymentPurpose: 'Invoice payment',
        currency: 'USD',
        exchangeRate: 1,
        amountForeign: 100,
      },
      {
        transactionDate: new Date('2024-01-10'),
        documentNumber: 'DOC-2',
        counterpartyName: 'Customer LLC',
        counterpartyBin: '987654321000',
        counterpartyAccount: 'KZACC456',
        counterpartyBank: 'Bereke',
        debit: undefined,
        credit: 200,
        paymentPurpose: 'Sale income',
        currency: 'USD',
        exchangeRate: 1,
        amountForeign: 200,
      },
    ],
  };

  const parserFactory = {
    detectBankAndFormat: jest.fn(async () => ({
      bankName: BankName.BEREKE_NEW,
      formatVersion: 'v1',
      detectedBy: 'header-name',
      detectedEvidence: ['name:bereke'],
      otherBankMentions: ['Kaspi Bank'],
    })),
    getParser: jest.fn(async () => ({
      parse: jest.fn().mockResolvedValue(parsedStatement),
      constructor: { name: 'FakeParser' },
    })),
  };

  let service: StatementProcessingService;

  beforeEach(() => {
    jest.clearAllMocks();
    savedTransactions.length = 0;

    fs.writeFileSync(tempFilePath, Buffer.from('%PDF-1.4\n%stub\n'));

    service = new StatementProcessingService(
      statementRepository as any,
      transactionRepository as any,
      parserFactory as any,
      classificationService as any,
      metadataExtractionService as any,
      importSessionService as any,
      transactionFingerprintService as any,
    );

    // Disable AI reconciliation for deterministic tests
    (service as any).aiValidator = {
      isAvailable: () => false,
    };
  });

  afterEach(() => {
    try {
      fs.unlinkSync(tempFilePath);
    } catch {
      // ignore
    }
  });

  it('persists parsed transactions and marks statement completed', async () => {
    await service.processStatement(statement.id);

    expect(statement.accountNumber).toBe('KZACC123');
    expect(statement.statementDateFrom?.toISOString()).toContain('2024-01-05');
    expect(statement.statementDateTo?.toISOString()).toContain('2024-01-10');
    expect(statement.currency).toBe('USD');
    expect(statement.status).toBe(StatementStatus.COMPLETED);

    expect(statement.parsingDetails?.metadataExtracted).toMatchObject({
      accountNumber: 'KZACC123',
      currency: 'USD',
    });
    expect(statement.parsingDetails?.transactionsFound).toBe(2);
    expect(statement.parsingDetails?.transactionsCreated).toBe(2);
    expect(statement.parsingDetails?.transactionsDeduplicated).toBe(0);
    expect(statement.parsingDetails?.importPreview).toBeUndefined();

    expect(savedTransactions).toHaveLength(2);
    expect(savedTransactions[0]).toMatchObject({
      documentNumber: 'DOC-1',
      counterpartyBin: '123456789012',
      counterpartyAccount: 'KZACC123',
      counterpartyBank: 'Bereke',
      paymentPurpose: 'Invoice payment',
      exchangeRate: 1,
      amountForeign: 100,
      currency: 'USD',
    });
    expect(statement.totalDebit).toBe(100);
    expect(statement.totalCredit).toBe(200);
    expect(statement.totalTransactions).toBe(2);
  });

  it('returns completed statement when import preview missing', async () => {
    statement.status = StatementStatus.COMPLETED;
    statement.parsingDetails = {
      importCommit: { committed: 2 },
    } as Statement['parsingDetails'];

    await expect(service.commitImport(statement.id)).resolves.toBe(statement);
    expect(importSessionService.processImport).not.toHaveBeenCalled();
  });

  it('returns statement when parsed but transactions already exist', async () => {
    statement.status = StatementStatus.PARSED;
    statement.totalTransactions = 0;
    statement.parsingDetails = null;
    transactionRepository.count.mockResolvedValueOnce(2);

    await expect(service.commitImport(statement.id)).resolves.toBe(statement);
    expect(importSessionService.processImport).not.toHaveBeenCalled();
  });
});
