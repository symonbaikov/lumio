'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export interface BudgetItem {
  id: string;
  name: string;
  categoryId: string;
  category?: { id: string; name: string; color?: string; icon?: string | null };
  limitAmount: number;
  /** Budget limit in the workspace currency (API may return it as a decimal string). */
  limitAmountWorkspace?: number;
  /** User-entered spent amount for a budget cycle (API may return it as a decimal string). */
  manualSpentAmount?: number;
  spentAmount: number;
  percentUsed: number;
  currency: string;
  workspaceCurrency?: string;
  periodType: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  createdAt: string;
}

export interface BudgetFormData {
  name: string;
  categoryId: string;
  limitAmount: number;
  manualSpentAmount: number;
  periodType: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  currency: string;
}

export type BudgetDrawerIntent = 'create' | 'edit' | 'spending';

const DEFAULT_CURRENCY = 'USD';

const makeEmptyForm = (currency: string): BudgetFormData => ({
  name: '',
  categoryId: '',
  limitAmount: 0,
  manualSpentAmount: 0,
  periodType: 'monthly',
  currency,
});

/** Coerces API decimal strings/numbers to a non-negative finite number. */
export function toNonNegativeNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed < 0 ? 0 : parsed;
}

/** Normalizes budget API decimal fields into usable numbers before form editing and summaries. */
export function normalizeBudgetItem(budget: BudgetItem): BudgetItem {
  return {
    ...budget,
    limitAmount: toNonNegativeNumber(budget.limitAmount),
    limitAmountWorkspace:
      budget.limitAmountWorkspace === undefined
        ? undefined
        : toNonNegativeNumber(budget.limitAmountWorkspace),
    manualSpentAmount:
      budget.manualSpentAmount === undefined
        ? undefined
        : toNonNegativeNumber(budget.manualSpentAmount),
    spentAmount: toNonNegativeNumber(budget.spentAmount),
    percentUsed: toNonNegativeNumber(budget.percentUsed),
  };
}

/**
 * Builds the update payload for a budget. Spending-only updates must not resend
 * the budget limit, so only the manual spent amount is included for that intent.
 */
export function buildBudgetUpdatePayload(
  formData: BudgetFormData,
  intent: BudgetDrawerIntent,
): Partial<BudgetFormData> {
  if (intent === 'spending') {
    return { manualSpentAmount: formData.manualSpentAmount };
  }
  return {
    name: formData.name,
    categoryId: formData.categoryId,
    limitAmount: formData.limitAmount,
    manualSpentAmount: formData.manualSpentAmount,
    periodType: formData.periodType,
    currency: formData.currency,
  };
}

export function useBudgetsPage() {
  const { currentWorkspace } = useWorkspace();
  const workspaceCurrency = currentWorkspace?.currency ?? DEFAULT_CURRENCY;
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [formData, setFormData] = useState<BudgetFormData>(() => makeEmptyForm(workspaceCurrency));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/budgets');
      setBudgets(res.data?.data ?? res.data ?? []);
    } catch {
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = useCallback(() => {
    setEditingBudget(null);
    setFormData(makeEmptyForm(workspaceCurrency));
    setDialogOpen(true);
  }, [workspaceCurrency]);

  const openEdit = useCallback((budget: BudgetItem) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      categoryId: budget.categoryId,
      limitAmount: budget.limitAmount,
      manualSpentAmount: budget.manualSpentAmount ?? 0,
      periodType: budget.periodType,
      currency: budget.currency,
    });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingBudget(null);
    setFormData(makeEmptyForm(workspaceCurrency));
  }, [workspaceCurrency]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (editingBudget) {
        await apiClient.put(`/budgets/${editingBudget.id}`, {
          name: formData.name,
          limitAmount: formData.limitAmount,
          currency: formData.currency,
        });
        toast.success('Budget updated');
      } else {
        await apiClient.post('/budgets', {
          name: formData.name,
          categoryId: formData.categoryId,
          limitAmount: formData.limitAmount,
          periodType: formData.periodType,
          currency: formData.currency,
        });
        toast.success('Budget created');
      }
      closeDialog();
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save budget'));
    } finally {
      setSaving(false);
    }
  }, [editingBudget, formData, closeDialog, load]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/budgets/${id}`);
        toast.success('Budget deleted');
        await load();
      } catch {
        toast.error('Failed to delete budget');
      }
    },
    [load],
  );

  return {
    budgets,
    loading,
    error,
    dialogOpen,
    editingBudget,
    formData,
    saving,
    setFormData,
    openCreate,
    openEdit,
    closeDialog,
    handleSave,
    handleDelete,
    refresh: load,
  };
}
