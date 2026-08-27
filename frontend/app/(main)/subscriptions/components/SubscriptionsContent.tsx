'use client';

import { Plus, Trash2 } from '@/app/components/icons';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  MenuItem,
  Select,
  Skeleton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import type {
  SubscriptionFormData,
  SubscriptionItem,
  SubscriptionSummary,
  SubscriptionWorkspaceMember,
} from '../hooks/useSubscriptionsPage';
import { SubscriptionCard } from './SubscriptionCard';
import { SubscriptionDetailsDrawer } from './SubscriptionDetailsDrawer';
import { SubscriptionFormDrawer } from './SubscriptionFormDrawer';
import { filterSubscriptions } from './subscription-filter.utils';

interface SubscriptionsContentProps {
  subscriptions: SubscriptionItem[];
  summary: SubscriptionSummary;
  workspaceCurrency: string;
  workspaceMembers: SubscriptionWorkspaceMember[];
  loading: boolean;
  error: string | null;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  dialogOpen: boolean;
  editingSubscription: SubscriptionItem | null;
  formData: SubscriptionFormData;
  setFormData: (data: SubscriptionFormData) => void;
  saving: boolean;
  openCreate: () => void;
  openEdit: (subscription: SubscriptionItem) => void;
  closeDialog: () => void;
  handleSave: () => void;
  handleDelete: (id: string) => void;
  handleConfirm: (id: string) => void;
  handleDismiss: (id: string) => void;
  assignOwner: (id: string, ownerId: string) => Promise<void>;
  recordDecision: (
    id: string,
    decision: 'keep' | 'review' | 'cancelled' | 'price_reduced',
    values?: { note?: string; reviewAt?: string; realizedAnnualSavings?: number },
  ) => Promise<void>;
}

function SubscriptionRowSkeleton(): React.JSX.Element {
  return (
    <tr>
      <td>
        <Skeleton variant="text" width={140} height={20} />
        <Skeleton variant="text" width={70} height={16} />
      </td>
      <td>
        <Skeleton variant="text" width={80} height={20} />
      </td>
      <td>
        <Skeleton variant="text" width={70} height={20} />
      </td>
      <td>
        <Skeleton variant="text" width={100} height={20} />
      </td>
      <td>
        <Skeleton variant="text" width={60} height={20} />
      </td>
      <td>
        <Skeleton variant="text" width={70} height={20} />
      </td>
    </tr>
  );
}

function SubscriptionCardSkeleton(): React.JSX.Element {
  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
        >
          <Box>
            <Skeleton variant="text" width={120} height={22} />
            <Skeleton variant="text" width={90} height={26} />
          </Box>
          <Skeleton variant="rounded" width={60} height={22} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
          <Skeleton variant="text" width={80} height={18} />
          <Skeleton variant="text" width={70} height={18} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Skeleton variant="circular" width={28} height={28} />
          <Skeleton variant="circular" width={28} height={28} />
        </Box>
      </CardContent>
    </Card>
  );
}

const formatAmount = (amount: number, currency: string) =>
  `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—';

export function SubscriptionsContent(props: SubscriptionsContentProps) {
  const [search, setSearch] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [category, setCategory] = useState('');
  const [riskStatus, setRiskStatus] = useState('');
  const [selected, setSelected] = useState<SubscriptionItem | null>(null);
  const visibleSubscriptions = useMemo(
    () =>
      filterSubscriptions(props.subscriptions, {
        search,
        ownerId,
        categoryId: category,
        riskStatus,
      }),
    [props.subscriptions, search, ownerId, category, riskStatus],
  );
  const categories = useMemo(
    () => [
      ...new Set(
        props.subscriptions
          .map(item => item.category?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ],
    [props.subscriptions],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, flex: 1, bgcolor: 'background.default' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Subscriptions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Control recurring SaaS spend and ownership.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={props.openCreate}>
          Add subscription
        </Button>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 2,
          mb: 3,
        }}
      >
        {[
          ['Monthly cost', formatAmount(props.summary.totalMonthlyCost, props.workspaceCurrency)],
          ['Forecast (30 days)', String(props.summary.upcoming30DaysCount)],
          ['Price changes', String(props.summary.priceChangeCount)],
          ['Reviews overdue', String(props.summary.overdueReviewCount)],
          [
            'Realized annual savings',
            formatAmount(props.summary.realizedAnnualSavings, props.workspaceCurrency),
          ],
        ].map(([label, value]) => (
          <Card key={label} variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Tabs
        value={props.statusFilter}
        onChange={(_, value) => props.setStatusFilter(value)}
        sx={{ mb: 2 }}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        <Tab value="all" label="All" />
        <Tab value="detected" label="Detected" />
        <Tab value="active" label="Active" />
        <Tab value="paused" label="Paused" />
        <Tab value="cancelled" label="Cancelled" />
      </Tabs>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(200px, 2fr) repeat(3, minmax(140px, 1fr))',
          },
          gap: 1.5,
          mb: 2,
        }}
      >
        <TextField
          size="small"
          label="Search subscriptions"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <Select
          size="small"
          displayEmpty
          value={ownerId}
          onChange={event => setOwnerId(event.target.value)}
        >
          <MenuItem value="">All owners</MenuItem>
          {props.workspaceMembers.map(member => (
            <MenuItem key={member.id} value={member.id}>
              {member.name || member.email || member.id}
            </MenuItem>
          ))}
        </Select>
        <Select
          size="small"
          displayEmpty
          value={category}
          onChange={event => setCategory(event.target.value)}
        >
          <MenuItem value="">All categories</MenuItem>
          {categories.map(name => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
        <Select
          size="small"
          displayEmpty
          value={riskStatus}
          onChange={event => setRiskStatus(event.target.value)}
        >
          <MenuItem value="">All risks</MenuItem>
          <MenuItem value="price_changed">Price changed</MenuItem>
          <MenuItem value="date_shifted">Date shifted</MenuItem>
          <MenuItem value="missing_charge">Missing charge</MenuItem>
        </Select>
      </Box>
      {props.loading ? (
        <>
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              overflowX: 'auto',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                '& th': { textAlign: 'left', p: 1.5, color: 'text.secondary', fontSize: 12 },
                '& td': { p: 1.5, borderTop: 1, borderColor: 'divider' },
              }}
            >
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Spend</th>
                  <th>Next charge</th>
                  <th>Owner</th>
                  <th>Risk</th>
                  <th>Review</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                  <SubscriptionRowSkeleton key={index} />
                ))}
              </tbody>
            </Box>
          </Box>
          <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: '1fr', gap: 1.5 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              <SubscriptionCardSkeleton key={index} />
            ))}
          </Box>
        </>
      ) : props.error ? (
        <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
          {props.error}
        </Typography>
      ) : visibleSubscriptions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No subscriptions match these filters
          </Typography>
          <Button variant="outlined" onClick={props.openCreate}>
            Add subscription
          </Button>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              overflowX: 'auto',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                '& th': { textAlign: 'left', p: 1.5, color: 'text.secondary', fontSize: 12 },
                '& td': { p: 1.5, borderTop: 1, borderColor: 'divider' },
                '& tbody tr': { cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } },
              }}
            >
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Spend</th>
                  <th>Next charge</th>
                  <th>Owner</th>
                  <th>Risk</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {visibleSubscriptions.map(subscription => (
                  <tr key={subscription.id} onClick={() => setSelected(subscription)}>
                    <td>
                      <Typography fontWeight={600}>{subscription.vendorName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {subscription.status}
                      </Typography>
                    </td>
                    <td>{formatAmount(subscription.amount, subscription.currency)}</td>
                    <td>{formatDate(subscription.nextChargeDate)}</td>
                    <td>{subscription.owner?.name || subscription.owner?.email || 'Unassigned'}</td>
                    <td>
                      {subscription.riskStatus === 'none'
                        ? '—'
                        : subscription.riskStatus.replace('_', ' ')}
                    </td>
                    <td>{formatDate(subscription.reviewAt)}</td>
                    <td>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={`Delete ${subscription.vendorName}`}
                        onClick={event => {
                          event.stopPropagation();
                          props.handleDelete(subscription.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
          <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: '1fr', gap: 1.5 }}>
            {visibleSubscriptions.map(subscription => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onEdit={() => props.openEdit(subscription)}
                onDelete={() => props.handleDelete(subscription.id)}
                onConfirm={() => props.handleConfirm(subscription.id)}
                onDismiss={() => props.handleDismiss(subscription.id)}
              />
            ))}
          </Box>
        </>
      )}
      <SubscriptionDetailsDrawer
        subscription={selected}
        members={props.workspaceMembers}
        onClose={() => setSelected(null)}
        onAssignOwner={props.assignOwner}
        onDecision={props.recordDecision}
      />
      <SubscriptionFormDrawer
        open={props.dialogOpen}
        formData={props.formData}
        setFormData={props.setFormData}
        saving={props.saving}
        isEditing={Boolean(props.editingSubscription)}
        onSave={props.handleSave}
        onClose={props.closeDialog}
      />
    </Box>
  );
}
