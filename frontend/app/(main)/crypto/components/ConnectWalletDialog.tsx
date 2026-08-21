'use client';

import { WalletUnavailableError, requestWalletAddress } from '@/app/lib/metamask';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type React from 'react';
import { useState } from 'react';
import { EVM_ADDRESS_PATTERN } from '../hooks/useCrypto';

type ConnectWalletDialogLabels = {
  title: string;
  useMetaMask: string;
  manualHint: string;
  addressLabel: string;
  nameLabel: string;
  invalidAddress: string;
  noWallet: string;
  readOnly: string;
  connect: string;
  cancel: string;
};

type ConnectWalletDialogProps = {
  open: boolean;
  saving: boolean;
  /** Failure reported by the server, e.g. an address already connected. */
  serverError: string | null;
  labels: ConnectWalletDialogLabels;
  onClose: () => void;
  onSubmit: (address: string, label: string) => Promise<boolean>;
};

export function ConnectWalletDialog({
  open,
  saving,
  serverError,
  labels,
  onClose,
  onSubmit,
}: ConnectWalletDialogProps): React.JSX.Element {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const close = (): void => {
    setAddress('');
    setLabel('');
    setLocalError(null);
    onClose();
  };

  const pickFromWallet = async (): Promise<void> => {
    setLocalError(null);
    try {
      setAddress(await requestWalletAddress());
    } catch (error) {
      // A user who dismisses the wallet prompt has not made a mistake; only a
      // missing wallet needs explaining, and the manual field still works.
      if (error instanceof WalletUnavailableError) {
        setLocalError(labels.noWallet);
      }
    }
  };

  const submit = async (): Promise<void> => {
    const trimmed = address.trim();
    if (!EVM_ADDRESS_PATTERN.test(trimmed)) {
      setLocalError(labels.invalidAddress);
      return;
    }
    if (await onSubmit(trimmed, label)) {
      close();
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{labels.title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Button variant="outlined" onClick={() => void pickFromWallet()} disabled={saving}>
          {labels.useMetaMask}
        </Button>

        <Divider sx={{ color: 'text.secondary', fontSize: 13 }}>{labels.manualHint}</Divider>

        <TextField
          label={labels.addressLabel}
          value={address}
          onChange={event => {
            setAddress(event.target.value);
            setLocalError(null);
          }}
          placeholder="0x…"
          fullWidth
          autoComplete="off"
          spellCheck={false}
          error={localError !== null || serverError !== null}
          helperText={localError ?? serverError ?? ' '}
        />

        <TextField
          label={labels.nameLabel}
          value={label}
          onChange={event => setLabel(event.target.value)}
          fullWidth
          autoComplete="off"
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {labels.readOnly}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={saving}>
          {labels.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={saving || address.trim() === ''}
        >
          {labels.connect}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
