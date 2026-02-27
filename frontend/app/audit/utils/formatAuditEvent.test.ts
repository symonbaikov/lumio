import { describe, expect, it } from 'vitest';
import type { AuditEvent } from '@/lib/api/audit';
import { formatAuditEvent } from './formatAuditEvent';

describe('formatAuditEvent', () => {
  it('formats action, entity, and description lines', () => {
    const mockEvent: AuditEvent = {
      id: 'evt-1',
      workspaceId: 'workspace-1',
      createdAt: '2024-10-12T12:00:00.000Z',
      actorType: 'user',
      actorId: 'user-1',
      actorLabel: 'Lia Bates',
      entityType: 'transaction',
      entityId: 'txn-123',
      action: 'update',
      diff: {
        before: { category: 'Marketing' },
        after: { category: 'Sales' },
      },
      meta: null,
      batchId: null,
      severity: 'info',
      isUndoable: false,
    };

    const result = formatAuditEvent(mockEvent);

    expect(result.descriptionLines).toContain('From: Marketing');
    expect(result.actionLabel).toBe('Change');
    expect(result.objectLabel).toBe('Transaction');
  });
});
