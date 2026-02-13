'use client';

import type { AuditEvent } from '@/lib/api/audit';
import React from 'react';

interface RollbackConfirmModalProps {
  open: boolean;
  event: AuditEvent | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export function RollbackConfirmModal({
  open,
  event,
  onConfirm,
  onCancel,
  loading,
  error,
}: RollbackConfirmModalProps) {
  if (!open || !event) return null;

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">Confirm rollback</h3>
        <p className="mt-2 text-sm text-gray-600">
          This will attempt to rollback the change for {event.entityType} {event.entityId}.
        </p>
        {event.diff && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            Rollback is based on stored diff data. Review changes before continuing.
          </div>
        )}
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            disabled={loading}
          >
            {loading ? 'Rolling back...' : 'Rollback'}
          </button>
        </div>
      </div>
    </div>
  );
}
