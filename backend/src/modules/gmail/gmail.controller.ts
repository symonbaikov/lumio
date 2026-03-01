import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
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
import { Cache } from 'cache-manager';
import { Response } from 'express';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  Category,
  GmailSettings,
  IntegrationStatus,
  Receipt,
  ReceiptStatus,
  Transaction,
  TransactionType,
  User,
} from '../../entities';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { BulkApproveDto } from './dto/bulk-approve.dto';
import { ExportSheetsDto } from './dto/export-sheets.dto';
import { MarkDuplicateDto } from './dto/mark-duplicate.dto';
import { ReparseMerchantsDto } from './dto/reparse-merchants.dto';
import { UpdateGmailSettingsDto } from './dto/update-gmail-settings.dto';
import { UpdateParsedDataDto } from './dto/update-parsed-data.dto';
import { ApproveReceiptDto, UpdateReceiptDto } from './dto/update-receipt.dto';
import { GmailMerchantReparseService } from './services/gmail-merchant-reparse.service';
import { GmailOAuthService } from './services/gmail-oauth.service';
import { GmailReceiptCategoryService } from './services/gmail-receipt-category.service';
import { GmailReceiptDuplicateService } from './services/gmail-receipt-duplicate.service';
import { GmailReceiptExportService } from './services/gmail-receipt-export.service';
import { GmailSyncService } from './services/gmail-sync.service';
import { GmailWatchService } from './services/gmail-watch.service';
import { GmailService } from './services/gmail.service';

const execAsync = promisify(exec);
const AMOUNT_PRESENT_SQL = "NULLIF(TRIM(receipt.parsed_data->>'amount'), '') IS NOT NULL";
const AMOUNT_MISSING_SQL = "NULLIF(TRIM(receipt.parsed_data->>'amount'), '') IS NULL";

@ApiTags('Gmail Integration')
@Controller('integrations/gmail')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GmailController {
  private readonly logger = new Logger(GmailController.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
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
    private readonly merchantReparseService: GmailMerchantReparseService,
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

    const connected = integration.status === IntegrationStatus.CONNECTED;

    return {
      connected,
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

  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'Handle Gmail OAuth callback' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const result = await this.gmailOAuthService.handleCallback({
      code,
      state,
      error,
    });

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
        errors: result.errors,
        warnings: result.warnings,
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
    @Query('includeInvalid') includeInvalid?: string,
    @Query('hasAmount') hasAmount?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const includeInvalidReceipts = this.parseBooleanQuery(includeInvalid, false);
    const hasAmountFilter = this.parseOptionalBooleanQuery(hasAmount);

    const queryBuilder = this.receiptRepository
      .createQueryBuilder('receipt')
      .where('receipt.userId = :userId', { userId: user.id })
      .orderBy('receipt.receivedAt', 'DESC');

    if (!includeInvalidReceipts) {
      queryBuilder.andWhere('receipt.status != :failedStatus', {
        failedStatus: ReceiptStatus.FAILED,
      });
    }

    if (hasAmountFilter === true) {
      queryBuilder.andWhere(AMOUNT_PRESENT_SQL);
    } else if (hasAmountFilter === false) {
      queryBuilder.andWhere(AMOUNT_MISSING_SQL);
    } else if (!includeInvalidReceipts) {
      queryBuilder.andWhere(AMOUNT_PRESENT_SQL);
    }

    if (status) {
      queryBuilder.andWhere('receipt.status = :status', { status });
    }

    if (categoryId) {
      queryBuilder.leftJoin('receipt.transaction', 'transaction');

      if (categoryId === 'uncategorized') {
        queryBuilder.andWhere(
          "COALESCE(NULLIF(receipt.parsed_data ->> 'categoryId', ''), transaction.category_id) IS NULL",
        );
      } else {
        queryBuilder.andWhere(
          "(transaction.category_id = :categoryId OR receipt.parsed_data ->> 'categoryId' = :categoryId)",
          { categoryId },
        );
      }
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

    const hadAmountBeforeUpdate = this.hasReceiptAmount(receipt.parsedData?.amount);

    // Update parsed data
    receipt.parsedData = {
      ...receipt.parsedData,
      ...dto,
    };

    const validationIssues = Array.isArray((receipt.parsedData as any)?.validationIssues)
      ? ((receipt.parsedData as any).validationIssues as string[])
      : [];
    const hasAmount = this.hasReceiptAmount(receipt.parsedData?.amount);

    if (hasAmount && !hadAmountBeforeUpdate && receipt.status === ReceiptStatus.NEEDS_REVIEW) {
      const nextIssues = validationIssues.filter(issue => issue !== 'missing_amount');
      receipt.parsedData = {
        ...receipt.parsedData,
        validationIssues: nextIssues.length > 0 ? nextIssues : undefined,
      };

      const hasPotentialDuplicates =
        Array.isArray(receipt.metadata?.potentialDuplicates) &&
        receipt.metadata.potentialDuplicates.length > 0;

      if (!hasPotentialDuplicates) {
        receipt.status = ReceiptStatus.DRAFT;
      }
    }

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

  @Post('receipts/reparse-merchants')
  @ApiOperation({ summary: 'Reparse merchant names for existing receipts' })
  async reparseMerchants(@CurrentUser() user: User, @Body() dto: ReparseMerchantsDto) {
    return this.merchantReparseService.reparseAll(user.id, {
      dryRun: dto.dryRun,
      limit: dto.limit,
    });
  }

  @Get('receipts/:id/thumbnail')
  @ApiOperation({ summary: 'Get receipt PDF thumbnail' })
  async getReceiptThumbnail(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('width') width: string | undefined,
    @Res() res: Response,
  ) {
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId: user.id },
    });

    if (!receipt) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Receipt not found' });
    }

    const normalizedWidth = Number.isFinite(Number(width)) ? Math.round(Number(width)) : 200;
    const thumbnailWidth = Math.min(1600, Math.max(80, normalizedWidth));
    const cacheVersion = receipt.updatedAt?.getTime?.() ?? 0;
    const cacheKey = `receipts:thumbnail:${id}:${cacheVersion}:${thumbnailWidth}`;
    const cached = await this.cacheManager.get<string>(cacheKey);

    if (cached) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      return res.send(Buffer.from(cached, 'base64'));
    }

    const pdfPath = (receipt.attachmentPaths || []).find(
      filePath => filePath.toLowerCase().endsWith('.pdf') && fs.existsSync(filePath),
    );

    if (!pdfPath) {
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'No PDF attachment found' });
    }

    let thumbnailPath: string | null = null;

    try {
      thumbnailPath = path.join('/tmp', `receipt-thumbnail-${id}-${Date.now()}.png`);
      const scriptPath = path.join(__dirname, '../../../scripts/generate-thumbnail.py');
      await execAsync(`python3 "${scriptPath}" "${pdfPath}" "${thumbnailPath}" ${thumbnailWidth}`);

      const thumbnailData = await fs.promises.readFile(thumbnailPath);
      await this.cacheManager.set(cacheKey, thumbnailData.toString('base64'), 604800);

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      return res.send(thumbnailData);
    } catch (error) {
      this.logger.error(`Thumbnail generation error for receipt ${id}:`, error);
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.setHeader('Retry-After', '60');
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        error: {
          code: 'THUMBNAIL_GENERATION_FAILED',
          message: 'Failed to generate thumbnail',
        },
      });
    } finally {
      if (thumbnailPath) {
        try {
          await fs.promises.unlink(thumbnailPath);
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }

  @Get('receipts/:id/file')
  @ApiOperation({ summary: 'Get receipt PDF file' })
  async getReceiptFile(@CurrentUser() user: User, @Param('id') id: string, @Res() res: Response) {
    const receipt = await this.receiptRepository.findOne({
      where: { id, userId: user.id },
    });

    if (!receipt) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Receipt not found' });
    }

    const pdfPath = (receipt.attachmentPaths || []).find(
      filePath => filePath.toLowerCase().endsWith('.pdf') && fs.existsSync(filePath),
    );

    if (!pdfPath) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'No PDF attachment found' });
    }

    try {
      const pdfBuffer = await fs.promises.readFile(pdfPath);
      const fileName = path.basename(pdfPath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Cache-Control', 'private, max-age=600');
      return res.send(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to read receipt PDF for ${id}:`, error);
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        error: {
          code: 'RECEIPT_FILE_UNAVAILABLE',
          message: 'Failed to load receipt file',
        },
      });
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
          const gmail = require('googleapis').google.gmail({
            version: 'v1',
            auth: client,
          });

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

  private parseBooleanQuery(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    const normalized = value.toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }

    return fallback;
  }

  private parseOptionalBooleanQuery(value: string | undefined): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return this.parseBooleanQuery(value, false);
  }

  private hasReceiptAmount(value: unknown): boolean {
    if (typeof value === 'number') {
      return Number.isFinite(value);
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized) {
        return false;
      }
      return Number.isFinite(Number(normalized));
    }

    return false;
  }
}
