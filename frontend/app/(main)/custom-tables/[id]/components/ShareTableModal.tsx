'use client';

import { ModalShell } from '@/app/components/ui/modal-shell';
import apiClient from '@/app/lib/api';
import { Box } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface ShareItem {
  id: string;
  token: string;
  status: 'active' | 'expired' | 'revoked';
  expiresAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
}

interface ShareTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string | null;
  labels: {
    title: string;
    hint: string;
    create: string;
    creating: string;
    revoke: string;
    copy: string;
    copied: string;
    empty: string;
    expires: string;
    opened: string;
    statusActive: string;
    statusExpired: string;
    statusRevoked: string;
    failed: string;
  };
}

function shareUrl(token: string): string {
  return `${window.location.origin}/shared/tables/${token}`;
}

export function ShareTableModal({ isOpen, onClose, tableId, labels }: ShareTableModalProps) {
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tableId) {
      return;
    }
    try {
      const response = await apiClient.get(`/custom-tables/${tableId}/shares`);
      const root = (response.data ?? {}) as Record<string, unknown>;
      const nested = (root.data ?? {}) as Record<string, unknown>;
      const items = root.items ?? nested.items ?? [];
      setShares(Array.isArray(items) ? (items as ShareItem[]) : []);
    } catch (error) {
      console.error('Failed to load shares:', error);
    }
  }, [tableId]);

  useEffect(() => {
    if (isOpen) {
      void load();
    }
  }, [isOpen, load]);

  const createShare = async (): Promise<void> => {
    if (!tableId) {
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(`/custom-tables/${tableId}/shares`, {});
      await load();
    } catch (error) {
      console.error('Failed to create share:', error);
      toast.error(labels.failed);
    } finally {
      setBusy(false);
    }
  };

  const revokeShare = async (shareId: string): Promise<void> => {
    if (!tableId) {
      return;
    }
    try {
      await apiClient.delete(`/custom-tables/${tableId}/shares/${shareId}`);
      await load();
    } catch (error) {
      console.error('Failed to revoke share:', error);
      toast.error(labels.failed);
    }
  };

  const statusLabel = (status: ShareItem['status']): string =>
    status === 'active'
      ? labels.statusActive
      : status === 'expired'
        ? labels.statusExpired
        : labels.statusRevoked;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} size="xl" title={labels.title}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{labels.hint}</Box>

        <Box
          component="button"
          type="button"
          disabled={busy}
          onClick={() => void createShare()}
          sx={{
            alignSelf: 'flex-start',
            border: '1px solid var(--border-color)',
            bgcolor: 'var(--card-bg)',
            px: 2,
            py: 1,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--foreground)',
            cursor: 'pointer',
            '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
          }}
        >
          {busy ? labels.creating : labels.create}
        </Box>

        {shares.length === 0 && (
          <Box sx={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{labels.empty}</Box>
        )}

        {shares.map(share => (
          <Box
            key={share.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              border: '1px solid var(--border-color)',
              px: 1.5,
              py: 1,
              fontSize: 13,
              opacity: share.status === 'active' ? 1 : 0.6,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                {shareUrl(share.token)}
              </Box>
              <Box sx={{ color: 'var(--muted-foreground)', fontSize: 12, mt: 0.5 }}>
                {statusLabel(share.status)}
                {share.expiresAt
                  ? ` · ${labels.expires} ${new Date(share.expiresAt).toLocaleDateString()}`
                  : ''}
                {` · ${labels.opened}: ${share.accessCount}`}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Box
                component="button"
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(shareUrl(share.token));
                  toast.success(labels.copied);
                }}
                sx={{
                  border: '1px solid var(--border-color)',
                  bgcolor: 'transparent',
                  px: 1,
                  py: 0.5,
                  fontSize: 12,
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                {labels.copy}
              </Box>
              {share.status === 'active' && (
                <Box
                  component="button"
                  type="button"
                  onClick={() => void revokeShare(share.id)}
                  sx={{
                    border: '1px solid var(--border-color)',
                    bgcolor: 'transparent',
                    px: 1,
                    py: 0.5,
                    fontSize: 12,
                    cursor: 'pointer',
                    color: 'var(--destructive)',
                  }}
                >
                  {labels.revoke}
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </ModalShell>
  );
}
