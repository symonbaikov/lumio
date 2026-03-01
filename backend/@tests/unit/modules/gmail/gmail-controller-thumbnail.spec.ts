import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category, GmailSettings, Receipt, Transaction, User } from '../../../../src/entities';
import { GmailController } from '../../../../src/modules/gmail/gmail.controller';
import { GmailMerchantReparseService } from '../../../../src/modules/gmail/services/gmail-merchant-reparse.service';
import { GmailOAuthService } from '../../../../src/modules/gmail/services/gmail-oauth.service';
import { GmailReceiptCategoryService } from '../../../../src/modules/gmail/services/gmail-receipt-category.service';
import { GmailReceiptDuplicateService } from '../../../../src/modules/gmail/services/gmail-receipt-duplicate.service';
import { GmailReceiptExportService } from '../../../../src/modules/gmail/services/gmail-receipt-export.service';
import { GmailSyncService } from '../../../../src/modules/gmail/services/gmail-sync.service';
import { GmailWatchService } from '../../../../src/modules/gmail/services/gmail-watch.service';
import { GmailService } from '../../../../src/modules/gmail/services/gmail.service';

describe('GmailController - Receipt Thumbnail Endpoint', () => {
  let controller: GmailController;
  let receiptRepository: { findOne: jest.Mock };

  const mockUser: Partial<User> = {
    id: 'user-123',
    workspaceId: 'ws-123',
    email: 'test@example.com',
  };

  const createMockResponse = () => {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GmailController],
      providers: [
        {
          provide: getRepositoryToken(Receipt),
          useValue: {
            findOne: jest.fn(),
          },
        },
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
    receiptRepository = module.get(getRepositoryToken(Receipt));
  });

  it('returns 404 when receipt is not found', async () => {
    receiptRepository.findOne.mockResolvedValue(null);
    const res = createMockResponse();

    await (controller as any).getReceiptThumbnail(
      mockUser as User,
      'missing-receipt',
      undefined,
      res,
    );

    expect(receiptRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'missing-receipt', userId: 'user-123' },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Receipt not found' });
  });

  it('returns 404 when receipt has no PDF attachment path', async () => {
    receiptRepository.findOne.mockResolvedValue({
      id: 'receipt-1',
      userId: 'user-123',
      attachmentPaths: ['/tmp/not-a-pdf.txt'],
    } as Receipt);
    const res = createMockResponse();

    await (controller as any).getReceiptThumbnail(mockUser as User, 'receipt-1', undefined, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'No PDF attachment found' });
  });

  it('returns 404 from file endpoint when receipt is not found', async () => {
    receiptRepository.findOne.mockResolvedValue(null);
    const res = createMockResponse();

    await (controller as any).getReceiptFile(mockUser as User, 'missing-receipt', res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Receipt not found' });
  });

  it('returns 404 from file endpoint when no PDF path exists', async () => {
    receiptRepository.findOne.mockResolvedValue({
      id: 'receipt-1',
      userId: 'user-123',
      attachmentPaths: ['/tmp/not-a-pdf.txt'],
    } as Receipt);
    const res = createMockResponse();

    await (controller as any).getReceiptFile(mockUser as User, 'receipt-1', res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'No PDF attachment found' });
  });
});
