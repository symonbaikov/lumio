import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category, GmailSettings, Receipt, Transaction, User } from '../../../../src/entities';
import { GmailController } from '../../../../src/modules/gmail/gmail.controller';
import { GmailOAuthService } from '../../../../src/modules/gmail/services/gmail-oauth.service';
import { GmailReceiptCategoryService } from '../../../../src/modules/gmail/services/gmail-receipt-category.service';
import { GmailReceiptDuplicateService } from '../../../../src/modules/gmail/services/gmail-receipt-duplicate.service';
import { GmailReceiptExportService } from '../../../../src/modules/gmail/services/gmail-receipt-export.service';
import { GmailSyncService } from '../../../../src/modules/gmail/services/gmail-sync.service';
import { GmailWatchService } from '../../../../src/modules/gmail/services/gmail-watch.service';
import { GmailService } from '../../../../src/modules/gmail/services/gmail.service';

describe('GmailController - Sync Endpoint', () => {
  let controller: GmailController;
  let gmailSyncService: jest.Mocked<GmailSyncService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    workspaceId: 'ws-123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GmailController],
      providers: [
        {
          provide: GmailSyncService,
          useValue: {
            syncForUser: jest.fn().mockResolvedValue({
              messagesFound: 5,
              jobsCreated: 3,
              skipped: 2,
              errors: [],
            }),
          },
        },
        { provide: getRepositoryToken(Receipt), useValue: {} },
        { provide: getRepositoryToken(Transaction), useValue: {} },
        { provide: getRepositoryToken(GmailSettings), useValue: {} },
        { provide: getRepositoryToken(Category), useValue: {} },
        { provide: GmailOAuthService, useValue: {} },
        { provide: GmailService, useValue: {} },
        { provide: GmailWatchService, useValue: {} },
        { provide: GmailReceiptDuplicateService, useValue: {} },
        { provide: GmailReceiptCategoryService, useValue: {} },
        { provide: GmailReceiptExportService, useValue: {} },
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
    gmailSyncService = module.get(GmailSyncService);
  });

  describe('POST /integrations/gmail/sync', () => {
    it('should trigger manual sync and return results', async () => {
      const result = await controller.triggerSync(mockUser as User);

      expect(gmailSyncService.syncForUser).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        success: true,
        messagesFound: 5,
        jobsCreated: 3,
        skipped: 2,
      });
    });

    it('should handle sync errors', async () => {
      gmailSyncService.syncForUser.mockRejectedValue(new Error('Gmail API error'));

      await expect(controller.triggerSync(mockUser as User)).rejects.toThrow();
    });
  });
});
