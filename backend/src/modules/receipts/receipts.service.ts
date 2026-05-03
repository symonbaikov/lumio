import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Receipt,
  ReceiptJobStatus,
  ReceiptProcessingJob,
  Statement,
  ReceiptSource,
  ReceiptStatus,
  Transaction,
  TransactionType,
} from '../../entities';
import { normalizePagination } from '../../common/utils/pagination.util';
import { ReceiptQueryDto } from './dto/receipt-query.dto';
import { ReceiptProcessorService } from './services/receipt-processor.service';
import { ReceiptApprovedEvent } from '../notifications/events/notification-events';

type UploadParams = {
  userId: string;
  workspaceId: string;
  files: Express.Multer.File[];
  language?: string;
};

type ScanParams = {
  userId: string;
  workspaceId: string;
  file: Express.Multer.File;
  language?: string;
};

const MANUAL_RECEIPT_WORKER_ID = 'manual-receipt-sync';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(ReceiptProcessingJob)
    private readonly jobRepository: Repository<ReceiptProcessingJob>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    private readonly receiptProcessor: ReceiptProcessorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createFromUpload(params: UploadParams): Promise<Receipt> {
    const [file] = params.files;
    const receipt = this.buildReceipt({
      userId: params.userId,
      workspaceId: params.workspaceId,
      source: ReceiptSource.UPLOAD,
      file,
      language: params.language,
    });

    const savedReceipt = await this.receiptRepository.save(receipt);
    const job = await this.createManualJob(savedReceipt.id, params.userId, 'manual-upload', params.language);
    await this.receiptProcessor.processReceipt(job);

    return (
      (await this.receiptRepository.findOne({
        where: { id: savedReceipt.id, workspaceId: params.workspaceId },
      })) ?? savedReceipt
    );
  }

  async createFromScan(params: ScanParams): Promise<Receipt> {
    const receipt = this.buildReceipt({
      userId: params.userId,
      workspaceId: params.workspaceId,
      source: ReceiptSource.SCAN,
      file: params.file,
      language: params.language,
    });

    const savedReceipt = await this.receiptRepository.save(receipt);
    const job = await this.createManualJob(savedReceipt.id, params.userId, 'manual-scan', params.language);
    await this.receiptProcessor.processReceipt(job);

    return (
      (await this.receiptRepository.findOne({
        where: { id: savedReceipt.id, workspaceId: params.workspaceId },
      })) ?? savedReceipt
    );
  }

  async findAll(workspaceId: string, query: ReceiptQueryDto) {
    const { page, limit, skip } = normalizePagination(query);
    const where: Record<string, unknown> = { workspaceId };

    if (query.source) {
      where.source = query.source;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await this.receiptRepository.findAndCount({
      where,
      order: { receivedAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string, workspaceId: string): Promise<Receipt | null> {
    return this.receiptRepository.findOne({ where: { id, workspaceId } });
  }

  async update(
    id: string,
    workspaceId: string,
    dto: {
      status?: ReceiptStatus;
      parsedData?: Record<string, unknown>;
      statementId?: string | null;
    },
  ) {
    const receipt = await this.receiptRepository.findOne({ where: { id, workspaceId } });
    if (!receipt) {
      return null;
    }

    if (dto.status) {
      receipt.status = dto.status;
    }

    if (dto.parsedData) {
      receipt.parsedData = {
        ...(receipt.parsedData ?? {}),
        ...dto.parsedData,
      };
    }

    if (dto.statementId !== undefined) {
      receipt.statementId = dto.statementId;
    }

    return this.receiptRepository.save(receipt);
  }

  async approve(id: string, workspaceId: string) {
    const receipt = await this.receiptRepository.findOne({ where: { id, workspaceId } });
    if (!receipt) {
      return null;
    }

    const savedTransaction = await this.createTransactionFromReceipt(receipt, workspaceId);
    receipt.status = ReceiptStatus.APPROVED;
    receipt.transactionId = savedTransaction.id;
    const savedReceipt = await this.receiptRepository.save(receipt);

    this.eventEmitter
      .emitAsync('receipt.approved', {
        workspaceId: savedReceipt.workspaceId,
        receiptId: savedReceipt.id,
        transactionId: savedTransaction.id,
      } satisfies ReceiptApprovedEvent)
      .catch((err) => this.logger.error('Failed to emit receipt.approved event', err));

    return {
      receipt: savedReceipt,
      transaction: savedTransaction,
    };
  }

  async bulkApprove(receiptIds: string[], workspaceId: string, categoryId?: string) {
    const results = {
      approved: 0,
      failed: 0,
      errors: [] as Array<{ receiptId: string; error: string }>,
    };

    for (const receiptId of receiptIds) {
      try {
        const receipt = await this.receiptRepository.findOne({ where: { id: receiptId, workspaceId } });

        if (!receipt) {
          results.failed += 1;
          results.errors.push({ receiptId, error: 'Receipt not found' });
          continue;
        }

        if (!receipt.parsedData?.amount || !receipt.parsedData?.date) {
          results.failed += 1;
          results.errors.push({ receiptId, error: 'Missing required data' });
          continue;
        }

        const savedTransaction = await this.createTransactionFromReceipt(receipt, workspaceId, categoryId);
        receipt.status = ReceiptStatus.APPROVED;
        receipt.transactionId = savedTransaction.id;
        const savedReceipt = await this.receiptRepository.save(receipt);
        this.eventEmitter
          .emitAsync('receipt.approved', {
            workspaceId: receipt.workspaceId,
            receiptId: savedReceipt.id,
            transactionId: savedTransaction.id,
          } satisfies ReceiptApprovedEvent)
          .catch((err) => this.logger.error('Failed to emit receipt.approved event', err));
        results.approved += 1;
      } catch (error) {
        results.failed += 1;
        results.errors.push({
          receiptId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  async delete(id: string, workspaceId: string) {
    const receipt = await this.receiptRepository.findOne({ where: { id, workspaceId } });

    if (receipt?.statementId) {
      const statement = await this.statementRepository.findOne({
        where: { id: receipt.statementId, workspaceId },
      });

      if (statement && !statement.deletedAt) {
        statement.deletedAt = new Date();
        await this.statementRepository.save(statement);
      }
    }

    for (const attachmentPath of receipt?.attachmentPaths ?? []) {
      try {
        await fs.unlink(attachmentPath);
      } catch {
        // Best-effort cleanup: missing or already-removed files should not block deletion.
      }
    }

    await this.receiptRepository.delete({ id, workspaceId });
    return { success: true };
  }

  async getFilePayload(id: string, workspaceId: string) {
    const receipt = await this.receiptRepository.findOne({ where: { id, workspaceId } });
    if (!receipt) {
      return null;
    }

    const attachment = receipt.metadata?.attachments?.[0];
    const filePath = receipt.attachmentPaths?.[0];

    if (!attachment || !filePath) {
      return null;
    }

    const buffer = await fs.readFile(filePath);

    return {
      buffer,
      fileName: attachment.filename || receipt.subject,
      mimeType: attachment.mimeType || 'application/octet-stream',
    };
  }

  private async createManualJob(
    receiptId: string,
    userId: string,
    integrationId: 'manual-upload' | 'manual-scan',
    language?: string,
  ): Promise<ReceiptProcessingJob> {
    const job = this.jobRepository.create({
      userId,
      receiptId,
      status: ReceiptJobStatus.PROCESSING,
      progress: 0,
      lockedAt: new Date(),
      lockedBy: MANUAL_RECEIPT_WORKER_ID,
      payload: {
        integrationId,
        gmailMessageId: receiptId,
        historyId: language ?? 'auto',
      },
    });

    return this.jobRepository.save(job);
  }

  private buildReceipt(params: {
    userId: string;
    workspaceId: string;
    source: ReceiptSource;
    file: Express.Multer.File;
    language?: string;
  }): Receipt {
    return this.receiptRepository.create({
      userId: params.userId,
      workspaceId: params.workspaceId,
      source: params.source,
      gmailMessageId: null,
      gmailThreadId: null,
      subject: params.file.originalname,
      sender: params.source === ReceiptSource.SCAN ? 'camera-scan' : 'manual-upload',
      receivedAt: new Date(),
      status: ReceiptStatus.NEW,
      attachmentPaths: [params.file.path],
      metadata: {
        attachments: [
          {
            id: params.file.filename,
            filename: params.file.originalname,
            mimeType: params.file.mimetype,
            size: params.file.size,
          },
        ],
      },
      language: params.language && params.language !== 'auto' ? params.language : null,
      extractionMethod: null,
      confidence: null,
      isDuplicate: false,
    });
  }

  private async createTransactionFromReceipt(
    receipt: Receipt,
    workspaceId: string,
    categoryId?: string,
  ) {
    const transactionType =
      receipt.parsedData?.transactionType === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE;

    const transaction = this.transactionRepository.create({
      statementId: null,
      workspaceId,
      transactionDate: receipt.parsedData?.date ? new Date(receipt.parsedData.date) : new Date(),
      counterpartyName: receipt.parsedData?.vendor || receipt.subject || 'Unknown',
      paymentPurpose: receipt.parsedData?.vendor || receipt.subject || '',
      amount: receipt.parsedData?.amount ?? null,
      currency: receipt.parsedData?.currency || 'KZT',
      categoryId: categoryId ?? (receipt.parsedData?.categoryId || null),
      transactionType,
    });

    return this.transactionRepository.save(transaction);
  }
}
