import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';
import type { ColumnType } from '../utils/stylingUtils';

type CreateColumnMessages = {
  addColumnLoading: string;
  addColumnSuccess: string;
  addColumnFailed: string;
};
type DeleteColumnMessages = {
  deleteColumnLoading: string;
  deleteColumnSuccess: string;
  deleteColumnFailed: string;
};
type RenameColumnMessages = { renameColumnSuccess: string; renameColumnFailed: string };

type CreateColumnArgs = {
  tableId: string;
  newColumn: { title: string; type: ColumnType };
  loadTable: () => Promise<void>;
  messages: CreateColumnMessages;
  onSuccess: () => void;
};
export async function doCreateColumn({
  tableId,
  newColumn,
  loadTable,
  messages,
  onSuccess,
}: CreateColumnArgs): Promise<void> {
  const title = newColumn.title.trim();
  if (!title) {
    return;
  }
  const toastId = toast.loading(messages.addColumnLoading);
  try {
    await apiClient.post(`/custom-tables/${tableId}/columns`, { title, type: newColumn.type });
    toast.success(messages.addColumnSuccess, { id: toastId });
    onSuccess();
    await loadTable();
  } catch (error) {
    console.error('Failed to create column:', error);
    toast.error(messages.addColumnFailed, { id: toastId });
  }
}

type DeleteColumnArgs = {
  tableId: string;
  targetId: string;
  loadTable: () => Promise<void>;
  closeModal: () => void;
  messages: DeleteColumnMessages;
};
export async function doDeleteColumn({
  tableId,
  targetId,
  loadTable,
  closeModal,
  messages,
}: DeleteColumnArgs): Promise<void> {
  const toastId = toast.loading(messages.deleteColumnLoading);
  try {
    await apiClient.delete(`/custom-tables/${tableId}/columns/${targetId}`);
    toast.success(messages.deleteColumnSuccess, { id: toastId });
    closeModal();
    await loadTable();
  } catch (error) {
    console.error('Failed to delete column:', error);
    toast.error(messages.deleteColumnFailed, { id: toastId });
  }
}

type RenameColumnArgs = {
  tableId: string;
  colId: string;
  nextTitle: string;
  loadTable: () => Promise<void>;
  messages: RenameColumnMessages;
};
export async function doRenameColumn({
  tableId,
  colId,
  nextTitle,
  loadTable,
  messages,
}: RenameColumnArgs): Promise<void> {
  try {
    await apiClient.patch(`/custom-tables/${tableId}/columns/${colId}`, { title: nextTitle });
    await loadTable();
    toast.success(messages.renameColumnSuccess);
  } catch (error) {
    console.error('Failed to rename column:', error);
    toast.error(messages.renameColumnFailed);
  }
}
