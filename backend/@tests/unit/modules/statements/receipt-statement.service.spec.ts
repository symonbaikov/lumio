import * as fs from 'fs';
import { WorkspaceCurrencyService } from '@/common/services/workspace-currency.service';
import { Category } from '@/entities/category.entity';
import { ReceiptStatus } from '@/entities/receipt.entity';
import { BankName, FileType, Statement, StatementStatus } from '@/entities/statement.entity';
import { TaxRate } from '@/entities/tax-rate.entity';
import { Transaction } from '@/entities/transaction.entity';
import { User, UserRole } from '@/entities/user.entity';
import { WorkspaceMember, WorkspaceRole } from '@/entities/workspace-member.entity';
import { AuditService } from '@/modules/audit/audit.service';
import { ReceiptsService } from '@/modules/receipts/receipts.service';
import { ReceiptStatementService } from '@/modules/statements/services/receipt-statement.service';
import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

jest.mock('@/common/utils/file-hash.util');
jest.mock('@/common/utils/file-validator.util');
jest.mock('@/common/utils/filename.util');

const AMOUNT_NOT_RECOGNIZED_MESSAGE =
  'Не удалось распознать сумму на чеке. Проверьте качество снимка или добавьте расход вручную.';

describe('ReceiptStatementService', () => {
  let testingModule: TestingModule;
  let service: ReceiptStatementService;
  let statementRepository: Repository<Statement>;
  let transactionRepository: Repository<Transaction>;
  let categoryRepository: Repository<Category>;
  let taxRateRepository: Repository<TaxRate>;
  let workspaceMemberRepository: Repository<WorkspaceMember>;
  let receiptsService: ReceiptsService;
  let workspaceCurrencyService: { resolve: jest.Mock };

  const mockUser: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    workspaceId: 'ws-1',
    isActive: true,
  };

  const imageFile = {
    path: '/tmp/receipt.jpg',
    originalname: 'receipt.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
  } as Express.Multer.File;

  /**
   * OCR runs detached from the upload request, so tests have to let the
   * background chain settle before asserting on its side effects.
   */
  const waitFor = async (condition: () => boolean, label: string): Promise<void> => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (condition()) {
        return;
      }
      await new Promise(resolve => setImmediate(resolve));
    }
    throw new Error(`Timed out waiting for ${label}`);
  };

  const statementUpdates = (): Array<Record<string, unknown>> =>
    (statementRepository.update as jest.Mock).mock.calls.map(([, patch]) => patch);

  const waitForStatus = (status: StatementStatus) =>
    waitFor(
      () => statementUpdates().some(patch => patch.status === status),
      `statement to be marked ${status}`,
    );

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        ReceiptStatementService,
        {
          provide: getRepositoryToken(Statement),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TaxRate),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            createEvent: jest.fn(),
          },
        },
        {
          provide: ReceiptsService,
          useValue: {
            createFromScan: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: WorkspaceCurrencyService,
          useValue: { resolve: jest.fn().mockResolvedValue('USD') },
        },
      ],
    }).compile();

    service = testingModule.get<ReceiptStatementService>(ReceiptStatementService);
    statementRepository = testingModule.get<Repository<Statement>>(getRepositoryToken(Statement));
    transactionRepository = testingModule.get<Repository<Transaction>>(
      getRepositoryToken(Transaction),
    );
    categoryRepository = testingModule.get<Repository<Category>>(getRepositoryToken(Category));
    taxRateRepository = testingModule.get<Repository<TaxRate>>(getRepositoryToken(TaxRate));
    workspaceMemberRepository = testingModule.get<Repository<WorkspaceMember>>(
      getRepositoryToken(WorkspaceMember),
    );
    receiptsService = testingModule.get<ReceiptsService>(ReceiptsService);
    workspaceCurrencyService = testingModule.get(WorkspaceCurrencyService);

    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(Buffer.from('test'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    workspaceCurrencyService.resolve.mockResolvedValue('USD');

    jest.spyOn(workspaceMemberRepository, 'findOne').mockResolvedValue({
      role: WorkspaceRole.ADMIN,
    } as WorkspaceMember);
    jest.spyOn(categoryRepository, 'findOne').mockResolvedValue({
      id: 'cat-1',
      workspaceId: 'ws-1',
      type: 'expense',
      isEnabled: true,
      name: 'Meals',
    } as unknown as Category);
    jest.spyOn(taxRateRepository, 'findOne').mockResolvedValue({
      id: 'tax-1',
      workspaceId: 'ws-1',
      isEnabled: true,
      isDefault: true,
      name: 'VAT',
      rate: 12,
    } as TaxRate);

    // No file-hash duplicate; the trailing lookup returns the processed statement.
    jest
      .spyOn(statementRepository, 'findOne')
      .mockImplementation(async (options: any) =>
        options?.where?.fileHash ? null : ({ id: 'stmt-1' } as Statement),
      );
    jest.spyOn(statementRepository, 'create').mockImplementation((input: any) => input);
    jest
      .spyOn(statementRepository, 'save')
      .mockImplementation(async (input: any) => ({ id: 'stmt-1', ...input }));
    jest.spyOn(statementRepository, 'update').mockResolvedValue({ affected: 1 } as any);
    jest.spyOn(transactionRepository, 'create').mockImplementation((input: any) => input);
    jest
      .spyOn(transactionRepository, 'save')
      .mockImplementation(async (input: any) => ({ id: 'tx-1', ...input }));

    const { calculateFileHash } = require('@/common/utils/file-hash.util');
    calculateFileHash.mockResolvedValue('abc123');
    const { getFileTypeFromMime } = require('@/common/utils/file-validator.util');
    getFileTypeFromMime.mockReturnValue(FileType.IMAGE);
    const { normalizeFilename } = require('@/common/utils/filename.util');
    normalizeFilename.mockReturnValue('receipt.jpg');
  });

  afterAll(async () => {
    await testingModule.close();
  });

  it('returns an UPLOADED statement immediately without creating a transaction', async () => {
    // OCR never settles, so nothing beyond the initial insert can have happened.
    jest.spyOn(receiptsService, 'createFromScan').mockReturnValue(new Promise(() => {}));

    const result = await service.createFromReceiptScan({
      user: mockUser as User,
      workspaceId: 'ws-1',
      files: [imageFile],
      language: 'ru',
    });

    expect(statementRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        bankName: BankName.OTHER,
        status: StatementStatus.UPLOADED,
        currency: 'USD',
        categoryId: 'cat-1',
        fileHash: 'abc123',
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({ id: 'stmt-1', status: StatementStatus.UPLOADED }),
    ]);
    expect(transactionRepository.create).not.toHaveBeenCalled();
    expect(statementRepository.update).not.toHaveBeenCalled();
  });

  it('completes the statement and creates a verified transaction once OCR finishes', async () => {
    jest.spyOn(receiptsService, 'createFromScan').mockResolvedValue({
      id: 'receipt-1',
      status: ReceiptStatus.DRAFT,
      subject: 'receipt.jpg',
      parsedData: {
        amount: 4590,
        // Explicit currency reported by OCR — it wins over the workspace default.
        currency: 'KZT',
        vendor: 'Magnum',
        date: '2026-03-27',
        categoryId: 'cat-1',
        confidence: 0.91,
        validationIssues: [],
        transactionType: 'expense',
      },
      extractionMethod: 'ocr_hybrid',
      metadata: {},
    } as any);

    await service.createFromReceiptScan({
      user: mockUser as User,
      workspaceId: 'ws-1',
      files: [imageFile],
      language: 'ru',
    });

    await waitForStatus(StatementStatus.COMPLETED);

    expect(receiptsService.createFromScan).toHaveBeenCalledWith({
      userId: '1',
      workspaceId: 'ws-1',
      file: imageFile,
      language: 'ru',
    });
    expect(statementRepository.update).toHaveBeenCalledWith(
      'stmt-1',
      expect.objectContaining({
        bankName: BankName.OTHER,
        status: StatementStatus.COMPLETED,
        errorMessage: null,
        totalTransactions: 1,
        totalDebit: 4590,
        totalCredit: 0,
        currency: 'KZT',
        categoryId: 'cat-1',
      }),
    );
    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        statementId: 'stmt-1',
        debit: 4590,
        credit: null,
        amount: 4590,
        currency: 'KZT',
        counterpartyName: 'Magnum',
        categoryId: 'cat-1',
        taxRateId: 'tax-1',
        isVerified: true,
      }),
    );
    expect(transactionRepository.save).toHaveBeenCalled();
    expect(receiptsService.update).toHaveBeenCalledWith('receipt-1', 'ws-1', {
      statementId: 'stmt-1',
    });
  });

  it("falls back to the workspace currency when OCR reports none", async () => {
    workspaceCurrencyService.resolve.mockResolvedValue('EUR');
    jest.spyOn(receiptsService, 'createFromScan').mockResolvedValue({
      id: 'receipt-2',
      status: ReceiptStatus.DRAFT,
      subject: 'receipt.jpg',
      parsedData: {
        amount: 1200,
        vendor: 'Some Store',
        date: '2026-05-06',
        validationIssues: [],
      },
      extractionMethod: 'regex',
      metadata: {},
    } as any);

    await service.createFromReceiptScan({
      user: mockUser as User,
      workspaceId: 'ws-1',
      files: [imageFile],
    });

    await waitForStatus(StatementStatus.COMPLETED);

    expect(workspaceCurrencyService.resolve).toHaveBeenCalledWith('ws-1');
    expect(statementRepository.update).toHaveBeenCalledWith(
      'stmt-1',
      expect.objectContaining({ currency: 'EUR' }),
    );
    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'EUR' }),
    );
  });

  it('derives a missing total from line items and leaves the transaction unverified', async () => {
    jest.spyOn(receiptsService, 'createFromScan').mockResolvedValue({
      id: 'receipt-3',
      status: ReceiptStatus.DRAFT,
      subject: 'receipt.jpg',
      parsedData: {
        vendor: 'Small Shop',
        date: '2026-05-06',
        currency: 'KZT',
        lineItems: [
          { description: 'Coffee', amount: 990 },
          { description: 'Bread', amount: 510 },
        ],
        validationIssues: [],
      },
      extractionMethod: 'regex',
      metadata: {},
    } as any);

    await service.createFromReceiptScan({
      user: mockUser as User,
      workspaceId: 'ws-1',
      files: [imageFile],
    });

    await waitForStatus(StatementStatus.COMPLETED);

    expect(statementRepository.update).toHaveBeenCalledWith(
      'stmt-1',
      expect.objectContaining({
        status: StatementStatus.COMPLETED,
        totalDebit: 1500,
        parsingDetails: expect.objectContaining({
          validation: {
            passed: false,
            warnings: ['amount_derived_from_line_items'],
          },
        }),
      }),
    );
    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1500, isVerified: false }),
    );
  });

  it('records an OCR failure on the statement without failing the upload', async () => {
    jest.spyOn(receiptsService, 'createFromScan').mockResolvedValue({
      id: 'receipt-failed',
      status: ReceiptStatus.FAILED,
      subject: 'receipt.jpg',
      parsedData: {},
      metadata: {
        processingError: 'OCR engine timeout',
      },
    } as any);

    const result = await service.createFromReceiptScan({
      user: mockUser as User,
      workspaceId: 'ws-1',
      files: [imageFile],
    });

    expect(result).toEqual([
      expect.objectContaining({ id: 'stmt-1', status: StatementStatus.UPLOADED }),
    ]);

    await waitForStatus(StatementStatus.ERROR);

    expect(statementRepository.update).toHaveBeenCalledWith(
      'stmt-1',
      expect.objectContaining({
        status: StatementStatus.ERROR,
        errorMessage: 'OCR engine timeout',
      }),
    );
    expect(transactionRepository.create).not.toHaveBeenCalled();
  });

  it('marks the statement as failed when no amount can be recognised', async () => {
    jest.spyOn(receiptsService, 'createFromScan').mockResolvedValue({
      id: 'receipt-noamt',
      status: ReceiptStatus.DRAFT,
      subject: 'receipt.jpg',
      parsedData: {
        vendor: 'Some Store',
        date: '2026-05-06',
        confidence: 0.3,
        validationIssues: [],
      },
      extractionMethod: 'regex',
      metadata: {},
    } as any);

    await service.createFromReceiptScan({
      user: mockUser as User,
      workspaceId: 'ws-1',
      files: [imageFile],
    });

    await waitForStatus(StatementStatus.ERROR);

    expect(statementRepository.update).toHaveBeenCalledWith(
      'stmt-1',
      expect.objectContaining({
        status: StatementStatus.ERROR,
        errorMessage: AMOUNT_NOT_RECOGNIZED_MESSAGE,
      }),
    );
    expect(transactionRepository.create).not.toHaveBeenCalled();
  });

  it('rejects a receipt whose file hash is already stored in the workspace', async () => {
    jest
      .spyOn(statementRepository, 'findOne')
      .mockResolvedValue({ id: 'stmt-existing' } as Statement);

    await expect(
      service.createFromReceiptScan({
        user: mockUser as User,
        workspaceId: 'ws-1',
        files: [imageFile],
      }),
    ).rejects.toThrow(ConflictException);

    expect(statementRepository.save).not.toHaveBeenCalled();
    expect(receiptsService.createFromScan).not.toHaveBeenCalled();
  });
});
