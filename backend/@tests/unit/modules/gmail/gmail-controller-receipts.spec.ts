import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category, GmailSettings, Receipt, Transaction, User } from '../../../../src/entities';
import { GmailController } from '../../../../src/modules/gmail/gmail.controller';
import { GmailOAuthService } from '../../../../src/modules/gmail/services/gmail-oauth.service';
import { GmailReceiptCategoryService } from '../../../../src/modules/gmail/services/gmail-receipt-category.service';
import { GmailReceiptDuplicateService } from '../../../../src/modules/gmail/services/gmail-receipt-duplicate.service';
import { GmailReceiptExportService } from '../../../../src/modules/gmail/services/gmail-receipt-export.service';
import { GmailMerchantReparseService } from '../../../../src/modules/gmail/services/gmail-merchant-reparse.service';
import { GmailSyncService } from '../../../../src/modules/gmail/services/gmail-sync.service';
import { GmailWatchService } from '../../../../src/modules/gmail/services/gmail-watch.service';
import { GmailService } from '../../../../src/modules/gmail/services/gmail.service';

describe('GmailController - Receipts List Endpoint', () => {
  let controller: GmailController;
  const queryBuilder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    take: jest.fn(),
    skip: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  const receiptRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockUser: Partial<User> = {
    id: 'user-123',
    workspaceId: 'ws-123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    queryBuilder.orderBy.mockReturnValue(queryBuilder);
    queryBuilder.take.mockReturnValue(queryBuilder);
    queryBuilder.skip.mockReturnValue(queryBuilder);
    queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    receiptRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GmailController],
      providers: [
        { provide: getRepositoryToken(Receipt), useValue: receiptRepository },
        { provide: getRepositoryToken(Transaction), useValue: {} },
        { provide: getRepositoryToken(GmailSettings), useValue: {} },
        { provide: getRepositoryToken(Category), useValue: {} },
        { provide: GmailOAuthService, useValue: {} },
        { provide: GmailService, useValue: {} },
        { provide: GmailWatchService, useValue: {} },
        { provide: GmailSyncService, useValue: {} },
        { provide: GmailReceiptDuplicateService, useValue: {} },
        { provide: GmailReceiptCategoryService, useValue: {} },
        { provide: GmailReceiptExportService, useValue: {} },
        { provide: GmailMerchantReparseService, useValue: {} },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<GmailController>(GmailController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('filters out failed and amountless receipts by default', async () => {
    await (controller as any).listReceipts(mockUser as User);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('receipt.status != :failedStatus', {
      failedStatus: 'failed',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "NULLIF(TRIM(receipt.parsed_data->>'amount'), '') IS NOT NULL",
    );
  });

  it('allows invalid receipts when includeInvalid=true', async () => {
    await (controller as any).listReceipts(
      mockUser as User,
      undefined,
      undefined,
      undefined,
      'true',
    );

    expect(queryBuilder.andWhere).not.toHaveBeenCalledWith('receipt.status != :failedStatus', {
      failedStatus: 'failed',
    });
    expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
      "NULLIF(TRIM(receipt.parsed_data->>'amount'), '') IS NOT NULL",
    );
  });

  it('returns only receipts without amount when hasAmount=false', async () => {
    await (controller as any).listReceipts(
      mockUser as User,
      undefined,
      undefined,
      undefined,
      'true',
      'false',
    );

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "NULLIF(TRIM(receipt.parsed_data->>'amount'), '') IS NULL",
    );
  });
});
