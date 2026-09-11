'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';

export type RowFilterOp =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'startsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'search';

// Exported so page.tsx can import the type instead of re-defining it
export type ColumnFilterState = {
  min?: string;
  max?: string;
  from?: string;
  to?: string;
  op?: RowFilterOp;
  value?: string;
};

// Minimal column shape required by this hook
interface MinimalColumn {
  key: string;
  width?: number;
}

export interface UseColumnConfigReturn {
  columnOrder: string[];
  setColumnOrder: React.Dispatch<React.SetStateAction<string[]>>;
  hiddenColumnKeys: string[];
  setHiddenColumnKeys: React.Dispatch<React.SetStateAction<string[]>>;
  columnFilters: Record<string, ColumnFilterState>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, ColumnFilterState>>>;
  columnWidths: Record<string, number>;
  getColumnWidth: (colKey: string) => number;
  persistColumnWidth: (colKey: string, width: number) => Promise<void>;
  toggleColumnHidden: (key: string) => void;
  moveColumn: (key: string, direction: 'up' | 'down') => void;
  resetColumns: () => void;
}

interface UseColumnConfigParams {
  tableId: string | null;
  orderedColumns: MinimalColumn[];
  viewSettings: { columns?: Record<string, { width?: number }> } | null | undefined;
  isAuthenticated: boolean;
  columnWidthSaveFailedMessage: string;
}

const DEFAULT_COLUMN_WIDTH = 180;
const MIN_COLUMN_WIDTH = 60;
const MAX_COLUMN_WIDTH = 1200;

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function loadLocalColumnWidths(tableId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`custom-table:${tableId}:column-widths`);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function persistLocalColumnWidths(storageKey: string, widths: Record<string, number>): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(widths));
  } catch (error) {
    console.warn('Failed to persist column widths to storage:', error);
  }
}

function readStoredColumnSettings(
  storageKey: string,
): { order?: string[]; hidden?: string[] } | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as { order?: string[]; hidden?: string[] }) : null;
  } catch (error) {
    console.warn('Failed to load column settings:', error);
    return null;
  }
}

function writeStoredColumnSettings(
  storageKey: string,
  settings: { order: string[]; hidden: string[] },
): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to persist column settings:', error);
  }
}

function resolveColWidth(
  serverWidth: unknown,
  localWidth: unknown,
  colWidth: unknown,
  hasServerWidths: boolean,
): number {
  if (hasServerWidths && isFiniteNum(serverWidth)) {
    return serverWidth;
  }
  if (isFiniteNum(localWidth) && localWidth > 0) {
    return localWidth;
  }
  if (!hasServerWidths && isFiniteNum(serverWidth)) {
    return serverWidth;
  }
  if (isFiniteNum(colWidth)) {
    return colWidth;
  }
  return DEFAULT_COLUMN_WIDTH;
}

function resolveColumnWidths(
  columns: { key: string; width?: number }[],
  localWidths: Record<string, number>,
  viewCols?: Record<string, { width?: number }>,
): Record<string, number> {
  const cols = viewCols ?? {};
  const hasServerWidths = Object.values(cols).some(e => isFiniteNum(e?.width));
  const result: Record<string, number> = {};
  for (const col of columns) {
    result[col.key] = resolveColWidth(
      cols[col.key]?.width,
      localWidths[col.key],
      col.width,
      hasServerWidths,
    );
  }
  return result;
}

export function useColumnConfig({
  tableId,
  orderedColumns,
  viewSettings,
  isAuthenticated,
  columnWidthSaveFailedMessage,
}: UseColumnConfigParams): UseColumnConfigReturn {
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilterState>>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const columnWidthTimersRef = useRef<Record<string, number>>({});

  // Load column order + visibility from localStorage on mount
  useEffect(() => {
    if (!tableId) {
      return;
    }
    const parsed = readStoredColumnSettings(`custom-table:${tableId}:columns`);
    if (!parsed) {
      return;
    }
    if (Array.isArray(parsed.order)) {
      setColumnOrder(parsed.order);
    }
    if (Array.isArray(parsed.hidden)) {
      setHiddenColumnKeys(parsed.hidden);
    }
  }, [tableId]);

  // Persist column order + visibility to localStorage
  useEffect(() => {
    if (!tableId) {
      return;
    }
    writeStoredColumnSettings(`custom-table:${tableId}:columns`, {
      order: columnOrder,
      hidden: hiddenColumnKeys,
    });
  }, [tableId, columnOrder, hiddenColumnKeys]);

  // Keep columnOrder in sync when orderedColumns changes (e.g. after a column is added/removed)
  useEffect(() => {
    const keys = orderedColumns.map(c => c.key);
    setColumnOrder(prev => {
      if (!prev.length) {
        return keys;
      }
      const next = prev.filter(k => keys.includes(k));
      keys.forEach(k => {
        if (!next.includes(k)) {
          next.push(k);
        }
      });
      return next;
    });
    setHiddenColumnKeys(prev => prev.filter(k => keys.includes(k)));
  }, [orderedColumns]);

  // Initialize column widths from localStorage + server view settings
  useEffect(() => {
    if (!(tableId && orderedColumns.length)) {
      return;
    }
    const localWidths = loadLocalColumnWidths(tableId);
    const newWidths = resolveColumnWidths(orderedColumns, localWidths, viewSettings?.columns);
    setColumnWidths(newWidths);
  }, [tableId, viewSettings, orderedColumns]);

  // Cleanup pending debounced width timers on unmount
  useEffect(() => {
    return () => {
      const timers = columnWidthTimersRef.current;
      Object.values(timers).forEach(timerId => window.clearTimeout(timerId));
    };
  }, []);

  const clampWidth = (width: number) =>
    Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width));

  const getColumnWidth = (colKey: string): number => {
    const width = columnWidths[colKey];
    if (typeof width === 'number' && Number.isFinite(width)) {
      return width;
    }
    return DEFAULT_COLUMN_WIDTH;
  };

  const persistColumnWidth = async (colKey: string, width: number): Promise<void> => {
    if (!tableId) {
      return;
    }
    const prevWidth = getColumnWidth(colKey);
    const finalWidth = clampWidth(width);
    if (Math.abs(finalWidth - prevWidth) < 1) {
      return;
    }

    const storageKey = `custom-table:${tableId}:column-widths`;
    setColumnWidths(prev => {
      const next = { ...prev, [colKey]: finalWidth };
      persistLocalColumnWidths(storageKey, next);
      return next;
    });

    if (!isAuthenticated) {
      return;
    }

    const existing = columnWidthTimersRef.current[colKey];
    if (existing) {
      window.clearTimeout(existing);
    }
    columnWidthTimersRef.current[colKey] = window.setTimeout(async () => {
      await (async () => {
        await apiClient.patch(`/custom-tables/${tableId}/view-settings/columns`, {
          columnKey: colKey,
          width: finalWidth,
        });
      })()
        .catch(async error => {
          console.error('Failed to persist column width:', error);
          toast.error(columnWidthSaveFailedMessage);
        })
        .finally(async () => {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete columnWidthTimersRef.current[colKey];
        });
    }, 800);
  };

  const toggleColumnHidden = (key: string) => {
    setHiddenColumnKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  };

  const moveColumn = (key: string, direction: 'up' | 'down') => {
    setColumnOrder(prev => {
      const order = prev.length ? [...prev] : orderedColumns.map(c => c.key);
      const index = order.indexOf(key);
      if (index === -1) {
        return order;
      }
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= order.length) {
        return order;
      }
      const next = [...order];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  };

  const resetColumns = () => {
    setHiddenColumnKeys([]);
    setColumnOrder(orderedColumns.map(c => c.key));
  };

  return {
    columnOrder,
    setColumnOrder,
    hiddenColumnKeys,
    setHiddenColumnKeys,
    columnFilters,
    setColumnFilters,
    columnWidths,
    getColumnWidth,
    persistColumnWidth,
    toggleColumnHidden,
    moveColumn,
    resetColumns,
  };
}

export { DEFAULT_COLUMN_WIDTH };
