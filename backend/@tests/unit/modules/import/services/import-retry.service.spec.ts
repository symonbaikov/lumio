import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ImportSession,
  ImportSessionMode,
  ImportSessionStatus,
} from '../../../../../src/entities/import-session.entity';
import { ImportConfigService } from '../../../../../src/modules/import/config/import.config';
import {
  ImportConflictError,
  ImportFatalError,
  ImportTransientError,
  ImportValidationError,
} from '../../../../../src/modules/import/errors/import-errors';
import { ImportRetryService } from '../../../../../src/modules/import/services/import-retry.service';

describe('ImportRetryService', () => {
  let service: ImportRetryService;
  let repository: jest.Mocked<Repository<ImportSession>>;
  let configService: jest.Mocked<ImportConfigService>;

  const mockSession: ImportSession = {
    id: 'session-123',
    workspaceId: 'workspace-1',
    workspace: null as any,
    userId: 'user-1',
    user: null,
    statementId: null,
    statement: null,
    status: ImportSessionStatus.FAILED,
    mode: ImportSessionMode.PREVIEW,
    fileHash: 'hash123',
    fileName: 'test.csv',
    fileSize: 1024,
    sessionMetadata: {
      totalTransactions: 10,
      newCount: 5,
      matchedCount: 3,
      skippedCount: 1,
      conflictedCount: 1,
      failedCount: 0,
      conflicts: [],
      warnings: [],
      errors: ['Test error'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockConfigService = {
      getMaxRetries: jest.fn().mockReturnValue(3),
      getRetryBackoffBaseMs: jest.fn().mockReturnValue(30000),
      calculateRetryBackoff: jest.fn((attempt: number) => 30000 * 2 ** attempt),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportRetryService,
        {
          provide: getRepositoryToken(ImportSession),
          useValue: mockRepository,
        },
        {
          provide: ImportConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ImportRetryService>(ImportRetryService);
    repository = module.get(getRepositoryToken(ImportSession));
    configService = module.get(ImportConfigService);
  });

  describe('scheduleRetry', () => {
    it('should schedule retry with correct metadata for attempt 0', async () => {
      repository.findOne.mockResolvedValue({ ...mockSession });

      await service.scheduleRetry('session-123', 0);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'session-123' },
      });

      expect(repository.update).toHaveBeenCalledWith(
        { id: 'session-123' },
        expect.objectContaining({
          sessionMetadata: expect.objectContaining({
            retryCount: 1,
            lastRetryAt: expect.any(String),
            nextRetryAt: expect.any(String),
            retryHistory: expect.arrayContaining([
              expect.objectContaining({
                attempt: 1,
                timestamp: expect.any(String),
                error: 'Test error',
              }),
            ]),
          }),
        }),
      );

      // Verify backoff calculation
      expect(configService.calculateRetryBackoff).toHaveBeenCalledWith(0);
    });

    it('should schedule retry with exponential backoff', async () => {
      repository.findOne.mockResolvedValue({ ...mockSession });

      // Attempt 0: 30s backoff
      await service.scheduleRetry('session-123', 0);
      expect(configService.calculateRetryBackoff).toHaveBeenCalledWith(0);

      // Attempt 1: 60s backoff
      await service.scheduleRetry('session-123', 1);
      expect(configService.calculateRetryBackoff).toHaveBeenCalledWith(1);

      // Attempt 2: 120s backoff
      await service.scheduleRetry('session-123', 2);
      expect(configService.calculateRetryBackoff).toHaveBeenCalledWith(2);
    });

    it('should preserve existing retry history', async () => {
      const sessionWithHistory = {
        ...mockSession,
        sessionMetadata: {
          ...mockSession.sessionMetadata!,
          retryHistory: [{ attempt: 1, timestamp: '2024-01-01T00:00:00Z', error: 'First error' }],
        },
      };
      repository.findOne.mockResolvedValue(sessionWithHistory);

      await service.scheduleRetry('session-123', 1);

      const updateCall = repository.update.mock.calls[0][1] as any;
      expect(updateCall.sessionMetadata.retryHistory).toHaveLength(2);
      expect(updateCall.sessionMetadata.retryHistory[0].attempt).toBe(1);
      expect(updateCall.sessionMetadata.retryHistory[1].attempt).toBe(2);
    });

    it('should throw NotFoundException if session does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.scheduleRetry('nonexistent', 0)).rejects.toThrow(NotFoundException);
    });

    it('should throw ImportValidationError if attempt is negative', async () => {
      repository.findOne.mockResolvedValue({ ...mockSession });

      await expect(service.scheduleRetry('session-123', -1)).rejects.toThrow(ImportValidationError);
    });

    it('should throw ImportValidationError if max retries exceeded', async () => {
      repository.findOne.mockResolvedValue({ ...mockSession });
      configService.getMaxRetries.mockReturnValue(3);

      await expect(service.scheduleRetry('session-123', 3)).rejects.toThrow(ImportValidationError);
      await expect(service.scheduleRetry('session-123', 5)).rejects.toThrow(ImportValidationError);
    });

    it('should use custom maxAttempts if provided', async () => {
      repository.findOne.mockResolvedValue({ ...mockSession });

      // With maxAttempts=5, attempt 3 should be valid
      await service.scheduleRetry('session-123', 3, 5);
      expect(repository.update).toHaveBeenCalled();

      // But attempt 5 should fail
      await expect(service.scheduleRetry('session-123', 5, 5)).rejects.toThrow(
        ImportValidationError,
      );
    });
  });

  describe('executeRetry', () => {
    it('should execute retry for valid session', async () => {
      const nextRetryAt = new Date(Date.now() - 1000).toISOString(); // 1 second in the past
      const sessionWithRetry = {
        ...mockSession,
        sessionMetadata: {
          ...mockSession.sessionMetadata!,
          retryCount: 1,
          nextRetryAt,
        },
      };
      repository.findOne.mockResolvedValueOnce(sessionWithRetry).mockResolvedValueOnce({
        ...sessionWithRetry,
        status: ImportSessionStatus.PENDING,
        sessionMetadata: {
          ...sessionWithRetry.sessionMetadata,
          nextRetryAt: null,
        },
      });

      const result = await service.executeRetry('session-123');

      expect(repository.update).toHaveBeenCalledWith(
        { id: 'session-123' },
        expect.objectContaining({
          status: ImportSessionStatus.PENDING,
          sessionMetadata: expect.objectContaining({
            nextRetryAt: null,
          }),
        }),
      );

      expect(result.status).toBe(ImportSessionStatus.PENDING);
    });

    it('should throw NotFoundException if session does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.executeRetry('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ImportValidationError if session is not in FAILED status', async () => {
      const processingSession = {
        ...mockSession,
        status: ImportSessionStatus.PROCESSING,
      };
      repository.findOne.mockResolvedValue(processingSession);

      await expect(service.executeRetry('session-123')).rejects.toThrow(ImportValidationError);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw ImportValidationError if no retry is scheduled', async () => {
      const sessionNoRetry = {
        ...mockSession,
        sessionMetadata: {
          ...mockSession.sessionMetadata!,
          nextRetryAt: null,
        },
      };
      repository.findOne.mockResolvedValue(sessionNoRetry);

      await expect(service.executeRetry('session-123')).rejects.toThrow(ImportValidationError);
    });

    it('should throw ImportValidationError if retry time has not arrived', async () => {
      const futureRetryAt = new Date(Date.now() + 60000).toISOString(); // 1 minute in future
      const sessionFutureRetry = {
        ...mockSession,
        sessionMetadata: {
          ...mockSession.sessionMetadata!,
          nextRetryAt: futureRetryAt,
        },
      };
      repository.findOne.mockResolvedValue(sessionFutureRetry);

      const error = await service.executeRetry('session-123').catch(e => e);

      expect(error).toBeInstanceOf(ImportValidationError);
      expect(error.message).toContain('scheduled for');
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('shouldRetry', () => {
    it('should return true for ImportTransientError', () => {
      const error = new ImportTransientError('Database timeout');
      expect(service.shouldRetry(error)).toBe(true);
    });

    it('should return false for ImportValidationError', () => {
      const error = new ImportValidationError('Invalid data');
      expect(service.shouldRetry(error)).toBe(false);
    });

    it('should return false for ImportConflictError', () => {
      const error = new ImportConflictError('Duplicate', 'duplicate');
      expect(service.shouldRetry(error)).toBe(false);
    });

    it('should return false for ImportFatalError', () => {
      const error = new ImportFatalError('File not found');
      expect(service.shouldRetry(error)).toBe(false);
    });

    it('should classify and determine retry for database deadlock', () => {
      const error = {
        name: 'QueryFailedError',
        message: 'deadlock',
        driverError: { code: '40P01' },
      };
      expect(service.shouldRetry(error)).toBe(true);
    });

    it('should classify and determine no retry for unique constraint', () => {
      const error = {
        name: 'QueryFailedError',
        message: 'duplicate key',
        driverError: { code: '23505' },
      };
      expect(service.shouldRetry(error)).toBe(false);
    });

    it('should return false if error classification fails', () => {
      // Mock classifyError to throw
      const circularObj: any = {};
      circularObj.self = circularObj;

      // This should not throw, but return false conservatively
      expect(service.shouldRetry(circularObj)).toBe(false);
    });
  });

  describe('getRetryMetadata', () => {
    it('should return retry metadata if present', () => {
      const sessionWithRetry = {
        ...mockSession,
        sessionMetadata: {
          ...mockSession.sessionMetadata!,
          retryCount: 2,
          lastRetryAt: '2024-01-01T00:00:00Z',
          nextRetryAt: '2024-01-01T00:01:00Z',
          lastError: {
            message: 'Database error',
            code: 'DB_ERROR',
            timestamp: '2024-01-01T00:00:00Z',
          },
          retryHistory: [{ attempt: 1, timestamp: '2024-01-01T00:00:00Z', error: 'Error 1' }],
        },
      };

      const metadata = service.getRetryMetadata(sessionWithRetry);

      expect(metadata).toBeDefined();
      expect(metadata!.retryCount).toBe(2);
      expect(metadata!.lastRetryAt).toBe('2024-01-01T00:00:00Z');
      expect(metadata!.nextRetryAt).toBe('2024-01-01T00:01:00Z');
      expect(metadata!.lastError).toBeDefined();
      expect(metadata!.retryHistory).toHaveLength(1);
    });

    it('should return null if no retry metadata', () => {
      const sessionNoRetry = { ...mockSession };
      const metadata = service.getRetryMetadata(sessionNoRetry);

      expect(metadata).toBeNull();
    });
  });

  describe('canRetry', () => {
    it('should return true if no retries yet', () => {
      const session = { ...mockSession };
      expect(service.canRetry(session)).toBe(true);
    });

    it('should return true if retry count is below max', () => {
      configService.getMaxRetries.mockReturnValue(3);
      const sessionWithRetries = {
        ...mockSession,
        sessionMetadata: {
          ...mockSession.sessionMetadata!,
          retryCount: 2,
        },
      };

      expect(service.canRetry(sessionWithRetries)).toBe(true);
    });

    it('should return false if retry count equals max', () => {
      configService.getMaxRetries.mockReturnValue(3);
      const sessionMaxRetries = {
        ...mockSession,
        sessionMetadata: {
          ...mockSession.sessionMetadata!,
          retryCount: 3,
        },
      };

      expect(service.canRetry(sessionMaxRetries)).toBe(false);
    });

    it('should return false if retry count exceeds max', () => {
      configService.getMaxRetries.mockReturnValue(3);
      const sessionTooManyRetries = {
        ...mockSession,
        sessionMetadata: {
          ...mockSession.sessionMetadata!,
          retryCount: 5,
        },
      };

      expect(service.canRetry(sessionTooManyRetries)).toBe(false);
    });

    it('should use custom maxAttempts if provided', () => {
      const sessionWithRetries = {
        ...mockSession,
        sessionMetadata: {
          ...mockSession.sessionMetadata!,
          retryCount: 4,
        },
      };

      expect(service.canRetry(sessionWithRetries, 5)).toBe(true);
      expect(service.canRetry(sessionWithRetries, 3)).toBe(false);
    });
  });

  describe('markAsPermanentlyFailed', () => {
    it('should mark session as permanently failed with error info', async () => {
      repository.findOne.mockResolvedValue({ ...mockSession });
      const error = new ImportFatalError('Unrecoverable error');

      await service.markAsPermanentlyFailed('session-123', error);

      expect(repository.update).toHaveBeenCalledWith(
        { id: 'session-123' },
        expect.objectContaining({
          status: ImportSessionStatus.FAILED,
          sessionMetadata: expect.objectContaining({
            errors: expect.arrayContaining([
              expect.stringContaining('Permanently failed: Unrecoverable error'),
            ]),
            nextRetryAt: null,
          }),
        }),
      );
    });

    it('should preserve existing errors', async () => {
      const sessionWithErrors = {
        ...mockSession,
        sessionMetadata: {
          ...mockSession.sessionMetadata!,
          errors: ['Previous error 1', 'Previous error 2'],
        },
      };
      repository.findOne.mockResolvedValue(sessionWithErrors);

      await service.markAsPermanentlyFailed('session-123', new Error('Final error'));

      const updateCall = repository.update.mock.calls[0][1] as any;
      expect(updateCall.sessionMetadata.errors).toHaveLength(3);
      expect(updateCall.sessionMetadata.errors[0]).toBe('Previous error 1');
      expect(updateCall.sessionMetadata.errors[2]).toContain('Final error');
    });

    it('should throw NotFoundException if session does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.markAsPermanentlyFailed('nonexistent', new Error('test')),
      ).rejects.toThrow(NotFoundException);
    });

    it('should classify unknown errors before storing', async () => {
      repository.findOne.mockResolvedValue({ ...mockSession });
      const genericError = new Error('Generic error');

      await service.markAsPermanentlyFailed('session-123', genericError);

      const updateCall = repository.update.mock.calls[0][1] as any;
      // Error is appended to existing errors, so check the last error
      const lastError =
        updateCall.sessionMetadata.errors[updateCall.sessionMetadata.errors.length - 1];
      expect(lastError).toContain('IMPORT_FATAL_ERROR');
      expect(lastError).toContain('Generic error');
    });
  });
});
