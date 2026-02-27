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

  it('lists multiple fields with from/to details', () => {
    const mockEvent: AuditEvent = {
      id: 'evt-2',
      workspaceId: 'workspace-1',
      createdAt: '2024-10-12T12:00:00.000Z',
      actorType: 'user',
      actorId: 'user-1',
      actorLabel: 'Lia Bates',
      entityType: 'transaction',
      entityId: 'txn-456',
      action: 'update',
      diff: {
        before: { category: 'Marketing', amount: 10, note: 'Old' },
        after: { category: 'Sales', amount: 12, note: 'New' },
      },
      meta: null,
      batchId: null,
      severity: 'info',
      isUndoable: false,
    };

    const result = formatAuditEvent(mockEvent);

    expect(result.descriptionLines[0]).toBe('Fields: amount, category, note');
    expect(result.descriptionLines).toContain('Field: amount');
    expect(result.descriptionLines).toContain('From: 10');
    expect(result.descriptionLines).toContain('To: 12');
    expect(result.descriptionLines).toContain('Field: category');
    expect(result.descriptionLines).toContain('From: Marketing');
    expect(result.descriptionLines).toContain('To: Sales');
  });

  it('uses action + object fallback when diff is missing', () => {
    const mockEvent: AuditEvent = {
      id: 'evt-3',
      workspaceId: 'workspace-1',
      createdAt: '2024-10-12T12:00:00.000Z',
      actorType: 'system',
      actorId: null,
      actorLabel: 'System',
      entityType: 'rule',
      entityId: '',
      action: 'create',
      diff: null,
      meta: null,
      batchId: null,
      severity: 'info',
      isUndoable: false,
    };

    const result = formatAuditEvent(mockEvent);

    expect(result.descriptionLines).toEqual(['Create Rule']);
  });

  it('uses action tone when severity is info', () => {
    const mockEvent: AuditEvent = {
      id: 'evt-4',
      workspaceId: 'workspace-1',
      createdAt: '2024-10-12T12:00:00.000Z',
      actorType: 'user',
      actorId: 'user-2',
      actorLabel: 'Ada Lovelace',
      entityType: 'transaction',
      entityId: 'txn-789',
      action: 'create',
      diff: null,
      meta: null,
      batchId: null,
      severity: 'info',
      isUndoable: false,
    };

    const result = formatAuditEvent(mockEvent);

    expect(result.actionTone).toBe('success');
  });

  it('uses severity tone when warn overrides action tone', () => {
    const mockEvent: AuditEvent = {
      id: 'evt-5',
      workspaceId: 'workspace-1',
      createdAt: '2024-10-12T12:00:00.000Z',
      actorType: 'user',
      actorId: 'user-2',
      actorLabel: 'Ada Lovelace',
      entityType: 'transaction',
      entityId: 'txn-789',
      action: 'create',
      diff: null,
      meta: null,
      batchId: null,
      severity: 'warn',
      isUndoable: false,
    };

    const result = formatAuditEvent(mockEvent);

    expect(result.actionTone).toBe('warn');
  });
});
