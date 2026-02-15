import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import type { Repository } from 'typeorm';
import { FileStorageService } from '../../common/services/file-storage.service';
import { calculateFileHash } from '../../common/utils/file-hash.util';
import { getFileTypeFromMime } from '../../common/utils/file-validator.util';
import { normalizeFilename } from '../../common/utils/filename.util';
import { WorkspaceMember, WorkspaceRole } from '../../entities';
import { ActorType, AuditAction, EntityType, Severity } from '../../entities/audit-event.entity';
import {
  BankName,
  type FileType,
  Statement,
  StatementStatus,
} from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { AuditService } from '../audit/audit.service';
import type {
  DataDeletedEvent,
  StatementUploadedEvent,
} from '../notifications/events/notification-events';
import { StatementProcessingService } from '../parsing/services/statement-processing.service';
import type { UpdateStatementDto } from './dto/update-statement.dto';

const execAsync = promisify(exec);

@Injectable()
export class StatementsService {
  constructor(
    @InjectRepository(Statement)
    private statementRepository: Repository<Statement>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly fileStorageService: FileStorageService,
    private statementProcessingService: StatementProcessingService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly auditService: AuditService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  private async ensureCanEditStatements(userId: string, workspaceId: string): Promise<void> {
    if (!workspaceId) return;

    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
      select: ['role', 'permissions'],
    });

    if (!membership) return;
    if ([WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(membership.role)) return;

    if (membership.permissions?.canEditStatements === false) {
      throw new ForbiddenException('Недостаточно прав для редактирования выписок');
    }
  }

  private async ensureCanModify(
    statement: Statement,
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    await this.ensureCanEditStatements(userId, workspaceId);
    if (statement.userId === userId) {
      return;
    }
    if (workspaceId && statement.workspaceId === workspaceId) {
      const membership = await this.workspaceMemberRepository.findOne({
        where: { workspaceId, userId },
        select: ['role'],
      });
      if (membership && [WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(membership.role)) {
        return;
      }
    }
    throw new ForbiddenException('Недостаточно прав для изменения выписки');
  }

  async create(
    user: User,
    workspaceId: string,
    file: Express.Multer.File,
    googleSheetId?: string,
    walletId?: string,
    branchId?: string,
    allowDuplicates = false,
    requireManualCategorySelection = false,
  ): Promise<Statement> {
    await this.ensureCanEditStatements(user.id, workspaceId);
    const normalizedName = normalizeFilename(file.originalname);
    const fileHash = await calculateFileHash(file.path);

    // Check for exact file hash duplicate
    const hashDuplicate = await this.statementRepository.findOne({
      where: { workspaceId, fileHash },
    });

    if (hashDuplicate && !allowDuplicates) {
      throw new ConflictException({
        message: 'Такая выписка уже загружена (дубликат файла)',
        duplicateStatementId: hashDuplicate.id,
      });
    }

    // Check for near-duplicate (same name, size, within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentStatements = await this.statementRepository
      .createQueryBuilder('statement')
      .where('statement.workspaceId = :workspaceId', { workspaceId })
      .andWhere('statement.fileName = :fileName', { fileName: normalizedName })
      .andWhere('statement.fileSize = :fileSize', { fileSize: file.size })
      .andWhere('statement.createdAt >= :fiveMinutesAgo', { fiveMinutesAgo })
      .getMany();

    if (recentStatements.length > 0 && !allowDuplicates) {
      throw new ConflictException({
        message: 'Аналогичная выписка была недавно загружена',
        duplicateStatementId: recentStatements[0].id,
      });
    }
    // Calculate file hash
    let fileData: Buffer | null = null;
    try {
      fileData = await fs.promises.readFile(file.path);
    } catch (error) {
      console.warn(
        `[Statements] Failed to read uploaded file for DB storage: ${(error as Error)?.message}`,
      );
    }

    // Create new statement
    const statement = this.statementRepository.create({
      userId: user.id,
      workspaceId,
      googleSheetId: googleSheetId || null,
      fileName: normalizedName,
      filePath: file.path,
      fileType: getFileTypeFromMime(file.mimetype) as FileType,
      fileSize: file.size,
      fileHash,
      bankName: BankName.OTHER, // Will be determined during parsing
      status: StatementStatus.UPLOADED,
      parsingDetails: requireManualCategorySelection
        ? {
            manualCategorySelectionRequired: true,
          }
        : null,
    });

    const savedStatement = (await this.statementRepository.save(statement)) as unknown as Statement;
    let storedInDb = false;
    if (fileData) {
      try {
        await this.statementRepository.update(savedStatement.id, { fileData });
        storedInDb = true;
      } catch (error) {
        console.warn(
          `[Statements] Failed to persist uploaded file in DB: ${(error as Error)?.message}`,
        );
      }
    }

    // Keep disk copy even if stored in DB to allow previews without DB select issues

    // Audit: record statement import for traceability.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: user.id,
      actorLabel: user.email || user.name || 'User',
      entityType: EntityType.STATEMENT,
      entityId: savedStatement.id,
      action: AuditAction.IMPORT,
      diff: { before: null, after: savedStatement },
      meta: {
        fileName: file.originalname,
        fileSize: file.size,
      },
      severity: Severity.INFO,
      isUndoable: false,
    });

    this.eventEmitter?.emit('statement.uploaded', {
      workspaceId,
      actorId: user.id,
      actorName: user.name || user.email || 'User',
      statementId: savedStatement.id,
      statementName: savedStatement.fileName,
      bankName: savedStatement.bankName,
    } satisfies StatementUploadedEvent);

    // Start processing asynchronously
    Promise.resolve(this.statementProcessingService.processStatement(savedStatement.id)).catch(
      error => {
        console.error('Error processing statement:', error);
      },
    );

    return savedStatement;
  }

  async findAll(
    workspaceId: string,
    page = 1,
    limit = 20,
    search?: string,
    categoryId?: string,
  ): Promise<{
    data: Statement[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.statementRepository
      .createQueryBuilder('statement')
      .leftJoinAndSelect('statement.user', 'user')
      .where('statement.deletedAt IS NULL')
      .andWhere('statement.workspaceId = :workspaceId', { workspaceId })
      .orderBy('statement.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('statement.fileName ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (categoryId) {
      const categorySubQuery = this.transactionRepository
        .createQueryBuilder('transaction')
        .select('DISTINCT transaction.statementId')
        .where('transaction.workspaceId = :workspaceId', { workspaceId })
        .andWhere('transaction.statementId IS NOT NULL');

      if (categoryId === 'uncategorized') {
        categorySubQuery.andWhere('transaction.categoryId IS NULL');
      } else {
        categorySubQuery.andWhere('transaction.categoryId = :categoryId', { categoryId });
      }

      qb.andWhere(`statement.id IN (${categorySubQuery.getQuery()})`).setParameters(
        categorySubQuery.getParameters(),
      );
    }

    const [dataRaw, total] = await qb.getManyAndCount();
    const data = await Promise.all(
      dataRaw.map(async st => {
        const availability = await this.fileStorageService.getFileAvailability(st);
        (st as any).hasFileOnDisk = availability.onDisk;
        (st as any).hasFileInDb = availability.inDb;
        (st as any).fileAvailability = availability;
        return st;
      }),
    );

    return { data, total, page, limit };
  }

  async findOne(id: string, workspaceId: string): Promise<Statement> {
    if (typeof (this.statementRepository as any).createQueryBuilder !== 'function') {
      const statement = await this.statementRepository.findOne({
        where: { id, workspaceId },
        relations: ['transactions', 'googleSheet', 'user'],
      } as any);

      if (!statement) {
        throw new NotFoundException('Statement not found');
      }

      const availability = await this.fileStorageService.getFileAvailability(statement);
      (statement as any).hasFileOnDisk = availability.onDisk;
      (statement as any).hasFileInDb = availability.inDb;
      (statement as any).fileAvailability = availability;

      return statement as Statement;
    }

    const qb = this.statementRepository
      .createQueryBuilder('statement')
      .leftJoinAndSelect('statement.transactions', 'transactions')
      .leftJoinAndSelect('statement.googleSheet', 'googleSheet')
      .leftJoinAndSelect('statement.user', 'owner')
      .where('statement.id = :id', { id })
      .andWhere('statement.workspaceId = :workspaceId', { workspaceId });

    const statement = await qb.getOne();

    if (!statement) {
      throw new NotFoundException('Statement not found');
    }

    const availability = await this.fileStorageService.getFileAvailability(statement);
    (statement as any).hasFileOnDisk = availability.onDisk;
    (statement as any).hasFileInDb = availability.inDb;
    (statement as any).fileAvailability = availability;

    return statement as Statement;
  }

  async updateMetadata(
    id: string,
    userId: string,
    workspaceId: string,
    updateDto: UpdateStatementDto,
  ): Promise<Statement> {
    const statement = await this.findOne(id, workspaceId);
    await this.ensureCanModify(statement, userId, workspaceId);

    if (updateDto.balanceStart !== undefined) {
      statement.balanceStart =
        updateDto.balanceStart === null ? null : Number(updateDto.balanceStart);
    }

    if (updateDto.balanceEnd !== undefined) {
      statement.balanceEnd = updateDto.balanceEnd === null ? null : Number(updateDto.balanceEnd);
    }

    if (updateDto.statementDateFrom !== undefined) {
      statement.statementDateFrom = updateDto.statementDateFrom
        ? new Date(updateDto.statementDateFrom)
        : null;
    }

    if (updateDto.statementDateTo !== undefined) {
      statement.statementDateTo = updateDto.statementDateTo
        ? new Date(updateDto.statementDateTo)
        : null;
    }

    if (statement.parsingDetails) {
      statement.parsingDetails = {
        ...statement.parsingDetails,
        metadataExtracted: {
          ...(statement.parsingDetails.metadataExtracted || {}),
          balanceStart: statement.balanceStart ?? undefined,
          balanceEnd: statement.balanceEnd ?? undefined,
          dateFrom: statement.statementDateFrom
            ? statement.statementDateFrom.toISOString().split('T')[0]
            : undefined,
          dateTo: statement.statementDateTo
            ? statement.statementDateTo.toISOString().split('T')[0]
            : undefined,
        },
      };
    }

    return this.statementRepository.save(statement);
  }

  async moveToTrash(id: string, userId: string, workspaceId: string): Promise<Statement> {
    const statement = await this.findOne(id, workspaceId);
    await this.ensureCanModify(statement, userId, workspaceId);

    // Mark as deleted (soft delete)
    const beforeState = { ...statement };
    statement.deletedAt = new Date();
    await this.statementRepository.save(statement);

    // Audit: record statement deletion with before snapshot.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.STATEMENT,
      entityId: statement.id,
      action: AuditAction.DELETE,
      diff: { before: beforeState, after: null },
      meta: {
        fileName: statement.fileName,
        source: 'trash',
      },
      isUndoable: true,
    });

    this.eventEmitter?.emit('data.deleted', {
      workspaceId,
      actorId: userId,
      actorName: statement.user?.name || statement.user?.email || 'User',
      entityType: 'statement',
      entityLabel: statement.fileName,
      count: 1,
    } satisfies DataDeletedEvent);

    return statement;
  }

  async permanentDelete(id: string, userId: string, workspaceId: string): Promise<void> {
    const statement = await this.statementRepository.findOne({
      where: { id, workspaceId },
      relations: ['user'],
    });

    if (!statement) {
      throw new NotFoundException('Statement not found');
    }

    await this.ensureCanModify(statement, userId, workspaceId);

    // Audit: record statement rollback for restore operations.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.STATEMENT,
      entityId: statement.id,
      action: AuditAction.DELETE,
      diff: { before: { ...statement }, after: null },
      meta: {
        fileName: statement.fileName,
        source: 'permanent',
      },
      isUndoable: true,
    });

    this.eventEmitter?.emit('data.deleted', {
      workspaceId,
      actorId: userId,
      actorName: statement.user?.name || statement.user?.email || 'User',
      entityType: 'statement',
      entityLabel: statement.fileName,
      count: 1,
    } satisfies DataDeletedEvent);

    // Delete all related transactions first
    await this.transactionRepository.delete({ statementId: id });

    // Delete file from filesystem
    if (fs.existsSync(statement.filePath)) {
      try {
        fs.unlinkSync(statement.filePath);
      } catch (error) {
        console.error(`Failed to delete file ${statement.filePath}:`, error);
        // Continue with statement deletion even if file deletion fails
      }
    }

    // Finally delete the statement
    await this.statementRepository.remove(statement);

    // Invalidate thumbnail cache
    await this.cacheManager.del(`statements:thumbnail:${id}`);
  }

  async remove(id: string, userId: string, workspaceId: string): Promise<void> {
    // For backward compatibility, remove now does soft delete
    await this.moveToTrash(id, userId, workspaceId);
  }

  async reprocess(
    id: string,
    userId: string,
    workspaceId: string,
    mode: 'merge' | 'replace' = 'merge',
  ): Promise<Statement> {
    const statement = await this.findOne(id, workspaceId);
    await this.ensureCanModify(statement, userId, workspaceId);

    if (statement.status === StatementStatus.PROCESSING) {
      return statement;
    }

    if (mode === 'replace') {
      // Full delete mode - clear all transactions
      await this.transactionRepository.delete({ statementId: statement.id });
    } else {
      // Merge mode - keep user-modified transactions, soft-delete others
      const existingTransactions = await this.transactionRepository.find({
        where: { statementId: statement.id },
      });

      // Identify user-modified transactions (where updatedAt > createdAt + 1 second)
      const userModified: string[] = [];
      const toDelete: string[] = [];

      for (const tx of existingTransactions) {
        const timeDiff = tx.updatedAt.getTime() - tx.createdAt.getTime();
        if (timeDiff > 1000) {
          // Modified more than 1 second after creation
          userModified.push(tx.id);
        } else {
          toDelete.push(tx.id);
        }
      }

      // Soft-delete non-modified transactions
      if (toDelete.length > 0) {
        await this.transactionRepository.delete(toDelete);
      }

      console.log(
        `[Reprocess Merge] Keeping ${userModified.length} user-modified transactions, deleting ${toDelete.length}`,
      );
    }

    statement.status = StatementStatus.UPLOADED;
    statement.errorMessage = null;
    statement.processedAt = null;
    statement.totalTransactions = 0;
    statement.totalDebit = 0;
    statement.totalCredit = 0;
    statement.categoryId = null;
    statement.parsingDetails = null;
    await this.statementRepository.save(statement);

    // Start processing asynchronously
    this.statementProcessingService.processStatement(statement.id).catch(error => {
      console.error('Error reprocessing statement:', error);
    });

    return statement;
  }

  async commitImport(id: string, userId: string, workspaceId: string): Promise<Statement> {
    const statement = await this.findOne(id, workspaceId);
    await this.ensureCanModify(statement, userId, workspaceId);
    return this.statementProcessingService.commitImport(statement.id);
  }

  async getFileStream(
    id: string,
    workspaceId: string,
  ): Promise<{
    stream: NodeJS.ReadableStream;
    fileName: string;
    mimeType: string;
  }> {
    const statement = await this.findOne(id, workspaceId);
    const { stream, fileName, mimeType } =
      await this.fileStorageService.getStatementFileStream(statement);
    return { stream, fileName, mimeType };
  }

  async restoreFile(id: string, userId: string, workspaceId: string) {
    const statement = await this.statementRepository.findOne({
      where: { id, workspaceId },
      relations: ['user'],
    });

    if (!statement) {
      throw new NotFoundException('Statement not found');
    }

    await this.ensureCanModify(statement, userId, workspaceId);

    // If the file is in trash, restore it from trash
    if (statement.deletedAt) {
      statement.deletedAt = null;
      await this.statementRepository.save(statement);

      // Audit: record permanent removal (used for hard delete flow).
      await this.auditService.createEvent({
        workspaceId,
        actorType: ActorType.USER,
        actorId: userId,
        entityType: EntityType.STATEMENT,
        entityId: statement.id,
        action: AuditAction.ROLLBACK,
        diff: { before: null, after: statement },
        meta: {
          source: 'trash_restore',
        },
        severity: Severity.INFO,
        isUndoable: false,
      });

      return { status: 'restored', source: 'trash' };
    }

    // Otherwise, restore file from database if it's missing from disk
    const restored = await this.fileStorageService.restoreFile(statement);
    if (!restored) {
      throw new NotFoundException('File data is unavailable for restore');
    }
    return { status: 'restored', source: restored.source };
  }

  async getThumbnail(id: string, workspaceId: string): Promise<Buffer> {
    const statement = await this.findOne(id, workspaceId);

    const cacheKey = `statements:thumbnail:${id}`;
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) {
      return Buffer.from(cached, 'base64');
    }

    // Check if file is PDF
    if (statement.fileType !== 'pdf' && !statement.fileName.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Thumbnails are only available for PDF files');
    }

    // Determine source file path
    let pdfPath: string | null = null;
    let tempPdfPath: string | null = null;

    if (statement.filePath && fs.existsSync(statement.filePath)) {
      // Use existing file on disk
      pdfPath = statement.filePath;
    } else if (statement.fileData) {
      // Write data to temporary file
      tempPdfPath = path.join('/tmp', `temp-${statement.id}-${Date.now()}.pdf`);
      await fs.promises.writeFile(tempPdfPath, statement.fileData);
      pdfPath = tempPdfPath;
    }

    if (!pdfPath) {
      throw new NotFoundException('File data not available');
    }

    try {
      // Generate thumbnail using Python script
      const thumbnailPath = path.join('/tmp', `thumbnail-${statement.id}-${Date.now()}.png`);
      const scriptPath = path.join(__dirname, '../../../scripts/generate-thumbnail.py');
      const width = 200; // Thumbnail width in pixels

      // Execute Python script
      await execAsync(`python3 "${scriptPath}" "${pdfPath}" "${thumbnailPath}" ${width}`);

      // Read generated thumbnail
      const thumbnailData = await fs.promises.readFile(thumbnailPath);

      // Cache the thumbnail (1 week)
      await this.cacheManager.set(cacheKey, thumbnailData.toString('base64'), 604800);

      // Clean up temporary files
      try {
        await fs.promises.unlink(thumbnailPath);
        if (tempPdfPath) {
          await fs.promises.unlink(tempPdfPath);
        }
      } catch (cleanupError) {
        console.warn('Error cleaning up temporary files:', cleanupError);
      }

      return thumbnailData;
    } catch (error) {
      // Clean up temp PDF if it was created
      if (tempPdfPath) {
        try {
          await fs.promises.unlink(tempPdfPath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }

      console.error('Error generating thumbnail:', error);
      throw new BadRequestException('Failed to generate thumbnail');
    }
  }
}
