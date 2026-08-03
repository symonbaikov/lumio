'use client';

import { ChevronDown, ChevronRight, Layers } from '@/app/components/icons';
import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import { AppPagination } from '@/app/components/ui/pagination';
import type { AuditEvent } from '@/lib/api/audit';
import { useMemo, useState } from 'react';
import { ACTION_ICON_MAP } from '../utils/actionIconMap';
import { buildGroupedData } from '../utils/audit-table-utils';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';
import { formatAuditEvent } from '../utils/formatAuditEvent';
import { relativeTime } from '../utils/relativeTime';

interface AuditTimelineProps {
  events: AuditEvent[];
  onSelect: (event: AuditEvent) => void;
  onRollback?: (event: AuditEvent) => void;
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  transaction: 'Transaction',
  statement: 'Statement',
  receipt: 'Receipt',
  category: 'Category',
  rule: 'Rule',
  workspace: 'Workspace',
  integration: 'Integration',
  table_row: 'Table Row',
  table_cell: 'Table Cell',
  branch: 'Branch',
  wallet: 'Wallet',
  custom_table: 'Custom Table',
  custom_table_column: 'Column',
};

function AuditTimelineItem({
  event,
  onSelect,
  onRollback,
}: {
  event: AuditEvent;
  onSelect: (e: AuditEvent) => void;
  onRollback?: (e: AuditEvent) => void;
}) {
  const formatted = formatAuditEvent(event);
  const Icon = ACTION_ICON_MAP[event.action];
  const entityLabel = ENTITY_TYPE_LABELS[event.entityType] ?? event.entityType;
  const initials = getInitials(event.actorLabel);
  const avatarColor =
    event.actorType === 'system' ? 'var(--muted-foreground)' : getAvatarColor(event.actorLabel);

  return (
    <li className="audit-item">
      <div className="audit-dot">{Icon && <Icon size={13} />}</div>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: timeline items are supplemented by drawer */}
      <div
        className="audit-body"
        onClick={() => onSelect(event)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(event);
          }
        }}
      >
        <div className="audit-line">
          <span
            className="audit-avatar"
            style={{ background: avatarColor }}
            title={event.actorLabel}
          >
            {initials}
          </span>
          <span className="audit-actor">{event.actorLabel}</span>
          <span className="audit-verb">{formatted.actionVerb}</span>
          <span className="audit-what">{entityLabel}</span>
          <span className="audit-tag">{entityLabel}</span>
        </div>
        <div className="audit-when">{relativeTime(event.createdAt)}</div>
      </div>

      {event.isUndoable && onRollback && (
        <button
          type="button"
          className="audit-rollback-btn"
          onClick={e => {
            e.stopPropagation();
            onRollback(event);
          }}
        >
          Rollback
        </button>
      )}
    </li>
  );
}

function AuditBatchGroup({
  batchId,
  count,
  createdAt,
  expanded,
  onToggle,
}: {
  batchId: string;
  count: number;
  createdAt: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="audit-item">
      <div className="audit-dot">
        <Layers size={13} />
      </div>
      <div className="audit-body">
        <button type="button" className="audit-batch-header" onClick={onToggle}>
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          Batch · {count} events
          <span className="audit-tag">Batch</span>
        </button>
        <div className="audit-when">{relativeTime(createdAt)}</div>
      </div>
    </li>
  );
}

export function AuditTimeline({
  events,
  onSelect,
  onRollback,
  page,
  limit,
  total,
  onPageChange,
}: AuditTimelineProps) {
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const rows = useMemo(() => buildGroupedData(events, expandedBatches), [events, expandedBatches]);

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  if (rows.length === 0) {
    return (
      <div className="audit-empty">
        <EmptyStateIllustration name="activity" size="md" />
        No events found.
      </div>
    );
  }

  return (
    <>
      <ol className="audit-list">
        {rows.map(row => {
          if (row.type === 'group') {
            return (
              <AuditBatchGroup
                key={row.id}
                batchId={row.batchId}
                count={row.count}
                createdAt={row.createdAt}
                expanded={expandedBatches.has(row.batchId)}
                onToggle={() => toggleBatch(row.batchId)}
              />
            );
          }
          return (
            <AuditTimelineItem
              key={row.id}
              event={row.event}
              onSelect={onSelect}
              onRollback={onRollback}
            />
          );
        })}
      </ol>

      <div className="audit-pagination">
        <span>
          Page {page} of {totalPages}
        </span>
        <AppPagination page={page} total={totalPages} onChange={onPageChange} />
      </div>
    </>
  );
}
