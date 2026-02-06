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

interface SyncError {
  integrationId: string;
  error: string;
}

export interface SyncResult {
  synced: number;
  skipped: number;
  messagesFound: number;
  jobsCreated: number;
  errors: SyncError[];
}

export interface UserSyncResult {
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

  async syncAllIntegrations(): Promise<SyncResult> {
    const result: SyncResult = {
      synced: 0,
      skipped: 0,
      messagesFound: 0,
      jobsCreated: 0,
      errors: [],
    };

    try {
      const integrations = await this.integrationRepository.find({
        where: {
          provider: IntegrationProvider.GMAIL,
          status: IntegrationStatus.CONNECTED,
        },
        relations: ['gmailSettings'],
      });

      for (const integration of integrations) {
        if (!integration.connectedByUserId) {
          this.logger.warn(`Integration ${integration.id} has no connected user`);
          result.skipped += 1;
          continue;
        }

        try {
          const userResult = await this.syncForIntegration(integration);
          result.synced += 1;
          result.messagesFound += userResult.messagesFound;
          result.jobsCreated += userResult.jobsCreated;
        } catch (error) {
          result.errors.push({
            integrationId: integration.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to sync all Gmail integrations', error);
    }

    return result;
  }

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

  private async syncForIntegration(integration: Integration): Promise<UserSyncResult> {
    const result: UserSyncResult = {
      messagesFound: 0,
      jobsCreated: 0,
      skipped: 0,
      errors: [],
    };

    const userId = integration.connectedByUserId;
    if (!userId) {
      throw new Error('Integration has no connected user');
    }

    const query = this.buildSearchQuery(integration.gmailSettings);
    const messages = await this.gmailService.listMessages(userId, query);
    result.messagesFound = messages.length;

    for (const message of messages) {
      try {
        const existingReceipt = await this.receiptRepository.findOne({
          where: { gmailMessageId: message.id },
        });

        if (existingReceipt) {
          result.skipped += 1;
          continue;
        }

        const job = this.jobRepository.create({
          userId,
          status: ReceiptJobStatus.PENDING,
          payload: {
            integrationId: integration.id,
            gmailMessageId: message.id,
          },
        });

        await this.jobRepository.save(job);
        result.jobsCreated += 1;
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    if (integration.gmailSettings) {
      integration.gmailSettings.lastSyncAt = new Date();
      await this.gmailSettingsRepository.save(integration.gmailSettings);
    }

    return result;
  }

  private buildSearchQuery(settings: GmailSettings | null): string {
    const parts: string[] = [];

    if (settings?.labelId) {
      parts.push(`label:${settings.labelId}`);
    }

    if (settings?.filterConfig?.hasAttachment !== false) {
      parts.push('has:attachment');
    }

    const sinceDate = settings?.lastSyncAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
    parts.push(`after:${this.formatDateForGmail(sinceDate)}`);

    const keywords = settings?.filterConfig?.keywords;
    if (keywords && keywords.length > 0) {
      const keywordQuery = keywords.map(keyword => keyword.trim()).join(' OR ');
      parts.push(`{${keywordQuery}}`);
    }

    const senders = settings?.filterConfig?.senders;
    if (senders && senders.length > 0) {
      const senderQuery = senders.map(sender => `from:${sender.trim()}`).join(' OR ');
      parts.push(`(${senderQuery})`);
    }

    return parts.join(' ');
  }

  private formatDateForGmail(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}/${month}/${day}`;
  }
}
