'use client';

import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { createDraftRow, isDraftReadyToSave, isDraftRowId } from '../helpers/draftRowHelpers';
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
  CustomTableColumn,
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
  /** Все колонки таблицы, включая скрытые: по ним решается, готов ли черновик. */
  columns: CustomTableColumn[];
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
  columns,
  rows,
  setRows,
  refreshStats,
  messages,
}: UseRowMutationsParams): UseRowMutationsReturn {
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
        const created = await createRowRequest(tableId, rows.length, nextData);
        setRows(prev =>
          prev.map(r =>
            r.id === rowId
              ? { ...created, data: { ...nextData, ...(created.data || {}) }, styles: r.styles }
              : r,
          ),
        );
        toast.success(messages.addRowSuccess, { id: toastId });
        void refreshStats();
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
    [tableId, columns, rows.length, setRows, refreshStats, messages],
  );

  const updateCellFromGrid = useCallback(
    async (rowId: string, columnKey: string, value: CustomTableCellValue): Promise<void> => {
      if (!tableId) {
        return;
      }
      const isDraft = isDraftRowId(rowId);
      if (!isDraft) {
        await updateCellRequest({ tableId, rowId, columnKey, value });
      }
      setRows(prev => applyRowDataPatch(prev, rowId, { [columnKey]: value }));
      if (columnKey === paidColKey) {
        void refreshStats();
      }
      if (isDraft) {
        const nextData = { ...(rows.find(r => r.id === rowId)?.data || {}), [columnKey]: value };
        await promoteDraftRow(rowId, nextData);
      }
    },
    [tableId, paidColKey, rows, setRows, refreshStats, promoteDraftRow],
  );

  const updateRowFromDrawer = useCallback(
    async (rowId: string, patchData: CustomTableRowPatch): Promise<void> => {
      if (!(tableId && Object.keys(patchData).length)) {
        return;
      }
      const isDraft = isDraftRowId(rowId);
      if (!isDraft) {
        await updateRowPatchRequest(tableId, rowId, patchData);
      }
      setRows(prev => applyRowDataPatch(prev, rowId, patchData));
      if (hasPaidColChange(paidColKey, patchData)) {
        void refreshStats();
      }
      if (isDraft) {
        const nextData = { ...(rows.find(r => r.id === rowId)?.data || {}), ...patchData };
        await promoteDraftRow(rowId, nextData);
      }
    },
    [tableId, paidColKey, rows, setRows, refreshStats, promoteDraftRow],
  );

  const updateRowStyle = useCallback(
    async (rowId: string, styles: CustomTableRowStyles): Promise<void> => {
      if (!tableId) {
        return;
      }

      return await (async () => {
        const row = rows.find(r => r.id === rowId);
        const tempStyles = { ...(row?.styles || {}), ...styles };
        if (isDraftRowId(rowId)) {
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
