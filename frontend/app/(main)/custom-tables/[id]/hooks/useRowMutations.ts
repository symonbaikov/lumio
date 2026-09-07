'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  applyRowDataPatch,
  applyRowStylePatch,
  createRowRequest,
  hasPaidColChange,
  persistRowStyle,
  updateCellRequest,
  updateRowPatchRequest,
} from '../helpers/rowActionHelpers';
import type {
  CustomTableCellValue,
  CustomTableGridRow,
  CustomTableRowPatch,
  CustomTableRowStyles,
} from '../utils/stylingUtils';

interface UseRowMutationsMessages {
  addRowLoading: string;
  addRowSuccess: string;
  addRowFailed: string;
  saveValueFailed: string;
}

export interface UseRowMutationsParams {
  tableId: string | null;
  paidColKey: string | null;
  rows: CustomTableGridRow[];
  setRows: React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
  refreshStats: () => Promise<void>;
  messages: UseRowMutationsMessages;
}

export interface UseRowMutationsReturn {
  createRow: () => Promise<CustomTableGridRow | null>;
  updateCellFromGrid: (
    rowId: string,
    columnKey: string,
    value: CustomTableCellValue,
  ) => Promise<void>;
  updateRowFromDrawer: (rowId: string, patchData: CustomTableRowPatch) => Promise<void>;
  updateRowStyle: (rowId: string, styles: CustomTableRowStyles) => Promise<void>;
}

export function useRowMutations({
  tableId,
  paidColKey,
  rows,
  setRows,
  refreshStats,
  messages,
}: UseRowMutationsParams): UseRowMutationsReturn {
  const createRow = useCallback(async (): Promise<CustomTableGridRow | null> => {
    if (!tableId) {
      return null;
    }
    const toastId = toast.loading(messages.addRowLoading);

    return await (async () => {
      const created = await createRowRequest(tableId, rows.length);
      setRows(prev => [...prev, created]);
      toast.success(messages.addRowSuccess, { id: toastId });
      void refreshStats();
      return created;
    })().catch(async error => {
      console.error('Failed to add row:', error);
      toast.error(messages.addRowFailed, { id: toastId });
      return null;
    });
  }, [tableId, rows.length, setRows, refreshStats, messages]);

  const updateCellFromGrid = useCallback(
    async (rowId: string, columnKey: string, value: CustomTableCellValue): Promise<void> => {
      if (!tableId) {
        return;
      }
      if (!rowId.startsWith('temp-')) {
        await updateCellRequest({ tableId, rowId, columnKey, value });
      }
      setRows(prev => applyRowDataPatch(prev, rowId, { [columnKey]: value }));
      if (columnKey === paidColKey) {
        void refreshStats();
      }
    },
    [tableId, paidColKey, setRows, refreshStats],
  );

  const updateRowFromDrawer = useCallback(
    async (rowId: string, patchData: CustomTableRowPatch): Promise<void> => {
      if (!(tableId && Object.keys(patchData).length)) {
        return;
      }
      if (!rowId.startsWith('temp-')) {
        await updateRowPatchRequest(tableId, rowId, patchData);
      }
      setRows(prev => applyRowDataPatch(prev, rowId, patchData));
      if (hasPaidColChange(paidColKey, patchData)) {
        void refreshStats();
      }
    },
    [tableId, paidColKey, setRows, refreshStats],
  );

  const updateRowStyle = useCallback(
    async (rowId: string, styles: CustomTableRowStyles): Promise<void> => {
      if (!tableId) {
        return;
      }

      return await (async () => {
        const row = rows.find(r => r.id === rowId);
        const tempStyles = { ...(row?.styles || {}), ...styles };
        if (rowId.startsWith('temp-')) {
          setRows(prev => applyRowStylePatch(prev, rowId, tempStyles));
          return;
        }
        const saved = await persistRowStyle({ tableId, rowId, rows, styles });
        setRows(prev => applyRowStylePatch(prev, rowId, saved));
      })().catch(async error => {
        console.error('Failed to update row styles:', error);
        toast.error(messages.saveValueFailed);
      });
    },
    [tableId, rows, setRows, messages.saveValueFailed],
  );

  return { createRow, updateCellFromGrid, updateRowFromDrawer, updateRowStyle };
}
