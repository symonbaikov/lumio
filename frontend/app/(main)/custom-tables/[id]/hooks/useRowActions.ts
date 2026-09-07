'use client';

import apiClient from '@/app/lib/api';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import type {
  CustomTableCellValue,
  CustomTableGridRow,
  CustomTableRowPatch,
  CustomTableRowStyles,
} from '../utils/stylingUtils';
import { getCreatedRowResponse } from '../utils/tableHelpers';

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
  rows: CustomTableGridRow[];
  displayRows: CustomTableGridRow[];
  setRows: React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
  refreshStats: () => Promise<void>;
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
  rows,
  displayRows,
  setRows,
  refreshStats,
  openRowDrawer,
  closeRowDrawer,
  messages,
}: UseRowActionsParams): UseRowActionsReturn {
  const createRow = useCallback(async (): Promise<CustomTableGridRow | null> => {
    if (!tableId) {
      return null;
    }
    const toastId = toast.loading(messages.addRowLoading);

    return await (async () => {
      const response = await apiClient.post(`/custom-tables/${tableId}/rows`, { data: {} });
      const payload = response.data?.data ?? response.data?.item ?? response.data;
      const createdRaw = Array.isArray(payload) ? payload[0] : payload;
      const created = getCreatedRowResponse(createdRaw);
      if (!created) {
        throw new Error('Invalid create row response');
      }
      created.rowNumber = created.rowNumber || rows.length + 1;
      setRows(prev => [...prev, created]);
      toast.success(messages.addRowSuccess, { id: toastId });
      refreshStats();
      return created;
    })().catch(async error => {
      console.error('Failed to add row:', error);
      toast.error(messages.addRowFailed, { id: toastId });
      return null;
    });
  }, [tableId, rows, setRows, refreshStats, messages]);

  const updateCellFromGrid = useCallback(
    async (rowId: string, columnKey: string, value: CustomTableCellValue) => {
      if (!tableId) {
        return;
      }
      if (rowId.startsWith('temp-')) {
        setRows(prev =>
          prev.map(r =>
            r.id === rowId ? { ...r, data: { ...(r.data || {}), [columnKey]: value } } : r,
          ),
        );
        if (columnKey === paidColKey) {
          refreshStats();
        }
        return;
      }

      await (async () => {
        await apiClient.patch(`/custom-tables/${tableId}/rows/${rowId}`, {
          data: { [columnKey]: value },
        });
        setRows(prev =>
          prev.map(r =>
            r.id === rowId ? { ...r, data: { ...(r.data || {}), [columnKey]: value } } : r,
          ),
        );
        if (columnKey === paidColKey) {
          refreshStats();
        }
      })().catch(async error => {
        console.error('Failed to update cell:', error);
        toast.error(messages.saveValueFailed);
      });
    },
    [tableId, paidColKey, setRows, refreshStats, messages.saveValueFailed],
  );

  const updateRowFromDrawer = useCallback(
    async (rowId: string, patchData: CustomTableRowPatch) => {
      if (!tableId) {
        return;
      }
      if (!Object.keys(patchData).length) {
        return;
      }
      if (rowId.startsWith('temp-')) {
        setRows(prev =>
          prev.map(r => (r.id === rowId ? { ...r, data: { ...(r.data || {}), ...patchData } } : r)),
        );
        if (paidColKey && Object.prototype.hasOwnProperty.call(patchData, paidColKey)) {
          refreshStats();
        }
        return;
      }
      await apiClient.patch(`/custom-tables/${tableId}/rows/${rowId}`, { data: patchData });
      setRows(prev =>
        prev.map(r => (r.id === rowId ? { ...r, data: { ...(r.data || {}), ...patchData } } : r)),
      );
      if (paidColKey && Object.prototype.hasOwnProperty.call(patchData, paidColKey)) {
        refreshStats();
      }
    },
    [tableId, paidColKey, setRows, refreshStats],
  );

  const updateRowStyle = useCallback(
    async (rowId: string, styles: CustomTableRowStyles) => {
      if (!tableId) {
        return;
      }

      return await (async () => {
        const row = rows.find(r => r.id === rowId);
        const mergedStyles = { ...(row?.styles || {}), ...styles };
        if (rowId.startsWith('temp-')) {
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
