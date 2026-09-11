import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';
import { getApiErrorStatus } from '@/app/lib/api-error';
import type { CustomTableGridRow } from '../utils/stylingUtils';
import { getClassificationResults } from '../utils/tableHelpers';
import type { CustomTablePageColumn } from '../utils/tableTypes';

type SetRows = React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
type SetIds = React.Dispatch<React.SetStateAction<string[]>>;
type SetTable = React.Dispatch<
  React.SetStateAction<import('../utils/tableTypes').CustomTable | null>
>;

export type DeleteRowMessages = {
  deleteRowLoading: string;
  deleteRowSuccess: string;
  deleteRowFailed: string;
};

export type BulkDeleteMessages = {
  bulkDeleteLoading: string;
  bulkDeleteSuccess: string;
  bulkDeleteFailed: string;
};

export type PaidColumnMessages = {
  creatingPaidColumn: string;
  paidColumnCreated: string;
  paidColumnCreateFailed: string;
  paidColumnTitle: string;
};

export type MarkPaidMessages = {
  markingPaid: string;
  markingUnpaid: string;
  markedPaid: string;
  markedUnpaid: string;
  updateSomeRowsFailed: string;
  updateRowsFailed: string;
};

type DeleteRowArgs = {
  tableId: string;
  deleteRowTarget: { id: string };
  setRows: SetRows;
  setIds: SetIds;
  closeModal: () => void;
  refresh: () => Promise<void>;
  messages: DeleteRowMessages;
};

function applyDeleteSuccess(
  args: Pick<DeleteRowArgs, 'deleteRowTarget' | 'setRows' | 'setIds' | 'closeModal' | 'refresh'>,
): void {
  const { deleteRowTarget, setRows, setIds, closeModal, refresh } = args;
  setRows(prev => prev.filter(r => r.id !== deleteRowTarget.id));
  setIds(prev => prev.filter(id => id !== deleteRowTarget.id));
  closeModal();
  void refresh();
}

export async function performDeleteRow(args: DeleteRowArgs): Promise<void> {
  const { tableId, deleteRowTarget, messages, ...rest } = args;
  if (deleteRowTarget.id.startsWith('temp-')) {
    applyDeleteSuccess({ deleteRowTarget, ...rest });
    toast.success(messages.deleteRowSuccess);
    return;
  }
  const toastId = toast.loading(messages.deleteRowLoading);
  try {
    await apiClient.delete(`/custom-tables/${tableId}/rows/${deleteRowTarget.id}`);
    toast.success(messages.deleteRowSuccess, { id: toastId });
    applyDeleteSuccess({ deleteRowTarget, ...rest });
  } catch (error) {
    const status = getApiErrorStatus(error);
    if (status === 404 || status === 410) {
      toast.success(messages.deleteRowSuccess, { id: toastId });
      applyDeleteSuccess({ deleteRowTarget, ...rest });
      return;
    }
    console.error('Failed to delete row:', error);
    toast.error(messages.deleteRowFailed, { id: toastId });
  }
}

type BulkDeleteArgs = {
  tableId: string;
  ids: string[];
  setRows: SetRows;
  setIds: SetIds;
  closeModal: () => void;
  refresh: () => Promise<void>;
  messages: BulkDeleteMessages;
};

export async function performBulkDelete(args: BulkDeleteArgs): Promise<void> {
  const { tableId, ids, setRows, setIds, closeModal, refresh, messages } = args;
  const toastId = toast.loading(messages.bulkDeleteLoading);
  try {
    const tempIds = ids.filter(id => id.startsWith('temp-'));
    if (tempIds.length) {
      setRows(prev => prev.filter(row => !tempIds.includes(row.id)));
    }
    const realIds = ids.filter(id => !id.startsWith('temp-'));
    const results = await Promise.allSettled(
      realIds.map(rowId => apiClient.delete(`/custom-tables/${tableId}/rows/${rowId}`)),
    );
    const succeededIds: string[] = [];
    const failedIds: string[] = [];
    results.forEach((result, index) => {
      const rowId = realIds[index];
      if (result.status === 'fulfilled') {
        succeededIds.push(rowId);
        return;
      }
      const s = getApiErrorStatus((result as PromiseRejectedResult).reason);
      if (s === 404 || s === 410) {
        succeededIds.push(rowId);
        return;
      }
      failedIds.push(rowId);
    });
    if (succeededIds.length) {
      const done = new Set(succeededIds);
      setRows(prev => prev.filter(row => !done.has(row.id)));
    }
    setIds(failedIds.filter(id => !id.startsWith('temp-')));
    if (failedIds.length) {
      toast.error(messages.bulkDeleteFailed, { id: toastId });
    } else {
      toast.success(messages.bulkDeleteSuccess, { id: toastId });
    }
    void refresh();
  } catch (error) {
    console.error('Failed to bulk delete rows:', error);
    toast.error(messages.bulkDeleteFailed, { id: toastId });
  } finally {
    closeModal();
  }
}

type EnsurePaidArgs = {
  paidColKey: string | null;
  tableId: string;
  setTable: SetTable;
  messages: PaidColumnMessages;
};

function makeColumnInserter(created: CustomTablePageColumn) {
  return (prev: import('../utils/tableTypes').CustomTable | null) =>
    prev ? { ...prev, columns: [...(prev.columns ?? []), created] } : prev;
}

function assertValidColumn(val: unknown): asserts val is CustomTablePageColumn {
  if (!val || typeof (val as Record<string, unknown>).key !== 'string') {
    throw new Error('Invalid create column response');
  }
}

export async function ensurePaidColumn(args: EnsurePaidArgs): Promise<string> {
  const { paidColKey, tableId, setTable, messages } = args;
  if (paidColKey) {
    return paidColKey;
  }
  const toastId = toast.loading(messages.creatingPaidColumn);
  try {
    const response = await apiClient.post(`/custom-tables/${tableId}/columns`, {
      title: messages.paidColumnTitle,
      type: 'boolean',
      config: { icon: 'mdi:check-circle-outline' },
    });
    const created: unknown = response.data?.data ?? response.data;
    assertValidColumn(created);
    setTable(makeColumnInserter(created));
    toast.success(messages.paidColumnCreated, { id: toastId });
    return (created as CustomTablePageColumn).key;
  } catch (error) {
    console.error('Failed to create Paid column:', error);
    toast.error(messages.paidColumnCreateFailed, { id: toastId });
    throw error;
  }
}

export async function classifyPaidStatus(
  tableId: string,
  rowIds: string[],
): Promise<Map<string, boolean | null>> {
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
}

type MarkPaidArgs = {
  tableId: string;
  ids: string[];
  paid: boolean;
  resolvedKey: string;
  predictions: Map<string, boolean | null>;
  setRows: SetRows;
  setIds: SetIds;
  refresh: () => Promise<void>;
  messages: MarkPaidMessages;
};

export async function performMarkPaid(args: MarkPaidArgs): Promise<void> {
  const { tableId, ids, paid, resolvedKey, predictions, setRows, setIds, refresh, messages } = args;
  const toastId = toast.loading(paid ? messages.markingPaid : messages.markingUnpaid);
  const updates = ids.map(rowId => ({ rowId, value: predictions.get(rowId) ?? paid }));
  try {
    const results = await Promise.allSettled(
      updates.map(u =>
        apiClient.patch(`/custom-tables/${tableId}/rows/${u.rowId}`, {
          data: { [resolvedKey]: u.value },
        }),
      ),
    );
    const failedIds: string[] = [];
    const succeededMap = new Map<string, boolean>();
    results.forEach((result, index) => {
      const u = updates[index];
      if (result.status === 'fulfilled') {
        succeededMap.set(u.rowId, u.value);
      } else {
        failedIds.push(u.rowId);
      }
    });
    if (succeededMap.size) {
      setRows(prev =>
        prev.map(row => {
          if (!succeededMap.has(row.id)) {
            return row;
          }
          return {
            ...row,
            data: { ...(row.data || {}), [resolvedKey]: succeededMap.get(row.id) as boolean },
          };
        }),
      );
    }
    setIds(failedIds);
    if (failedIds.length) {
      toast.error(messages.updateSomeRowsFailed, { id: toastId });
    } else {
      toast.success(paid ? messages.markedPaid : messages.markedUnpaid, { id: toastId });
    }
    void refresh();
  } catch (error) {
    console.error('Failed to mark rows as paid:', error);
    toast.error(messages.updateRowsFailed, { id: toastId });
    throw error;
  }
}
