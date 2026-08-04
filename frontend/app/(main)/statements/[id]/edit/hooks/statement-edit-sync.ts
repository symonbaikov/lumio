import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import type { Transaction } from '../editHelpers';

type SaveCtx = {
  setTransactions: (fn: (prev: Transaction[]) => Transaction[]) => void;
  setEditingRow: (v: string | null) => void;
  setSuccess: (v: boolean) => void;
  setError: (v: string) => void;
  editedData: Record<string, Partial<Transaction>>;
  messages: { saveTransactionError: string };
};

const NUMERIC_FIELDS = ['debit', 'credit', 'amountForeign', 'exchangeRate'] as const;

function normalizeNumericFields(updates: Partial<Transaction>): Partial<Transaction> {
  const normalized: Record<string, unknown> = { ...updates };
  for (const field of NUMERIC_FIELDS) {
    const value = normalized[field];
    if (typeof value === 'string') {
      normalized[field] = value.trim() === '' ? undefined : Number(value);
    }
  }
  return normalized as Partial<Transaction>;
}

export async function saveTransactionAction(txId: string, ctx: SaveCtx): Promise<void> {
  try {
    const updates = normalizeNumericFields(ctx.editedData[txId]);
    await apiClient.patch(`/transactions/${txId}`, updates);
    ctx.setTransactions(prev => prev.map(t => (t.id === txId ? { ...t, ...updates } : t)));
    ctx.setEditingRow(null);
    ctx.setSuccess(true);
    setTimeout(() => ctx.setSuccess(false), 3000);
  } catch (err: unknown) {
    ctx.setError(getApiErrorMessage(err, ctx.messages.saveTransactionError));
  }
}

type DeleteCtx = {
  setTransactions: (fn: (prev: Transaction[]) => Transaction[]) => void;
  setSuccess: (v: boolean) => void;
  setError: (v: string) => void;
  messages: { deleteTransactionError: string };
};

export async function deleteTransactionAction(txId: string, ctx: DeleteCtx): Promise<void> {
  try {
    await apiClient.delete(`/transactions/${txId}`);
    ctx.setTransactions(prev => prev.filter(t => t.id !== txId));
    ctx.setSuccess(true);
    setTimeout(() => ctx.setSuccess(false), 3000);
  } catch (err: unknown) {
    ctx.setError(getApiErrorMessage(err, ctx.messages.deleteTransactionError));
  }
}

type BulkCtx = {
  selectedRows: Set<string>;
  editedData: Record<string, Partial<Transaction>>;
  setSaving: (v: boolean) => void;
  setSelectedRows: (v: Set<string>) => void;
  setEditedData: (v: Record<string, Partial<Transaction>>) => void;
  setSuccess: (v: boolean) => void;
  setError: (v: string) => void;
  messages: { updateTransactionsError: string };
};

export async function bulkUpdateAction(loadData: () => Promise<void>, ctx: BulkCtx): Promise<void> {
  try {
    ctx.setSaving(true);
    const updates = Array.from(ctx.selectedRows)
      .filter(id => ctx.editedData[id])
      .map(id => ({ id, updates: ctx.editedData[id] }));
    await apiClient.patch('/transactions/bulk', { items: updates });
    await loadData();
    ctx.setSelectedRows(new Set());
    ctx.setEditedData({});
    ctx.setSuccess(true);
    setTimeout(() => ctx.setSuccess(false), 3000);
  } catch (err: unknown) {
    ctx.setError(getApiErrorMessage(err, ctx.messages.updateTransactionsError));
  } finally {
    ctx.setSaving(false);
  }
}

type BulkDelCtx = {
  selectedRows: Set<string>;
  setTransactions: (fn: (prev: Transaction[]) => Transaction[]) => void;
  setSaving: (v: boolean) => void;
  setSelectedRows: (v: Set<string>) => void;
  setSuccess: (v: boolean) => void;
  setError: (v: string) => void;
  messages: { deleteTransactionsError: string };
};

export async function bulkDeleteAction(
  confirmMsg: string,
  _loadData: () => Promise<void>,
  ctx: BulkDelCtx,
): Promise<void> {
  if (!window.confirm(confirmMsg)) {
    return;
  }
  try {
    ctx.setSaving(true);
    await apiClient.post('/transactions/bulk-delete', { ids: Array.from(ctx.selectedRows) });
    ctx.setTransactions(prev => prev.filter(t => !ctx.selectedRows.has(t.id)));
    ctx.setSelectedRows(new Set());
    ctx.setSuccess(true);
    setTimeout(() => ctx.setSuccess(false), 3000);
  } catch (err: unknown) {
    ctx.setError(getApiErrorMessage(err, ctx.messages.deleteTransactionsError));
  } finally {
    ctx.setSaving(false);
  }
}

type BulkCatCtx = {
  bulkCategoryId: string;
  selectedRows: Set<string>;
  setSaving: (v: boolean) => void;
  setSelectedRows: (v: Set<string>) => void;
  setBulkCategoryDialogOpen: (v: boolean) => void;
  setBulkCategoryId: (v: string) => void;
  setSuccess: (v: boolean) => void;
  setError: (v: string) => void;
  messages: { assignCategoryError: string };
};

export async function applyBulkCategoryAction(
  loadData: () => Promise<void>,
  ctx: BulkCatCtx,
): Promise<void> {
  if (!ctx.bulkCategoryId) {
    return;
  }
  try {
    ctx.setSaving(true);
    const items = Array.from(ctx.selectedRows).map(id => ({
      id,
      updates: { categoryId: ctx.bulkCategoryId },
    }));
    await apiClient.patch('/transactions/bulk', { items });
    await loadData();
    ctx.setSelectedRows(new Set());
    ctx.setBulkCategoryDialogOpen(false);
    ctx.setBulkCategoryId('');
    ctx.setSuccess(true);
    setTimeout(() => ctx.setSuccess(false), 3000);
  } catch (err: unknown) {
    ctx.setError(getApiErrorMessage(err, ctx.messages.assignCategoryError));
  } finally {
    ctx.setSaving(false);
  }
}
