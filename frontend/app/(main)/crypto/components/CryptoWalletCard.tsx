'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type React from 'react';
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

export function CryptoWalletCard({
  wallet,
  locale,
  busy,
  labels,
  onSync,
  onRemove,
}: CryptoWalletCardProps): React.JSX.Element {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}
    >
      <Box sx={{ flex: 1, minWidth: 220 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography fontWeight={600}>{wallet.label ?? shortenAddress(wallet.address)}</Typography>
          <Chip label={wallet.chainName} size="small" />
        </Box>

        {/* The full address stays visible: unlike a card number it is public, and
            hiding it would make it impossible to tell two wallets apart. */}
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', wordBreak: 'break-all', fontFamily: 'monospace' }}
        >
          {wallet.address}
        </Typography>

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

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" onClick={() => onSync(wallet.id)} disabled={busy}>
          {labels.sync}
        </Button>
        <Button size="small" color="error" onClick={() => onRemove(wallet.id)} disabled={busy}>
          {labels.remove}
        </Button>
      </Box>
    </Paper>
  );
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
