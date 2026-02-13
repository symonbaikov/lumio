'use client';

import type { AuditEvent } from '@/lib/api/audit';
import {
  CheckCircle2,
  Edit3,
  FileDown,
  FileUp,
  Link2,
  PlusCircle,
  RotateCcw,
  Trash2,
  Unlink2,
} from 'lucide-react';
import React from 'react';

interface EntityHistoryTimelineProps {
  events: AuditEvent[];
  onSelect?: (event: AuditEvent) => void;
}

export function EntityHistoryTimeline({ events, onSelect }: EntityHistoryTimelineProps) {
  if (!events.length) {
    return <div className="text-sm text-gray-500">No history available.</div>;
  }

  const iconForAction = (action: string) => {
    switch (action) {
      case 'create':
        return PlusCircle;
      case 'update':
        return Edit3;
      case 'delete':
        return Trash2;
      case 'import':
        return FileUp;
      case 'export':
        return FileDown;
      case 'rollback':
        return RotateCcw;
      case 'apply_rule':
        return CheckCircle2;
      case 'link':
        return Link2;
      case 'unlink':
        return Unlink2;
      default:
        return Edit3;
    }
  };

  return (
    <div className="space-y-4">
      {events.map(event => {
        const Icon = iconForAction(event.action);
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelect?.(event)}
            className="flex w-full items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-gray-300"
          >
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-900">
                  {event.action.replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(event.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                {event.actorLabel} • {event.entityType} • {event.severity}
              </div>
              {event.batchId && (
                <div className="mt-1 text-xs text-gray-500">Batch {event.batchId}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
