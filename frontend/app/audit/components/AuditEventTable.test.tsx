import type { AuditEvent } from '@/lib/api/audit';
// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { AuditEventTable } from './AuditEventTable';

const events: AuditEvent[] = [
  {
    id: 'event-1',
    workspaceId: 'workspace-1',
    createdAt: '2026-02-01T12:00:00.000Z',
    actorType: 'user',
    actorId: 'user-1',
    actorLabel: 'Sam C',
    entityType: 'transaction',
    entityId: 'txn-123',
    action: 'update',
    diff: {
      before: { amount: 10 },
      after: { amount: 20 },
    },
    meta: null,
    batchId: null,
    severity: 'warn',
    isUndoable: true,
  },
];

describe('AuditEventTable', () => {
  it('renders audit columns and formatted description', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AuditEventTable
          events={events}
          onSelect={() => undefined}
          page={1}
          limit={50}
          total={1}
          onPageChange={() => undefined}
        />,
      );
    });

    const headers = Array.from(container.querySelectorAll('th')).map(header =>
      header.textContent?.trim(),
    );

    expect(headers).toEqual(['Action', 'Object', 'Description', 'User', 'Date', 'Severity']);
    expect(container.textContent).toContain('Change');
    expect(container.textContent).toContain('Transaction');
    expect(container.textContent).toContain('From: 10');
    expect(container.textContent).toContain('To: 20');
    expect(container.textContent).toContain('Sam C');
    expect(container.textContent).toContain('warn');
  });
});
