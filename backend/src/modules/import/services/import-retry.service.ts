import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportSession, ImportSessionStatus } from '../../../entities/import-session.entity';
import { ImportConfigService } from '../config/import.config';
import {
  ImportConflictError,
  ImportFatalError,
  ImportTransientError,
  ImportValidationError,
  classifyError,
  isImportError,
} from '../errors/import-errors';

/**
 * Extended metadata for retry tracking
 */
interface RetryMetadata {
  retryCount: number;
  lastRetryAt: string | null;
  nextRetryAt: string | null;
  lastError: {
    message: string;
    code: string;
    timestamp: string;
  } | null;
  retryHistory: Array<{
    attempt: number;
    timestamp: string;
    error: string;
  }>;
}

/**
 * Service for handling retry logic for failed import sessions
 * Implements exponential backoff strategy with configurable limits
 */
@Injectable()
export class ImportRetryService {
  private readonly logger = new Logger(ImportRetryService.name);

  constructor(
    @InjectRepository(ImportSession)
    private readonly importSessionRepository: Repository<ImportSession>,
    private readonly configService: ImportConfigService,
  ) {}

  /**
   * Schedule a retry for a failed import session
   * Updates session metadata with retry information and next retry timestamp
   *
   * @param sessionId - The import session to schedule for retry
   * @param attempt - Current retry attempt (0-indexed)
   * @param maxAttempts - Maximum retry attempts (defaults to config value)
   * @returns Promise that resolves when retry is scheduled
   * @throws NotFoundException if session doesn't exist
   * @throws ImportValidationError if max retries exceeded
   */
  async scheduleRetry(sessionId: string, attempt: number, maxAttempts?: number): Promise<void> {
    const maxRetries = maxAttempts ?? this.configService.getMaxRetries();

    // Validate attempt number
    if (attempt < 0) {
      throw new ImportValidationError('Retry attempt must be non-negative', { attempt });
    }

    if (attempt >= maxRetries) {
      throw new ImportValidationError(`Maximum retry attempts (${maxRetries}) exceeded`, {
        attempt,
        maxRetries,
      });
    }

    // Fetch session
    const session = await this.importSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Import session with ID ${sessionId} not found`);
    }

    // Calculate next retry time
    const backoffMs = this.configService.calculateRetryBackoff(attempt);
    const nextRetryAt = new Date(Date.now() + backoffMs);

    // Get or initialize retry metadata
    const existingMetadata = session.sessionMetadata || {
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

    const retryMetadata: RetryMetadata = {
      retryCount: attempt + 1,
      lastRetryAt: new Date().toISOString(),
      nextRetryAt: nextRetryAt.toISOString(),
      lastError: existingMetadata.errors?.[0]
        ? {
            message: existingMetadata.errors[0],
            code: 'UNKNOWN',
            timestamp: new Date().toISOString(),
          }
        : null,
      retryHistory: [
        ...(((existingMetadata as any).retryHistory as RetryMetadata['retryHistory']) || []),
        {
          attempt: attempt + 1,
          timestamp: new Date().toISOString(),
          error: existingMetadata.errors?.[0] || 'Unknown error',
        },
      ],
    };

    // Update session with retry metadata
    await this.importSessionRepository.update(
      { id: sessionId },
      {
        sessionMetadata: {
          ...existingMetadata,
          ...retryMetadata,
        } as any,
      },
    );

    this.logger.log(
      `Scheduled retry for session ${sessionId}: attempt ${attempt + 1}/${maxRetries}, next retry at ${nextRetryAt.toISOString()}`,
    );
  }

  /**
   * Execute a retry for an import session
   * This method should be called by a scheduler/cron or manually by admin
   *
   * @param sessionId - The import session to retry
   * @returns Promise that resolves to the updated import session
   * @throws NotFoundException if session doesn't exist
   * @throws ImportValidationError if session is not in failed state or retry is not scheduled
   */
  async executeRetry(sessionId: string): Promise<ImportSession> {
    const session = await this.importSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Import session with ID ${sessionId} not found`);
    }

    // Validate session state
    if (session.status !== ImportSessionStatus.FAILED) {
      throw new ImportValidationError(
        `Cannot retry session in status ${session.status}. Only failed sessions can be retried.`,
        {
          sessionId,
          currentStatus: session.status,
        },
      );
    }

    const metadata = session.sessionMetadata as any;
    const nextRetryAt = metadata?.nextRetryAt;

    if (!nextRetryAt) {
      throw new ImportValidationError('No retry scheduled for this session', {
        sessionId,
      });
    }

    // Check if it's time to retry
    const now = new Date();
    const scheduledTime = new Date(nextRetryAt);

    if (now < scheduledTime) {
      const waitTimeMs = scheduledTime.getTime() - now.getTime();
      throw new ImportValidationError(
        `Retry is scheduled for ${scheduledTime.toISOString()}. Please wait ${Math.ceil(waitTimeMs / 1000)} seconds.`,
        {
          sessionId,
          nextRetryAt: scheduledTime.toISOString(),
          waitTimeMs,
        },
      );
    }

    // Reset session to pending status for retry
    await this.importSessionRepository.update(
      { id: sessionId },
      {
        status: ImportSessionStatus.PENDING,
        sessionMetadata: {
          ...session.sessionMetadata,
          nextRetryAt: null,
        } as any,
      },
    );

    const updatedSession = await this.importSessionRepository.findOne({
      where: { id: sessionId },
    });

    this.logger.log(`Executing retry for session ${sessionId}`);

    return updatedSession!;
  }

  /**
   * Determine if an error should trigger a retry
   * Returns true for transient errors, false for validation/conflict/fatal errors
   *
   * @param error - The error to classify
   * @returns true if error is retryable (transient), false otherwise
   */
  shouldRetry(error: unknown): boolean {
    try {
      const classified = classifyError(error);

      // Only retry transient errors
      if (classified instanceof ImportTransientError) {
        this.logger.debug(`Error is retryable (transient): ${classified.message}`);
        return true;
      }

      // Log why we're not retrying
      if (classified instanceof ImportValidationError) {
        this.logger.debug(`Error is not retryable (validation error): ${classified.message}`);
      } else if (classified instanceof ImportConflictError) {
        this.logger.debug(`Error is not retryable (conflict error): ${classified.message}`);
      } else if (classified instanceof ImportFatalError) {
        this.logger.debug(`Error is not retryable (fatal error): ${classified.message}`);
      }

      return false;
    } catch (classificationError) {
      // If we can't classify the error, be conservative and don't retry
      this.logger.error(`Failed to classify error for retry decision: ${classificationError}`);
      return false;
    }
  }

  /**
   * Get retry metadata for a session
   * Helper method to extract retry information from session metadata
   *
   * @param session - The import session
   * @returns Retry metadata or null if no retry info exists
   */
  getRetryMetadata(session: ImportSession): RetryMetadata | null {
    const metadata = session.sessionMetadata as any;
    if (!metadata?.retryCount) {
      return null;
    }

    return {
      retryCount: metadata.retryCount || 0,
      lastRetryAt: metadata.lastRetryAt || null,
      nextRetryAt: metadata.nextRetryAt || null,
      lastError: metadata.lastError || null,
      retryHistory: metadata.retryHistory || [],
    };
  }

  /**
   * Check if a session has retry attempts remaining
   *
   * @param session - The import session
   * @param maxAttempts - Maximum retry attempts (defaults to config value)
   * @returns true if session can be retried, false otherwise
   */
  canRetry(session: ImportSession, maxAttempts?: number): boolean {
    const maxRetries = maxAttempts ?? this.configService.getMaxRetries();
    const retryMetadata = this.getRetryMetadata(session);

    if (!retryMetadata) {
      // No retries yet, so can retry
      return true;
    }

    return retryMetadata.retryCount < maxRetries;
  }

  /**
   * Mark a session as permanently failed (no more retries)
   * Updates session with final error information
   *
   * @param sessionId - The import session to mark as failed
   * @param error - The final error
   */
  async markAsPermanentlyFailed(sessionId: string, error: unknown): Promise<void> {
    const classified = isImportError(error) ? error : classifyError(error);

    const session = await this.importSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Import session with ID ${sessionId} not found`);
    }

    const existingMetadata = session.sessionMetadata || {
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

    await this.importSessionRepository.update(
      { id: sessionId },
      {
        status: ImportSessionStatus.FAILED,
        sessionMetadata: {
          ...existingMetadata,
          errors: [
            ...(existingMetadata.errors || []),
            `Permanently failed: ${classified.message} (${classified.code})`,
          ],
          nextRetryAt: null,
        } as any,
      },
    );

    this.logger.warn(`Session ${sessionId} marked as permanently failed: ${classified.message}`);
  }
}
