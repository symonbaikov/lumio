'use client';

import { Plus } from '@/app/components/icons';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import type {
  SubscriptionFormData,
  SubscriptionItem,
  SubscriptionSummary,
} from '../hooks/useSubscriptionsPage';
import { SubscriptionCard } from './SubscriptionCard';
import { SubscriptionFormDrawer } from './SubscriptionFormDrawer';

interface SubscriptionsContentProps {
  subscriptions: SubscriptionItem[];
  summary: SubscriptionSummary;
  loading: boolean;
  error: string | null;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  dialogOpen: boolean;
  editingSubscription: SubscriptionItem | null;
  formData: SubscriptionFormData;
  setFormData: (data: SubscriptionFormData) => void;
  saving: boolean;
  openCreate: () => void;
  openEdit: (sub: SubscriptionItem) => void;
  closeDialog: () => void;
  handleSave: () => void;
  handleDelete: (id: string) => void;
  handleConfirm: (id: string) => void;
  handleDismiss: (id: string) => void;
}

export function SubscriptionsContent(props: SubscriptionsContentProps) {
  const {
    subscriptions,
    summary,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    dialogOpen,
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
  } = props;

  const formatAmount = (amount: number, currency: string) =>
    `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount)} ${currency}`;

  return (
    <Box sx={{ p: 3, flex: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Subscriptions
        </Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={openCreate}>
          Add subscription
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 2,
          mb: 3,
        }}
      >
        <Card variant="outlined">
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">
              Monthly cost
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {formatAmount(summary.totalMonthlyCost, 'KZT')}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">
              Active
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {summary.activeCount}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">
              Upcoming (7 days)
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {summary.upcomingCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Tabs value={statusFilter} onChange={(_, v) => setStatusFilter(v)} sx={{ mb: 2 }}>
        <Tab value="all" label="All" />
        <Tab value="detected" label="Detected" />
        <Tab value="active" label="Active" />
        <Tab value="paused" label="Paused" />
        <Tab value="cancelled" label="Cancelled" />
      </Tabs>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
          {error}
        </Typography>
      ) : subscriptions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No subscriptions found
          </Typography>
          <Button variant="outlined" onClick={openCreate}>
            Add your first subscription
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 2,
          }}
        >
          {subscriptions.map(sub => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              onEdit={() => openEdit(sub)}
              onDelete={() => handleDelete(sub.id)}
              onConfirm={() => handleConfirm(sub.id)}
              onDismiss={() => handleDismiss(sub.id)}
            />
          ))}
        </Box>
      )}

      <SubscriptionFormDrawer
        open={dialogOpen}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
        isEditing={!!props.editingSubscription}
        onSave={handleSave}
        onClose={closeDialog}
      />
    </Box>
  );
}
