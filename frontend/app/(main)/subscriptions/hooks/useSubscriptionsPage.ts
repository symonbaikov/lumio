import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import apiClient from '@/app/lib/api';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';

export interface SubscriptionItem {
  id: string;
  vendorName: string;
  vendorRaw: string | null;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  status: 'detected' | 'active' | 'paused' | 'cancelled';
  ownerId: string | null;
  owner: { id: string; name: string | null; email: string | null } | null;
  reviewAt: string | null;
  reviewStatus: 'current' | 'needs_review';
  riskStatus: 'none' | 'price_changed' | 'date_shifted' | 'missing_charge';
  cancellationReason: string | null;
  realizedAnnualSavings: number;
  confidence: number | null;
  nextChargeDate: string | null;
  lastChargeDate: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  detectionMeta: Record<string, unknown> | null;
  createdAt: string;
}

export interface SubscriptionSummary {
  totalMonthlyCost: number;
  activeCount: number;
  upcomingCount: number;
  upcoming30DaysCount: number;
  priceChangeCount: number;
  overdueReviewCount: number;
  realizedAnnualSavings: number;
}

export interface SubscriptionWorkspaceMember {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface SubscriptionFormData {
  vendorName: string;
  amount: number | '';
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  currency: string;
  categoryId: string;
  nextChargeDate: string;
}

const DEFAULT_CURRENCY = 'USD';

const EMPTY_SUMMARY: SubscriptionSummary = {
  totalMonthlyCost: 0,
  activeCount: 0,
  upcomingCount: 0,
  upcoming30DaysCount: 0,
  priceChangeCount: 0,
  overdueReviewCount: 0,
  realizedAnnualSavings: 0,
};

const makeEmptyForm = (currency: string): SubscriptionFormData => ({
  vendorName: '',
  amount: '',
  frequency: 'monthly',
  currency,
  categoryId: '',
  nextChargeDate: '',
});

export function useSubscriptionsPage() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const workspaceCurrency = currentWorkspace?.currency ?? DEFAULT_CURRENCY;

  const [workspaceMembers, setWorkspaceMembers] = useState<SubscriptionWorkspaceMember[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionItem | null>(null);
  const [formData, setFormData] = useState<SubscriptionFormData>(() =>
    makeEmptyForm(workspaceCurrency),
  );

  const listQuery = useQuery({
    queryKey: queryKeys.subscriptions({ workspaceId, status: statusFilter }),
    queryFn: ({ signal }) =>
      apiQuery<SubscriptionItem[]>({
        url: '/subscriptions',
        params: statusFilter !== 'all' ? { status: statusFilter } : undefined,
        signal,
      }),
    // Смена фильтра статуса не должна стирать список: старые карточки живут на
    // экране до прихода новых, но только внутри того же воркспейса.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === workspaceId ? previous : undefined,
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.subscriptionsSummary(workspaceId),
    queryFn: ({ signal }) =>
      apiQuery<SubscriptionSummary>({ url: '/subscriptions/summary', signal }),
  });

  const invalidate = useCallback((): Promise<void> => {
    return queryClient.invalidateQueries({ queryKey: ['subscriptions', workspaceId] });
  }, [queryClient, workspaceId]);

  /**
   * Действия строки отличаются только запросом и текстом тоста, поэтому живут
   * в одной мутации: отдельный `saveMutation` нужен лишь затем, чтобы спиннер
   * в диалоге не загорался от действий в списке.
   */
  const rowMutation = useMutation({
    mutationFn: (action: { run: () => Promise<unknown>; success: string; failure: string }) =>
      action.run(),
    onSuccess: (_result, action) => toast.success(action.success),
    onError: (_error, action) => toast.error(action.failure),
    onSettled: invalidate,
  });

  const saveMutation = useMutation({
    mutationFn: (action: { run: () => Promise<unknown>; success: string; failure: string }) =>
      action.run(),
    onSuccess: (_result, action) => toast.success(action.success),
    onError: (_error, action) => toast.error(action.failure),
    onSettled: invalidate,
  });

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    void apiClient
      .get(`/workspaces/${currentWorkspace.id}`)
      .then(res => {
        setWorkspaceMembers(res.data?.members ?? []);
      })
      .catch(() => setWorkspaceMembers([]));
  }, [currentWorkspace?.id]);

  const openCreate = useCallback(() => {
    setEditingSubscription(null);
    setFormData(makeEmptyForm(workspaceCurrency));
    setDialogOpen(true);
  }, [workspaceCurrency]);

  const openEdit = useCallback((sub: SubscriptionItem) => {
    setEditingSubscription(sub);
    setFormData({
      vendorName: sub.vendorName,
      amount: sub.amount,
      frequency: sub.frequency,
      currency: sub.currency,
      categoryId: sub.categoryId ?? '',
      nextChargeDate: sub.nextChargeDate ?? '',
    });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingSubscription(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!(formData.vendorName && formData.amount)) return;

    const payload = {
      vendorName: formData.vendorName,
      amount: Number(formData.amount),
      frequency: formData.frequency,
      currency: formData.currency || workspaceCurrency,
      categoryId: formData.categoryId || undefined,
      nextChargeDate: formData.nextChargeDate || undefined,
    };
    const editingId = editingSubscription?.id;

    await saveMutation
      .mutateAsync({
        run: () =>
          editingId
            ? apiClient.put(`/subscriptions/${editingId}`, payload)
            : apiClient.post('/subscriptions', payload),
        success: editingId ? 'Subscription updated' : 'Subscription created',
        failure: 'Failed to save subscription',
      })
      // Диалог закрывается только после успеха: при ошибке форма остаётся
      // заполненной, как и до миграции.
      .then(() => closeDialog())
      .catch(() => undefined);
  }, [formData, editingSubscription, closeDialog, saveMutation.mutateAsync, workspaceCurrency]);

  const handleDelete = useCallback(
    async (id: string) => {
      rowMutation.mutate({
        run: () => apiClient.delete(`/subscriptions/${id}`),
        success: 'Subscription deleted',
        failure: 'Failed to delete subscription',
      });
    },
    [rowMutation.mutate],
  );

  const handleConfirm = useCallback(
    async (id: string) => {
      rowMutation.mutate({
        run: () => apiClient.post(`/subscriptions/${id}/confirm`),
        success: 'Subscription confirmed',
        failure: 'Failed to confirm subscription',
      });
    },
    [rowMutation.mutate],
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      rowMutation.mutate({
        run: () => apiClient.post(`/subscriptions/${id}/dismiss`),
        success: 'Subscription dismissed',
        failure: 'Failed to dismiss subscription',
      });
    },
    [rowMutation.mutate],
  );

  const assignOwner = useCallback(
    async (id: string, ownerId: string) => {
      rowMutation.mutate({
        run: () => apiClient.patch(`/subscriptions/${id}/owner`, { ownerId }),
        success: 'Owner assigned',
        failure: 'Failed to assign owner',
      });
    },
    [rowMutation.mutate],
  );

  const recordDecision = useCallback(
    async (
      id: string,
      decision: 'keep' | 'review' | 'cancelled' | 'price_reduced',
      values: { note?: string; reviewAt?: string; realizedAnnualSavings?: number } = {},
    ) => {
      rowMutation.mutate({
        run: () => apiClient.post(`/subscriptions/${id}/decisions`, { decision, ...values }),
        success: 'Subscription decision saved',
        failure: 'Failed to save subscription decision',
      });
    },
    [rowMutation.mutate],
  );

  return {
    subscriptions: listQuery.data ?? [],
    summary: summaryQuery.data ?? EMPTY_SUMMARY,
    workspaceMembers,
    workspaceCurrency,
    isPending: listQuery.isPending,
    isFetching: listQuery.isFetching || rowMutation.isPending,
    error: listQuery.isError ? 'Failed to load subscriptions' : null,
    statusFilter,
    setStatusFilter,
    dialogOpen,
    editingSubscription,
    formData,
    setFormData,
    saving: saveMutation.isPending,
    openCreate,
    openEdit,
    closeDialog,
    handleSave,
    handleDelete,
    handleConfirm,
    handleDismiss,
    assignOwner,
    recordDecision,
  };
}
