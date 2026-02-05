'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { AuditEventDrawer } from '@/app/audit/components/AuditEventDrawer';
import { EntityHistoryTimeline } from '@/app/audit/components/EntityHistoryTimeline';
import type { AuditEvent } from '@/lib/api/audit';
import { fetchEntityHistory } from '@/lib/api/audit';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnType, CustomTableColumn, CustomTableGridRow } from '../utils/stylingUtils';

type DrawerMode = 'view' | 'edit';

interface RowDrawerProps {
  open: boolean;
  mode: DrawerMode;
  row: CustomTableGridRow | null;
  columns: CustomTableColumn[];
  onClose: () => void;
  onModeChange?: (mode: DrawerMode) => void;
  onSave: (rowId: string, patchData: Record<string, any>) => Promise<void>;
  onSaveAndClose?: (rowId: string, patchData: Record<string, any>) => Promise<void>;
  onSaveAndNext?: (rowId: string, patchData: Record<string, any>) => Promise<void>;
}

const normalizeValue = (type: ColumnType, value: unknown) => {
  if (type === 'boolean') return Boolean(value);
  if (type === 'number')
    return value === null || value === undefined || value === '' ? null : Number(value);
  if (type === 'multi_select') {
    if (Array.isArray(value)) return value.map(v => String(v));
    if (value === null || value === undefined || value === '') return [];
    return [String(value)];
  }
  if (type === 'date')
    return value === null || value === undefined || value === '' ? null : String(value);
  if (type === 'select') return value === null || value === undefined ? '' : String(value);
  return value === null || value === undefined ? '' : String(value);
};

const formatValue = (type: ColumnType, value: unknown) => {
  if (value === null || value === undefined) return '—';
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'multi_select') {
    const arr = Array.isArray(value) ? value : [value];
    const text = arr
      .map(v => String(v))
      .filter(Boolean)
      .join(', ');
    return text || '—';
  }
  const text = String(value);
  return text.trim() ? text : '—';
};

export function RowDrawer({
  open,
  mode,
  row,
  columns,
  onClose,
  onModeChange,
  onSave,
  onSaveAndClose,
  onSaveAndNext,
}: RowDrawerProps) {
  const orderedColumns = useMemo(() => {
    return [...columns].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [columns]);

  const [baseData, setBaseData] = useState<Record<string, any>>({});
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [historyEvents, setHistoryEvents] = useState<AuditEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<AuditEvent | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  useEffect(() => {
    if (!row) {
      setBaseData({});
      setDraft({});
      return;
    }
    const initial: Record<string, any> = {};
    for (const col of orderedColumns) {
      initial[col.key] = normalizeValue(col.type, row.data?.[col.key]);
    }
    setBaseData(initial);
    setDraft(initial);
  }, [row?.id, orderedColumns]);

  useEffect(() => {
    if (!open || !row) return;
    setHistoryLoading(true);
    Promise.all([
      fetchEntityHistory('table_row', row.id),
      fetchEntityHistory('table_cell', row.id),
    ])
      .then(([rowEvents, cellEvents]) => {
        const combined = [...(rowEvents || []), ...(cellEvents || [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setHistoryEvents(combined);
      })
      .catch(error => {
        console.error('Failed to load row history:', error);
        setHistoryEvents([]);
      })
      .finally(() => setHistoryLoading(false));
  }, [open, row?.id]);

  const patch = useMemo(() => {
    const next: Record<string, any> = {};
    for (const col of orderedColumns) {
      const key = col.key;
      const before = baseData?.[key];
      const after = draft?.[key];
      const isEqual =
        Array.isArray(before) && Array.isArray(after)
          ? before.length === after.length && before.every((v, idx) => v === after[idx])
          : before === after;
      if (!isEqual) {
        if (col.type === 'select' && after === '') next[key] = null;
        else next[key] = after;
      }
    }
    return next;
  }, [orderedColumns, baseData, draft]);

  const isDirty = Object.keys(patch).length > 0;

  const title = row ? `Row #${row.rowNumber}` : 'Row';

  const applySave = async (intent: 'save' | 'close' | 'next') => {
    if (!row) return;
    if (!isDirty) {
      if (intent === 'close') onClose();
      if (intent === 'next') {
        await onSaveAndNext?.(row.id, {});
      }
      return;
    }

    setSaving(true);
    try {
      if (intent === 'close' && onSaveAndClose) {
        await onSaveAndClose(row.id, patch);
      } else if (intent === 'next' && onSaveAndNext) {
        await onSaveAndNext(row.id, patch);
      } else {
        await onSave(row.id, patch);
        setBaseData(prev => ({ ...(prev || {}), ...patch }));
      }
    } catch (error) {
      console.error('Failed to save row:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!row) return null;

  return (
    <DrawerShell isOpen={open} onClose={onClose} title={title} position="right" width="lg">
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`rounded-md px-3 py-1 ${
              activeTab === 'details' ? 'bg-gray-900 text-white' : 'text-gray-600'
            }`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`rounded-md px-3 py-1 ${
              activeTab === 'history' ? 'bg-gray-900 text-white' : 'text-gray-600'
            }`}
          >
            History
          </button>
        </div>

        <div className={activeTab === 'details' ? 'space-y-6' : 'hidden'}>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Meta</div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">Row number</span>
              <span className="font-semibold text-gray-900">{row.rowNumber}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">Row id</span>
              <span className="font-mono text-xs text-gray-800">{row.id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-900">
            {mode === 'edit' ? 'Edit fields' : 'Fields'}
          </div>
          {mode === 'view' ? (
            <button
              type="button"
              onClick={() => onModeChange?.('edit')}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(baseData);
                onModeChange?.('view');
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="space-y-3">
          {orderedColumns.map(col => {
            const value = mode === 'edit' ? draft[col.key] : row.data?.[col.key];
            const options = Array.isArray((col.config as any)?.options)
              ? ((col.config as any).options as unknown[]).map(v => String(v))
              : [];

            return (
              <div key={col.key} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {col.title || col.key}
                </div>

                {mode === 'view' ? (
                  <div className="mt-2 text-sm font-semibold text-gray-900">
                    {formatValue(col.type, value)}
                  </div>
                ) : col.type === 'boolean' ? (
                  <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={e =>
                        setDraft(prev => ({
                          ...prev,
                          [col.key]: e.target.checked,
                        }))
                      }
                      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <span>{value ? 'Yes' : 'No'}</span>
                  </label>
                ) : col.type === 'number' ? (
                  <input
                    type="number"
                    step="any"
                    value={value === null || value === undefined ? '' : String(value)}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        [col.key]: e.target.value.trim() === '' ? null : Number(e.target.value),
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                ) : col.type === 'date' ? (
                  <input
                    type="date"
                    value={value ? String(value) : ''}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        [col.key]: e.target.value.trim() ? e.target.value.trim() : null,
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                ) : col.type === 'select' && options.length ? (
                  <select
                    value={String(value ?? '')}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        [col.key]: e.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">—</option>
                    {options.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : col.type === 'multi_select' && options.length ? (
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {options.map(opt => {
                      const selected = Array.isArray(value) && value.includes(opt);
                      return (
                        <label
                          key={opt}
                          className="inline-flex items-center gap-2 text-sm text-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={e => {
                              const next = Array.isArray(value) ? [...value] : [];
                              const updated = e.target.checked
                                ? Array.from(new Set([...next, opt]))
                                : next.filter(v => v !== opt);
                              setDraft(prev => ({
                                ...prev,
                                [col.key]: updated,
                              }));
                            }}
                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={value === null || value === undefined ? '' : String(value)}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        [col.key]: e.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                )}
              </div>
            );
          })}
        </div>

        {mode === 'edit' && (
          <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-gray-200 bg-white px-6 py-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => applySave('save')}
                disabled={saving || !isDirty}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => applySave('close')}
                disabled={saving}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save & close
              </button>
              <button
                type="button"
                onClick={() => applySave('next')}
                disabled={saving}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply & next
              </button>
            </div>
          </div>
        )}
        </div>

        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyLoading ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
                Loading history...
              </div>
            ) : (
              <EntityHistoryTimeline
                events={historyEvents}
                onSelect={event => {
                  setSelectedHistoryEvent(event);
                  setHistoryDrawerOpen(true);
                }}
              />
            )}
          </div>
        )}
      </div>

      <AuditEventDrawer
        event={selectedHistoryEvent}
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
      />
    </DrawerShell>
  );
}
