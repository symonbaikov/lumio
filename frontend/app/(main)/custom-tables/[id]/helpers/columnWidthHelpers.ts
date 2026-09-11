import type { Dispatch, SetStateAction } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';

export const DEFAULT_COLUMN_WIDTH = 180;
export const MIN_COLUMN_WIDTH = 60;
export const MAX_COLUMN_WIDTH = 1200;

interface MinimalColumn {
  key: string;
  width?: number;
}

function isValidWidth(v: number | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

type ResolveWidthArgs = {
  serverWidth?: number;
  localWidth?: number;
  colWidth?: number;
  hasServerWidths: boolean;
};
export function resolveColumnWidth({
  serverWidth,
  localWidth,
  colWidth,
  hasServerWidths,
}: ResolveWidthArgs): number {
  const priority = hasServerWidths
    ? [serverWidth, localWidth, colWidth]
    : [localWidth, serverWidth, colWidth];
  return priority.find(isValidWidth) ?? DEFAULT_COLUMN_WIDTH;
}

export function loadLocalWidths(tableId: string): Record<string, number> {
  const storageKey = `custom-table:${tableId}:column-widths`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, number>;
    }
  } catch {
    /* ignore storage errors */
  }
  return {};
}

type ViewCols = Record<string, { width?: number }>;
export function hasServerColumnWidths(viewCols: ViewCols): boolean {
  return Object.values(viewCols).some(e => isValidWidth(e?.width));
}

type ViewSettings = { columns?: ViewCols } | null | undefined;
export function initColumnWidths(
  tableId: string,
  cols: MinimalColumn[],
  viewSettings: ViewSettings,
): Record<string, number> {
  const localWidths = loadLocalWidths(tableId);
  const viewCols = viewSettings?.columns ?? {};
  const hasServerWidths = hasServerColumnWidths(viewCols);
  const newWidths: Record<string, number> = {};
  for (const col of cols) {
    newWidths[col.key] = resolveColumnWidth({
      serverWidth: viewCols[col.key]?.width,
      localWidth: localWidths[col.key],
      colWidth: col.width,
      hasServerWidths,
    });
  }
  return newWidths;
}

type SaveLocalArgs = {
  tableId: string;
  colKey: string;
  width: number;
  setWidths: Dispatch<SetStateAction<Record<string, number>>>;
};
export function saveLocalColumnWidth({ tableId, colKey, width, setWidths }: SaveLocalArgs): void {
  const storageKey = `custom-table:${tableId}:column-widths`;
  setWidths(prev => {
    const next = { ...prev, [colKey]: width };
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    return next;
  });
}

type SaveServerArgs = {
  tableId: string;
  colKey: string;
  width: number;
  errorMsg: string;
  timers: Map<string, number>;
};
export async function saveWidthToServer({
  tableId,
  colKey,
  width,
  errorMsg,
  timers,
}: SaveServerArgs): Promise<void> {
  try {
    await apiClient.patch(`/custom-tables/${tableId}/view-settings/columns`, {
      columnKey: colKey,
      width,
    });
  } catch (error) {
    console.error('Failed to persist column width:', error);
    toast.error(errorMsg);
  } finally {
    timers.delete(colKey);
  }
}
