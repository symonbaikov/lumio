'use client';

import apiClient from '@/app/lib/api';
import toast from 'react-hot-toast';
import type { PastePreviewData } from '../utils/pasteUtils';
import type {
  CustomTableCellValue,
  CustomTableGridRow,
  CustomTableRowPatch,
} from '../utils/stylingUtils';
import { getResponseItems } from '../utils/tableHelpers';

interface NewColumnSpec {
  mode: string;
  newTitle?: string;
  newType?: string;
  columnKey?: string | null;
}
type ResponseObj = Record<string, unknown>;

function getResponseKey(data: ResponseObj): string | null {
  const nested =
    typeof data.data === 'object' && data.data !== null ? (data.data as ResponseObj) : null;
  const key = nested ? nested.key : data.key;
  return typeof key === 'string' ? key : null;
}

function extractColKey(responseData: unknown, placeholder: string): [string, string] | null {
  if (!placeholder) {
    return null;
  }
  if (!responseData || typeof responseData !== 'object') {
    return null;
  }
  const key = getResponseKey(responseData as ResponseObj);
  return key ? [placeholder, key] : null;
}

export async function createPasteColumns(
  tableId: string,
  cols: NewColumnSpec[],
  loadTable: () => Promise<void>,
): Promise<Map<string, string>> {
  if (!cols.length) {
    return new Map();
  }
  const responses = await Promise.all(
    cols.map(col =>
      apiClient.post(`/custom-tables/${tableId}/columns`, {
        title: col.newTitle?.trim() || '',
        type: col.newType || 'text',
      }),
    ),
  );
  const entries = responses.flatMap((r, i) => {
    const e = extractColKey(r.data as unknown, cols[i]?.columnKey ?? '');
    return e ? [e] : [];
  });
  await loadTable();
  return new Map(entries);
}

export function buildPastePayload(
  dataRows: Record<string, unknown>[],
  keyMap: Map<string, string>,
): { data: CustomTableRowPatch }[] {
  return dataRows.map(row => {
    const data: CustomTableRowPatch = {};
    for (const [key, value] of Object.entries(row)) {
      data[keyMap.get(key) ?? key] = value as CustomTableCellValue;
    }
    return { data };
  });
}

function firstDefined<T>(items: (T | undefined | null)[]): T | undefined {
  for (const item of items) {
    if (item !== undefined && item !== null) {
      return item;
    }
  }
  return undefined;
}

interface ExtractResult {
  normalizedRows: CustomTableGridRow[];
  createdCount: number;
}

function getNestedData(p: ResponseObj): ResponseObj {
  const data = p.data;
  return typeof data === 'object' && data !== null ? (data as ResponseObj) : {};
}

export function extractPasteResult(payload: unknown, fallbackCount: number): ExtractResult {
  const p = (payload || {}) as ResponseObj;
  const d = getNestedData(p);
  const rawRows = (firstDefined([p.rows, d.rows, p.items, d.items]) ?? []) as unknown[];
  const normalizedRows = getResponseItems(rawRows);
  const rawCount = firstDefined([p.created, d.created]);
  const createdCount =
    typeof rawCount === 'number' ? rawCount : normalizedRows.length || fallbackCount;
  return { normalizedRows, createdCount };
}

export function dedupeAndSortRows(
  prev: CustomTableGridRow[],
  created: CustomTableGridRow[],
): CustomTableGridRow[] {
  const seen = new Set<string>();
  const out: CustomTableGridRow[] = [];
  for (const row of [...prev, ...created]) {
    const id = row.id || String(row.rowNumber);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(row);
  }
  return out.sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0));
}

interface RollbackArgs {
  tableId: string;
  rowIds: string[];
  setRows: React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
  refreshStats: () => Promise<void>;
  failMessage: string;
}
export async function rollbackPastedRows({
  tableId,
  rowIds,
  setRows,
  refreshStats,
  failMessage,
}: RollbackArgs): Promise<void> {
  if (!rowIds.length) {
    return;
  }
  try {
    await Promise.all(rowIds.map(id => apiClient.delete(`/custom-tables/${tableId}/rows/${id}`)));
    setRows(prev => prev.filter(r => !rowIds.includes(r.id)));
    await refreshStats();
  } catch (error) {
    console.error('Failed to rollback rows:', error);
    toast.error(failMessage);
  }
}

interface PasteMessages {
  noRows: string;
  missingColumnTitle: string;
  insertFailed: string;
  undoFailed: string;
}

export function hasRequiredPasteContext(
  tableId: string | null,
  preview: PastePreviewData | null,
  applying: boolean,
): boolean {
  return !!tableId && !!preview && !applying;
}

interface PasteGateArgs {
  tableId: string | null;
  preview: PastePreviewData | null;
  applying: boolean;
  msgs: PasteMessages;
}
/** Returns null to proceed, false to block silently, or an error string to block with a toast. */
export function getPasteGate({
  tableId,
  preview,
  applying,
  msgs,
}: PasteGateArgs): null | false | string {
  if (!hasRequiredPasteContext(tableId, preview, applying)) {
    return false;
  }
  const p = preview as PastePreviewData;
  if (!p.dataRows.length) {
    return msgs.noRows;
  }
  if (p.hasErrors) {
    return false;
  }
  if (p.columns.some(col => col.mode === 'new' && !col.newTitle?.trim())) {
    return msgs.missingColumnTitle;
  }
  return null;
}

interface ExecutePasteArgs {
  tableId: string;
  preview: PastePreviewData;
  loadTable: () => Promise<void>;
  setRows: React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
  resetPastePreview: () => void;
  refreshStats: () => Promise<void>;
  onInsertSuccess: (count: number, onUndo: () => void) => void;
  undoFailedMessage: string;
}
export async function executePasteInsert({
  tableId,
  preview,
  loadTable,
  setRows,
  resetPastePreview,
  refreshStats,
  onInsertSuccess,
  undoFailedMessage,
}: ExecutePasteArgs): Promise<void> {
  const newCols = preview.columns.filter(col => col.mode === 'new');
  const keyMap = await createPasteColumns(tableId, newCols, loadTable);
  const payload = buildPastePayload(preview.dataRows as Record<string, unknown>[], keyMap);
  const response = await apiClient.post(`/custom-tables/${tableId}/rows/batch`, { rows: payload });
  const { normalizedRows, createdCount } = extractPasteResult(
    response.data,
    preview.dataRows.length,
  );
  if (normalizedRows.length) {
    setRows(prev => dedupeAndSortRows(prev, normalizedRows));
  }
  resetPastePreview();
  await refreshStats();
  const ids = normalizedRows.map(r => r.id).filter(Boolean) as string[];
  onInsertSuccess(createdCount, () => {
    void rollbackPastedRows({
      tableId,
      rowIds: ids,
      setRows,
      refreshStats,
      failMessage: undoFailedMessage,
    });
  });
}
