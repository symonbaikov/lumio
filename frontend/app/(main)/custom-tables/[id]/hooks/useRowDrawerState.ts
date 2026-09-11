import React, { useEffect, useMemo, useState } from 'react';
import type { AuditEvent } from '@/lib/api/audit';
import { fetchEntityHistory } from '@/lib/api/audit';
import { computePatch, normalizeValue } from '../helpers/rowDrawerHelpers';
import type {
  CustomTableCellValue,
  CustomTableColumn,
  CustomTableGridRow,
  CustomTableRowPatch,
} from '../utils/stylingUtils';

export type DrawerMode = 'view' | 'edit';
export type SaveIntent = 'save' | 'close' | 'next';
export type RowSaveCallback = (rowId: string, patchData: CustomTableRowPatch) => Promise<void>;

export interface RowDrawerSaveHandlers {
  onClose: () => void;
  onSave: RowSaveCallback;
  onSaveAndClose?: RowSaveCallback;
  onSaveAndNext?: RowSaveCallback;
}

interface UseRowDrawerStateParams {
  open: boolean;
  row: CustomTableGridRow | null;
  columns: CustomTableColumn[];
  handlers: RowDrawerSaveHandlers;
}

export interface UseRowDrawerStateReturn {
  orderedColumns: CustomTableColumn[];
  baseData: CustomTableRowPatch;
  draft: CustomTableRowPatch;
  saving: boolean;
  activeTab: 'details' | 'history';
  historyEvents: AuditEvent[];
  historyLoading: boolean;
  selectedHistoryEvent: AuditEvent | null;
  historyDrawerOpen: boolean;
  patch: CustomTableRowPatch;
  isDirty: boolean;
  setDraft: React.Dispatch<React.SetStateAction<CustomTableRowPatch>>;
  setActiveTab: React.Dispatch<React.SetStateAction<'details' | 'history'>>;
  setBaseData: React.Dispatch<React.SetStateAction<CustomTableRowPatch>>;
  setSelectedHistoryEvent: React.Dispatch<React.SetStateAction<AuditEvent | null>>;
  setHistoryDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  applySave: (intent: SaveIntent) => void;
}

function byCreatedAtDesc(a: AuditEvent, b: AuditEvent): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function byPosition(a: CustomTableColumn, b: CustomTableColumn): number {
  return (a.position ?? 0) - (b.position ?? 0);
}

async function loadRowHistory(rowId: string): Promise<AuditEvent[]> {
  const [rowEvents, cellEvents] = await Promise.all([
    fetchEntityHistory('table_row', rowId),
    fetchEntityHistory('table_cell', rowId),
  ]);
  return [...(rowEvents ?? []), ...(cellEvents ?? [])].sort(byCreatedAtDesc);
}

interface ExecuteSaveParams {
  intent: SaveIntent;
  rowId: string;
  patch: CustomTableRowPatch;
  isDirty: boolean;
  handlers: RowDrawerSaveHandlers;
  setBaseData: (updater: (prev: CustomTableRowPatch) => CustomTableRowPatch) => void;
}

async function executeCleanIntent(
  params: Pick<ExecuteSaveParams, 'intent' | 'rowId' | 'handlers'>,
): Promise<void> {
  const { intent, rowId, handlers } = params;
  if (intent === 'close') {
    handlers.onClose();
  }
  if (intent === 'next') {
    await handlers.onSaveAndNext?.(rowId, {});
  }
}

async function executeDirtyIntent(params: ExecuteSaveParams): Promise<void> {
  const { intent, rowId, patch, handlers, setBaseData } = params;
  const handler =
    (intent === 'close' && handlers.onSaveAndClose) ||
    (intent === 'next' && handlers.onSaveAndNext) ||
    null;
  if (handler) {
    await handler(rowId, patch);
    return;
  }
  await handlers.onSave(rowId, patch);
  setBaseData(prev => ({ ...(prev ?? {}), ...patch }));
}

async function executeSaveIntent(params: ExecuteSaveParams): Promise<void> {
  if (!params.isDirty) {
    await executeCleanIntent(params);
    return;
  }
  await executeDirtyIntent(params);
}

interface UseDataStateParams {
  row: CustomTableGridRow | null;
  orderedColumns: CustomTableColumn[];
}

function useDataState({ row, orderedColumns }: UseDataStateParams): {
  baseData: CustomTableRowPatch;
  draft: CustomTableRowPatch;
  setBaseData: React.Dispatch<React.SetStateAction<CustomTableRowPatch>>;
  setDraft: React.Dispatch<React.SetStateAction<CustomTableRowPatch>>;
} {
  const [baseData, setBaseData] = useState<CustomTableRowPatch>({});
  const [draft, setDraft] = useState<CustomTableRowPatch>({});

  useEffect(() => {
    if (!row) {
      setBaseData({});
      setDraft({});
      return;
    }
    const initial: CustomTableRowPatch = {};
    for (const col of orderedColumns) {
      initial[col.key] = normalizeValue(col.type, row.data?.[col.key]) as CustomTableCellValue;
    }
    setBaseData(initial);
    setDraft(initial);
  }, [row, orderedColumns]);

  return { baseData, draft, setBaseData, setDraft };
}

interface UseHistoryStateParams {
  open: boolean;
  row: CustomTableGridRow | null;
}

function useHistoryState({ open, row }: UseHistoryStateParams): {
  historyEvents: AuditEvent[];
  historyLoading: boolean;
  selectedHistoryEvent: AuditEvent | null;
  historyDrawerOpen: boolean;
  setSelectedHistoryEvent: React.Dispatch<React.SetStateAction<AuditEvent | null>>;
  setHistoryDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
} {
  const [historyEvents, setHistoryEvents] = useState<AuditEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<AuditEvent | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  useEffect(() => {
    if (!(open && row)) {
      return;
    }
    setHistoryLoading(true);
    void loadRowHistory(row.id)
      .then(setHistoryEvents)
      .catch((error: unknown) => {
        console.error('Failed to load row history:', error);
        setHistoryEvents([]);
      })
      .finally(() => setHistoryLoading(false));
  }, [open, row]);

  return {
    historyEvents,
    historyLoading,
    selectedHistoryEvent,
    historyDrawerOpen,
    setSelectedHistoryEvent,
    setHistoryDrawerOpen,
  };
}

export function useRowDrawerState({
  open,
  row,
  columns,
  handlers,
}: UseRowDrawerStateParams): UseRowDrawerStateReturn {
  const orderedColumns = useMemo(() => [...columns].sort(byPosition), [columns]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const { baseData, draft, setBaseData, setDraft } = useDataState({ row, orderedColumns });
  const historyState = useHistoryState({ open, row });
  const patch = useMemo(
    () => computePatch({ orderedColumns, baseData, draft }) as CustomTableRowPatch,
    [orderedColumns, baseData, draft],
  );
  const isDirty = Object.keys(patch).length > 0;

  function applySave(intent: SaveIntent): void {
    if (!row) {
      return;
    }
    setSaving(true);
    void executeSaveIntent({ intent, rowId: row.id, patch, isDirty, handlers, setBaseData })
      .catch((error: unknown) => {
        console.error('Failed to save row:', error);
      })
      .finally(() => setSaving(false));
  }

  return {
    orderedColumns,
    baseData,
    draft,
    saving,
    activeTab,
    patch,
    isDirty,
    setDraft,
    setActiveTab,
    setBaseData,
    applySave,
    ...historyState,
  };
}
