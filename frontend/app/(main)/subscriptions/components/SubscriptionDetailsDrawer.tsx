'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import apiClient from '@/app/lib/api';
import { Button, Chip, Divider, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import type { SubscriptionItem, SubscriptionWorkspaceMember } from '../hooks/useSubscriptionsPage';

interface SubscriptionDetailsDrawerProps {
  subscription: SubscriptionItem | null;
  members: SubscriptionWorkspaceMember[];
  onClose: () => void;
  onAssignOwner: (id: string, ownerId: string) => Promise<void>;
  onDecision: (
    id: string,
    decision: 'keep' | 'review' | 'cancelled' | 'price_reduced',
    values?: { note?: string; reviewAt?: string; realizedAnnualSavings?: number },
  ) => Promise<void>;
}

const formatDate = (value: string | null): string => value ? new Date(value).toLocaleDateString('ru-RU') : '—';

type SubscriptionDetails = {
  charges: Array<{ id: string; amount: number; currency: string; chargeDate: string; matchStatus: string }>;
  decisions: Array<{ id: string; decision: string; note: string | null; savingsAmount: number | null; createdAt: string }>;
};

export function SubscriptionDetailsDrawer({ subscription, members, onClose, onAssignOwner, onDecision }: SubscriptionDetailsDrawerProps) {
  const [ownerId, setOwnerId] = useState('');
  const [note, setNote] = useState('');
  const [reviewAt, setReviewAt] = useState('');
  const [annualSavings, setAnnualSavings] = useState('');
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);

  useEffect(() => {
    if (!subscription) return;
    void apiClient.get(`/subscriptions/${subscription.id}`).then(response => {
      setDetails(response.data?.data ?? response.data ?? null);
    }).catch(() => setDetails(null));
  }, [subscription]);

  if (!subscription) return null;
  const assignableOwnerId = ownerId || subscription.ownerId || '';

  return (
    <DrawerShell isOpen={Boolean(subscription)} onClose={onClose} title={subscription.vendorName} width="lg">
      <Stack spacing={2} sx={{ overflowY: 'auto', pr: 0.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={subscription.status} size="small" color={subscription.status === 'active' ? 'success' : 'default'} />
          {subscription.riskStatus !== 'none' && <Chip label={subscription.riskStatus.replace('_', ' ')} size="small" color="warning" />}
        </Stack>
        <Typography variant="h5" fontWeight={700}>{subscription.amount} {subscription.currency}</Typography>
        <Typography color="text.secondary">Expected charge: {formatDate(subscription.nextChargeDate)} · Last charge: {formatDate(subscription.lastChargeDate)}</Typography>
        <Typography variant="subtitle2">Charge history</Typography>
        {details?.charges.length ? details.charges.map(charge => <Typography key={charge.id} variant="body2">{formatDate(charge.chargeDate)} · {charge.amount} {charge.currency} · {charge.matchStatus.replace('_', ' ')}</Typography>) : <Typography variant="body2" color="text.secondary">No linked charges yet.</Typography>}
        <Divider />
        <Typography variant="subtitle2">Accountability</Typography>
        <FormControl fullWidth size="small">
          <InputLabel id="subscription-owner-label">Owner</InputLabel>
          <Select labelId="subscription-owner-label" label="Owner" value={assignableOwnerId} onChange={event => setOwnerId(event.target.value)}>
            <MenuItem value=""><em>Unassigned</em></MenuItem>
            {members.map(member => <MenuItem key={member.id} value={member.id}>{member.name || member.email || member.id}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="outlined" disabled={!ownerId || ownerId === subscription.ownerId} onClick={() => void onAssignOwner(subscription.id, ownerId)}>Assign owner</Button>
        <TextField label="Review date" type="date" value={reviewAt || subscription.reviewAt?.slice(0, 10) || ''} onChange={event => setReviewAt(event.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small" />
        <Stack direction="row" spacing={1}>
          <Button fullWidth variant="contained" onClick={() => void onDecision(subscription.id, 'keep', { reviewAt: reviewAt || undefined })}>Keep</Button>
          <Button fullWidth variant="outlined" onClick={() => void onDecision(subscription.id, 'review', { reviewAt: reviewAt || undefined })}>Review</Button>
        </Stack>
        <Divider />
        <Typography variant="subtitle2">Record a decision</Typography>
        <TextField label="Reason" value={note} onChange={event => setNote(event.target.value)} multiline minRows={2} fullWidth />
        <TextField label="Realized annual savings" type="number" value={annualSavings} onChange={event => setAnnualSavings(event.target.value)} fullWidth size="small" />
        <Stack direction="row" spacing={1}>
          <Button color="error" variant="outlined" onClick={() => void onDecision(subscription.id, 'cancelled', { note, realizedAnnualSavings: Number(annualSavings) || 0 })}>Record cancellation</Button>
          <Button variant="outlined" onClick={() => void onDecision(subscription.id, 'price_reduced', { note, realizedAnnualSavings: Number(annualSavings) || 0 })}>Record price reduction</Button>
        </Stack>
        <Typography variant="subtitle2">Decision history</Typography>
        {details?.decisions.length ? details.decisions.map(decision => <Typography key={decision.id} variant="body2">{formatDate(decision.createdAt)} · {decision.decision}{decision.note ? ` — ${decision.note}` : ''}</Typography>) : <Typography variant="body2" color="text.secondary">No decisions recorded yet.</Typography>}
      </Stack>
    </DrawerShell>
  );
}
