import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

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
  const workspaceCurrency = currentWorkspace?.currency ?? DEFAULT_CURRENCY;

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [summary, setSummary] = useState<SubscriptionSummary>({
    totalMonthlyCost: 0,
    activeCount: 0,
    upcomingCount: 0,
    upcoming30DaysCount: 0,
    priceChangeCount: 0,
    overdueReviewCount: 0,
    realizedAnnualSavings: 0,
  });
  const [workspaceMembers, setWorkspaceMembers] = useState<SubscriptionWorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionItem | null>(null);
  const [formData, setFormData] = useState<SubscriptionFormData>(() =>
    makeEmptyForm(workspaceCurrency),
  );
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const [subsRes, summaryRes] = await Promise.all([
        apiClient.get(`/subscriptions${params}`),
        apiClient.get('/subscriptions/summary'),
      ]);
      setSubscriptions(subsRes.data?.data ?? subsRes.data ?? []);
      setSummary(
        summaryRes.data?.data ??
          summaryRes.data ?? {
            totalMonthlyCost: 0,
            activeCount: 0,
            upcomingCount: 0,
            upcoming30DaysCount: 0,
            priceChangeCount: 0,
            overdueReviewCount: 0,
            realizedAnnualSavings: 0,
          },
      );
    } catch {
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

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
    if (!formData.vendorName || !formData.amount) return;
    setSaving(true);
    try {
      const payload = {
        vendorName: formData.vendorName,
        amount: Number(formData.amount),
        frequency: formData.frequency,
        currency: formData.currency || workspaceCurrency,
        categoryId: formData.categoryId || undefined,
        nextChargeDate: formData.nextChargeDate || undefined,
      };
      if (editingSubscription) {
        await apiClient.put(`/subscriptions/${editingSubscription.id}`, payload);
        toast.success('Subscription updated');
      } else {
        await apiClient.post('/subscriptions', payload);
        toast.success('Subscription created');
      }
      closeDialog();
      await load();
    } catch {
      toast.error('Failed to save subscription');
    } finally {
      setSaving(false);
    }
  }, [formData, editingSubscription, closeDialog, load, workspaceCurrency]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/subscriptions/${id}`);
        toast.success('Subscription cancelled');
        await load();
      } catch {
        toast.error('Failed to delete subscription');
      }
    },
    [load],
  );

  const handleConfirm = useCallback(
    async (id: string) => {
      try {
        await apiClient.post(`/subscriptions/${id}/confirm`);
        toast.success('Subscription confirmed');
        await load();
      } catch {
        toast.error('Failed to confirm subscription');
      }
    },
    [load],
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      try {
        await apiClient.post(`/subscriptions/${id}/dismiss`);
        toast.success('Subscription dismissed');
        await load();
      } catch {
        toast.error('Failed to dismiss subscription');
      }
    },
    [load],
  );

  const assignOwner = useCallback(
    async (id: string, ownerId: string) => {
      try {
        await apiClient.patch(`/subscriptions/${id}/owner`, { ownerId });
        toast.success('Owner assigned');
        await load();
      } catch {
        toast.error('Failed to assign owner');
      }
    },
    [load],
  );

  const recordDecision = useCallback(
    async (
      id: string,
      decision: 'keep' | 'review' | 'cancelled' | 'price_reduced',
      values: { note?: string; reviewAt?: string; realizedAnnualSavings?: number } = {},
    ) => {
      try {
        await apiClient.post(`/subscriptions/${id}/decisions`, { decision, ...values });
        toast.success('Subscription decision saved');
        await load();
      } catch {
        toast.error('Failed to save subscription decision');
      }
    },
    [load],
  );

  return {
    subscriptions,
    summary,
    workspaceMembers,
    workspaceCurrency,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    dialogOpen,
    editingSubscription,
    formData,
    setFormData,
    saving,
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
