# Gmail Receipts Daily Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automatic daily synchronization of receipts from Gmail with universal receipt parsing for any company/vendor.

**Architecture:**
- Add `GmailSyncService` for fetching messages from Gmail API with configurable filters
- Add daily cron job (03:00 UTC) + manual sync endpoint as complement to existing Pub/Sub real-time
- Enhance `GmailReceiptParserService` with AI-powered extraction for universal receipt parsing

**Tech Stack:** NestJS, TypeORM, Gmail API, pdf-parse, OpenAI/Gemini (optional for AI parsing)

---

## Overview

### What Already Exists
- `GmailReceiptProcessor` - processes job queue every 3 seconds
- `GmailReceiptParserService` - basic PDF parsing (amount, date, vendor, tax)
- `GmailWatchService` - Pub/Sub real-time notifications
- `GmailScheduler` - only renews watch subscriptions (every 6h)
- Receipt entity with full CRUD and status workflow
- Frontend Gmail integration page

### What Needs to Be Added
1. **GmailSyncService** - fetch messages from Gmail, create processing jobs
2. **Daily Sync Cron** - run sync at 03:00 UTC daily
3. **Manual Sync Endpoint** - POST /integrations/gmail/sync
4. **Enhanced Universal Parser** - better extraction patterns, AI fallback
5. **Sync Status Tracking** - last sync time, sync results

---

## Task 1: Create GmailSyncService

**Files:**
- Create: `backend/src/modules/gmail/services/gmail-sync.service.ts`
- Modify: `backend/src/modules/gmail/gmail.module.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-sync.service.spec.ts`

### Step 1: Write the failing test

Create test file:

```typescript
// backend/@tests/unit/modules/gmail/gmail-sync.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GmailSyncService } from '../../../../src/modules/gmail/services/gmail-sync.service';
import {
  Integration,
  GmailSettings,
  Receipt,
  ReceiptProcessingJob,
  IntegrationStatus,
  IntegrationProvider,
} from '../../../../src/entities';
import { GmailService } from '../../../../src/modules/gmail/services/gmail.service';

describe('GmailSyncService', () => {
  let service: GmailSyncService;
  let integrationRepo: jest.Mocked<Repository<Integration>>;
  let gmailSettingsRepo: jest.Mocked<Repository<GmailSettings>>;
  let receiptRepo: jest.Mocked<Repository<Receipt>>;
  let jobRepo: jest.Mocked<Repository<ReceiptProcessingJob>>;
  let gmailService: jest.Mocked<GmailService>;

  const mockIntegration: Partial<Integration> = {
    id: 'int-123',
    provider: IntegrationProvider.GMAIL,
    status: IntegrationStatus.CONNECTED,
    connectedByUserId: 'user-123',
    workspaceId: 'ws-123',
    gmailSettings: {
      id: 'settings-123',
      integrationId: 'int-123',
      labelId: 'Label_123',
      labelName: 'Lumio/Receipts',
      filterEnabled: true,
      filterConfig: {
        hasAttachment: true,
        keywords: ['receipt', 'invoice'],
      },
      lastSyncAt: new Date('2026-02-05T00:00:00Z'),
      watchEnabled: true,
      watchExpiration: null,
      historyId: 'hist-123',
    } as GmailSettings,
  };

  const mockMessages = [
    { id: 'msg-1', threadId: 'thread-1' },
    { id: 'msg-2', threadId: 'thread-2' },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GmailSyncService,
        {
          provide: getRepositoryToken(Integration),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GmailSettings),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Receipt),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ReceiptProcessingJob),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'job-1', ...entity })),
          },
        },
        {
          provide: GmailService,
          useValue: {
            listMessages: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GmailSyncService>(GmailSyncService);
    integrationRepo = module.get(getRepositoryToken(Integration));
    gmailSettingsRepo = module.get(getRepositoryToken(GmailSettings));
    receiptRepo = module.get(getRepositoryToken(Receipt));
    jobRepo = module.get(getRepositoryToken(ReceiptProcessingJob));
    gmailService = module.get(GmailService);
  });

  describe('syncAllIntegrations', () => {
    it('should sync all connected Gmail integrations', async () => {
      integrationRepo.find.mockResolvedValue([mockIntegration as Integration]);
      gmailService.listMessages.mockResolvedValue(mockMessages);
      receiptRepo.findOne.mockResolvedValue(null); // No existing receipts

      const result = await service.syncAllIntegrations();

      expect(integrationRepo.find).toHaveBeenCalledWith({
        where: {
          provider: IntegrationProvider.GMAIL,
          status: IntegrationStatus.CONNECTED,
        },
        relations: ['gmailSettings'],
      });
      expect(result.synced).toBe(1);
      expect(result.messagesFound).toBe(2);
    });

    it('should skip integrations without connectedByUserId', async () => {
      const integrationWithoutUser = { ...mockIntegration, connectedByUserId: null };
      integrationRepo.find.mockResolvedValue([integrationWithoutUser as Integration]);

      const result = await service.syncAllIntegrations();

      expect(result.synced).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });

  describe('syncForUser', () => {
    it('should create processing jobs for new messages', async () => {
      integrationRepo.findOne.mockResolvedValue(mockIntegration as Integration);
      gmailService.listMessages.mockResolvedValue(mockMessages);
      receiptRepo.findOne.mockResolvedValue(null);

      const result = await service.syncForUser('user-123');

      expect(jobRepo.create).toHaveBeenCalledTimes(2);
      expect(jobRepo.save).toHaveBeenCalledTimes(2);
      expect(result.messagesFound).toBe(2);
      expect(result.jobsCreated).toBe(2);
    });

    it('should skip messages that already have receipts', async () => {
      integrationRepo.findOne.mockResolvedValue(mockIntegration as Integration);
      gmailService.listMessages.mockResolvedValue(mockMessages);
      // First message already exists
      receiptRepo.findOne
        .mockResolvedValueOnce({ id: 'existing-receipt' } as Receipt)
        .mockResolvedValueOnce(null);

      const result = await service.syncForUser('user-123');

      expect(result.jobsCreated).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should build correct Gmail query from filter config', async () => {
      integrationRepo.findOne.mockResolvedValue(mockIntegration as Integration);
      gmailService.listMessages.mockResolvedValue([]);
      receiptRepo.findOne.mockResolvedValue(null);

      await service.syncForUser('user-123');

      // Should include label, has:attachment, and date filter
      expect(gmailService.listMessages).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('has:attachment'),
      );
    });
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd backend && npm run test:unit -- @tests/unit/modules/gmail/gmail-sync.service.spec.ts -v
```

Expected: FAIL - "Cannot find module 'gmail-sync.service'"

### Step 3: Write minimal implementation

```typescript
// backend/src/modules/gmail/services/gmail-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GmailSettings,
  Integration,
  IntegrationProvider,
  IntegrationStatus,
  Receipt,
  ReceiptJobStatus,
  ReceiptProcessingJob,
} from '../../../entities';
import { GmailService } from './gmail.service';

interface SyncResult {
  synced: number;
  skipped: number;
  messagesFound: number;
  jobsCreated: number;
  errors: Array<{ integrationId: string; error: string }>;
}

interface UserSyncResult {
  messagesFound: number;
  jobsCreated: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class GmailSyncService {
  private readonly logger = new Logger(GmailSyncService.name);

  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
    @InjectRepository(GmailSettings)
    private readonly gmailSettingsRepository: Repository<GmailSettings>,
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(ReceiptProcessingJob)
    private readonly jobRepository: Repository<ReceiptProcessingJob>,
    private readonly gmailService: GmailService,
  ) {}

  /**
   * Sync all connected Gmail integrations.
   * Called by daily cron job.
   */
  async syncAllIntegrations(): Promise<SyncResult> {
    const result: SyncResult = {
      synced: 0,
      skipped: 0,
      messagesFound: 0,
      jobsCreated: 0,
      errors: [],
    };

    try {
      // Find all connected Gmail integrations
      const integrations = await this.integrationRepository.find({
        where: {
          provider: IntegrationProvider.GMAIL,
          status: IntegrationStatus.CONNECTED,
        },
        relations: ['gmailSettings'],
      });

      this.logger.log(`Found ${integrations.length} Gmail integrations to sync`);

      for (const integration of integrations) {
        if (!integration.connectedByUserId) {
          this.logger.warn(`Integration ${integration.id} has no connectedByUserId, skipping`);
          result.skipped++;
          continue;
        }

        try {
          const userResult = await this.syncForIntegration(integration);
          result.synced++;
          result.messagesFound += userResult.messagesFound;
          result.jobsCreated += userResult.jobsCreated;
        } catch (error) {
          this.logger.error(`Failed to sync integration ${integration.id}`, error);
          result.errors.push({
            integrationId: integration.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      this.logger.log(
        `Daily sync completed: ${result.synced} integrations synced, ${result.messagesFound} messages found, ${result.jobsCreated} jobs created`,
      );
    } catch (error) {
      this.logger.error('Failed to run daily sync', error);
    }

    return result;
  }

  /**
   * Sync receipts for a specific user.
   * Called by manual sync endpoint.
   */
  async syncForUser(userId: string): Promise<UserSyncResult> {
    const integration = await this.integrationRepository.findOne({
      where: {
        connectedByUserId: userId,
        provider: IntegrationProvider.GMAIL,
        status: IntegrationStatus.CONNECTED,
      },
      relations: ['gmailSettings'],
    });

    if (!integration) {
      throw new Error('No connected Gmail integration found for user');
    }

    return this.syncForIntegration(integration);
  }

  /**
   * Sync receipts for a specific integration.
   */
  private async syncForIntegration(integration: Integration): Promise<UserSyncResult> {
    const result: UserSyncResult = {
      messagesFound: 0,
      jobsCreated: 0,
      skipped: 0,
      errors: [],
    };

    const settings = integration.gmailSettings;
    const userId = integration.connectedByUserId!;

    // Build Gmail search query
    const query = this.buildSearchQuery(settings);

    this.logger.log(`Syncing integration ${integration.id} with query: ${query}`);

    // Fetch messages from Gmail
    const messages = await this.gmailService.listMessages(userId, query);
    result.messagesFound = messages.length;

    this.logger.log(`Found ${messages.length} messages for integration ${integration.id}`);

    // Create processing jobs for new messages
    for (const message of messages) {
      try {
        // Check if receipt already exists
        const existing = await this.receiptRepository.findOne({
          where: { gmailMessageId: message.id },
        });

        if (existing) {
          result.skipped++;
          continue;
        }

        // Create processing job
        const job = this.jobRepository.create({
          userId,
          status: ReceiptJobStatus.PENDING,
          payload: {
            integrationId: integration.id,
            gmailMessageId: message.id,
            source: 'daily_sync',
          },
        });

        await this.jobRepository.save(job);
        result.jobsCreated++;
      } catch (error) {
        this.logger.error(`Failed to create job for message ${message.id}`, error);
        result.errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    // Update lastSyncAt
    if (settings) {
      settings.lastSyncAt = new Date();
      await this.gmailSettingsRepository.save(settings);
    }

    return result;
  }

  /**
   * Build Gmail search query from settings.
   */
  private buildSearchQuery(settings: GmailSettings | null): string {
    const parts: string[] = [];

    // Label filter
    if (settings?.labelId) {
      parts.push(`label:${settings.labelId}`);
    }

    // Has attachment filter
    if (settings?.filterConfig?.hasAttachment !== false) {
      parts.push('has:attachment');
    }

    // Date filter: messages after lastSyncAt (or last 24 hours)
    const sinceDate = settings?.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dateStr = this.formatDateForGmail(sinceDate);
    parts.push(`after:${dateStr}`);

    // Keyword filter (OR-based search in subject/body)
    const keywords = settings?.filterConfig?.keywords;
    if (keywords && keywords.length > 0) {
      // Gmail search: subject:(receipt OR invoice) OR body:(receipt OR invoice)
      const keywordQuery = keywords.map(k => k.trim()).join(' OR ');
      parts.push(`{${keywordQuery}}`);
    }

    // Sender filter
    const senders = settings?.filterConfig?.senders;
    if (senders && senders.length > 0) {
      const senderQuery = senders.map(s => `from:${s.trim()}`).join(' OR ');
      parts.push(`(${senderQuery})`);
    }

    return parts.join(' ');
  }

  /**
   * Format date for Gmail search query.
   * Gmail accepts: YYYY/MM/DD
   */
  private formatDateForGmail(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }
}
```

### Step 4: Run test to verify it passes

```bash
cd backend && npm run test:unit -- @tests/unit/modules/gmail/gmail-sync.service.spec.ts -v
```

Expected: PASS

### Step 5: Register service in module

Modify `backend/src/modules/gmail/gmail.module.ts`:

```typescript
// Add import at top
import { GmailSyncService } from './services/gmail-sync.service';

// Add to providers array
providers: [
  GmailOAuthService,
  GmailService,
  GmailWatchService,
  GmailWebhookService,
  GmailSyncService,  // <-- Add this
  GmailReceiptParserService,
  GmailReceiptDuplicateService,
  GmailReceiptCategoryService,
  GmailReceiptExportService,
  GmailReceiptProcessor,
  GmailScheduler,
],
// Add to exports array
exports: [GmailOAuthService, GmailService, GmailWatchService, GmailSyncService],
```

### Step 6: Commit

```bash
git add backend/src/modules/gmail/services/gmail-sync.service.ts \
        backend/src/modules/gmail/gmail.module.ts \
        backend/@tests/unit/modules/gmail/gmail-sync.service.spec.ts
git commit -m "feat(gmail): add GmailSyncService for daily receipt sync

- Add service to fetch messages from Gmail with configurable filters
- Build search query from GmailSettings (label, keywords, senders, date)
- Create ReceiptProcessingJob for new messages
- Skip already existing receipts (idempotent)
- Update lastSyncAt after successful sync

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Daily Sync Cron Job

**Files:**
- Modify: `backend/src/modules/gmail/gmail.scheduler.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-scheduler.spec.ts`

### Step 1: Write the failing test

```typescript
// backend/@tests/unit/modules/gmail/gmail-scheduler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GmailScheduler } from '../../../../src/modules/gmail/gmail.scheduler';
import { GmailWatchSubscription, Integration } from '../../../../src/entities';
import { GmailWatchService } from '../../../../src/modules/gmail/services/gmail-watch.service';
import { GmailSyncService } from '../../../../src/modules/gmail/services/gmail-sync.service';

describe('GmailScheduler', () => {
  let scheduler: GmailScheduler;
  let gmailSyncService: jest.Mocked<GmailSyncService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GmailScheduler,
        {
          provide: getRepositoryToken(GmailWatchSubscription),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(Integration),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: GmailWatchService,
          useValue: { renewWatch: jest.fn() },
        },
        {
          provide: GmailSyncService,
          useValue: {
            syncAllIntegrations: jest.fn().mockResolvedValue({
              synced: 2,
              skipped: 0,
              messagesFound: 10,
              jobsCreated: 8,
              errors: [],
            }),
          },
        },
      ],
    }).compile();

    scheduler = module.get<GmailScheduler>(GmailScheduler);
    gmailSyncService = module.get(GmailSyncService);
  });

  describe('runDailySync', () => {
    it('should call syncAllIntegrations', async () => {
      await scheduler.runDailySync();

      expect(gmailSyncService.syncAllIntegrations).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      gmailSyncService.syncAllIntegrations.mockRejectedValue(new Error('Sync failed'));

      // Should not throw
      await expect(scheduler.runDailySync()).resolves.not.toThrow();
    });
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd backend && npm run test:unit -- @tests/unit/modules/gmail/gmail-scheduler.spec.ts -v
```

Expected: FAIL - "runDailySync is not a function"

### Step 3: Update scheduler implementation

```typescript
// backend/src/modules/gmail/gmail.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import {
  GmailWatchSubscription,
  Integration,
  IntegrationStatus,
  WatchSubscriptionStatus,
} from '../../entities';
import { GmailWatchService } from './services/gmail-watch.service';
import { GmailSyncService } from './services/gmail-sync.service';

@Injectable()
export class GmailScheduler {
  private readonly logger = new Logger(GmailScheduler.name);

  constructor(
    @InjectRepository(GmailWatchSubscription)
    private readonly watchSubscriptionRepository: Repository<GmailWatchSubscription>,
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
    private readonly gmailWatchService: GmailWatchService,
    private readonly gmailSyncService: GmailSyncService,
  ) {}

  /**
   * Daily sync cron job - runs at 03:00 UTC every day.
   * Fetches new receipts from Gmail for all connected integrations.
   */
  @Cron('0 3 * * *') // 03:00 UTC daily
  async runDailySync(): Promise<void> {
    try {
      this.logger.log('Starting daily Gmail receipts sync...');

      const result = await this.gmailSyncService.syncAllIntegrations();

      this.logger.log(
        `Daily sync completed: ${result.synced} integrations, ` +
          `${result.messagesFound} messages found, ${result.jobsCreated} jobs created`,
      );

      if (result.errors.length > 0) {
        this.logger.warn(`Daily sync had ${result.errors.length} errors:`, result.errors);
      }
    } catch (error) {
      this.logger.error('Error in daily sync cron job', error);
    }
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async renewExpiringWatches(): Promise<void> {
    try {
      this.logger.log('Checking for expiring Gmail watches...');

      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 24);

      // Find watches expiring in the next 24 hours
      const expiringWatches = await this.watchSubscriptionRepository.find({
        where: {
          expiration: LessThan(tomorrow),
          status: WatchSubscriptionStatus.ACTIVE,
        },
        relations: ['integration'],
      });

      this.logger.log(`Found ${expiringWatches.length} expiring watches`);

      for (const watch of expiringWatches) {
        try {
          const integration = await this.integrationRepository.findOne({
            where: { id: watch.integrationId },
          });

          if (!integration) {
            this.logger.warn(`Integration not found for watch ${watch.id}`);
            continue;
          }

          if (integration.status !== IntegrationStatus.CONNECTED) {
            this.logger.warn(
              `Integration ${integration.id} is not connected, skipping watch renewal`,
            );
            continue;
          }

          if (!integration.connectedByUserId) {
            this.logger.warn(
              `No connected user for integration ${integration.id}, skipping watch renewal`,
            );
            continue;
          }

          await this.gmailWatchService.renewWatch(integration, integration.connectedByUserId);

          this.logger.log(`Successfully renewed watch for integration ${integration.id}`);
        } catch (error) {
          this.logger.error(`Failed to renew watch ${watch.id}`, error);

          // Mark watch as error
          watch.status = WatchSubscriptionStatus.ERROR;
          await this.watchSubscriptionRepository.save(watch);

          // Mark integration as needs reauth if token refresh failed
          const integration = await this.integrationRepository.findOne({
            where: { id: watch.integrationId },
          });
          if (integration) {
            integration.status = IntegrationStatus.NEEDS_REAUTH;
            await this.integrationRepository.save(integration);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in renewExpiringWatches cron job', error);
    }
  }
}
```

### Step 4: Run test to verify it passes

```bash
cd backend && npm run test:unit -- @tests/unit/modules/gmail/gmail-scheduler.spec.ts -v
```

Expected: PASS

### Step 5: Commit

```bash
git add backend/src/modules/gmail/gmail.scheduler.ts \
        backend/@tests/unit/modules/gmail/gmail-scheduler.spec.ts
git commit -m "feat(gmail): add daily sync cron job at 03:00 UTC

- Add runDailySync method triggered by @Cron('0 3 * * *')
- Call GmailSyncService.syncAllIntegrations()
- Log sync results and errors
- Graceful error handling to not break scheduler

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Manual Sync Endpoint

**Files:**
- Modify: `backend/src/modules/gmail/gmail.controller.ts`
- Create: `backend/src/modules/gmail/dto/sync-gmail.dto.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-controller-sync.spec.ts`

### Step 1: Write the failing test

```typescript
// backend/@tests/unit/modules/gmail/gmail-controller-sync.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GmailController } from '../../../../src/modules/gmail/gmail.controller';
import { GmailSyncService } from '../../../../src/modules/gmail/services/gmail-sync.service';
import { Category, GmailSettings, Receipt, Transaction, User } from '../../../../src/entities';

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
        // Mock all other required dependencies
        { provide: getRepositoryToken(Receipt), useValue: {} },
        { provide: getRepositoryToken(Transaction), useValue: {} },
        { provide: getRepositoryToken(GmailSettings), useValue: {} },
        { provide: getRepositoryToken(Category), useValue: {} },
        { provide: 'GmailOAuthService', useValue: {} },
        { provide: 'GmailService', useValue: {} },
        { provide: 'GmailWatchService', useValue: {} },
        { provide: 'GmailReceiptDuplicateService', useValue: {} },
        { provide: 'GmailReceiptCategoryService', useValue: {} },
        { provide: 'GmailReceiptExportService', useValue: {} },
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
```

### Step 2: Run test to verify it fails

```bash
cd backend && npm run test:unit -- @tests/unit/modules/gmail/gmail-controller-sync.spec.ts -v
```

Expected: FAIL - "triggerSync is not a function"

### Step 3: Add sync endpoint to controller

Add to `backend/src/modules/gmail/gmail.controller.ts`:

```typescript
// Add import at top
import { GmailSyncService } from './services/gmail-sync.service';

// Add to constructor
constructor(
  @InjectRepository(Receipt)
  private readonly receiptRepository: Repository<Receipt>,
  @InjectRepository(Transaction)
  private readonly transactionRepository: Repository<Transaction>,
  @InjectRepository(GmailSettings)
  private readonly gmailSettingsRepository: Repository<GmailSettings>,
  @InjectRepository(Category)
  private readonly categoryRepository: Repository<Category>,
  private readonly gmailOAuthService: GmailOAuthService,
  private readonly gmailService: GmailService,
  private readonly gmailWatchService: GmailWatchService,
  private readonly gmailSyncService: GmailSyncService,  // <-- Add this
  private readonly duplicateService: GmailReceiptDuplicateService,
  private readonly categoryService: GmailReceiptCategoryService,
  private readonly exportService: GmailReceiptExportService,
) {}

// Add new endpoint after disconnect
@Post('sync')
@ApiOperation({ summary: 'Trigger manual Gmail sync' })
async triggerSync(@CurrentUser() user: User) {
  try {
    const result = await this.gmailSyncService.syncForUser(user.id);

    return {
      success: true,
      messagesFound: result.messagesFound,
      jobsCreated: result.jobsCreated,
      skipped: result.skipped,
    };
  } catch (error) {
    this.logger.error('Manual sync failed', error);
    throw new BadRequestException(
      `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
```

### Step 4: Run test to verify it passes

```bash
cd backend && npm run test:unit -- @tests/unit/modules/gmail/gmail-controller-sync.spec.ts -v
```

Expected: PASS

### Step 5: Commit

```bash
git add backend/src/modules/gmail/gmail.controller.ts \
        backend/@tests/unit/modules/gmail/gmail-controller-sync.spec.ts
git commit -m "feat(gmail): add manual sync endpoint POST /integrations/gmail/sync

- Allow users to trigger receipt sync on demand
- Return sync results: messagesFound, jobsCreated, skipped
- Handle errors with BadRequestException

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Enhance Universal Receipt Parser

**Files:**
- Modify: `backend/src/modules/gmail/services/gmail-receipt-parser.service.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

### Step 1: Write the failing test

```typescript
// backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GmailReceiptParserService } from '../../../../src/modules/gmail/services/gmail-receipt-parser.service';

describe('GmailReceiptParserService', () => {
  let service: GmailReceiptParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GmailReceiptParserService],
    }).compile();

    service = module.get<GmailReceiptParserService>(GmailReceiptParserService);
  });

  describe('extractAmount', () => {
    it('should extract amount with KZT symbol (₸)', () => {
      const text = 'Total: 15 500,00 ₸';
      const result = service['extractAmount'](text);
      expect(result).toBe(15500);
    });

    it('should extract amount with spaces as thousand separator', () => {
      const text = 'Сумма: 417 955,97';
      const result = service['extractAmount'](text);
      expect(result).toBe(417955.97);
    });

    it('should extract amount from Kaspi receipt format', () => {
      const text = 'ИТОГО: 5 000 ₸';
      const result = service['extractAmount'](text);
      expect(result).toBe(5000);
    });

    it('should extract amount with comma as decimal separator', () => {
      const text = 'Amount: 1234,56 KZT';
      const result = service['extractAmount'](text);
      expect(result).toBe(1234.56);
    });
  });

  describe('extractDate', () => {
    it('should extract date in DD.MM.YYYY format', () => {
      const text = 'Дата: 06.02.2026';
      const result = service['extractDate'](text);
      expect(result).toBe('06.02.2026');
    });

    it('should extract date in YYYY-MM-DD format', () => {
      const text = 'Date: 2026-02-06';
      const result = service['extractDate'](text);
      expect(result).toBe('2026-02-06');
    });

    it('should extract date with time', () => {
      const text = '06.02.2026 15:30:00';
      const result = service['extractDate'](text);
      expect(result).toBe('06.02.2026');
    });
  });

  describe('extractVendor', () => {
    it('should extract vendor from common patterns', () => {
      const text = 'Магазин: ТОО "MAGNUM CASH & CARRY"\\nАдрес: г.Алматы';
      const result = service['extractVendor'](text);
      expect(result).toContain('MAGNUM');
    });

    it('should extract company name from ИИН/БИН line', () => {
      const text = 'БИН: 123456789012\\nИП Иванов А.А.';
      const result = service['extractVendor'](text);
      expect(result).toBeDefined();
    });
  });

  describe('extractCurrency', () => {
    it('should detect KZT from ₸ symbol', () => {
      const text = 'Total: 5000 ₸';
      const result = service['extractCurrency'](text);
      expect(result).toBe('KZT');
    });

    it('should detect USD from $ symbol', () => {
      const text = 'Total: $50.00';
      const result = service['extractCurrency'](text);
      expect(result).toBe('USD');
    });

    it('should detect RUB from ₽ symbol', () => {
      const text = 'Итого: 1500 ₽';
      const result = service['extractCurrency'](text);
      expect(result).toBe('RUB');
    });

    it('should detect currency code in text', () => {
      const text = 'Amount: 1000 KZT';
      const result = service['extractCurrency'](text);
      expect(result).toBe('KZT');
    });
  });

  describe('parseReceipt confidence', () => {
    it('should have high confidence when all fields extracted', () => {
      // Mock a complete receipt
      const fullReceipt = {
        amount: 5000,
        date: '06.02.2026',
        vendor: 'Test Store',
        tax: 500,
        lineItems: [{ description: 'Item', amount: 5000 }],
      };
      const confidence = service['calculateConfidence'](fullReceipt);
      expect(confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should have low confidence when only amount extracted', () => {
      const partialReceipt = {
        amount: 5000,
      };
      const confidence = service['calculateConfidence'](partialReceipt);
      expect(confidence).toBeLessThan(0.5);
    });
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd backend && npm run test:unit -- @tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts -v
```

Expected: Some tests FAIL due to incomplete extraction logic

### Step 3: Enhance parser implementation

```typescript
// backend/src/modules/gmail/services/gmail-receipt-parser.service.ts
import * as fs from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';

interface ParsedReceipt {
  amount?: number;
  currency?: string;
  date?: string;
  vendor?: string;
  tax?: number;
  taxRate?: number;
  subtotal?: number;
  lineItems?: Array<{ description: string; amount: number }>;
  confidence: number;
  rawText?: string;
}

@Injectable()
export class GmailReceiptParserService {
  private readonly logger = new Logger(GmailReceiptParserService.name);

  async parseReceipt(filePath: string): Promise<ParsedReceipt | null> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = this.getMimeType(filePath);

      if (mimeType === 'application/pdf') {
        return await this.parsePdfReceipt(fileBuffer);
      }

      // For images, return basic metadata (AI extraction can be added later)
      if (mimeType.startsWith('image/')) {
        return {
          confidence: 0.1,
          rawText: '[Image file - OCR not implemented]',
        };
      }

      return {
        confidence: 0.1,
        rawText: '[Unsupported file type]',
      };
    } catch (error) {
      this.logger.error('Failed to parse receipt', error);
      return null;
    }
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private async parsePdfReceipt(buffer: Buffer): Promise<ParsedReceipt> {
    try {
      const data = await pdfParse(buffer);
      const text = data.text;

      const amount = this.extractAmount(text);
      const currency = this.extractCurrency(text);
      const date = this.extractDate(text);
      const vendor = this.extractVendor(text);
      const tax = this.extractTax(text);
      const lineItems = this.extractLineItems(text);

      // Calculate subtotal if tax is found
      let subtotal: number | undefined;
      let taxRate: number | undefined;
      if (amount && tax && tax < amount) {
        subtotal = amount - tax;
        taxRate = (tax / subtotal) * 100;
      }

      const confidence = this.calculateConfidence({
        amount,
        date,
        vendor,
        tax,
        lineItems,
      });

      return {
        amount,
        currency: currency || 'KZT',
        date,
        vendor,
        tax,
        taxRate,
        subtotal,
        lineItems,
        confidence,
        rawText: text.slice(0, 2000), // First 2000 chars for debugging
      };
    } catch (error) {
      this.logger.error('Failed to parse PDF receipt', error);
      return { confidence: 0 };
    }
  }

  /**
   * Extract amount with support for various formats:
   * - 15 500,00 ₸ (Kazakhstan)
   * - 417,955.97 KZT
   * - $50.00
   * - 1500 ₽
   */
  extractAmount(text: string): number | undefined {
    // Normalize text: replace multiple spaces, newlines
    const normalizedText = text.replace(/\s+/g, ' ');

    const patterns = [
      // Total/Sum/Amount followed by number with currency
      /(?:total|итого|сумма|amount|sum|к\s*оплате|всего)[:\s]*([0-9\s]+[,.]?[0-9]*)\s*(?:₸|тг|kzt|тенге)?/gi,
      // Currency symbol before number
      /[₸$€₽]\s*([0-9\s]+[,.]?[0-9]*)/g,
      // Number followed by currency
      /([0-9\s]+[,.]?[0-9]*)\s*(?:₸|тг|kzt|тенге|usd|rub|eur|\$|€|₽)/gi,
      // "ИТОГО" on its own line with amount
      /итого[:\s]*\n?\s*([0-9\s]+[,.]?[0-9]*)/gi,
    ];

    let maxAmount: number | undefined;

    for (const pattern of patterns) {
      const matches = normalizedText.matchAll(pattern);
      for (const match of matches) {
        const parsed = this.parseNumber(match[1]);
        if (parsed && (!maxAmount || parsed > maxAmount)) {
          // Usually the largest "total" is the actual total
          maxAmount = parsed;
        }
      }
    }

    return maxAmount;
  }

  /**
   * Parse number from string with various formats.
   * Handles: "15 500,00", "15,500.00", "15500"
   */
  private parseNumber(str: string): number | undefined {
    if (!str) return undefined;

    // Remove all spaces
    let cleaned = str.replace(/\s/g, '');

    // Handle comma as decimal separator (European/Russian format)
    // If there's both comma and dot, the last one is decimal
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    if (lastComma > lastDot) {
      // Comma is decimal separator: "1234,56" or "1.234,56"
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // Dot is decimal separator: "1,234.56"
      cleaned = cleaned.replace(/,/g, '');
    } else if (lastComma > -1) {
      // Only comma present
      // Check if it's a thousand separator or decimal
      const afterComma = cleaned.slice(lastComma + 1);
      if (afterComma.length <= 2) {
        // Decimal separator
        cleaned = cleaned.replace(',', '.');
      } else {
        // Thousand separator
        cleaned = cleaned.replace(',', '');
      }
    }

    const num = Number.parseFloat(cleaned);
    return Number.isNaN(num) || num <= 0 ? undefined : num;
  }

  /**
   * Extract date in various formats.
   */
  extractDate(text: string): string | undefined {
    const patterns = [
      // DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
      /(\d{2})[.\-/](\d{2})[.\-/](\d{4})/,
      // YYYY-MM-DD
      /(\d{4})[.\-/](\d{2})[.\-/](\d{2})/,
      // "Дата: DD.MM.YYYY" or "Date: ..."
      /(?:дата|date)[:\s]*(\d{2}[.\-/]\d{2}[.\-/]\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // Return the full date match
        return match[0].replace(/(?:дата|date)[:\s]*/i, '');
      }
    }

    return undefined;
  }

  /**
   * Extract vendor/merchant name.
   */
  extractVendor(text: string): string | undefined {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Patterns for vendor detection
    const vendorPatterns = [
      /(?:магазин|продавец|компания|организация|merchant|vendor|store)[:\s]*(.+)/i,
      /(?:тоо|ип|ао|зао|оао)\s*[«"]?([^»"\n]+)[»"]?/i,
      /(?:бин|иин)[:\s]*\d+\s*\n?\s*(.+)/i,
    ];

    for (const pattern of vendorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const vendor = match[1].trim();
        if (vendor.length >= 3 && vendor.length <= 100) {
          return vendor;
        }
      }
    }

    // Fallback: first non-empty line that looks like a name
    for (const line of lines.slice(0, 5)) {
      // Skip lines that are just numbers or dates
      if (/^\d+[.\-/\s\d]*$/.test(line)) continue;
      // Skip very short lines
      if (line.length < 3) continue;
      // Skip lines that look like addresses or dates
      if (/(?:дата|date|адрес|address|чек|receipt|№)/i.test(line)) continue;

      return line.slice(0, 100);
    }

    return undefined;
  }

  /**
   * Extract currency from text.
   */
  extractCurrency(text: string): string | undefined {
    const currencyMap: Record<string, string> = {
      '₸': 'KZT',
      'тг': 'KZT',
      'тенге': 'KZT',
      'kzt': 'KZT',
      '$': 'USD',
      'usd': 'USD',
      '€': 'EUR',
      'eur': 'EUR',
      '₽': 'RUB',
      'руб': 'RUB',
      'rub': 'RUB',
    };

    const lowerText = text.toLowerCase();

    for (const [symbol, code] of Object.entries(currencyMap)) {
      if (lowerText.includes(symbol)) {
        return code;
      }
    }

    return undefined;
  }

  /**
   * Extract tax amount.
   */
  extractTax(text: string): number | undefined {
    const patterns = [
      /(?:налог|tax|ндс|vat|нсп)[:\s]*([0-9\s]+[,.]?[0-9]*)/gi,
      /(?:ндс|vat)\s*\d+%[:\s]*([0-9\s]+[,.]?[0-9]*)/gi,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const parsed = this.parseNumber(match[1]);
        if (parsed) {
          return parsed;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract line items from receipt.
   */
  extractLineItems(text: string): Array<{ description: string; amount: number }> {
    const lineItems: Array<{ description: string; amount: number }> = [];
    const lines = text.split('\n');

    // Pattern: description followed by amount
    const itemPattern = /^(.{3,60}?)\s+(\d+[\s,.]?\d*)\s*(?:₸|тг|kzt)?$/i;

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(itemPattern);

      if (match) {
        const description = match[1].trim();
        const amount = this.parseNumber(match[2]);

        // Filter out header/total lines
        if (
          amount &&
          description.length >= 3 &&
          !/(итого|total|сумма|налог|ндс|vat)/i.test(description)
        ) {
          lineItems.push({ description, amount });
        }
      }
    }

    return lineItems;
  }

  /**
   * Calculate confidence score based on extracted fields.
   */
  calculateConfidence(data: {
    amount?: number;
    date?: string;
    vendor?: string;
    tax?: number;
    lineItems?: Array<any>;
  }): number {
    let score = 0;

    if (data.amount && data.amount > 0) score += 35;
    if (data.date) score += 25;
    if (data.vendor && data.vendor.length >= 3) score += 20;
    if (data.tax && data.tax > 0) score += 10;
    if (data.lineItems && data.lineItems.length > 0) score += 10;

    return score / 100;
  }
}
```

### Step 4: Run test to verify it passes

```bash
cd backend && npm run test:unit -- @tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts -v
```

Expected: PASS

### Step 5: Commit

```bash
git add backend/src/modules/gmail/services/gmail-receipt-parser.service.ts \
        backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts
git commit -m "feat(gmail): enhance universal receipt parser

- Support KZT format: '15 500,00 ₸', '417 955,97'
- Support multiple currencies: KZT, USD, EUR, RUB
- Better vendor extraction from common patterns
- Improved date extraction (DD.MM.YYYY, YYYY-MM-DD)
- Handle comma/dot as thousand/decimal separators
- Add rawText to parsed result for debugging
- Confidence scoring based on extracted fields

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add Sync Button to Frontend

**Files:**
- Modify: `frontend/app/integrations/gmail/page.tsx`
- Modify: `frontend/app/lib/api.ts` (if needed)

### Step 1: Add sync button to Gmail integration page

Update `frontend/app/integrations/gmail/page.tsx`:

```typescript
// Add to imports
import { RefreshCw } from 'lucide-react';

// Add state for syncing
const [syncing, setSyncing] = useState(false);
const [lastSyncResult, setLastSyncResult] = useState<{
  messagesFound: number;
  jobsCreated: number;
} | null>(null);

// Add sync handler
const handleSync = async () => {
  try {
    setSyncing(true);
    const response = await apiClient.post('/integrations/gmail/sync');
    const result = response.data;
    setLastSyncResult({
      messagesFound: result.messagesFound,
      jobsCreated: result.jobsCreated,
    });
    toast.success(`Found ${result.messagesFound} messages, ${result.jobsCreated} new receipts`);
    await loadStatus(); // Refresh status to update lastSyncAt
  } catch (error) {
    toast.error('Failed to sync Gmail');
  } finally {
    setSyncing(false);
  }
};

// Add sync button to the Connection Status Card (after Disconnect button)
{status?.connected && (
  <button
    type="button"
    onClick={handleSync}
    disabled={syncing}
    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
  >
    {syncing ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <RefreshCw className="h-4 w-4" />
    )}
    Sync Now
  </button>
)}

// Add sync result display in Settings Card
{lastSyncResult && (
  <div className="p-3 rounded-lg bg-emerald-50 text-sm">
    <p className="text-emerald-700">
      Last sync found {lastSyncResult.messagesFound} messages,
      created {lastSyncResult.jobsCreated} new receipts
    </p>
  </div>
)}
```

### Step 2: Test manually

```bash
cd frontend && npm run dev
```

Open http://localhost:3000/integrations/gmail and test the Sync Now button.

### Step 3: Commit

```bash
git add frontend/app/integrations/gmail/page.tsx
git commit -m "feat(frontend): add Sync Now button to Gmail integration

- Add manual sync button with loading state
- Display sync results (messages found, receipts created)
- Refresh status after sync to update lastSyncAt

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Add Sync Frequency Settings

**Files:**
- Modify: `backend/src/entities/gmail-settings.entity.ts`
- Create migration: `backend/src/migrations/XXX-AddGmailSyncSettings.ts`
- Modify: `backend/src/modules/gmail/dto/update-gmail-settings.dto.ts`
- Modify: `backend/src/modules/gmail/gmail.controller.ts`

### Step 1: Add sync settings to entity

Update `backend/src/entities/gmail-settings.entity.ts`:

```typescript
// Add new columns
@Column({ name: 'sync_enabled', type: 'boolean', default: true })
syncEnabled: boolean;

@Column({ name: 'sync_frequency', type: 'varchar', length: 20, default: 'daily' })
syncFrequency: 'daily' | '12h' | '6h' | 'manual';

@Column({ name: 'sync_hour_utc', type: 'int', default: 3 })
syncHourUtc: number; // 0-23, default 3 (03:00 UTC)
```

### Step 2: Generate and run migration

```bash
cd backend && npm run migration:generate -- AddGmailSyncSettings
cd backend && npm run migration:run
```

### Step 3: Update DTO

```typescript
// backend/src/modules/gmail/dto/update-gmail-settings.dto.ts
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateGmailSettingsDto {
  // ... existing fields ...

  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;

  @IsOptional()
  @IsEnum(['daily', '12h', '6h', 'manual'])
  syncFrequency?: 'daily' | '12h' | '6h' | 'manual';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  syncHourUtc?: number;
}
```

### Step 4: Update controller

Update settings handler in `gmail.controller.ts`:

```typescript
// In updateSettings method, add:
if (dto.syncEnabled !== undefined) {
  settings.syncEnabled = dto.syncEnabled;
}
if (dto.syncFrequency !== undefined) {
  settings.syncFrequency = dto.syncFrequency;
}
if (dto.syncHourUtc !== undefined) {
  settings.syncHourUtc = dto.syncHourUtc;
}
```

### Step 5: Commit

```bash
git add backend/src/entities/gmail-settings.entity.ts \
        backend/src/migrations/*AddGmailSyncSettings* \
        backend/src/modules/gmail/dto/update-gmail-settings.dto.ts \
        backend/src/modules/gmail/gmail.controller.ts
git commit -m "feat(gmail): add sync frequency settings

- Add syncEnabled, syncFrequency, syncHourUtc to GmailSettings
- Support: daily, 12h, 6h, manual frequencies
- Add migration for new columns
- Update DTO with validation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update Scheduler for Configurable Frequency

**Files:**
- Modify: `backend/src/modules/gmail/gmail.scheduler.ts`
- Modify: `backend/src/modules/gmail/services/gmail-sync.service.ts`

### Step 1: Update scheduler to respect settings

```typescript
// backend/src/modules/gmail/gmail.scheduler.ts

// Run every hour, but only process integrations that should sync
@Cron('0 * * * *') // Every hour at minute 0
async runScheduledSync(): Promise<void> {
  try {
    const currentHour = new Date().getUTCHours();
    this.logger.log(`Running scheduled sync check for hour ${currentHour} UTC`);

    const result = await this.gmailSyncService.syncIntegrationsForHour(currentHour);

    if (result.synced > 0) {
      this.logger.log(
        `Scheduled sync: ${result.synced} integrations, ` +
          `${result.messagesFound} messages, ${result.jobsCreated} jobs`,
      );
    }
  } catch (error) {
    this.logger.error('Error in scheduled sync', error);
  }
}
```

### Step 2: Update sync service

```typescript
// Add to GmailSyncService

/**
 * Sync integrations that should run at this hour.
 */
async syncIntegrationsForHour(hour: number): Promise<SyncResult> {
  const result: SyncResult = {
    synced: 0,
    skipped: 0,
    messagesFound: 0,
    jobsCreated: 0,
    errors: [],
  };

  const integrations = await this.integrationRepository.find({
    where: {
      provider: IntegrationProvider.GMAIL,
      status: IntegrationStatus.CONNECTED,
    },
    relations: ['gmailSettings'],
  });

  for (const integration of integrations) {
    const settings = integration.gmailSettings;

    // Skip if sync disabled or manual only
    if (!settings?.syncEnabled || settings.syncFrequency === 'manual') {
      result.skipped++;
      continue;
    }

    // Check if this integration should sync at this hour
    if (!this.shouldSyncAtHour(settings, hour)) {
      result.skipped++;
      continue;
    }

    // ... rest of sync logic
  }

  return result;
}

private shouldSyncAtHour(settings: GmailSettings, hour: number): boolean {
  const syncHour = settings.syncHourUtc ?? 3;

  switch (settings.syncFrequency) {
    case 'daily':
      return hour === syncHour;
    case '12h':
      return hour === syncHour || hour === (syncHour + 12) % 24;
    case '6h':
      return [0, 6, 12, 18].includes(hour);
    default:
      return false;
  }
}
```

### Step 3: Commit

```bash
git add backend/src/modules/gmail/gmail.scheduler.ts \
        backend/src/modules/gmail/services/gmail-sync.service.ts
git commit -m "feat(gmail): implement configurable sync frequency

- Run scheduler every hour, filter by settings
- Support daily, 12h, 6h, manual frequencies
- Respect syncHourUtc setting
- Skip disabled or manual-only integrations

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

### Files Created
1. `backend/src/modules/gmail/services/gmail-sync.service.ts`
2. `backend/@tests/unit/modules/gmail/gmail-sync.service.spec.ts`
3. `backend/@tests/unit/modules/gmail/gmail-scheduler.spec.ts`
4. `backend/@tests/unit/modules/gmail/gmail-controller-sync.spec.ts`
5. `backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`
6. Migration file for sync settings

### Files Modified
1. `backend/src/modules/gmail/gmail.module.ts` - register GmailSyncService
2. `backend/src/modules/gmail/gmail.scheduler.ts` - add daily sync cron
3. `backend/src/modules/gmail/gmail.controller.ts` - add sync endpoint
4. `backend/src/modules/gmail/services/gmail-receipt-parser.service.ts` - enhance parsing
5. `backend/src/entities/gmail-settings.entity.ts` - add sync settings
6. `backend/src/modules/gmail/dto/update-gmail-settings.dto.ts` - add sync DTOs
7. `frontend/app/integrations/gmail/page.tsx` - add Sync Now button

### API Endpoints
- `POST /integrations/gmail/sync` - Manual sync trigger

### Cron Jobs
- Every hour: Check and run syncs based on integration settings
- Every 6 hours: Renew Pub/Sub watches (existing)

### Environment Variables (no new ones required)
Uses existing GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, etc.
