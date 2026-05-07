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
import type React from 'react';
import type { ReactNode } from 'react';
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
  handleRestore: (id: string) => void;
}

interface SummaryCardProps {
  label: string;
  value: ReactNode;
}

function SummaryCard({ label, value }: SummaryCardProps): React.JSX.Element {
  return (
    <Card variant="outlined">
      <CardContent
        sx={{
          py: { xs: 2, sm: 2 },
          px: { xs: 2, sm: 2 },
          '&:last-child': { pb: { xs: 2, sm: 2 } },
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: 16, sm: 14 } }}>
          {label}
        </Typography>
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ fontSize: { xs: 20, sm: 18 }, lineHeight: 1.2, mt: 0.5 }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
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
    handleRestore,
  } = props;

  const formatAmount = (amount: number, currency: string) =>
    `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount)} ${currency}`;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        p: { xs: 2, md: 3 },
        pb: { xs: 10, md: 3 },
        flex: 1,
        minWidth: 0,
        overflowX: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: { xs: 2.5, sm: 3 },
        }}
      >
        <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: 28, sm: 24 } }}>
          Subscriptions
        </Typography>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={openCreate}
          aria-label="Add subscription"
          sx={{
            flexShrink: 0,
            minWidth: { xs: 56, md: 'auto' },
            width: { xs: 56, md: 'auto' },
            height: { xs: 56, md: 36 },
            px: { xs: 0, md: 2 },
            '& .MuiButton-startIcon': { m: { xs: 0, md: '0 8px 0 -4px' } },
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
            Add subscription
          </Box>
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          width: '100%',
          minWidth: 0,
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'repeat(3, minmax(0, 1fr))',
          },
          gap: { xs: 1.5, md: 2 },
          mb: 3,
        }}
      >
        <SummaryCard label="Monthly cost" value={formatAmount(summary.totalMonthlyCost, 'KZT')} />
        <SummaryCard label="Active" value={summary.activeCount} />
        <SummaryCard label="Upcoming (7 days)" value={summary.upcomingCount} />
      </Box>

      {/* Tabs */}
      <Tabs
        value={statusFilter}
        onChange={(_, v) => setStatusFilter(v)}
        variant="scrollable"
        scrollButtons={false}
        sx={{
          mb: { xs: 2, sm: 2 },
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflow: 'hidden',
          '& .MuiTabs-scroller': { overflowX: 'auto !important' },
          '& .MuiTabs-flexContainer': { width: 'max-content' },
          '& .MuiTab-root': {
            minWidth: { xs: 104, md: 90 },
            px: { xs: 1.5, md: 2 },
            fontSize: { xs: 16, md: 14 },
          },
        }}
      >
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
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: 'repeat(auto-fill, minmax(320px, 1fr))',
            },
            gap: { xs: 1.5, md: 2 },
            width: '100%',
            minWidth: 0,
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
              onRestore={() => handleRestore(sub.id)}
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
