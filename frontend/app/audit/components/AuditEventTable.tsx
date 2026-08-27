'use client';
import { formatStoredDateTime } from '@/app/lib/user-format-store';

import { ChevronDown, ChevronRight, Cpu, Plug, User } from '@/app/components/icons';
import { AppPagination } from '@/app/components/ui/pagination';
import type { AuditEvent } from '@/lib/api/audit';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useTheme } from 'next-themes';
import { useMemo, useState } from 'react';
import { formatAuditEvent } from '../utils/formatAuditEvent';

interface AuditEventTableProps {
  events: AuditEvent[];
  onSelect: (event: AuditEvent) => void;
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

type AuditTableRow =
  | {
      type: 'group';
      id: string;
      batchId: string;
      count: number;
      createdAt: string;
    }
  | {
      type: 'event';
      id: string;
      event: AuditEvent;
      batchId: string | null;
      createdAt: string;
    };

const severityColors: Record<string, { bg: string; color: string }> = {
  info: { bg: 'var(--color-info-soft-bg)', color: 'var(--color-info-soft-text)' },
  warn: { bg: '#fefce8', color: '#a16207' },
  critical: { bg: 'var(--color-error-soft-bg)', color: 'var(--destructive)' },
};

const actionToneColors: Record<string, { bg: string; color: string }> = {
  info: { bg: 'var(--color-info-soft-bg)', color: 'var(--color-info-soft-text)' },
  warn: { bg: '#fefce8', color: '#a16207' },
  critical: { bg: 'var(--color-error-soft-bg)', color: 'var(--destructive)' },
  primary: { bg: 'var(--color-success-soft-bg)', color: '#157811' },
  success: { bg: 'var(--color-success-soft-bg)', color: 'var(--color-success-soft-text)' },
};

export function AuditEventTable({
  events,
  onSelect,
  page,
  limit,
  total,
  onPageChange,
}: AuditEventTableProps) {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;

  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);

  const groupedData = useMemo<AuditTableRow[]>(() => {
    const rows: AuditTableRow[] = [];
    const batchGroups = new Map<string, AuditEvent[]>();

    events.forEach(event => {
      if (event.batchId) {
        const list = batchGroups.get(event.batchId) || [];
        list.push(event);
        batchGroups.set(event.batchId, list);
      } else {
        rows.push({
          type: 'event',
          id: event.id,
          event,
          batchId: null,
          createdAt: event.createdAt,
        });
      }
    });

    batchGroups.forEach((batchEvents, batchId) => {
      const sorted = [...batchEvents].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      rows.push({
        type: 'group',
        id: `batch-${batchId}`,
        batchId,
        count: batchEvents.length,
        createdAt: sorted[0]?.createdAt || new Date().toISOString(),
      });
      if (expandedBatches.has(batchId)) {
        sorted.forEach(event => {
          rows.push({
            type: 'event',
            id: event.id,
            event,
            batchId,
            createdAt: event.createdAt,
          });
        });
      }
    });

    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [events, expandedBatches]);

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

  const columns = useMemo<ColumnDef<AuditTableRow>[]>(
    () => [
      {
        id: 'action',
        header: 'Action',
        cell: ({ row }) => {
          const data = row.original;
          if (data.type === 'group') {
            return (
              <button
                type="button"
                onClick={() => toggleBatch(data.batchId)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: c.ink800,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {expandedBatches.has(data.batchId) ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                Batch {data.batchId.slice(0, 8)}
              </button>
            );
          }
          const formatted = formatAuditEvent(data.event);
          const colors = actionToneColors[formatted.actionTone] || { bg: c.ink50, color: c.ink800 };
          return (
            <Chip
              label={formatted.actionLabel}
              size="small"
              sx={{
                fontSize: 12,
                fontWeight: 600,
                bgcolor: colors.bg,
                color: colors.color,
                borderRadius: tokens.radius.full,
                height: 24,
              }}
            />
          );
        },
      },
      {
        id: 'object',
        header: 'Object',
        cell: ({ row }) => {
          const data = row.original;
          if (data.type === 'group') {
            return (
              <Typography variant="body2" style={{ color: c.ink500 }}>
                {data.count} events
              </Typography>
            );
          }
          const formatted = formatAuditEvent(data.event);
          return (
            <Typography variant="body2" style={{ color: c.ink800 }}>
              {formatted.objectLabel}
            </Typography>
          );
        },
      },
      {
        id: 'description',
        header: 'Description',
        cell: ({ row }) => {
          const data = row.original;
          if (data.type === 'group') {
            return (
              <Typography variant="body2" style={{ color: c.ink500 }}>
                —
              </Typography>
            );
          }
          const formatted = formatAuditEvent(data.event);
          return (
            <Typography variant="body2" style={{ color: c.ink800 }}>
              {formatted.description}
            </Typography>
          );
        },
      },
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) => {
          const data = row.original;
          if (data.type === 'group') {
            return (
              <Typography variant="body2" style={{ color: c.ink500 }}>
                —
              </Typography>
            );
          }
          const Icon =
            data.event.actorType === 'integration'
              ? Plug
              : data.event.actorType === 'system'
                ? Cpu
                : User;
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                color: c.ink800,
              }}
            >
              <Icon size={16} style={{ color: c.ink500 }} />
              {data.event.actorLabel}
            </span>
          );
        },
      },
      {
        id: 'date',
        header: 'Date',
        cell: ({ row }) => {
          const data = row.original;
          return (
            <Typography variant="body2" style={{ color: c.ink800 }}>
              {formatStoredDateTime(data.createdAt)}
            </Typography>
          );
        },
      },
      {
        id: 'severity',
        header: 'Severity',
        cell: ({ row }) => {
          const data = row.original;
          if (data.type === 'group') {
            return (
              <Typography variant="body2" style={{ color: c.ink500 }}>
                —
              </Typography>
            );
          }
          const colors = severityColors[data.event.severity] || { bg: c.ink50, color: c.ink800 };
          return (
            <Chip
              label={data.event.severity}
              size="small"
              sx={{
                fontSize: 12,
                fontWeight: 600,
                bgcolor: colors.bg,
                color: colors.color,
                borderRadius: tokens.radius.full,
                height: 24,
              }}
            />
          );
        },
      },
    ],
    [expandedBatches, c],
  );

  const table = useReactTable({
    data: groupedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ overflow: 'hidden', border: `1px solid ${c.border}` }}>
        <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: c.ink50 }}>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 600,
                      color: c.ink500,
                      borderBottom: `1px solid ${c.border}`,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => {
              const data = row.original;
              return (
                <tr
                  key={row.id}
                  style={{
                    background: data.type === 'event' ? c.surface : c.ink50,
                    cursor: data.type === 'event' ? 'pointer' : undefined,
                    borderBottom: `1px solid ${c.border}`,
                  }}
                  role={data.type === 'event' ? 'button' : undefined}
                  tabIndex={data.type === 'event' ? 0 : undefined}
                  onClick={() => {
                    if (data.type === 'event') {
                      onSelect(data.event);
                    }
                  }}
                  onKeyDown={event => {
                    if (data.type !== 'event') {
                      return;
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(data.event);
                    }
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    fontSize: 14,
                    color: c.ink500,
                  }}
                >
                  No events found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 14,
          color: c.ink700,
        }}
      >
        <div>
          Page {page} of {totalPages}
        </div>
        <AppPagination page={page} total={totalPages} onChange={onPageChange} />
      </Box>
    </Box>
  );
}
