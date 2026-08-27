'use client';

import apiClient from '@/app/lib/api';
import { getApiErrorStatus } from '@/app/lib/api-error';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import type { CustomTableGridRow } from '../utils/stylingUtils';
import { getClassificationResults } from '../utils/tableHelpers';
import type { CustomTablePageColumn } from '../utils/tableTypes';

interface UseBulkRowActionsMessages {
  deleteRowLoading: string;
  deleteRowSuccess: string;
  deleteRowFailed: string;
  bulkDeleteLoading: string;
  bulkDeleteSuccess: string;
  bulkDeleteFailed: string;
  creatingPaidColumn: string;
  paidColumnCreated: string;
  paidColumnCreateFailed: string;
  markingPaid: string;
  markingUnpaid: string;
  markedPaid: string;
  markedUnpaid: string;
  updateSomeRowsFailed: string;
  updateRowsFailed: string;
  paidColumnTitle: string;
}

interface UseBulkRowActionsParams {
  tableId: string | null;
  paidColKey: string | null;
  selectedRowIds: string[];
  setSelectedRowIds: React.Dispatch<React.SetStateAction<string[]>>;
  deleteRowTarget: { id: string } | null;
  bulkDeleteRowIds: string[];
  closeDeleteRowModal: () => void;
  closeBulkDeleteModal: () => void;
  rows: CustomTableGridRow[];
  setRows: React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
  setTable: React.Dispatch<React.SetStateAction<import('../utils/tableTypes').CustomTable | null>>;
  refreshStats: () => Promise<void>;
  messages: UseBulkRowActionsMessages;
}

export interface UseBulkRowActionsReturn {
  bulkMarking: 'paid' | 'unpaid' | null;
  deleteRow: () => Promise<void>;
  deleteSelectedRows: () => Promise<void>;
  markSelectedRowsPaid: (paid: boolean) => Promise<void>;
}

export function useBulkRowActions({
  tableId,
  paidColKey,
  selectedRowIds,
  setSelectedRowIds,
  deleteRowTarget,
  bulkDeleteRowIds,
  closeDeleteRowModal,
  closeBulkDeleteModal,
  rows,
  setRows,
  setTable,
  refreshStats,
  messages,
}: UseBulkRowActionsParams): UseBulkRowActionsReturn {
  const [bulkMarking, setBulkMarking] = useState<'paid' | 'unpaid' | null>(null);

  const deleteRow = useCallback(async () => {
    if (!(tableId && deleteRowTarget)) {
      return;
    }
    if (deleteRowTarget.id?.startsWith('temp-')) {
      setRows(prev => prev.filter(r => r.id !== deleteRowTarget.id));
      setSelectedRowIds(prev => prev.filter(id => id !== deleteRowTarget.id));
      closeDeleteRowModal();
      toast.success(messages.deleteRowSuccess);
      refreshStats();
      return;
    }
    const toastId = toast.loading(messages.deleteRowLoading);
    try {
      await apiClient.delete(`/custom-tables/${tableId}/rows/${deleteRowTarget.id}`);
      toast.success(messages.deleteRowSuccess, { id: toastId });
      setRows(prev => prev.filter(r => r.id !== deleteRowTarget.id));
      setSelectedRowIds(prev => prev.filter(id => id !== deleteRowTarget.id));
      closeDeleteRowModal();
      refreshStats();
    } catch (error) {
      const status = getApiErrorStatus(error);
      if (status === 404 || status === 410) {
        toast.success(messages.deleteRowSuccess, { id: toastId });
        setRows(prev => prev.filter(r => r.id !== deleteRowTarget.id));
        setSelectedRowIds(prev => prev.filter(id => id !== deleteRowTarget.id));
        closeDeleteRowModal();
        refreshStats();
        return;
      }
      console.error('Failed to delete row:', error);
      toast.error(messages.deleteRowFailed, { id: toastId });
    }
  }, [
    tableId,
    deleteRowTarget,
    setRows,
    setSelectedRowIds,
    closeDeleteRowModal,
    refreshStats,
    messages,
  ]);

  const deleteSelectedRows = useCallback(async () => {
    if (!tableId) {
      return;
    }
    const ids = bulkDeleteRowIds.length ? bulkDeleteRowIds : selectedRowIds;
    if (!ids.length) {
      return;
    }
    const toastId = toast.loading(messages.bulkDeleteLoading);
    try {
      const tempIds = ids.filter(id => id.startsWith('temp-'));
      if (tempIds.length) {
        setRows(prev => prev.filter(row => !tempIds.includes(row.id)));
      }
      const results = await Promise.allSettled(
        ids
          .filter(id => !id.startsWith('temp-'))
          .map(rowId => apiClient.delete(`/custom-tables/${tableId}/rows/${rowId}`)),
      );
      const succeededIds: string[] = [];
      const failedIds: string[] = [];
      const realIds = ids.filter(id => !id.startsWith('temp-'));
      results.forEach((result, index) => {
        const rowId = realIds[index];
        if (result.status === 'fulfilled') {
          succeededIds.push(rowId);
          return;
        }
        const status = result.status === 'rejected' ? getApiErrorStatus(result.reason) : undefined;
        if (status === 404 || status === 410) {
          succeededIds.push(rowId);
          return;
        }
        failedIds.push(rowId);
      });
      if (succeededIds.length) {
        const succeededSet = new Set(succeededIds);
        setRows(prev => prev.filter(row => !succeededSet.has(row.id)));
      }
      setSelectedRowIds(failedIds.filter(id => !id.startsWith('temp-')));
      if (failedIds.length) {
        toast.error(messages.bulkDeleteFailed, { id: toastId });
      } else {
        toast.success(messages.bulkDeleteSuccess, { id: toastId });
      }
      refreshStats();
    } catch (error) {
      console.error('Failed to bulk delete rows:', error);
      toast.error(messages.bulkDeleteFailed, { id: toastId });
    } finally {
      closeBulkDeleteModal();
    }
  }, [
    tableId,
    bulkDeleteRowIds,
    selectedRowIds,
    setRows,
    setSelectedRowIds,
    closeBulkDeleteModal,
    refreshStats,
    messages,
  ]);

  const ensurePaidStatusColumnKey = useCallback(async (): Promise<string> => {
    if (paidColKey) {
      return paidColKey;
    }
    if (!tableId) {
      throw new Error('Missing tableId');
    }
    const toastId = toast.loading(messages.creatingPaidColumn);
    try {
      const response = await apiClient.post(`/custom-tables/${tableId}/columns`, {
        title: messages.paidColumnTitle,
        type: 'boolean',
        config: { icon: 'mdi:check-circle-outline' },
      });
      const created = response.data?.data || response.data;
      if (!created || typeof created.key !== 'string') {
        throw new Error('Invalid create column response');
      }
      setTable(prev =>
        prev
          ? { ...prev, columns: [...(prev.columns || []), created as CustomTablePageColumn] }
          : prev,
      );
      toast.success(messages.paidColumnCreated, { id: toastId });
      return created.key;
    } catch (error) {
      console.error('Failed to create Paid column:', error);
      toast.error(messages.paidColumnCreateFailed, { id: toastId });
      throw error;
    }
  }, [paidColKey, tableId, setTable, messages]);

  const classifyPaidStatuses = useCallback(
    async (rowIds: string[]): Promise<Map<string, boolean | null>> => {
      if (!(tableId && rowIds.length)) {
        return new Map();
      }
      try {
        const response = await apiClient.post(`/custom-tables/${tableId}/rows/paid-classify`, {
          rowIds,
        });
        return getClassificationResults(response.data);
      } catch (error) {
        console.error('Failed to classify paid status:', error);
        return new Map();
      }
    },
    [tableId],
  );

  function partitionResults(
    results: PromiseSettledResult<unknown>[],
    updates: { rowId: string; value: boolean }[],
  ): { succeededMap: Map<string, boolean>; failedIds: string[] } {
    const failedIds: string[] = [];
    const succeededMap = new Map<string, boolean>();
    results.forEach((result, index) => {
      const update = updates[index];
      if (result.status === 'fulfilled') {
        succeededMap.set(update.rowId, update.value);
      } else {
        failedIds.push(update.rowId);
      }
    });
    return { succeededMap, failedIds };
  }

  const applyPaidUpdates = (succeededMap: Map<string, boolean>, colKey: string): void => {
    if (!succeededMap.size) {
      return;
    }
    setRows(prev =>
      prev.map(row =>
        succeededMap.has(row.id)
          ? {
              ...row,
              data: { ...(row.data || {}), [colKey]: succeededMap.get(row.id) as boolean },
            }
          : row,
      ),
    );
  };

  const executeBulkPaid = async (paid: boolean, ids: string[]): Promise<string[]> => {
    const resolvedPaidColKey = await ensurePaidStatusColumnKey();
    const predictions = await classifyPaidStatuses(ids);
    const updates = ids.map(rowId => ({
      rowId,
      value: predictions.get(rowId) ?? paid,
    }));
    const results = await Promise.allSettled(
      updates.map(u =>
        apiClient.patch(`/custom-tables/${tableId}/rows/${u.rowId}`, {
          data: { [resolvedPaidColKey]: u.value },
        }),
      ),
    );
    const { succeededMap, failedIds } = partitionResults(results, updates);
    applyPaidUpdates(succeededMap, resolvedPaidColKey);
    setSelectedRowIds(failedIds);
    return failedIds;
  };

  const markSelectedRowsPaid = useCallback(
    async (paid: boolean) => {
      if (!(tableId && selectedRowIds.length) || bulkMarking) {
        return;
      }
      const ids = [...selectedRowIds];
      const markingLabel = paid ? ('paid' as const) : ('unpaid' as const);
      const loadingMessage = paid ? messages.markingPaid : messages.markingUnpaid;
      const successMessage = paid ? messages.markedPaid : messages.markedUnpaid;
      setBulkMarking(markingLabel);
      const toastId = toast.loading(loadingMessage);
      try {
        const failedIds = await executeBulkPaid(paid, ids);
        if (failedIds.length) {
          toast.error(messages.updateSomeRowsFailed, { id: toastId });
        } else {
          toast.success(successMessage, { id: toastId });
        }
        void refreshStats();
      } catch (error) {
        console.error('Failed to mark rows:', error);
        toast.error(messages.updateRowsFailed, { id: toastId });
      } finally {
        setBulkMarking(null);
      }
    },
    [
      tableId,
      selectedRowIds,
      bulkMarking,
      ensurePaidStatusColumnKey,
      classifyPaidStatuses,
      setRows,
      setSelectedRowIds,
      refreshStats,
      messages,
    ],
  );

  return { bulkMarking, deleteRow, deleteSelectedRows, markSelectedRowsPaid };
}
