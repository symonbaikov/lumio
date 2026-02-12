import { Test, type TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category, GmailSettings, IntegrationStatus, Receipt, Transaction, User } from '../../../../src/entities';
import { GmailController } from '../../../../src/modules/gmail/gmail.controller';
import { GmailOAuthService } from '../../../../src/modules/gmail/services/gmail-oauth.service';
import { GmailReceiptCategoryService } from '../../../../src/modules/gmail/services/gmail-receipt-category.service';
import { GmailReceiptDuplicateService } from '../../../../src/modules/gmail/services/gmail-receipt-duplicate.service';
import { GmailReceiptExportService } from '../../../../src/modules/gmail/services/gmail-receipt-export.service';
import { GmailSyncService } from '../../../../src/modules/gmail/services/gmail-sync.service';
import { GmailWatchService } from '../../../../src/modules/gmail/services/gmail-watch.service';
import { GmailService } from '../../../../src/modules/gmail/services/gmail.service';

describe('GmailController - Status Endpoint', () => {
  let controller: GmailController;
  let gmailOAuthService: { findIntegrationForUser: jest.Mock };

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
          provide: GmailOAuthService,
          useValue: {
            findIntegrationForUser: jest.fn(),
          },
        },
        { provide: getRepositoryToken(Receipt), useValue: {} },
        { provide: getRepositoryToken(Transaction), useValue: {} },
        { provide: getRepositoryToken(GmailSettings), useValue: {} },
        { provide: getRepositoryToken(Category), useValue: {} },
        { provide: GmailService, useValue: {} },
        { provide: GmailWatchService, useValue: {} },
        { provide: GmailSyncService, useValue: {} },
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
    gmailOAuthService = module.get(GmailOAuthService);
  });

  it('returns disconnected when integration status is disconnected', async () => {
    const integration = {
      id: 'integration-123',
      status: IntegrationStatus.DISCONNECTED,
      gmailSettings: null,
      scopes: ['scope-a'],
    };

    gmailOAuthService.findIntegrationForUser.mockResolvedValue({ integration });

    await expect(controller.getStatus(mockUser as User)).resolves.toEqual({
      connected: false,
      status: IntegrationStatus.DISCONNECTED,
      settings: null,
      scopes: ['scope-a'],
    });
  });
});
