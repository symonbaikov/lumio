'use client';

import { AuditEventDrawer } from '@/app/audit/components/AuditEventDrawer';
import CustomDatePicker from '@/app/components/CustomDatePicker';
import { EntityHistoryTimeline } from '@/app/audit/components/EntityHistoryTimeline';
import { Checkbox } from '@/app/components/ui/checkbox';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import type { AuditEvent } from '@/lib/api/audit';
import { fetchEntityHistory } from '@/lib/api/audit';
import { Box, Divider, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type {
  ColumnType,
  CustomTableColumn,
  CustomTableGridRow,
  CustomTableRowPatch,
} from '../utils/stylingUtils';

type DrawerMode = 'view' | 'edit';

interface RowDrawerProps {
  open: boolean;
  mode: DrawerMode;
  row: CustomTableGridRow | null;
  columns: CustomTableColumn[];
  onClose: () => void;
  onModeChange?: (mode: DrawerMode) => void;
  onSave: (rowId: string, patchData: CustomTableRowPatch) => Promise<void>;
  onSaveAndClose?: (rowId: string, patchData: CustomTableRowPatch) => Promise<void>;
  onSaveAndNext?: (rowId: string, patchData: CustomTableRowPatch) => Promise<void>;
}

const getColumnOptions = (column: CustomTableColumn): string[] => {
  return Array.isArray(column.config?.options)
    ? column.config.options.map(option => String(option))
    : [];
};

const isNullish = (v: unknown): v is null | undefined | '' => v === null || v === undefined || v === '';

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) { return true; }
  if (!Array.isArray(a) || !Array.isArray(b)) { return false; }
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

const normalizers: Record<ColumnType, (v: unknown) => unknown> = {
  boolean: v => Boolean(v),
  number: v => (isNullish(v) ? null : Number(v)),
  multi_select: v => {
    if (Array.isArray(v)) { return v.map(item => String(item)); }
    return isNullish(v) ? [] : [String(v)];
  },
  date: v => (isNullish(v) ? null : String(v)),
  select: v => (v === null || v === undefined ? '' : String(v)),
  text: v => (v === null || v === undefined ? '' : String(v)),
  url: v => (v === null || v === undefined ? '' : String(v)),
};

const normalizeValue = (type: ColumnType, value: unknown): unknown => {
  const fn = normalizers[type];
  return fn ? fn(value) : (value === null || value === undefined ? '' : String(value));
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

function MultiSelectEditor({ value, options, colKey, setDraft }: {
  value: unknown; options: string[]; colKey: string;
  setDraft: React.Dispatch<React.SetStateAction<CustomTableRowPatch>>;
}) {
  return (
    <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '1fr', gap: 1 }}>
      {options.map(opt => {
        const selected = Array.isArray(value) && value.includes(opt);
        return (
          <Box key={opt} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            <Checkbox
              checked={selected}
              onCheckedChange={checked => {
                const next = Array.isArray(value) ? [...value] : [];
                const updated = checked ? Array.from(new Set([...next, opt])) : next.filter(v => v !== opt);
                setDraft(prev => ({ ...prev, [colKey]: updated }));
              }}
              className="h-5 w-5"
            />
            <Typography style={{ fontSize: 14, color: 'var(--foreground)' }}>{opt}</Typography>
          </Box>
        );
      })}
    </Box>
  );
}

function ColumnFieldEditor({ col, value, options, inputSx, setDraft }: {
  col: CustomTableColumn; value: unknown; options: string[];
  inputSx: React.CSSProperties;
  setDraft: React.Dispatch<React.SetStateAction<CustomTableRowPatch>>;
}) {
  const updateField = (v: unknown) => setDraft(prev => ({ ...prev, [col.key]: v }));

  if (col.type === 'boolean') {
    return (
      <Box sx={{ mt: 1.5, display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        <Checkbox checked={Boolean(value)} onCheckedChange={checked => updateField(checked)} className="h-5 w-5" />
        <Typography style={{ fontSize: 14, color: 'var(--foreground)' }}>{value ? 'Yes' : 'No'}</Typography>
      </Box>
    );
  }

  if (col.type === 'number') {
    return (
      <input type="number" step="any" value={isNullish(value) ? '' : String(value)}
        onChange={e => updateField(e.target.value.trim() === '' ? null : Number(e.target.value))} style={inputSx} />
    );
  }

  if (col.type === 'date') {
    return (
      <CustomDatePicker
        value={value ? String(value) : ''}
        onChange={nextValue => updateField(nextValue.trim() || null)}
      />
    );
  }

  if (col.type === 'select' && options.length) {
    return (
      <select value={String(value ?? '')} onChange={e => updateField(e.target.value)} style={inputSx}>
        <option value="">—</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }

  if (col.type === 'multi_select' && options.length) {
    return <MultiSelectEditor value={value} options={options} colKey={col.key} setDraft={setDraft} />;
  }

  return (
    <input type="text" value={isNullish(value) ? '' : String(value)}
      onChange={e => updateField(e.target.value)} style={inputSx} />
  );
}

function HistoryTab({ loading, events, onSelectEvent }: {
  loading: boolean; events: AuditEvent[]; onSelectEvent: (e: AuditEvent) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {loading ? (
        <Box sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', p: 2 }}>
          <Typography style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>Loading history...</Typography>
        </Box>
      ) : (
        <EntityHistoryTimeline events={events} onSelect={onSelectEvent} />
      )}
    </Box>
  );
}

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

  const [baseData, setBaseData] = useState<CustomTableRowPatch>({});
  const [draft, setDraft] = useState<CustomTableRowPatch>({});
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
    const initial: CustomTableRowPatch = {};
    for (const col of orderedColumns) {
      initial[col.key] = normalizeValue(col.type, row.data?.[col.key]);
    }
    setBaseData(initial);
    setDraft(initial);
  }, [row?.id, orderedColumns]);

  useEffect(() => {
    if (!open || !row) return;
    setHistoryLoading(true);
    Promise.all([fetchEntityHistory('table_row', row.id), fetchEntityHistory('table_cell', row.id)])
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
    const next: CustomTableRowPatch = {};
    for (const col of orderedColumns) {
      const before = baseData?.[col.key];
      const after = draft?.[col.key];
      if (shallowEqual(before, after)) {
        continue;
      }
      next[col.key] = col.type === 'select' && after === '' ? null : after;
    }
    return next;
  }, [orderedColumns, baseData, draft]);

  const isDirty = Object.keys(patch).length > 0;

  const title = row ? `Row #${row.rowNumber}` : 'Row';

  const handleNonDirtySave = (intent: string) => {
    if (intent === 'close') { onClose(); }
    if (intent === 'next') { void onSaveAndNext?.(row!.id, {}); }
  };

  const getSaveHandler = (intent: string): (() => Promise<void>) | null => {
    if (intent === 'close' && onSaveAndClose) { return () => onSaveAndClose(row!.id, patch); }
    if (intent === 'next' && onSaveAndNext) { return () => onSaveAndNext(row!.id, patch); }
    return null;
  };

  const applySave = async (intent: 'save' | 'close' | 'next') => {
    if (!row) { return; }
    if (!isDirty) { handleNonDirtySave(intent); return; }

    setSaving(true);
    try {
      const handler = getSaveHandler(intent);
      if (handler) {
        await handler();
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

  const inputSx = {
    width: '100%',
    border: '1px solid var(--border-color)',
    padding: '8px 12px',
    fontSize: 14,
    marginTop: 8,
    boxSizing: 'border-box' as const,
  };

  return (
    <DrawerShell isOpen={open} onClose={onClose} title={title} position="right" width="lg">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid var(--border-color)', pb: 1 }}>
          <Box
            component="button"
            type="button"
            onClick={() => setActiveTab('details')}
            sx={{ px: 1.5, py: 0.5, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', bgcolor: activeTab === 'details' ? 'var(--foreground)' : 'transparent', color: activeTab === 'details' ? 'var(--background)' : 'var(--text-secondary)' }}
          >
            Details
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => setActiveTab('history')}
            sx={{ px: 1.5, py: 0.5, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', bgcolor: activeTab === 'history' ? 'var(--foreground)' : 'transparent', color: activeTab === 'history' ? 'var(--background)' : 'var(--text-secondary)' }}
          >
            History
          </Box>
        </Box>

        {activeTab === 'details' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ border: '1px solid var(--border-color)', bgcolor: 'var(--muted)', p: 2 }}>
              <Typography style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-foreground)' }}>Meta</Typography>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Typography style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Row number</Typography>
                  <Typography style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{row.rowNumber}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Typography style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Row id</Typography>
                  <Typography style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--foreground)' }}>{row.id}</Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
              <Typography style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
                {mode === 'edit' ? 'Edit fields' : 'Fields'}
              </Typography>
              {mode === 'view' ? (
                <Box
                  component="button"
                  type="button"
                  onClick={() => onModeChange?.('edit')}
                  sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', px: 1.5, py: 0.75, fontSize: 12, fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  Edit
                </Box>
              ) : (
                <Box
                  component="button"
                  type="button"
                  onClick={() => {
                    setDraft(baseData);
                    onModeChange?.('view');
                  }}
                  sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', px: 1.5, py: 0.75, fontSize: 12, fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  Cancel
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {orderedColumns.map(col => {
                const value = mode === 'edit' ? draft[col.key] : row.data?.[col.key];
                const options = getColumnOptions(col);

                return (
                  <Box key={col.key} sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', p: 2 }}>
                    <Typography style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-foreground)' }}>
                      {col.title || col.key}
                    </Typography>

                    {mode === 'view' ? (
                      <Typography style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
                        {formatValue(col.type, value)}
                      </Typography>
                    ) : (
                      <ColumnFieldEditor col={col} value={value} options={options} inputSx={inputSx} setDraft={setDraft} />
                    )}
                  </Box>
                );
              })}
            </Box>

            {mode === 'edit' && (
              <Box sx={{ position: 'sticky', bottom: 0, mx: -3, mb: -3, borderTop: '1px solid var(--border-color)', bgcolor: 'background.paper', px: 3, py: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => applySave('save')}
                    disabled={saving || !isDirty}
                    sx={{ bgcolor: 'primary.main', color: '#fff', px: 2, py: 1, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', '&:hover': { bgcolor: 'primary.dark' }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Box>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => applySave('close')}
                    disabled={saving}
                    sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', color: 'var(--foreground)', px: 2, py: 1, fontSize: 14, fontWeight: 600, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } }}
                  >
                    Save & close
                  </Box>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => applySave('next')}
                    disabled={saving}
                    sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', color: 'var(--foreground)', px: 2, py: 1, fontSize: 14, fontWeight: 600, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } }}
                  >
                    Apply & next
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {activeTab === 'history' && (
          <HistoryTab
            loading={historyLoading}
            events={historyEvents}
            onSelectEvent={event => { setSelectedHistoryEvent(event); setHistoryDrawerOpen(true); }}
          />
        )}
      </Box>

      <AuditEventDrawer
        event={selectedHistoryEvent}
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
      />
    </DrawerShell>
  );
}
