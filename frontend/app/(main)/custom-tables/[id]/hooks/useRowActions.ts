'use client';

import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';
import { createDraftRow, isDraftReadyToSave, isDraftRowId } from '../helpers/draftRowHelpers';
import { extractRowData, parseCreateRowResponse } from '../helpers/rowActionHelpers';
import type {
  CustomTableCellValue,
  CustomTableColumn,
  CustomTableGridRow,
  CustomTableRowPatch,
  CustomTableRowStyles,
} from '../utils/stylingUtils';

interface UseRowActionsMessages {
  addRowLoading: string;
  addRowSuccess: string;
  addRowFailed: string;
  saveValueFailed: string;
  noMoreRows: string;
}

interface UseRowActionsParams {
  tableId: string | null;
  paidColKey: string | null;
  /** Все колонки таблицы, включая скрытые: по ним решается, готов ли черновик. */
  columns: CustomTableColumn[];
  rows: CustomTableGridRow[];
  displayRows: CustomTableGridRow[];
  setRows: React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
  refreshStats: () => Promise<void>;
  /** Любая сохранённая правка строк — итоги и группы считает сервер, их надо перечитать. */
  onRowsMutated?: () => void;
  openRowDrawer: (rowId: string, mode: 'view' | 'edit') => void;
  closeRowDrawer: () => void;
  messages: UseRowActionsMessages;
}

export interface UseRowActionsReturn {
  createRow: () => Promise<CustomTableGridRow | null>;
  updateCellFromGrid: (
    rowId: string,
    columnKey: string,
    value: CustomTableCellValue,
  ) => Promise<void>;
  updateRowFromDrawer: (rowId: string, patchData: CustomTableRowPatch) => Promise<void>;
  updateRowStyle: (rowId: string, styles: CustomTableRowStyles) => Promise<void>;
  saveRowFromDrawer: (rowId: string, patchData: CustomTableRowPatch) => Promise<void>;
  saveRowAndCloseDrawer: (rowId: string, patchData: CustomTableRowPatch) => Promise<void>;
  saveRowAndNext: (rowId: string, patchData: CustomTableRowPatch) => Promise<void>;
}

export function useRowActions({
  tableId,
  paidColKey,
  columns,
  rows,
  displayRows,
  setRows,
  refreshStats,
  onRowsMutated,
  openRowDrawer,
  closeRowDrawer,
  messages,
}: UseRowActionsParams): UseRowActionsReturn {
  const draftSeqRef = useRef(0);
  // Строка, по которой POST уже летит: без этого две быстрые правки ячеек
  // создали бы на сервере две строки вместо одной.
  const promotingRef = useRef<Set<string>>(new Set());

  // Строка создаётся локально: пустую строку бэкенд отвергает, пока в таблице
  // есть колонка с isRequired. Запись — в promoteDraftRow.
  const createRow = useCallback(async (): Promise<CustomTableGridRow | null> => {
    if (!tableId) {
      return null;
    }
    draftSeqRef.current += 1;
    const draft = createDraftRow(draftSeqRef.current, rows.length + 1);
    setRows(prev => [...prev, draft]);
    return draft;
  }, [tableId, rows.length, setRows]);

  const promoteDraftRow = useCallback(
    async (rowId: string, nextData: CustomTableRowPatch): Promise<void> => {
      if (!tableId || promotingRef.current.has(rowId)) {
        return;
      }
      if (!isDraftReadyToSave(nextData, columns)) {
        return;
      }
      promotingRef.current.add(rowId);
      const toastId = toast.loading(messages.addRowLoading);

      await (async () => {
        const response = await apiClient.post(`/custom-tables/${tableId}/rows`, {
          data: nextData,
        });
        const created = parseCreateRowResponse(response.data, rows.length);
        if (!created) {
          throw new Error('Invalid create row response');
        }
        setRows(prev =>
          prev.map(r =>
            r.id === rowId
              ? { ...created, data: { ...nextData, ...(created.data || {}) }, styles: r.styles }
              : r,
          ),
        );
        toast.success(messages.addRowSuccess, { id: toastId });
        refreshStats();
        onRowsMutated?.();
      })()
        .catch(async error => {
          // Строка остаётся черновиком: следующая правка ячейки попробует снова.
          console.error('Failed to add row:', error);
          toast.error(messages.addRowFailed, { id: toastId });
        })
        .finally(async () => {
          promotingRef.current.delete(rowId);
        });
    },
    [tableId, columns, rows.length, setRows, refreshStats, onRowsMutated, messages],
  );

  const updateCellFromGrid = useCallback(
    async (rowId: string, columnKey: string, value: CustomTableCellValue) => {
      if (!tableId) {
        return;
      }
      if (isDraftRowId(rowId)) {
        const nextData = { ...(rows.find(r => r.id === rowId)?.data || {}), [columnKey]: value };
        setRows(prev => prev.map(r => (r.id === rowId ? { ...r, data: nextData } : r)));
        if (columnKey === paidColKey) {
          refreshStats();
        }
        await promoteDraftRow(rowId, nextData);
        return;
      }

      await (async () => {
        const response = await apiClient.patch(`/custom-tables/${tableId}/rows/${rowId}`, {
          data: { [columnKey]: value },
        });
        const returned = extractRowData(response?.data);
        setRows(prev =>
          prev.map(r =>
            r.id === rowId
              ? { ...r, data: { ...(r.data || {}), [columnKey]: value, ...returned } }
              : r,
          ),
        );
        if (columnKey === paidColKey) {
          refreshStats();
        }
        onRowsMutated?.();
      })().catch(async error => {
        console.error('Failed to update cell:', error);
        toast.error(messages.saveValueFailed);
      });
    },
    [
      tableId,
      paidColKey,
      rows,
      setRows,
      refreshStats,
      onRowsMutated,
      promoteDraftRow,
      messages.saveValueFailed,
    ],
  );

  const updateRowFromDrawer = useCallback(
    async (rowId: string, patchData: CustomTableRowPatch) => {
      if (!tableId) {
        return;
      }
      if (!Object.keys(patchData).length) {
        return;
      }
      if (isDraftRowId(rowId)) {
        const nextData = { ...(rows.find(r => r.id === rowId)?.data || {}), ...patchData };
        setRows(prev => prev.map(r => (r.id === rowId ? { ...r, data: nextData } : r)));
        if (paidColKey && Object.hasOwn(patchData, paidColKey)) {
          refreshStats();
        }
        await promoteDraftRow(rowId, nextData);
        return;
      }
      const response = await apiClient.patch(`/custom-tables/${tableId}/rows/${rowId}`, {
        data: patchData,
      });
      const returned = extractRowData(response?.data);
      setRows(prev =>
        prev.map(r =>
          r.id === rowId ? { ...r, data: { ...(r.data || {}), ...patchData, ...returned } } : r,
        ),
      );
      if (paidColKey && Object.hasOwn(patchData, paidColKey)) {
        refreshStats();
      }
      onRowsMutated?.();
    },
    [tableId, paidColKey, rows, setRows, refreshStats, onRowsMutated, promoteDraftRow],
  );

  const updateRowStyle = useCallback(
    async (rowId: string, styles: CustomTableRowStyles) => {
      if (!tableId) {
        return;
      }

      return await (async () => {
        const row = rows.find(r => r.id === rowId);
        const mergedStyles = { ...(row?.styles || {}), ...styles };
        if (isDraftRowId(rowId)) {
          setRows(prev => prev.map(r => (r.id === rowId ? { ...r, styles: mergedStyles } : r)));
          return;
        }
        await apiClient.patch(`/custom-tables/${tableId}/rows/${rowId}`, {
          data: row?.data || {},
          styles: mergedStyles,
        });
        setRows(prev => prev.map(r => (r.id === rowId ? { ...r, styles: mergedStyles } : r)));
      })().catch(async error => {
        console.error('Failed to update row styles:', error);
        toast.error(messages.saveValueFailed);
      });
    },
    [tableId, rows, setRows, messages.saveValueFailed],
  );

  const saveRowFromDrawer = useCallback(
    async (rowId: string, patchData: CustomTableRowPatch) => {
      await (async () => {
        await updateRowFromDrawer(rowId, patchData);
      })().catch(async error => {
        console.error('Failed to update row:', error);
        toast.error(messages.saveValueFailed);
        throw error;
      });
    },
    [updateRowFromDrawer, messages.saveValueFailed],
  );

  const saveRowAndCloseDrawer = useCallback(
    async (rowId: string, patchData: CustomTableRowPatch) => {
      await saveRowFromDrawer(rowId, patchData);
      closeRowDrawer();
    },
    [saveRowFromDrawer, closeRowDrawer],
  );

  const saveRowAndNext = useCallback(
    async (rowId: string, patchData: CustomTableRowPatch) => {
      await saveRowFromDrawer(rowId, patchData);
      const ids = displayRows.map(r => r.id);
      const idx = ids.indexOf(rowId);
      const nextId = idx >= 0 ? ids[idx + 1] : null;
      if (nextId) {
        openRowDrawer(nextId, 'edit');
      } else {
        toast(messages.noMoreRows);
      }
    },
    [saveRowFromDrawer, displayRows, openRowDrawer, messages.noMoreRows],
  );

  return {
    createRow,
    updateCellFromGrid,
    updateRowFromDrawer,
    updateRowStyle,
    saveRowFromDrawer,
    saveRowAndCloseDrawer,
    saveRowAndNext,
  };
}
