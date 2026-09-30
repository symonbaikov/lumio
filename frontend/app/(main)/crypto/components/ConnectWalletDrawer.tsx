'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type React from 'react';
import { useState } from 'react';
import { ChevronLeft } from '@/app/components/icons';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { requestWalletAddress, WalletUnavailableError } from '@/app/lib/metamask';
import { addressFamily, type CryptoNetwork } from '../hooks/useCrypto';

type ConnectWalletDrawerLabels = {
  title: string;
  useMetaMask: string;
  manualHint: string;
  addressLabel: string;
  nameLabel: string;
  invalidAddress: string;
  networksHint: string;
  networksLabel: string;
  networkDetected: string;
  noNetworkSelected: string;
  noWallet: string;
  readOnly: string;
  connect: string;
  cancel: string;
};

type ConnectWalletDrawerProps = {
  open: boolean;
  saving: boolean;
  /** Failure reported by the server, e.g. an address already connected. */
  serverError: string | null;
  labels: ConnectWalletDrawerLabels;
  networks: CryptoNetwork[];
  onClose: () => void;
  onSubmit: (address: string, label: string, chainIds?: number[]) => Promise<boolean>;
};

export function ConnectWalletDrawer({
  open,
  saving,
  serverError,
  labels,
  networks,
  onClose,
  onSubmit,
}: ConnectWalletDrawerProps): React.JSX.Element {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  // Networks the user unticked. Everything else is on, so a new EVM network
  // added on the server is offered ticked without the form having to know it.
  const [excludedChainIds, setExcludedChainIds] = useState<number[]>([]);

  const family = addressFamily(address.trim());
  const evmNetworks = networks.filter(network => network.family === 'evm');
  const selectedChainIds = evmNetworks
    .map(network => network.chainId)
    .filter(chainId => !excludedChainIds.includes(chainId));
  const detectedNetwork =
    family && family !== 'evm' ? networks.find(network => network.family === family) : undefined;

  const toggleChain = (chainId: number): void => {
    setLocalError(null);
    setExcludedChainIds(previous =>
      previous.includes(chainId) ? previous.filter(id => id !== chainId) : [...previous, chainId],
    );
  };

  const close = (): void => {
    setAddress('');
    setLabel('');
    setLocalError(null);
    setExcludedChainIds([]);
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
    if (!family) {
      setLocalError(labels.invalidAddress);
      return;
    }
    if (family === 'evm' && selectedChainIds.length === 0) {
      setLocalError(labels.noNetworkSelected);
      return;
    }
    // Only an EVM address exists on several networks; the rest are read off the format.
    if (await onSubmit(trimmed, label, family === 'evm' ? selectedChainIds : undefined)) {
      close();
    }
  };

  return (
    <DrawerShell
      isOpen={open}
      onClose={close}
      position="right"
      width="lg"
      showCloseButton={false}
      sx={{
        maxWidth: '100%',
        borderLeft: 0,
        bgcolor: 'background.paper',
        '@media (min-width:600px)': { maxWidth: 512 },
      }}
      title={
        <div className="lumio-payable-drawer__title-wrap">
          <button
            type="button"
            onClick={close}
            className="lumio-payable-drawer__back-btn"
            aria-label={labels.cancel}
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>
            {labels.title}
          </span>
        </div>
      }
    >
      <div className="lumio-payable-drawer__body">
        <div style={{ display: 'grid', gap: 16 }}>
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
            placeholder="0x… · T… · bc1… · Solana"
            fullWidth
            autoComplete="off"
            spellCheck={false}
            error={localError !== null || serverError !== null}
            helperText={localError ?? serverError ?? ' '}
          />

          {family === 'evm' && evmNetworks.length > 0 && (
            <Box component="fieldset" sx={{ border: 0, m: 0, p: 0 }}>
              <Typography component="legend" variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {labels.networksLabel}
              </Typography>
              <Box
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' } }}
              >
                {evmNetworks.map(network => (
                  <FormControlLabel
                    key={network.chainId}
                    label={network.name}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedChainIds.includes(network.chainId)}
                        onChange={() => toggleChain(network.chainId)}
                      />
                    }
                  />
                ))}
              </Box>
            </Box>
          )}

          {detectedNetwork && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {labels.networkDetected}
              </Typography>
              <Chip size="small" variant="outlined" label={detectedNetwork.name} />
            </Box>
          )}

          <TextField
            label={labels.nameLabel}
            value={label}
            onChange={event => setLabel(event.target.value)}
            fullWidth
            autoComplete="off"
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {labels.networksHint}
          </Typography>

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {labels.readOnly}
          </Typography>
        </div>

        <div className="lumio-payable-drawer__footer">
          <Button variant="outlined" sx={{ flex: 1 }} onClick={close} disabled={saving}>
            {labels.cancel}
          </Button>
          <Button
            variant="contained"
            sx={{ flex: 1 }}
            onClick={() => void submit()}
            disabled={saving || address.trim() === ''}
          >
            {labels.connect}
          </Button>
        </div>
      </div>
    </DrawerShell>
  );
}
