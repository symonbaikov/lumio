'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import type { AuditEvent } from '@/lib/api/audit';
import React from 'react';
import { DiffViewer } from './DiffViewer';

interface AuditEventDrawerProps {
  event: AuditEvent | null;
  open: boolean;
  onClose: () => void;
  onRollback?: (event: AuditEvent) => void;
}

export function AuditEventDrawer({ event, open, onClose, onRollback }: AuditEventDrawerProps) {
  if (!event) return null;

  return (
    <DrawerShell isOpen={open} onClose={onClose} title="Audit Event" position="right" width="lg">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Timestamp</span>
            <span className="font-semibold text-gray-900">
              {new Date(event.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Actor</span>
            <span className="font-semibold text-gray-900">{event.actorLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Action</span>
            <span className="font-semibold text-gray-900">{event.action}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Entity</span>
            <span className="font-semibold text-gray-900">{event.entityType}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Entity ID</span>
            <span className="font-mono text-xs text-gray-800">{event.entityId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Severity</span>
            <span className="font-semibold text-gray-900">{event.severity}</span>
          </div>
          {event.batchId && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Batch</span>
              <span className="font-mono text-xs text-gray-800">{event.batchId}</span>
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-semibold text-gray-900">Diff</div>
          <div className="mt-2">
            <DiffViewer diff={event.diff} />
          </div>
        </div>

        <details className="rounded-lg border border-gray-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-gray-900">Metadata</summary>
          <div className="mt-2 text-xs text-gray-700">
            <pre className="whitespace-pre-wrap">
              {event.meta ? JSON.stringify(event.meta, null, 2) : 'No metadata'}
            </pre>
          </div>
        </details>

        {event.meta?.rollbackOf && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            Related event (rollback of):
            <span className="ml-2 font-mono text-xs text-gray-900">{event.meta.rollbackOf}</span>
          </div>
        )}

        {event.isUndoable && (
          <button
            type="button"
            onClick={() => onRollback?.(event)}
            className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Rollback
          </button>
        )}
      </div>
    </DrawerShell>
  );
}
