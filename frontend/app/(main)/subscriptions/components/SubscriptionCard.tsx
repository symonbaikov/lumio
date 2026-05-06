'use client';

import { Box, Button, Card, CardContent, Chip, IconButton, Typography } from '@mui/material';
import { Pencil, Trash2 } from '@/app/components/icons';
import type { SubscriptionItem } from '../hooks/useSubscriptionsPage';

interface SubscriptionCardProps {
  subscription: SubscriptionItem;
  onEdit: () => void;
  onDelete: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
}

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'default' | 'error'> = {
  detected: 'warning',
  active: 'success',
  paused: 'default',
  cancelled: 'error',
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: '/week',
  monthly: '/mo',
  quarterly: '/quarter',
  annual: '/year',
};

export function SubscriptionCard({ subscription, onEdit, onDelete, onConfirm, onDismiss }: SubscriptionCardProps) {
  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount) + ' ' + currency;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <Card variant="outlined" sx={{ position: 'relative' }}>
      <CardContent sx={{ pb: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {subscription.vendorName}
            </Typography>
            <Typography variant="h6" fontWeight={700} color="primary">
              {formatAmount(subscription.amount, subscription.currency)}
              <Typography component="span" variant="body2" color="text.secondary">
                {FREQUENCY_LABELS[subscription.frequency]}
              </Typography>
            </Typography>
          </Box>
          <Chip
            label={subscription.status}
            size="small"
            color={STATUS_COLORS[subscription.status] ?? 'default'}
            variant="outlined"
          />
        </Box>

        {/* Details */}
        <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
          {subscription.nextChargeDate && (
            <Typography variant="body2" color="text.secondary">
              Next: {formatDate(subscription.nextChargeDate)}
            </Typography>
          )}
          {subscription.category && (
            <Typography variant="body2" color="text.secondary">
              {subscription.category.name}
            </Typography>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {subscription.status === 'detected' ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="contained" onClick={onConfirm}>
                Confirm
              </Button>
              <Button size="small" variant="outlined" color="inherit" onClick={onDismiss}>
                Dismiss
              </Button>
            </Box>
          ) : (
            <Box />
          )}
          <Box>
            <IconButton size="small" onClick={onEdit}>
              <Pencil size={16} />
            </IconButton>
            <IconButton size="small" color="error" onClick={onDelete}>
              <Trash2 size={16} />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
