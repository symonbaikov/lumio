'use client';

import apiClient from '@/app/lib/api';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import type { ColumnType } from '../utils/stylingUtils';
import type { CustomTablePageColumn } from '../utils/tableTypes';

export const DEFAULT_COLUMN_CURRENCY = 'KZT';

export interface NewColumnDraft {
  title: string;
  type: ColumnType;
  /** Используется только когда type === 'currency'. */
  currency: string;
  /** Используется только когда type === 'formula'. */
  expression: string;
  isRequired: boolean;
  isUnique: boolean;
  /** Используется только когда type === 'relation'. */
  targetTableId: string;
  /** Используется только когда type === 'ai'. */
  prompt: string;
}

interface UseColumnManagementMessages {
  addColumnLoading: string;
  addColumnSuccess: string;
  addColumnFailed: string;
  deleteColumnLoading: string;
  deleteColumnSuccess: string;
  deleteColumnFailed: string;
  renameColumnSuccess: string;
  renameColumnFailed: string;
}

interface UseColumnManagementParams {
  tableId: string | null;
  orderedColumns: CustomTablePageColumn[];
  loadTable: () => Promise<void>;
  deleteColumnTarget: { id: string } | null;
  closeDeleteColumnModal: () => void;
  messages: UseColumnManagementMessages;
}

export interface UseColumnManagementReturn {
  newColumnOpen: boolean;
  setNewColumnOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newColumn: NewColumnDraft;
  setNewColumn: React.Dispatch<React.SetStateAction<NewColumnDraft>>;
  createColumn: () => Promise<void>;
  deleteColumn: () => Promise<void>;
  renameColumnTitleFromGrid: (columnKey: string, nextTitle: string) => Promise<void>;
}

export function useColumnManagement({
  tableId,
  orderedColumns,
  loadTable,
  deleteColumnTarget,
  closeDeleteColumnModal,
  messages,
}: UseColumnManagementParams): UseColumnManagementReturn {
  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [newColumn, setNewColumn] = useState<NewColumnDraft>({
    title: '',
    type: 'text',
    currency: DEFAULT_COLUMN_CURRENCY,
    expression: '',
    isRequired: false,
    isUnique: false,
    targetTableId: '',
    prompt: '',
  });

  const createColumn = useCallback(async () => {
    if (!tableId) {
      return;
    }
    const title = newColumn.title.trim();
    if (!title) {
      return;
    }
    // Денежной колонке валюта нужна сразу: без неё в ячейке останется голое число.
    const config =
      newColumn.type === 'currency'
        ? { currency: (newColumn.currency || DEFAULT_COLUMN_CURRENCY).toUpperCase(), precision: 2 }
        : newColumn.type === 'formula'
          ? { expression: newColumn.expression.trim() }
          : newColumn.type === 'relation'
            ? { targetTableId: newColumn.targetTableId }
            : newColumn.type === 'ai'
              ? { prompt: newColumn.prompt.trim() }
              : undefined;
    const toastId = toast.loading(messages.addColumnLoading);
    try {
      await apiClient.post(`/custom-tables/${tableId}/columns`, {
        title,
        type: newColumn.type,
        isRequired: newColumn.isRequired,
        isUnique: newColumn.isUnique,
        ...(config ? { config } : {}),
      });
      toast.success(messages.addColumnSuccess, { id: toastId });
      setNewColumnOpen(false);
      setNewColumn({
        title: '',
        type: 'text',
        currency: DEFAULT_COLUMN_CURRENCY,
        expression: '',
        isRequired: false,
        isUnique: false,
        targetTableId: '',
        prompt: '',
      });
      await loadTable();
    } catch (error) {
      console.error('Failed to create column:', error);
      toast.error(messages.addColumnFailed, { id: toastId });
    }
  }, [tableId, newColumn, loadTable, messages]);

  const deleteColumn = useCallback(async () => {
    if (!(tableId && deleteColumnTarget)) {
      return;
    }
    const toastId = toast.loading(messages.deleteColumnLoading);
    try {
      await apiClient.delete(`/custom-tables/${tableId}/columns/${deleteColumnTarget.id}`);
      toast.success(messages.deleteColumnSuccess, { id: toastId });
      closeDeleteColumnModal();
      await loadTable();
    } catch (error) {
      console.error('Failed to delete column:', error);
      toast.error(messages.deleteColumnFailed, { id: toastId });
    }
  }, [tableId, deleteColumnTarget, closeDeleteColumnModal, loadTable, messages]);

  const renameColumnTitleFromGrid = useCallback(
    async (columnKey: string, nextTitle: string) => {
      if (!tableId) {
        return;
      }
      const colId = orderedColumns.find(c => c.key === columnKey)?.id;
      if (!colId) {
        return;
      }
      try {
        await apiClient.patch(`/custom-tables/${tableId}/columns/${colId}`, { title: nextTitle });
        await loadTable();
        toast.success(messages.renameColumnSuccess);
      } catch (error) {
        console.error('Failed to rename column:', error);
        toast.error(messages.renameColumnFailed);
      }
    },
    [tableId, orderedColumns, loadTable, messages],
  );

  return {
    newColumnOpen,
    setNewColumnOpen,
    newColumn,
    setNewColumn,
    createColumn,
    deleteColumn,
    renameColumnTitleFromGrid,
  };
}
