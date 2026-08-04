import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { DEFAULT_CURRENCY } from '@/app/lib/format-money';

export interface SubscriptionItem {
  id: string;
  vendorName: string;
  vendorRaw: string | null;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  status: 'detected' | 'active' | 'paused' | 'cancelled';
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
}

export interface SubscriptionFormData {
  vendorName: string;
  amount: number | '';
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  currency: string;
  categoryId: string;
  nextChargeDate: string;
}

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
  const [summary, setSummary] = useState<SubscriptionSummary>({ totalMonthlyCost: 0, activeCount: 0, upcomingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionItem | null>(null);
  const [formData, setFormData] = useState<SubscriptionFormData>(() => makeEmptyForm(workspaceCurrency));
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
      setSummary(summaryRes.data?.data ?? summaryRes.data ?? { totalMonthlyCost: 0, activeCount: 0, upcomingCount: 0 });
    } catch {
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

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
  }, [formData, editingSubscription, closeDialog, load]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/subscriptions/${id}`);
      toast.success('Subscription cancelled');
      await load();
    } catch {
      toast.error('Failed to delete subscription');
    }
  }, [load]);

  const handleConfirm = useCallback(async (id: string) => {
    try {
      await apiClient.post(`/subscriptions/${id}/confirm`);
      toast.success('Subscription confirmed');
      await load();
    } catch {
      toast.error('Failed to confirm subscription');
    }
  }, [load]);

  const handleDismiss = useCallback(async (id: string) => {
    try {
      await apiClient.post(`/subscriptions/${id}/dismiss`);
      toast.success('Subscription dismissed');
      await load();
    } catch {
      toast.error('Failed to dismiss subscription');
    }
  }, [load]);

  return {
    subscriptions,
    summary,
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
  };
}
