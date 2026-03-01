import { ImportSession } from '../../../src/entities/import-session.entity';
import { Transaction } from '../../../src/entities/transaction.entity';

describe('Transaction Entity - Fingerprint Extensions', () => {
  it('should accept fingerprint field', () => {
    const transaction = new Transaction();
    transaction.fingerprint = 'abc123def456789012345678901234';

    expect(transaction.fingerprint).toBe('abc123def456789012345678901234');
  });

  it('should allow null fingerprint', () => {
    const transaction = new Transaction();
    transaction.fingerprint = null;

    expect(transaction.fingerprint).toBeNull();
  });

  it('should accept import session ID', () => {
    const transaction = new Transaction();
    transaction.importSessionId = 'session-uuid-123';

    expect(transaction.importSessionId).toBe('session-uuid-123');
  });

  it('should allow null import session ID', () => {
    const transaction = new Transaction();
    transaction.importSessionId = null;

    expect(transaction.importSessionId).toBeNull();
  });

  it('should support import session relation', () => {
    const transaction = new Transaction();
    const importSession = new ImportSession();
    importSession.id = 'session-uuid-123';

    transaction.importSession = importSession;
    transaction.importSessionId = importSession.id;

    expect(transaction.importSession).toBe(importSession);
    expect(transaction.importSessionId).toBe('session-uuid-123');
  });

  it('should maintain existing duplicate tracking fields', () => {
    const transaction = new Transaction();
    transaction.isDuplicate = true;
    transaction.duplicateOfId = 'tx-uuid-456';
    transaction.duplicateConfidence = 0.95;
    transaction.duplicateMatchType = 'exact';
    transaction.fingerprint = 'abc123def456789012345678901234';

    expect(transaction.isDuplicate).toBe(true);
    expect(transaction.duplicateOfId).toBe('tx-uuid-456');
    expect(transaction.duplicateConfidence).toBe(0.95);
    expect(transaction.duplicateMatchType).toBe('exact');
    expect(transaction.fingerprint).toBe('abc123def456789012345678901234');
  });

  it('should create transaction with all new fields', () => {
    const transaction = new Transaction();
    transaction.workspaceId = 'workspace-123';
    transaction.statementId = 'statement-123';
    transaction.fingerprint = 'abc123def456789012345678901234';
    transaction.importSessionId = 'session-123';
    transaction.isDuplicate = false;
    transaction.duplicateOfId = null;
    transaction.duplicateConfidence = null;
    transaction.duplicateMatchType = null;

    expect(transaction.workspaceId).toBe('workspace-123');
    expect(transaction.statementId).toBe('statement-123');
    expect(transaction.fingerprint).toBe('abc123def456789012345678901234');
    expect(transaction.importSessionId).toBe('session-123');
    expect(transaction.isDuplicate).toBe(false);
    expect(transaction.duplicateOfId).toBeNull();
  });
});
