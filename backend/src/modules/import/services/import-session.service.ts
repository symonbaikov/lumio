import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ImportSession,
  ImportSessionMetadata,
  ImportSessionMode,
  ImportSessionStatus,
} from '../../../entities/import-session.entity';
import { Statement } from '../../../entities/statement.entity';
import { Transaction } from '../../../entities/transaction.entity';
import { User } from '../../../entities/user.entity';
import { Workspace } from '../../../entities/workspace.entity';
import type {
  ImportCommittedEvent,
  ImportFailedEvent,
} from '../../notifications/events/notification-events';
import { ParsedTransaction } from '../../parsing/interfaces/parsed-statement.interface';
import {
  ConflictGroup,
  IntelligentDeduplicationService,
} from '../../parsing/services/intelligent-deduplication.service';
import { TransactionFingerprintService } from '../../transactions/services/transaction-fingerprint.service';
import { ImportConfigService } from '../config/import.config';
import {
  ImportConflictError,
  ImportFatalError,
  ImportTransientError,
  ImportValidationError,
  classifyError,
} from '../errors/import-errors';
import { ImportRetryService } from './import-retry.service';

/**
 * Result returned from processImport operation
 */
export interface ImportSessionResult {
  sessionId: string;
  status: ImportSessionStatus;
  summary: ImportSessionSummary;
}

/**
 * Summary of import session with detailed statistics
 */
export interface ImportSessionSummary {
  totalTransactions: number;
  newCount: number;
  matchedCount: number;
  skippedCount: number;
  conflictedCount: number;
  failedCount: number;
  conflicts: Array<{
    transactionIndex: number;
    reason: string;
    confidence: number;
  }>;
  warnings: string[];
  errors: string[];
}

/**
 * Conflict resolution map: transaction index -> action
 */
export type ConflictResolutionMap = Record<number, 'skip' | 'force_import' | 'mark_duplicate'>;

/**
 * Classification result for a single transaction
 */
interface TransactionClassification {
  transaction: ParsedTransaction;
  index: number;
  status: 'new' | 'matched' | 'conflicted' | 'skipped' | 'failed';
  fingerprint?: string;
  existingTransaction?: Transaction;
  conflict?: ConflictGroup;
  error?: string;
}

/**
 * Service for orchestrating the import workflow.
 * Handles session creation, preview/commit processing, conflict resolution, and session management.
 *
 * Workflow:
 * 1. Create session (createSession)
 * 2. Preview import (processImport with mode='preview')
 * 3. Resolve conflicts if needed (resolveConflicts)
 * 4. Commit import (processImport with mode='commit')
 */
@Injectable()
export class ImportSessionService {
  private readonly logger = new Logger(ImportSessionService.name);

  constructor(
    @InjectRepository(ImportSession)
    private readonly importSessionRepository: Repository<ImportSession>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly fingerprintService: TransactionFingerprintService,
    private readonly deduplicationService: IntelligentDeduplicationService,
    private readonly importConfigService: ImportConfigService,
    private readonly retryService: ImportRetryService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  private async resolveActorName(userId: string | null | undefined): Promise<string> {
    if (!userId) {
      return 'System';
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['name', 'email'],
    });

    return user?.name || user?.email || 'User';
  }

  /**
   * Create a new import session.
   * Validates workspace, user, and statement existence before creating the session.
   *
   * @param workspaceId Workspace ID
   * @param userId User ID initiating the import
   * @param statementId Statement ID (optional, for statement-based imports)
   * @param mode Import mode (preview or commit)
   * @param fileHash Hash of the file being imported (for idempotency)
   * @param fileName Original filename
   * @param fileSize File size in bytes (optional, defaults to 0 if not provided)
   * @returns Created import session
   * @throws ImportValidationError if workspace/user/statement not found
   */
  async createSession(
    workspaceId: string,
    userId: string,
    statementId: string | null,
    mode: ImportSessionMode,
    fileHash: string,
    fileName: string,
    fileSize?: number,
  ): Promise<ImportSession> {
    this.logger.log(
      `Creating import session: workspace=${workspaceId}, user=${userId}, mode=${mode}, file=${fileName}`,
    );

    // Validate workspace exists
    const workspace = await this.workspaceRepository.findOne({ where: { id: workspaceId } });
    if (!workspace) {
      throw new ImportValidationError(`Workspace not found: ${workspaceId}`, { workspaceId });
    }

    // Validate user exists (optional - user can be null for system imports)
    if (userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new ImportValidationError(`User not found: ${userId}`, { userId });
      }
    }

    // Validate statement exists if provided
    if (statementId) {
      const statement = await this.statementRepository.findOne({
        where: { id: statementId, workspaceId },
      });
      if (!statement) {
        throw new ImportValidationError(
          `Statement not found: ${statementId} in workspace ${workspaceId}`,
          { statementId, workspaceId },
        );
      }
    }

    // Check for existing session with same file hash (idempotency)
    const existingSession = await this.importSessionRepository.findOne({
      where: {
        workspaceId,
        fileHash,
      },
      order: { createdAt: 'DESC' },
    });

    if (existingSession && existingSession.status !== ImportSessionStatus.CANCELLED) {
      this.logger.warn(
        `Import session already exists for file hash ${fileHash}, returning existing session`,
      );
      return existingSession;
    }

    // Create new session
    const session = this.importSessionRepository.create({
      workspaceId,
      userId: userId || null,
      statementId: statementId || null,
      mode,
      fileHash,
      fileName,
      fileSize: fileSize ?? 0,
      status: ImportSessionStatus.PENDING,
      sessionMetadata: null,
    });

    const savedSession = await this.importSessionRepository.save(session);

    this.logger.log(`Created import session: ${savedSession.id}`);
    return savedSession;
  }

  /**
   * Process an import session.
   *
   * Preview mode:
   * - Generates fingerprints for all transactions
   * - Finds existing transactions by fingerprint
   * - Detects conflicts using tolerant matching
   * - Returns summary WITHOUT persisting any data
   * - Stores preview results in session metadata
   *
   * Commit mode:
   * - Uses previously stored preview results from session metadata
   * - Applies conflict resolutions
   * - Persists new transactions to database
   * - Marks duplicates (isDuplicate=true, duplicateOfId set)
   * - Updates session status to COMPLETED
   * - Returns final summary
   *
   * @param sessionId Import session ID
   * @param transactions Array of parsed transactions to import
   * @param mode Import mode (preview or commit)
   * @returns Import result with summary
   * @throws ImportValidationError if session not found or in invalid state
   * @throws ImportConflictError if conflicts detected in commit mode without resolutions
   * @throws ImportTransientError for retryable errors (database deadlock, etc.)
   * @throws ImportFatalError for non-retryable errors
   */
  async processImport(
    sessionId: string,
    transactions: ParsedTransaction[],
    mode: ImportSessionMode,
  ): Promise<ImportSessionResult> {
    this.logger.log(
      `Processing import session ${sessionId}: mode=${mode}, transactions=${transactions.length}`,
    );

    // Fetch and validate session
    const session = await this.importSessionRepository.findOne({
      where: { id: sessionId },
      relations: ['workspace', 'statement'],
    });

    if (!session) {
      throw new ImportValidationError(`Import session not found: ${sessionId}`, { sessionId });
    }

    // Validate session state
    if (mode === ImportSessionMode.COMMIT && session.status !== ImportSessionStatus.PREVIEW) {
      throw new ImportValidationError(
        `Cannot commit session in status ${session.status}. Must be in PREVIEW status first.`,
        { sessionId, currentStatus: session.status },
      );
    }

    try {
      // Update session status
      await this.importSessionRepository.update(
        { id: sessionId },
        { status: ImportSessionStatus.PROCESSING },
      );

      let result: ImportSessionResult;

      if (mode === ImportSessionMode.PREVIEW) {
        result = await this.processPreview(session, transactions);
      } else {
        result = await this.processCommit(session, transactions);
      }

      this.logger.log(
        `Import session ${sessionId} processed successfully: ${result.summary.newCount} new, ${result.summary.matchedCount} matched, ${result.summary.conflictedCount} conflicts`,
      );

      return result;
    } catch (error) {
      // Classify error and handle accordingly
      const classified = classifyError(error);

      this.logger.error(
        `Import session ${sessionId} failed: ${classified.message}`,
        classified.stack,
      );

      // Store error in session metadata
      const metadata = session.sessionMetadata || this.createEmptyMetadata();
      metadata.errors.push(`${classified.code}: ${classified.message}`);
      metadata.failedCount = transactions.length;

      await this.importSessionRepository.update(
        { id: sessionId },
        {
          status: ImportSessionStatus.FAILED,
          sessionMetadata: metadata,
        },
      );

      if (session.userId) {
        this.eventEmitter?.emit('import.failed', {
          workspaceId: session.workspaceId,
          userId: session.userId,
          statementId: session.statementId,
          statementName: session.statement?.fileName,
          errorMessage: classified.message,
        } satisfies ImportFailedEvent);
      }

      // Handle retryable errors
      if (this.retryService.shouldRetry(classified)) {
        const retryMetadata = this.retryService.getRetryMetadata(session);
        const attempt = retryMetadata?.retryCount || 0;

        if (this.retryService.canRetry(session)) {
          await this.retryService.scheduleRetry(sessionId, attempt);
          throw new ImportTransientError(
            `Import session ${sessionId} failed transiently and will be retried`,
            classified,
          );
        }
        await this.retryService.markAsPermanentlyFailed(sessionId, classified);
        throw new ImportFatalError(
          `Import session ${sessionId} exceeded maximum retry attempts`,
          classified,
        );
      }

      // Re-throw for controller to handle
      throw classified;
    }
  }

  /**
   * Process preview mode: classify transactions without persisting
   */
  private async processPreview(
    session: ImportSession,
    transactions: ParsedTransaction[],
  ): Promise<ImportSessionResult> {
    this.logger.debug(`Processing preview for session ${session.id}`);

    // Get statement account number if available
    const accountNumber = session.statement?.accountNumber || '';

    // Step 1: Generate fingerprints for all new transactions
    const classifications: TransactionClassification[] = [];
    const fingerprints: string[] = [];

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];

      try {
        const fingerprint = this.fingerprintService.generateFingerprint(
          {
            ...tx,
            workspaceId: session.workspaceId,
            amount: tx.debit || tx.credit || null,
            currency: tx.currency || session.statement?.currency || 'KZT',
          },
          accountNumber,
        );
        fingerprints.push(fingerprint);

        classifications.push({
          transaction: tx,
          index: i,
          status: 'new', // Will be updated in next steps
          fingerprint,
        });
      } catch (error) {
        this.logger.warn(`Failed to generate fingerprint for transaction ${i}: ${error.message}`);
        classifications.push({
          transaction: tx,
          index: i,
          status: 'failed',
          error: `Fingerprint generation failed: ${error.message}`,
        });
      }
    }

    // Step 2: Find existing transactions by fingerprint (exact matches)
    const existingTransactions = await this.fingerprintService.findByFingerprints(
      session.workspaceId,
      fingerprints.filter(f => !!f),
    );

    const existingByFingerprint = new Map<string, Transaction>();
    for (const existing of existingTransactions) {
      if (existing.fingerprint) {
        existingByFingerprint.set(existing.fingerprint, existing);
      }
    }

    // Step 3: Classify transactions as exact matches
    for (const classification of classifications) {
      if (classification.status === 'failed') continue;
      if (!classification.fingerprint) continue;

      const existing = existingByFingerprint.get(classification.fingerprint);
      if (existing) {
        classification.status = 'matched';
        classification.existingTransaction = existing;
      }
    }

    // Step 4: Detect conflicts using tolerant matching for non-matched transactions
    // Expand candidate set by date/amount windows instead of only exact fingerprints
    const unmatchedClassifications = classifications.filter(c => c.status === 'new');
    const unmatchedTransactions = unmatchedClassifications.map(c => c.transaction);

    const dateToleranceDays = this.importConfigService.getDedupDateToleranceDays();
    const amountTolerancePercent = this.importConfigService.getDedupAmountTolerancePercent();

    const transactionDates = transactions
      .map(tx => tx.transactionDate)
      .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()));

    const minDateValue =
      transactionDates.length > 0
        ? Math.min(...transactionDates.map(d => d.getTime()))
        : Date.now();
    const maxDateValue =
      transactionDates.length > 0
        ? Math.max(...transactionDates.map(d => d.getTime()))
        : Date.now();

    const minDate = new Date(minDateValue - dateToleranceDays * 24 * 60 * 60 * 1000);
    const maxDate = new Date(maxDateValue + dateToleranceDays * 24 * 60 * 60 * 1000);

    const amountRangesMap = new Map<string, { min: number; max: number }>();
    for (const tx of transactions) {
      const amount = (tx.debit ?? tx.credit ?? 0) as number;
      const tolerance = Math.abs(amount) * (amountTolerancePercent / 100);
      const minAmount = amount - tolerance;
      const maxAmount = amount + tolerance;
      const key = `${minAmount.toFixed(2)}:${maxAmount.toFixed(2)}`;
      if (!amountRangesMap.has(key)) {
        amountRangesMap.set(key, { min: minAmount, max: maxAmount });
      }
    }

    const candidateExisting = await this.fingerprintService.findCandidatesByWindow(
      session.workspaceId,
      { start: minDate, end: maxDate },
      Array.from(amountRangesMap.values()),
    );

    const conflicts = await this.deduplicationService.detectConflicts(
      unmatchedTransactions,
      candidateExisting,
    );

    // Map conflicts to classifications
    const conflictsByIndex = new Map<number, ConflictGroup>();
    for (const conflict of conflicts) {
      const index = unmatchedTransactions.indexOf(conflict.newTransaction);
      if (index >= 0) {
        const originalIndex = unmatchedClassifications[index].index;
        conflictsByIndex.set(originalIndex, conflict);
      }
    }

    for (const classification of classifications) {
      if (classification.status !== 'new') continue;

      const conflict = conflictsByIndex.get(classification.index);
      if (conflict) {
        classification.status = 'conflicted';
        classification.conflict = conflict;
        classification.existingTransaction = conflict.existingTransaction;
      }
    }

    // Step 5: Build summary
    const summary = this.buildSummary(classifications);

    // Step 6: Store preview results in session metadata
    const metadata: ImportSessionMetadata = {
      ...summary,
      // Store classifications for commit phase
      previewData: {
        classifications: classifications.map(c => ({
          index: c.index,
          status: c.status,
          fingerprint: c.fingerprint,
          existingTransactionId: c.existingTransaction?.id,
          conflictConfidence: c.conflict?.confidence,
          conflictMatchType: c.conflict?.matchType,
          conflictRecommendedAction: c.conflict?.recommendedAction,
          error: c.error,
        })),
      },
    } as any;

    await this.importSessionRepository.update(
      { id: session.id },
      {
        status: ImportSessionStatus.PREVIEW,
        sessionMetadata: metadata,
      },
    );

    return {
      sessionId: session.id,
      status: ImportSessionStatus.PREVIEW,
      summary,
    };
  }

  /**
   * Process commit mode: persist transactions based on preview results
   */
  private async processCommit(
    session: ImportSession,
    transactions: ParsedTransaction[],
  ): Promise<ImportSessionResult> {
    this.logger.debug(`Processing commit for session ${session.id}`);

    // Validate that preview data exists
    const metadata = session.sessionMetadata as any;
    if (!metadata?.previewData?.classifications) {
      throw new ImportValidationError(
        'Cannot commit without preview data. Run preview mode first.',
        { sessionId: session.id },
      );
    }

    // Retrieve preview classifications
    const previewClassifications = metadata.previewData.classifications;

    // Check for unresolved conflicts
    const unresolvedConflicts = previewClassifications.filter(
      (c: any) => c.status === 'conflicted' && !c.resolution,
    );

    if (unresolvedConflicts.length > 0) {
      throw new ImportConflictError(
        `Cannot commit with ${unresolvedConflicts.length} unresolved conflicts`,
        'unresolved_conflicts',
        {
          sessionId: session.id,
          conflictCount: unresolvedConflicts.length,
          conflicts: unresolvedConflicts.map((c: any) => c.index),
        },
      );
    }

    // Use database transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const accountNumber = session.statement?.accountNumber || '';
      const savedTransactions: Transaction[] = [];
      const classifications: TransactionClassification[] = [];
      const existingById = new Map<string, Transaction>();

      const loadExisting = async (id?: string | null): Promise<Transaction | undefined> => {
        if (!id) return undefined;
        if (existingById.has(id)) {
          return existingById.get(id);
        }
        const existing = await queryRunner.manager.findOne(Transaction, {
          where: { id },
        });
        if (existing) {
          existingById.set(id, existing);
        }
        return existing;
      };

      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        const previewData = previewClassifications[i];

        if (!previewData) {
          this.logger.warn(`No preview data for transaction ${i}, skipping`);
          classifications.push({
            transaction: tx,
            index: i,
            status: 'skipped',
            error: 'No preview data available',
          });
          continue;
        }

        // Handle based on preview status and resolution
        if (previewData.status === 'matched') {
          // Already exists, skip
          classifications.push({
            transaction: tx,
            index: i,
            status: 'matched',
            fingerprint: previewData.fingerprint,
          });
        } else if (previewData.status === 'conflicted') {
          // Apply resolution
          const resolution = previewData.resolution || 'skip';

          if (resolution === 'skip') {
            classifications.push({
              transaction: tx,
              index: i,
              status: 'skipped',
            });
          } else if (resolution === 'mark_duplicate') {
            // Save as duplicate
            const newTransaction = await this.createTransaction(
              tx,
              session,
              accountNumber,
              queryRunner,
            );
            const existing = await loadExisting(previewData.existingTransactionId);
            if (existing) {
              newTransaction.categoryId = existing.categoryId;
              newTransaction.branchId = existing.branchId;
              newTransaction.walletId = existing.walletId;
            }
            newTransaction.isDuplicate = true;
            newTransaction.duplicateOfId = previewData.existingTransactionId;
            newTransaction.duplicateConfidence = previewData.conflictConfidence || null;
            newTransaction.duplicateMatchType = previewData.conflictMatchType || null;

            const saved = await queryRunner.manager.save(newTransaction);
            savedTransactions.push(saved);

            classifications.push({
              transaction: tx,
              index: i,
              status: 'matched',
              fingerprint: previewData.fingerprint,
            });
          } else if (resolution === 'force_import') {
            // Import as new (ignore conflict)
            const newTransaction = await this.createTransaction(
              tx,
              session,
              accountNumber,
              queryRunner,
            );
            const existing = await loadExisting(previewData.existingTransactionId);
            if (existing) {
              newTransaction.categoryId = existing.categoryId;
              newTransaction.branchId = existing.branchId;
              newTransaction.walletId = existing.walletId;
            }
            const saved = await queryRunner.manager.save(newTransaction);
            savedTransactions.push(saved);

            classifications.push({
              transaction: tx,
              index: i,
              status: 'new',
              fingerprint: previewData.fingerprint,
            });
          }
        } else if (previewData.status === 'new') {
          // Save as new transaction
          const newTransaction = await this.createTransaction(
            tx,
            session,
            accountNumber,
            queryRunner,
          );
          const saved = await queryRunner.manager.save(newTransaction);
          savedTransactions.push(saved);

          classifications.push({
            transaction: tx,
            index: i,
            status: 'new',
            fingerprint: previewData.fingerprint,
          });
        } else {
          // Failed or skipped
          classifications.push({
            transaction: tx,
            index: i,
            status: previewData.status,
            error: previewData.error,
          });
        }
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(
        `Committed ${savedTransactions.length} transactions for session ${session.id}`,
      );

      // Build final summary
      const summary = this.buildSummary(classifications);

      // Update session with final metadata
      const finalMetadata: ImportSessionMetadata = {
        ...summary,
      };

      await this.importSessionRepository.update(
        { id: session.id },
        {
          status: ImportSessionStatus.COMPLETED,
          sessionMetadata: finalMetadata,
          completedAt: new Date(),
        },
      );

      if (session.userId) {
        this.eventEmitter?.emit('import.committed', {
          workspaceId: session.workspaceId,
          actorId: session.userId,
          actorName: await this.resolveActorName(session.userId),
          statementId: session.statementId || undefined,
          transactionCount: summary.newCount + summary.matchedCount,
        } satisfies ImportCommittedEvent);
      }

      return {
        sessionId: session.id,
        status: ImportSessionStatus.COMPLETED,
        summary,
      };
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create a Transaction entity from ParsedTransaction
   */
  private async createTransaction(
    parsed: ParsedTransaction,
    session: ImportSession,
    accountNumber: string,
    queryRunner: any,
  ): Promise<Transaction> {
    const fingerprint = this.fingerprintService.generateFingerprint(
      {
        ...parsed,
        workspaceId: session.workspaceId,
        amount: parsed.debit || parsed.credit || null,
        currency: parsed.currency || session.statement?.currency || 'KZT',
      },
      accountNumber,
    );

    // Determine transaction type
    const isIncome = (parsed.credit || 0) > 0;

    const transaction = queryRunner.manager.create(Transaction, {
      workspaceId: session.workspaceId,
      statementId: session.statementId,
      importSessionId: session.id,
      transactionDate: parsed.transactionDate,
      documentNumber: parsed.documentNumber || null,
      counterpartyName: parsed.counterpartyName,
      counterpartyBin: parsed.counterpartyBin || null,
      counterpartyAccount: parsed.counterpartyAccount || null,
      counterpartyBank: parsed.counterpartyBank || null,
      debit: parsed.debit || null,
      credit: parsed.credit || null,
      amount: parsed.debit || parsed.credit || null,
      currency: parsed.currency || 'KZT',
      exchangeRate: parsed.exchangeRate || null,
      amountForeign: parsed.amountForeign || null,
      paymentPurpose: parsed.paymentPurpose,
      transactionType: isIncome ? 'income' : 'expense',
      fingerprint,
      isDuplicate: false,
      isVerified: false,
    });

    return transaction;
  }

  /**
   * Build summary from classifications
   */
  private buildSummary(classifications: TransactionClassification[]): ImportSessionSummary {
    const summary: ImportSessionSummary = {
      totalTransactions: classifications.length,
      newCount: 0,
      matchedCount: 0,
      skippedCount: 0,
      conflictedCount: 0,
      failedCount: 0,
      conflicts: [],
      warnings: [],
      errors: [],
    };

    for (const classification of classifications) {
      switch (classification.status) {
        case 'new':
          summary.newCount++;
          break;
        case 'matched':
          summary.matchedCount++;
          break;
        case 'skipped':
          summary.skippedCount++;
          break;
        case 'conflicted':
          summary.conflictedCount++;
          summary.conflicts.push({
            transactionIndex: classification.index,
            reason: `Potential duplicate detected (${classification.conflict?.matchType})`,
            confidence: classification.conflict?.confidence || 0,
          });
          break;
        case 'failed':
          summary.failedCount++;
          if (classification.error) {
            summary.errors.push(`Transaction ${classification.index}: ${classification.error}`);
          }
          break;
      }
    }

    return summary;
  }

  /**
   * Get full import session entity.
   *
   * @param sessionId Import session ID
   * @returns Import session
   * @throws ImportValidationError if session not found
   */
  async getSession(sessionId: string): Promise<ImportSession> {
    const session = await this.importSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ImportValidationError(`Import session not found: ${sessionId}`, { sessionId });
    }

    return session;
  }

  /**
   * Get summary of an import session.
   * Returns the session metadata with counts and conflict details.
   *
   * @param sessionId Import session ID
   * @returns Session summary
   * @throws ImportValidationError if session not found
   */
  async getSessionSummary(sessionId: string): Promise<ImportSessionSummary> {
    this.logger.debug(`Getting summary for session ${sessionId}`);

    const session = await this.importSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ImportValidationError(`Import session not found: ${sessionId}`, { sessionId });
    }

    if (!session.sessionMetadata) {
      return this.createEmptyMetadata();
    }

    return {
      totalTransactions: session.sessionMetadata.totalTransactions,
      newCount: session.sessionMetadata.newCount,
      matchedCount: session.sessionMetadata.matchedCount,
      skippedCount: session.sessionMetadata.skippedCount,
      conflictedCount: session.sessionMetadata.conflictedCount,
      failedCount: session.sessionMetadata.failedCount,
      conflicts: session.sessionMetadata.conflicts,
      warnings: session.sessionMetadata.warnings,
      errors: session.sessionMetadata.errors,
    };
  }

  /**
   * Resolve conflicts for an import session.
   * Updates the session metadata with conflict resolutions for commit phase.
   *
   * @param sessionId Import session ID
   * @param resolutions Map of transaction index to resolution action
   * @throws ImportValidationError if session not found or not in preview state
   */
  async resolveConflicts(sessionId: string, resolutions: ConflictResolutionMap): Promise<void> {
    this.logger.log(`Resolving conflicts for session ${sessionId}`, resolutions);

    const session = await this.importSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ImportValidationError(`Import session not found: ${sessionId}`, { sessionId });
    }

    if (session.status !== ImportSessionStatus.PREVIEW) {
      throw new ImportValidationError(
        `Cannot resolve conflicts for session in status ${session.status}. Must be in PREVIEW status.`,
        { sessionId, currentStatus: session.status },
      );
    }

    const metadata = session.sessionMetadata as any;
    if (!metadata?.previewData?.classifications) {
      throw new ImportValidationError('No preview data found for session', { sessionId });
    }

    // Apply resolutions to preview data
    const classifications = metadata.previewData.classifications;
    let resolvedCount = 0;

    for (const [indexStr, action] of Object.entries(resolutions)) {
      const index = Number.parseInt(indexStr, 10);
      const classification = classifications.find((c: any) => c.index === index);

      if (!classification) {
        this.logger.warn(`No classification found for index ${index}, skipping`);
        continue;
      }

      if (classification.status !== 'conflicted') {
        this.logger.warn(
          `Transaction ${index} is not conflicted (status: ${classification.status}), skipping`,
        );
        continue;
      }

      classification.resolution = action;
      resolvedCount++;
    }

    // Update metadata
    await this.importSessionRepository.update(
      { id: sessionId },
      {
        sessionMetadata: metadata,
      },
    );

    this.logger.log(`Resolved ${resolvedCount} conflicts for session ${sessionId}`);
  }

  /**
   * Cancel an import session.
   * Marks the session as cancelled and prevents further processing.
   *
   * @param sessionId Import session ID
   * @throws ImportValidationError if session not found or already completed
   */
  async cancelSession(sessionId: string): Promise<void> {
    this.logger.log(`Cancelling session ${sessionId}`);

    const session = await this.importSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ImportValidationError(`Import session not found: ${sessionId}`, { sessionId });
    }

    if (session.status === ImportSessionStatus.COMPLETED) {
      throw new ImportValidationError('Cannot cancel a completed session', {
        sessionId,
        status: session.status,
      });
    }

    await this.importSessionRepository.update(
      { id: sessionId },
      {
        status: ImportSessionStatus.CANCELLED,
        completedAt: new Date(),
      },
    );

    this.logger.log(`Session ${sessionId} cancelled successfully`);
  }

  /**
   * Helper to create empty metadata structure
   */
  private createEmptyMetadata(): ImportSessionSummary {
    return {
      totalTransactions: 0,
      newCount: 0,
      matchedCount: 0,
      skippedCount: 0,
      conflictedCount: 0,
      failedCount: 0,
      conflicts: [],
      warnings: [],
      errors: [],
    };
  }
}
