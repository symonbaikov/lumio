'use client';

import type { AuditEvent } from '@/lib/api/audit';
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Cpu, Plug, User } from 'lucide-react';
import React, { useMemo, useState } from 'react';

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

const severityClasses: Record<string, string> = {
  info: 'bg-blue-50 text-blue-700',
  warn: 'bg-yellow-50 text-yellow-700',
  critical: 'bg-red-50 text-red-700',
};

export function AuditEventTable({
  events,
  onSelect,
  page,
  limit,
  total,
  onPageChange,
}: AuditEventTableProps) {
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);

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
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  };

  const columns = useMemo<ColumnDef<AuditTableRow>[]>(
    () => [
      {
        id: 'timestamp',
        header: 'Timestamp',
        cell: ({ row }) => {
          const data = row.original;
          return (
            <div className="text-sm text-gray-700">{new Date(data.createdAt).toLocaleString()}</div>
          );
        },
      },
      {
        id: 'actor',
        header: 'Actor',
        cell: ({ row }) => {
          const data = row.original;
          if (data.type === 'group') {
            return (
              <button
                type="button"
                onClick={() => toggleBatch(data.batchId)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800"
              >
                {expandedBatches.has(data.batchId) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Batch {data.batchId.slice(0, 8)}
              </button>
            );
          }
          const Icon =
            data.event.actorType === 'integration'
              ? Plug
              : data.event.actorType === 'system'
                ? Cpu
                : User;
          return (
            <span className="inline-flex items-center gap-2 text-sm text-gray-800">
              <Icon className="h-4 w-4 text-gray-500" />
              {data.event.actorLabel}
            </span>
          );
        },
      },
      {
        id: 'action',
        header: 'Action',
        cell: ({ row }) => {
          const data = row.original;
          if (data.type === 'group') {
            return <span className="text-sm text-gray-500">{data.count} events</span>;
          }
          return <span className="text-sm text-gray-800">{data.event.action}</span>;
        },
      },
      {
        id: 'entity',
        header: 'Entity',
        cell: ({ row }) => {
          const data = row.original;
          if (data.type === 'group') return <span className="text-sm text-gray-500">—</span>;
          return (
            <div className="text-sm text-gray-800">
              {data.event.entityType}
              <div className="text-xs text-gray-500">{data.event.entityId}</div>
            </div>
          );
        },
      },
      {
        id: 'severity',
        header: 'Severity',
        cell: ({ row }) => {
          const data = row.original;
          if (data.type === 'group') return <span className="text-sm text-gray-500">—</span>;
          return (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                severityClasses[data.event.severity] || 'bg-gray-100 text-gray-700'
              }`}
            >
              {data.event.severity}
            </span>
          );
        },
      },
      {
        id: 'batch',
        header: 'Batch',
        cell: ({ row }) => {
          const data = row.original;
          if (data.type === 'group') {
            return <span className="text-xs font-mono text-gray-600">{data.batchId}</span>;
          }
          if (!data.batchId) return <span className="text-sm text-gray-500">—</span>;
          return <span className="text-xs font-mono text-gray-600">{data.batchId}</span>;
        },
      },
    ],
    [expandedBatches],
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
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {table.getRowModel().rows.map(row => {
              const data = row.original;
              return (
                <tr
                  key={row.id}
                  className={
                    data.type === 'event' ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50'
                  }
                  onClick={() => {
                    if (data.type === 'event') onSelect(data.event);
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 align-top">
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
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  No events found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="rounded-md border border-gray-200 px-3 py-1"
            disabled={page <= 1}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="rounded-md border border-gray-200 px-3 py-1"
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
