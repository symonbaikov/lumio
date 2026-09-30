'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type React from 'react';
import { RefreshCcw, Trash2, Wallet } from '@/app/components/icons';
import type { CryptoWallet } from '../hooks/useCrypto';

type CryptoWalletCardLabels = {
  sync: string;
  remove: string;
  transactions: string;
  neverSynced: string;
};

type CryptoWalletCardProps = {
  wallet: CryptoWallet;
  locale: string;
  busy: boolean;
  labels: CryptoWalletCardLabels;
  onSync: (id: string) => void;
  onRemove: (id: string) => void;
};

// Both actions share one quiet look; Disconnect only turns red on hover so the
// destructive action is still recognisable without shouting from every card.
const ghostButton = {
  color: 'text.secondary',
  fontWeight: 500,
  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
} as const;

export function CryptoWalletCard({
  wallet,
  locale,
  busy,
  labels,
  onSync,
  onRemove,
}: CryptoWalletCardProps): React.JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: 1.5,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            color: 'text.secondary',
          }}
        >
          <Wallet size={18} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography fontWeight={600}>
              {wallet.label ?? shortenAddress(wallet.address)}
            </Typography>
            <Chip label={wallet.chainName} size="small" variant="outlined" />
          </Box>

          {/* The full address stays visible: unlike a card number it is public, and
              hiding it would make it impossible to tell two wallets apart. */}
          <Typography
            variant="caption"
            component="p"
            sx={{ color: 'text.secondary', wordBreak: 'break-all', fontFamily: 'monospace' }}
          >
            {wallet.address}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
          pt: 1,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {wallet.transactionCount} {labels.transactions}
            {' · '}
            {wallet.lastSyncedAt
              ? new Date(wallet.lastSyncedAt).toLocaleString(locale)
              : labels.neverSynced}
          </Typography>
          {wallet.lastSyncError && (
            <Typography variant="caption" color="error" sx={{ display: 'block' }}>
              {wallet.lastSyncError}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            size="small"
            startIcon={<RefreshCcw size={14} />}
            sx={ghostButton}
            onClick={() => onSync(wallet.id)}
            disabled={busy}
          >
            {labels.sync}
          </Button>
          <Button
            size="small"
            startIcon={<Trash2 size={14} />}
            sx={{ ...ghostButton, '&:hover': { bgcolor: 'action.hover', color: 'error.main' } }}
            onClick={() => onRemove(wallet.id)}
            disabled={busy}
          >
            {labels.remove}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
