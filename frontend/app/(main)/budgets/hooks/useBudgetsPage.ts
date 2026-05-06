'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/app/lib/api';
import toast from 'react-hot-toast';

export interface BudgetItem {
  id: string;
  name: string;
  categoryId: string;
  category?: { id: string; name: string; color?: string; icon?: string | null };
  limitAmount: number;
  currency: string;
  periodType: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  spentAmount: number;
  percentUsed: number;
  createdAt: string;
}

export interface BudgetFormData {
  name: string;
  categoryId: string;
  limitAmount: number;
  periodType: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  currency: string;
}

const EMPTY_FORM: BudgetFormData = {
  name: '',
  categoryId: '',
  limitAmount: 0,
  periodType: 'monthly',
  currency: 'KZT',
};

export function useBudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [formData, setFormData] = useState<BudgetFormData>(EMPTY_FORM);
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
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((budget: BudgetItem) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      categoryId: budget.categoryId,
      limitAmount: budget.limitAmount,
      periodType: budget.periodType,
      currency: budget.currency,
    });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingBudget(null);
    setFormData(EMPTY_FORM);
  }, []);

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
        await apiClient.post('/budgets', formData);
        toast.success('Budget created');
      }
      closeDialog();
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to save budget';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [editingBudget, formData, closeDialog, load]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/budgets/${id}`);
      toast.success('Budget deleted');
      await load();
    } catch {
      toast.error('Failed to delete budget');
    }
  }, [load]);

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
