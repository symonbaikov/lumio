import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'express';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  Category,
  GmailSettings,
  Receipt,
  ReceiptStatus,
  Transaction,
  TransactionType,
  User,
} from '../../entities';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BulkApproveDto } from './dto/bulk-approve.dto';
import { ExportSheetsDto } from './dto/export-sheets.dto';
import { MarkDuplicateDto } from './dto/mark-duplicate.dto';
import { UpdateGmailSettingsDto } from './dto/update-gmail-settings.dto';
import { UpdateParsedDataDto } from './dto/update-parsed-data.dto';
import { ApproveReceiptDto, UpdateReceiptDto } from './dto/update-receipt.dto';
import { GmailOAuthService } from './services/gmail-oauth.service';
import { GmailReceiptCategoryService } from './services/gmail-receipt-category.service';
import { GmailReceiptDuplicateService } from './services/gmail-receipt-duplicate.service';
import { GmailReceiptExportService } from './services/gmail-receipt-export.service';
import { GmailSyncService } from './services/gmail-sync.service';
import { GmailWatchService } from './services/gmail-watch.service';
import { GmailService } from './services/gmail.service';

@ApiTags('Gmail Integration')
@Controller('integrations/gmail')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GmailController {
  private readonly logger = new Logger(GmailController.name);

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
    private readonly gmailSyncService: GmailSyncService,
    private readonly duplicateService: GmailReceiptDuplicateService,
    private readonly categoryService: GmailReceiptCategoryService,
    private readonly exportService: GmailReceiptExportService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get Gmail integration status' })
  async getStatus(@CurrentUser() user: User) {
    const { integration } = await this.gmailOAuthService.findIntegrationForUser(user.id);

    if (!integration) {
      return {
        connected: false,
        status: 'disconnected',
      };
    }

    return {
      connected: true,
      status: integration.status,
      settings: integration.gmailSettings,
      scopes: integration.scopes,
    };
  }

  @Get('connect')
  @ApiOperation({ summary: 'Get Gmail OAuth URL' })
  getConnectUrl(@CurrentUser() user: User) {
    const authUrl = this.gmailOAuthService.getAuthUrl(user);
    return { url: authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle Gmail OAuth callback' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const result = await this.gmailOAuthService.handleCallback({ code, state, error });

    // If integration was created successfully, set up Gmail environment
    if (result.integration?.connectedByUserId) {
      try {
        await this.gmailService.setupGmailEnvironment(
          result.integration,
          result.integration.connectedByUserId,
        );

        // Start watch
        await this.gmailWatchService.setupWatch(
          result.integration,
          result.integration.connectedByUserId,
        );
      } catch (setupError) {
        console.error('Failed to setup Gmail environment or watch:', setupError);
      }
    }

    return res.redirect(result.redirectUrl);
  }

  @Post('disconnect')
  @ApiOperation({ summary: 'Disconnect Gmail integration' })
  async disconnect(@CurrentUser() user: User) {
    const integration = await this.gmailOAuthService.ensureIntegration(user.id);

    if (integration.connectedByUserId) {
      // Stop watch
      try {
        await this.gmailWatchService.stopWatch(integration, integration.connectedByUserId);
      } catch (error) {
        console.error('Failed to stop watch:', error);
      }
    }

    await this.gmailOAuthService.disconnect(user.id);

    return { success: true, message: 'Gmail integration disconnected' };
  }

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

  @Post('settings')
  @ApiOperation({ summary: 'Update Gmail settings' })
  async updateSettings(@CurrentUser() user: User, @Body() dto: UpdateGmailSettingsDto) {
    const integration = await this.gmailOAuthService.ensureIntegration(user.id);

    if (!integration.gmailSettings) {
      throw new BadRequestException('Gmail settings not found');
    }

    const settings = integration.gmailSettings;

    if (dto.labelName !== undefined) {
      settings.labelName = dto.labelName;
    }
    if (dto.filterEnabled !== undefined) {
      settings.filterEnabled = dto.filterEnabled;
    }
    if (dto.subjects || dto.senders || dto.hasAttachment !== undefined || dto.keywords) {
      settings.filterConfig = {
        subjects: dto.subjects || settings.filterConfig?.subjects,
        senders: dto.senders || settings.filterConfig?.senders,
        hasAttachment: dto.hasAttachment ?? settings.filterConfig?.hasAttachment,
        keywords: dto.keywords || settings.filterConfig?.keywords,
      };
    }

    await this.gmailSettingsRepository.save(settings);

    return { success: true, settings };
  }

  @Get('receipts')
  @ApiOperation({ summary: 'List receipts' })
  async listReceipts(
    @CurrentUser() user: User,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const queryBuilder = this.receiptRepository
      .createQueryBuilder('receipt')
      .where('receipt.userId = :userId', { userId: user.id })
      .orderBy('receipt.receivedAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('receipt.status = :status', { status });
    }

    const take = Math.min(Number.parseInt(limit || '50'), 100);
    const skip = Number.parseInt(offset || '0');

    const [receipts, total] = await queryBuilder.take(take).skip(skip).getManyAndCount();

    return {
      receipts,
      total,
      limit: take,
      offset: skip,
    };
  }

  @Patch('receipts/:id')
  @ApiOperation({ summary: 'Update receipt' })
  async updateReceipt(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateReceiptDto,
  ) {
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId: user.id },
    });

    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }

    if (dto.status) {
      receipt.status = dto.status;
    }
    if (dto.parsedData) {
      receipt.parsedData = { ...receipt.parsedData, ...dto.parsedData };
    }

    await this.receiptRepository.save(receipt);

    return receipt;
  }

  @Post('receipts/:id/approve')
  @ApiOperation({ summary: 'Approve receipt and create transaction' })
  async approveReceipt(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ApproveReceiptDto,
  ) {
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId: user.id },
    });

    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }

    // Create transaction with workspaceId
    const transaction = this.transactionRepository.create({
      statementId: null,
      workspaceId: user.workspaceId,
      transactionDate: new Date(dto.date),
      counterpartyName: dto.description || receipt.parsedData?.vendor || 'Unknown',
      paymentPurpose: dto.description || receipt.parsedData?.vendor || '',
      amount: dto.amount,
      currency: dto.currency || 'KZT',
      categoryId: dto.categoryId || receipt.parsedData?.categoryId || null,
      transactionType: TransactionType.EXPENSE,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Update receipt
    receipt.status = ReceiptStatus.APPROVED;
    receipt.transactionId = savedTransaction.id;
    await this.receiptRepository.save(receipt);

    return {
      receipt,
      transaction: savedTransaction,
    };
  }

  @Get('receipts/:id')
  @ApiOperation({ summary: 'Get single receipt with details' })
  async getReceipt(@CurrentUser() user: User, @Param('id') id: string) {
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId: user.id },
      relations: ['transaction', 'duplicateOf'],
    });

    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }

    // Find potential duplicates
    const potentialDuplicates = await this.duplicateService.findPotentialDuplicates(receipt);

    // Suggest category
    const suggestedCategory = await this.categoryService.suggestCategory(receipt);

    // Ensure categoryId is in parsedData if suggested
    if (suggestedCategory && receipt.parsedData && !receipt.parsedData.categoryId) {
      receipt.parsedData.categoryId = suggestedCategory.id;
    }

    return {
      receipt,
      potentialDuplicates,
      suggestedCategory,
    };
  }

  @Patch('receipts/:id/parsed-data')
  @ApiOperation({ summary: 'Update parsed receipt data' })
  async updateParsedData(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateParsedDataDto,
  ) {
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId: user.id },
    });

    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }

    // Update parsed data
    receipt.parsedData = {
      ...receipt.parsedData,
      ...dto,
    };

    // Update tax amount if provided
    if (dto.tax !== undefined) {
      receipt.taxAmount = dto.tax;
    }

    await this.receiptRepository.save(receipt);

    return receipt;
  }

  @Post('receipts/:id/mark-duplicate')
  @ApiOperation({ summary: 'Mark receipt as duplicate' })
  async markDuplicate(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: MarkDuplicateDto,
  ) {
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId: user.id },
    });

    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }

    await this.duplicateService.markAsDuplicate(id, dto.originalReceiptId);

    return await this.receiptRepository.findOne({
      where: { id },
      relations: ['duplicateOf'],
    });
  }

  @Post('receipts/:id/unmark-duplicate')
  @ApiOperation({ summary: 'Unmark receipt as duplicate' })
  async unmarkDuplicate(@CurrentUser() user: User, @Param('id') id: string) {
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId: user.id },
    });

    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }

    await this.duplicateService.unmarkDuplicate(id);

    return await this.receiptRepository.findOne({
      where: { id },
    });
  }

  @Post('receipts/bulk-approve')
  @ApiOperation({ summary: 'Approve multiple receipts at once' })
  async bulkApprove(@CurrentUser() user: User, @Body() dto: BulkApproveDto) {
    const results = {
      approved: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const receiptId of dto.receiptIds) {
      try {
        const receipt = await this.receiptRepository.findOne({
          where: { id: receiptId, userId: user.id },
        });

        if (!receipt) {
          results.failed++;
          results.errors.push({ receiptId, error: 'Receipt not found' });
          continue;
        }

        if (!receipt.parsedData?.amount || !receipt.parsedData?.date) {
          results.failed++;
          results.errors.push({ receiptId, error: 'Missing required data' });
          continue;
        }

        // Create transaction with workspaceId
        const transaction = this.transactionRepository.create({
          statementId: null,
          workspaceId: user.workspaceId,
          transactionDate: new Date(receipt.parsedData.date),
          counterpartyName: receipt.parsedData.vendor || receipt.subject || 'Unknown',
          paymentPurpose: receipt.parsedData.vendor || receipt.subject || '',
          amount: receipt.parsedData.amount,
          currency: receipt.parsedData.currency || 'KZT',
          categoryId: dto.categoryId || receipt.parsedData.categoryId || null,
          transactionType: TransactionType.EXPENSE,
        });

        const savedTransaction = await this.transactionRepository.save(transaction);

        // Update receipt
        receipt.status = ReceiptStatus.APPROVED;
        receipt.transactionId = savedTransaction.id;
        await this.receiptRepository.save(receipt);

        results.approved++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          receiptId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  @Post('receipts/export-sheets')
  @ApiOperation({ summary: 'Export receipts to Google Sheets' })
  async exportToSheets(@CurrentUser() user: User, @Body() dto: ExportSheetsDto) {
    try {
      const result = await this.exportService.exportToSheets(
        user.id,
        dto.receiptIds,
        dto.spreadsheetId,
      );
      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to export to sheets: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Get('receipts/:id/preview')
  @ApiOperation({ summary: 'Get receipt preview (email body or attachment)' })
  async getReceiptPreview(@CurrentUser() user: User, @Param('id') id: string) {
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId: user.id },
    });

    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }

    // Get Gmail message
    const message = await this.gmailService.getMessage(user.id, receipt.gmailMessageId);

    // Extract email body
    let emailBody = '';
    const findBody = (part: any): string => {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        for (const subPart of part.parts) {
          const body = findBody(subPart);
          if (body) return body;
        }
      }
      return '';
    };

    emailBody = findBody(message.payload);

    // Fetch attachment data if available
    const attachments = receipt.metadata?.attachments || [];
    const attachmentData: any[] = [];

    if (attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          // Get attachment data from Gmail
          const { client } = await this.gmailOAuthService.getGmailClient(user.id);
          const gmail = require('googleapis').google.gmail({ version: 'v1', auth: client });

          const response = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: receipt.gmailMessageId,
            id: attachment.id,
          });

          if (response.data.data) {
            // Return base64 data for client-side rendering
            attachmentData.push({
              filename: attachment.filename,
              mimeType: attachment.mimeType,
              size: attachment.size,
              data: response.data.data, // base64url encoded
            });
          }
        } catch (error) {
          this.logger.error(`Failed to fetch attachment ${attachment.filename}`, error);
        }
      }
    }

    return {
      emailBody,
      attachments: receipt.metadata?.attachments || [],
      attachmentData, // Include actual attachment data
      snippet: receipt.metadata?.snippet,
    };
  }
}
