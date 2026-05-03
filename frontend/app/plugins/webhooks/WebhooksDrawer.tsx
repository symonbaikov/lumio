'use client';

import { useState } from 'react';
import { Box, Typography, TextField, FormControlLabel, Checkbox } from '@mui/material';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { Copy, Trash2, Plus } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';
import { useWebhookEndpoints, useWebhookSubscriptions } from './useWebhooks';
import toast from 'react-hot-toast';

const EVENTS = [
  { value: 'transaction.created', label: 'Transaction Created' },
  { value: 'statement.processed', label: 'Statement Processed' },
  { value: 'receipt.approved', label: 'Receipt Approved' },
];

interface WebhooksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const tabBtnStyle = (active: boolean) => ({
  padding: '6px 16px',
  borderRadius: tokens.radius.md,
  border: 'none',
  background: active ? 'var(--primary, #059669)' : 'transparent',
  color: active ? '#fff' : 'var(--text-secondary)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s',
});

const actionBtnStyle = (variant: 'danger' | 'default' | 'primary') => ({
  padding: '5px 12px',
  borderRadius: tokens.radius.sm,
  border: variant === 'danger' ? '1px solid #dc2626' : variant === 'primary' ? 'none' : '1px solid var(--border-color, #e5e7eb)',
  background: variant === 'primary' ? 'var(--primary, #059669)' : 'transparent',
  color: variant === 'danger' ? '#dc2626' : variant === 'primary' ? '#fff' : 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
});

export function WebhooksDrawer({ isOpen, onClose }: WebhooksDrawerProps) {
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');

  const {
    endpoints,
    loading: endpointsLoading,
    newToken,
    setNewToken,
    create: createEndpoint,
    remove: removeEndpoint,
    toggle: toggleEndpoint,
  } = useWebhookEndpoints();

  const {
    subscriptions,
    loading: subsLoading,
    create: createSubscription,
    remove: removeSubscription,
    testPing,
  } = useWebhookSubscriptions();

  // Inbound form state
  const [showEndpointForm, setShowEndpointForm] = useState(false);
  const [endpointName, setEndpointName] = useState('');

  // Outbound form state
  const [showSubForm, setShowSubForm] = useState(false);
  const [subName, setSubName] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [subSecret, setSubSecret] = useState('');
  const [subEvents, setSubEvents] = useState<string[]>([]);

  const handleCreateEndpoint = async () => {
    if (!endpointName.trim()) return;
    await createEndpoint(endpointName.trim());
    setEndpointName('');
    setShowEndpointForm(false);
  };

  const handleCreateSubscription = async () => {
    if (!subName.trim() || !subUrl.trim() || subSecret.length < 16 || subEvents.length === 0) return;
    await createSubscription({ name: subName.trim(), url: subUrl.trim(), secret: subSecret, events: subEvents });
    setSubName('');
    setSubUrl('');
    setSubSecret('');
    setSubEvents([]);
    setShowSubForm(false);
  };

  const handleCopyToken = (token: string) => {
    void navigator.clipboard.writeText(token).then(() => toast.success('Token copied'));
  };

  const toggleEvent = (value: string) => {
    setSubEvents(prev =>
      prev.includes(value) ? prev.filter(e => e !== value) : [...prev, value],
    );
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Webhooks"
      position="right"
      width="lg"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
        {/* Tab switcher */}
        <Box sx={{ display: 'flex', gap: 0.5, p: 0.5, borderRadius: tokens.radius.md, border: '1px solid var(--border-color, #e5e7eb)', alignSelf: 'flex-start' }}>
          <button type="button" style={tabBtnStyle(activeTab === 'inbound')} onClick={() => setActiveTab('inbound')}>
            Inbound
          </button>
          <button type="button" style={tabBtnStyle(activeTab === 'outbound')} onClick={() => setActiveTab('outbound')}>
            Outbound
          </button>
        </Box>

        {/* Inbound tab */}
        {activeTab === 'inbound' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflow: 'auto' }}>
            <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Inbound endpoints receive data from external tools via a unique URL and token.
            </Typography>

            {/* New token banner */}
            {newToken && (
              <Box sx={{
                p: 2,
                borderRadius: tokens.radius.md,
                border: '1px solid rgba(5,150,105,0.4)',
                background: 'rgba(5,150,105,0.06)',
              }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#059669', mb: 1 }}>
                  Copy this token — it won&apos;t be shown again
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all', flex: 1 }}>
                    {newToken}
                  </Typography>
                  <button type="button" style={actionBtnStyle('primary')} onClick={() => handleCopyToken(newToken)}>
                    <Copy size={14} />
                  </button>
                  <button type="button" style={actionBtnStyle('default')} onClick={() => setNewToken(null)}>
                    Dismiss
                  </button>
                </Box>
              </Box>
            )}

            {/* Endpoint list */}
            {endpointsLoading ? (
              <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading...</Typography>
            ) : endpoints.length === 0 && !showEndpointForm ? (
              <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>No endpoints yet.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {endpoints.map(ep => (
                  <Box key={ep.id} sx={{
                    p: 1.5,
                    borderRadius: tokens.radius.md,
                    border: '1px solid var(--border-color, #e5e7eb)',
                    background: 'var(--card-bg, #fff)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ep.name}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {ep.tokenPreview}
                      </Typography>
                    </Box>
                    <Box sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: tokens.radius.sm,
                      background: ep.isActive ? 'rgba(5,150,105,0.1)' : 'rgba(0,0,0,0.06)',
                      color: ep.isActive ? '#059669' : 'var(--text-secondary)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }} onClick={() => void toggleEndpoint(ep.id, ep.isActive)}>
                      {ep.isActive ? 'Active' : 'Paused'}
                    </Box>
                    <button type="button" style={actionBtnStyle('danger')} onClick={() => void removeEndpoint(ep.id)}>
                      <Trash2 size={14} />
                    </button>
                  </Box>
                ))}
              </Box>
            )}

            {/* Inline create form */}
            {showEndpointForm ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5, borderRadius: tokens.radius.md, border: '1px solid var(--border-color, #e5e7eb)' }}>
                <TextField
                  size="small"
                  label="Endpoint name"
                  value={endpointName}
                  onChange={e => setEndpointName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void handleCreateEndpoint(); }}
                  autoFocus
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <button type="button" style={actionBtnStyle('primary')} onClick={() => void handleCreateEndpoint()}>
                    Create
                  </button>
                  <button type="button" style={actionBtnStyle('default')} onClick={() => { setShowEndpointForm(false); setEndpointName(''); }}>
                    Cancel
                  </button>
                </Box>
              </Box>
            ) : (
              <button type="button" style={{ ...actionBtnStyle('default'), alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setShowEndpointForm(true)}>
                <Plus size={14} /> New Endpoint
              </button>
            )}
          </Box>
        )}

        {/* Outbound tab */}
        {activeTab === 'outbound' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflow: 'auto' }}>
            <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Outbound subscriptions deliver event notifications to your external URLs.
            </Typography>

            {/* Subscription list */}
            {subsLoading ? (
              <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading...</Typography>
            ) : subscriptions.length === 0 && !showSubForm ? (
              <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>No subscriptions yet.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {subscriptions.map(sub => (
                  <Box key={sub.id} sx={{
                    p: 1.5,
                    borderRadius: tokens.radius.md,
                    border: '1px solid var(--border-color, #e5e7eb)',
                    background: 'var(--card-bg, #fff)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {sub.name}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sub.url}
                        </Typography>
                      </Box>
                      <button type="button" style={actionBtnStyle('default')} onClick={() => void testPing(sub.id)}>
                        Test
                      </button>
                      <button type="button" style={actionBtnStyle('danger')} onClick={() => void removeSubscription(sub.id)}>
                        <Trash2 size={14} />
                      </button>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {sub.events.map(evt => (
                        <Box key={evt} sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: tokens.radius.sm,
                          background: 'rgba(99,102,241,0.08)',
                          color: '#6366f1',
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          {evt}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Inline create form */}
            {showSubForm ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5, borderRadius: tokens.radius.md, border: '1px solid var(--border-color, #e5e7eb)' }}>
                <TextField size="small" label="Name" value={subName} onChange={e => setSubName(e.target.value)} />
                <TextField size="small" label="URL" value={subUrl} onChange={e => setSubUrl(e.target.value)} placeholder="https://example.com/hook" />
                <TextField
                  size="small"
                  label="Secret (min 16 chars)"
                  value={subSecret}
                  onChange={e => setSubSecret(e.target.value)}
                  error={subSecret.length > 0 && subSecret.length < 16}
                  helperText={subSecret.length > 0 && subSecret.length < 16 ? 'Secret must be at least 16 characters' : ''}
                />
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', mb: 0.5 }}>Events</Typography>
                  {EVENTS.map(evt => (
                    <FormControlLabel
                      key={evt.value}
                      control={
                        <Checkbox
                          size="small"
                          checked={subEvents.includes(evt.value)}
                          onChange={() => toggleEvent(evt.value)}
                        />
                      }
                      label={<Typography sx={{ fontSize: 13 }}>{evt.label}</Typography>}
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <button
                    type="button"
                    style={actionBtnStyle('primary')}
                    onClick={() => void handleCreateSubscription()}
                    disabled={!subName.trim() || !subUrl.trim() || subSecret.length < 16 || subEvents.length === 0}
                  >
                    Create
                  </button>
                  <button type="button" style={actionBtnStyle('default')} onClick={() => { setShowSubForm(false); setSubName(''); setSubUrl(''); setSubSecret(''); setSubEvents([]); }}>
                    Cancel
                  </button>
                </Box>
              </Box>
            ) : (
              <button type="button" style={{ ...actionBtnStyle('default'), alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setShowSubForm(true)}>
                <Plus size={14} /> New Subscription
              </button>
            )}
          </Box>
        )}
      </Box>
    </DrawerShell>
  );
}
