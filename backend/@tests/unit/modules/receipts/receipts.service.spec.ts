import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Receipt,
  ReceiptProcessingJob,
  Statement,
  ReceiptSource,
  ReceiptStatus,
  Transaction,
} from '../../../../src/entities';
import { ReceiptsService } from '../../../../src/modules/receipts/receipts.service';
import { ReceiptProcessorService } from '../../../../src/modules/receipts/services/receipt-processor.service';

describe('ReceiptsService', () => {
  let service: ReceiptsService;
  let receiptRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };
  let jobRepository: { create: jest.Mock; save: jest.Mock };
  let transactionRepository: { create: jest.Mock; save: jest.Mock };
  let statementRepository: { findOne: jest.Mock; save: jest.Mock; remove: jest.Mock };
  let processorService: { processReceipt: jest.Mock };
  let mockEventEmitter: { emit: jest.Mock; emitAsync: jest.Mock };

  beforeEach(async () => {
    receiptRepository = {
      create: jest.fn().mockImplementation(payload => payload),
      save: jest.fn().mockImplementation(async payload => ({ id: 'receipt-1', ...payload })),
      findAndCount: jest.fn().mockResolvedValue([[{ id: 'receipt-1' }], 1]),
      findOne: jest.fn().mockResolvedValue({
        id: 'receipt-1',
        status: ReceiptStatus.DRAFT,
        source: ReceiptSource.UPLOAD,
      }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    jobRepository = {
      create: jest.fn().mockImplementation(payload => payload),
      save: jest.fn().mockImplementation(async payload => ({ id: 'job-1', ...payload })),
    };

    transactionRepository = {
      create: jest.fn().mockImplementation(payload => payload),
      save: jest.fn().mockImplementation(async payload => ({ id: 'tx-1', ...payload })),
    };

    statementRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async payload => payload),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    processorService = {
      processReceipt: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: getRepositoryToken(Receipt), useValue: receiptRepository },
        { provide: getRepositoryToken(ReceiptProcessingJob), useValue: jobRepository },
        { provide: getRepositoryToken(Transaction), useValue: transactionRepository },
        { provide: getRepositoryToken(Statement), useValue: statementRepository },
        { provide: ReceiptProcessorService, useValue: processorService },
        {
          provide: EventEmitter2,
          useValue: (mockEventEmitter = { emit: jest.fn(), emitAsync: jest.fn().mockResolvedValue([]) }),
        },
      ],
    }).compile();

    service = module.get(ReceiptsService);
  });

  it('creates upload receipt, creates a processing job, and processes it', async () => {
    const result = await service.createFromUpload({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      files: [
        {
          originalname: 'receipt.jpg',
          filename: 'stored.jpg',
          path: '/tmp/stored.jpg',
          mimetype: 'image/jpeg',
          size: 123,
        } as Express.Multer.File,
      ],
      language: 'eng',
    });

    expect(receiptRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        workspaceId: 'workspace-1',
        source: ReceiptSource.UPLOAD,
        status: ReceiptStatus.NEW,
        language: 'eng',
      }),
    );
    expect(jobRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        receiptId: 'receipt-1',
      }),
    );
    expect(processorService.processReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptId: 'receipt-1',
        payload: expect.objectContaining({ historyId: 'eng' }),
      }),
    );
    expect(result).toMatchObject({ id: 'receipt-1', status: ReceiptStatus.DRAFT });
  });

  it('creates scan receipt and processes it', async () => {
    const result = await service.createFromScan({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      file: {
        originalname: 'scan.jpg',
        filename: 'scan-stored.jpg',
        path: '/tmp/scan-stored.jpg',
        mimetype: 'image/jpeg',
        size: 321,
      } as Express.Multer.File,
      language: 'auto',
    });

    expect(receiptRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ source: ReceiptSource.SCAN }),
    );
    expect(processorService.processReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ integrationId: 'manual-scan', historyId: 'auto' }),
      }),
    );
    expect(result).toMatchObject({ id: 'receipt-1' });
  });

  it('lists receipts by workspace with filters', async () => {
    const result = await service.findAll('workspace-1', {
      page: 2,
      limit: 10,
      source: ReceiptSource.SCAN,
      status: ReceiptStatus.NEEDS_REVIEW,
    });

    expect(receiptRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: 'workspace-1',
          source: ReceiptSource.SCAN,
          status: ReceiptStatus.NEEDS_REVIEW,
        }),
        skip: 10,
        take: 10,
      }),
    );
    expect(result).toEqual({ data: [{ id: 'receipt-1' }], total: 1, page: 2, limit: 10 });
  });

  it('approves receipt and creates transaction', async () => {
    const receipt = {
      id: 'receipt-approve-1',
      workspaceId: 'workspace-1',
      status: ReceiptStatus.DRAFT,
      parsedData: {
        amount: 99.5,
        currency: 'EUR',
        vendor: 'Lidl',
        date: '2026-03-20',
        categoryId: 'cat-1',
        transactionType: 'expense',
      },
      subject: 'receipt.jpg',
      transactionId: null,
    } as unknown as Receipt;

    receiptRepository.findOne.mockResolvedValue(receipt);

    const result = await service.approve('receipt-approve-1', 'workspace-1');

    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        amount: 99.5,
        debit: 99.5,
        credit: null,
        currency: 'EUR',
        counterpartyName: 'Lidl',
      }),
    );
    expect(receiptRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ReceiptStatus.APPROVED,
        transactionId: 'tx-1',
      }),
    );
    expect(result).toMatchObject({ transaction: { id: 'tx-1' } });
    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      'receipt.approved',
      expect.objectContaining({ receiptId: expect.any(String) }),
    );
  });

  it('bulk approves receipts and reports missing items', async () => {
    const firstReceipt = {
      id: 'receipt-1',
      workspaceId: 'workspace-1',
      status: ReceiptStatus.DRAFT,
      parsedData: {
        amount: 15.5,
        currency: 'EUR',
        vendor: 'Lidl',
        date: '2026-03-20',
      },
      subject: 'receipt-1.jpg',
    } as unknown as Receipt;

    receiptRepository.findOne.mockResolvedValueOnce(firstReceipt).mockResolvedValueOnce(null);

    const result = await service.bulkApprove(['receipt-1', 'missing-receipt'], 'workspace-1');

    expect(result).toEqual({
      approved: 1,
      failed: 1,
      errors: [{ receiptId: 'missing-receipt', error: 'Receipt not found' }],
    });
    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        amount: 15.5,
        debit: 15.5,
        credit: null,
        currency: 'EUR',
        counterpartyName: 'Lidl',
      }),
    );
  });

  it('deletes receipt by id and workspace', async () => {
    await service.delete('receipt-1', 'workspace-1');

    expect(receiptRepository.delete).toHaveBeenCalledWith({
      id: 'receipt-1',
      workspaceId: 'workspace-1',
    });
  });

  it('cascades scan receipt deletion to linked statement and attached files', async () => {
    const unlinkSpy = jest.spyOn(require('node:fs').promises, 'unlink').mockResolvedValue(undefined);
    receiptRepository.findOne.mockResolvedValue({
      id: 'receipt-scan-1',
      workspaceId: 'workspace-1',
      source: ReceiptSource.SCAN,
      statementId: 'statement-scan-1',
      attachmentPaths: ['/tmp/receipt-scan.jpg'],
    } as unknown as Receipt);
    statementRepository.findOne.mockResolvedValue({
      id: 'statement-scan-1',
      workspaceId: 'workspace-1',
      filePath: '/tmp/receipt-scan.jpg',
      deletedAt: null,
    } as unknown as Statement);

    await service.delete('receipt-scan-1', 'workspace-1');

    expect(unlinkSpy).toHaveBeenCalledWith('/tmp/receipt-scan.jpg');
    expect(statementRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'statement-scan-1', deletedAt: expect.any(Date) }),
    );
    expect(receiptRepository.delete).toHaveBeenCalledWith({
      id: 'receipt-scan-1',
      workspaceId: 'workspace-1',
    });
  });
});
