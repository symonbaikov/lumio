import {
  ImportSession,
  ImportSessionMode,
  ImportSessionStatus,
} from '../../../src/entities/import-session.entity';

describe('ImportSession Entity', () => {
  it('should create an import session instance', () => {
    const session = new ImportSession();
    session.workspaceId = 'workspace-123';
    session.userId = 'user-123';
    session.statementId = 'statement-123';
    session.status = ImportSessionStatus.PREVIEW;
    session.mode = ImportSessionMode.PREVIEW;
    session.fileHash = 'abc123def456';
    session.fileName = 'test-statement.pdf';
    session.fileSize = 1024000;
    session.sessionMetadata = {
      totalTransactions: 100,
      newCount: 80,
      matchedCount: 15,
      skippedCount: 3,
      conflictedCount: 2,
      failedCount: 0,
      conflicts: [
        {
          transactionIndex: 45,
          reason: 'Potential duplicate detected',
          confidence: 0.85,
        },
      ],
      warnings: ['Some transactions have missing dates'],
      errors: [],
    };

    expect(session.workspaceId).toBe('workspace-123');
    expect(session.userId).toBe('user-123');
    expect(session.statementId).toBe('statement-123');
    expect(session.status).toBe(ImportSessionStatus.PREVIEW);
    expect(session.mode).toBe(ImportSessionMode.PREVIEW);
    expect(session.fileHash).toBe('abc123def456');
    expect(session.fileName).toBe('test-statement.pdf');
    expect(session.fileSize).toBe(1024000);
    expect(session.sessionMetadata).toBeDefined();
    expect(session.sessionMetadata?.totalTransactions).toBe(100);
    expect(session.sessionMetadata?.conflicts).toHaveLength(1);
  });

  it('should have all status enum values', () => {
    expect(ImportSessionStatus.PENDING).toBe('pending');
    expect(ImportSessionStatus.PROCESSING).toBe('processing');
    expect(ImportSessionStatus.PREVIEW).toBe('preview');
    expect(ImportSessionStatus.COMPLETED).toBe('completed');
    expect(ImportSessionStatus.FAILED).toBe('failed');
    expect(ImportSessionStatus.CANCELLED).toBe('cancelled');
  });

  it('should have all mode enum values', () => {
    expect(ImportSessionMode.PREVIEW).toBe('preview');
    expect(ImportSessionMode.COMMIT).toBe('commit');
  });

  it('should allow null values for nullable fields', () => {
    const session = new ImportSession();
    session.workspaceId = 'workspace-123';
    session.userId = null;
    session.statementId = null;
    session.sessionMetadata = null;
    session.completedAt = null;

    expect(session.userId).toBeNull();
    expect(session.statementId).toBeNull();
    expect(session.sessionMetadata).toBeNull();
    expect(session.completedAt).toBeNull();
  });

  it('should validate metadata structure', () => {
    const session = new ImportSession();
    const metadata = {
      totalTransactions: 50,
      newCount: 40,
      matchedCount: 8,
      skippedCount: 1,
      conflictedCount: 1,
      failedCount: 0,
      conflicts: [],
      warnings: [],
      errors: [],
    };

    session.sessionMetadata = metadata;

    expect(session.sessionMetadata.totalTransactions).toBe(50);
    expect(session.sessionMetadata.newCount).toBe(40);
    expect(session.sessionMetadata.matchedCount).toBe(8);
    expect(session.sessionMetadata.skippedCount).toBe(1);
    expect(session.sessionMetadata.conflictedCount).toBe(1);
    expect(session.sessionMetadata.failedCount).toBe(0);
    expect(Array.isArray(session.sessionMetadata.conflicts)).toBe(true);
    expect(Array.isArray(session.sessionMetadata.warnings)).toBe(true);
    expect(Array.isArray(session.sessionMetadata.errors)).toBe(true);
  });
});
