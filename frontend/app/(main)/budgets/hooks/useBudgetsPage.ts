'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';

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
  /** The goal this budget serves; null when it stands on its own. */
  goalId?: string | null;
  /** The window the budget applies in; both null means it runs forever. */
  startsOn?: string | null;
  endsOn?: string | null;
  /** Whether today falls inside that window. */
  isActive?: boolean;
  createdAt: string;
}

export interface BudgetFormData {
  name: string;
  categoryId: string;
  limitAmount: number;
  manualSpentAmount: number;
  periodType: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  currency: string;
  /** Empty string means "no goal"; the API takes null for that. */
  goalId: string;
  /** Empty string means "no boundary"; the API takes null for that. */
  startsOn: string;
  endsOn: string;
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
  goalId: '',
  startsOn: '',
  endsOn: '',
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
    goalId: formData.goalId,
    startsOn: formData.startsOn,
    endsOn: formData.endsOn,
  };
}

export function useBudgetsPage() {
  const { currentWorkspace } = useWorkspace();
  const workspaceCurrency = currentWorkspace?.currency ?? DEFAULT_CURRENCY;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [formData, setFormData] = useState<BudgetFormData>(() => makeEmptyForm(workspaceCurrency));

  // Workspace-scoped: the request itself does not mention the workspace (the
  // server scopes by header), so the key carries it explicitly.
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.budgets(workspaceId),
    queryFn: ({ signal }) => apiQuery<BudgetItem[]>({ url: '/budgets', signal }),
  });

  const invalidate = useCallback((): Promise<void> => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.budgets(workspaceId) });
  }, [queryClient, workspaceId]);

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
      goalId: budget.goalId ?? '',
      startsOn: budget.startsOn ?? '',
      endsOn: budget.endsOn ?? '',
    });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingBudget(null);
    setFormData(makeEmptyForm(workspaceCurrency));
  }, [workspaceCurrency]);

  const saveMutation = useMutation({
    mutationFn: (variables: { id: string | null; body: Record<string, unknown> }) =>
      variables.id
        ? apiClient.put(`/budgets/${variables.id}`, variables.body)
        : apiClient.post('/budgets', variables.body),
    onSettled: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/budgets/${id}`),
    onSuccess: () => toast.success('Budget deleted'),
    onError: () => toast.error('Failed to delete budget'),
    onSettled: invalidate,
  });

  const handleSave = useCallback(async () => {
    const editingId = editingBudget?.id ?? null;
    const body = editingId
      ? {
          name: formData.name,
          limitAmount: formData.limitAmount,
          currency: formData.currency,
          // Explicit null detaches; the API leaves the link alone only when the
          // field is absent, which the form can never mean.
          goalId: formData.goalId || null,
          startsOn: formData.startsOn || null,
          endsOn: formData.endsOn || null,
        }
      : {
          name: formData.name,
          categoryId: formData.categoryId,
          limitAmount: formData.limitAmount,
          periodType: formData.periodType,
          currency: formData.currency,
          goalId: formData.goalId || null,
          startsOn: formData.startsOn || null,
          endsOn: formData.endsOn || null,
        };

    await saveMutation
      .mutateAsync({ id: editingId, body })
      .then(() => {
        toast.success(editingId ? 'Budget updated' : 'Budget created');
        closeDialog();
      })
      .catch(err => {
        toast.error(getApiErrorMessage(err, 'Failed to save budget'));
      });
  }, [editingBudget, formData, closeDialog, saveMutation.mutateAsync]);

  const handleDelete = useCallback(
    async (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation.mutate],
  );

  const refresh = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  return {
    budgets: query.data ?? [],
    isPending: query.isPending,
    isFetching: query.isFetching || deleteMutation.isPending,
    error: query.isError ? 'Failed to load budgets' : null,
    dialogOpen,
    editingBudget,
    formData,
    saving: saveMutation.isPending,
    setFormData,
    openCreate,
    openEdit,
    closeDialog,
    handleSave,
    handleDelete,
    refresh,
  };
}
