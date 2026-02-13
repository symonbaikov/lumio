'use client';

import {
  type AuditEvent,
  type AuditEventFilter,
  fetchAuditEvents,
  rollbackEvent,
} from '@/lib/api/audit';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AuditEventDrawer } from './components/AuditEventDrawer';
import { AuditEventTable } from './components/AuditEventTable';
import { RollbackConfirmModal } from './components/RollbackConfirmModal';

const ENTITY_TYPES = [
  'transaction',
  'statement',
  'receipt',
  'category',
  'rule',
  'workspace',
  'integration',
  'table_row',
  'table_cell',
  'branch',
  'wallet',
  'custom_table',
  'custom_table_column',
] as const;

const ACTOR_TYPES = ['user', 'system', 'integration'] as const;
const SEVERITIES = ['info', 'warn', 'critical'] as const;

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<AuditEventFilter>({});
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<AuditEvent | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      ...filters,
      page,
      limit,
    }),
    [filters, page, limit],
  );

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAuditEvents(params);
      setEvents(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load audit events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [params]);

  const onSelectEvent = (event: AuditEvent) => {
    setSelectedEvent(event);
    setDrawerOpen(true);
  };

  const handleRollback = (event: AuditEvent) => {
    setRollbackTarget(event);
    setRollbackError(null);
  };

  const confirmRollback = async () => {
    if (!rollbackTarget) return;
    setRollbackLoading(true);
    setRollbackError(null);
    try {
      await rollbackEvent(rollbackTarget.id);
      toast.success('Rollback successful');
      setRollbackTarget(null);
      setDrawerOpen(false);
      loadEvents();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Rollback failed';
      setRollbackError(message);
    } finally {
      setRollbackLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-sm text-gray-600">Track workspace activity and rollbacks.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
            <div className="mt-4 space-y-3 text-sm">
              <label className="block">
                <span className="text-gray-500">Entity Type</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={filters.entityType || ''}
                  onChange={e => {
                    setFilters(prev => ({
                      ...prev,
                      entityType: (e.target.value || undefined) as any,
                    }));
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {ENTITY_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-gray-500">Actor Type</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={filters.actorType || ''}
                  onChange={e => {
                    setFilters(prev => ({
                      ...prev,
                      actorType: (e.target.value || undefined) as any,
                    }));
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {ACTOR_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-gray-500">Severity</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={filters.severity || ''}
                  onChange={e => {
                    setFilters(prev => ({
                      ...prev,
                      severity: (e.target.value || undefined) as any,
                    }));
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {SEVERITIES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-gray-500">Entity ID</span>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={filters.entityId || ''}
                  onChange={e => {
                    setFilters(prev => ({
                      ...prev,
                      entityId: e.target.value || undefined,
                    }));
                    setPage(1);
                  }}
                />
              </label>

              <label className="block">
                <span className="text-gray-500">Date From</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={filters.dateFrom || ''}
                  onChange={e => {
                    setFilters(prev => ({
                      ...prev,
                      dateFrom: e.target.value || undefined,
                    }));
                    setPage(1);
                  }}
                />
              </label>

              <label className="block">
                <span className="text-gray-500">Date To</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={filters.dateTo || ''}
                  onChange={e => {
                    setFilters(prev => ({
                      ...prev,
                      dateTo: e.target.value || undefined,
                    }));
                    setPage(1);
                  }}
                />
              </label>

              <label className="block">
                <span className="text-gray-500">Batch ID</span>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={filters.batchId || ''}
                  onChange={e => {
                    setFilters(prev => ({
                      ...prev,
                      batchId: e.target.value || undefined,
                    }));
                    setPage(1);
                  }}
                />
              </label>

              <label className="block">
                <span className="text-gray-500">Limit</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={limit}
                  onChange={e => setLimit(Number(e.target.value))}
                >
                  {[25, 50, 100, 200].map(value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {loading ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
                Loading audit events...
              </div>
            ) : (
              <AuditEventTable
                events={events}
                onSelect={onSelectEvent}
                page={page}
                limit={limit}
                total={total}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
      </div>

      <AuditEventDrawer
        event={selectedEvent}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRollback={handleRollback}
      />

      <RollbackConfirmModal
        open={Boolean(rollbackTarget)}
        event={rollbackTarget}
        onCancel={() => setRollbackTarget(null)}
        onConfirm={confirmRollback}
        loading={rollbackLoading}
        error={rollbackError}
      />
    </div>
  );
}
