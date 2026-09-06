'use client';

import { Plus } from '@/app/components/icons';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Spinner } from '@/app/components/ui/spinner';
import { useIntlayer, useLocale } from '@/app/i18n';
import { formatMoney } from '@/app/lib/format-money';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type React from 'react';
import { useState } from 'react';
import { ConnectWalletDialog } from './components/ConnectWalletDialog';
import { CryptoWalletCard } from './components/CryptoWalletCard';
import { useCrypto } from './hooks/useCrypto';

export default function CryptoPage(): React.JSX.Element {
  const t = useIntlayer('cryptoPage');
  const { locale } = useLocale();
  const {
    wallets,
    summary,
    loading,
    error,
    busyWalletId,
    connecting,
    connectWallet,
    syncWallet,
    removeWallet,
  } = useCrypto();

  const [dialogOpen, setDialogOpen] = useState(false);

  const currency = summary?.currency ?? 'USD';
  const money = (value: number): string => formatMoney(value, currency, locale);

  // A duplicate address belongs next to the field the user must change; every
  // other failure is a page-level problem and is reported above the list.
  const dialogServerError = error === 'duplicate' ? t.duplicate.value : null;

  return (
    <Box component="main" sx={{ px: { xs: 2, md: 4 }, py: 3, width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {t.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t.subtitle}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setDialogOpen(true)}
        >
          {t.connect}
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Spinner size={32} />
        </Box>
      )}

      {error === 'failed' && !loading && (
        <Typography color="error" sx={{ py: 6, textAlign: 'center' }}>
          {t.error}
        </Typography>
      )}

      {!loading && summary && wallets.length > 0 && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            <SummaryTile label={t.portfolio.value} value={money(summary.portfolioValue)} />
            <SummaryTile label={t.income.value} value={money(summary.income)} />
            <SummaryTile label={t.expense.value} value={money(summary.expense)} />
          </Box>

          {summary.holdings.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t.holdings}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {summary.holdings.map(holding => (
                  <Box
                    key={holding.asset}
                    sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
                  >
                    <Typography variant="body2">
                      {holding.amount} {holding.asset}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {money(holding.value)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
        </>
      )}

      {!loading && wallets.length === 0 && error !== 'failed' && (
        <EmptyState illustration="integrations" description={t.empty} />
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {wallets.map(wallet => (
          <CryptoWalletCard
            key={wallet.id}
            wallet={wallet}
            locale={locale}
            busy={busyWalletId === wallet.id}
            labels={{
              sync: t.sync.value,
              remove: t.remove.value,
              transactions: t.transactions.value,
              neverSynced: t.neverSynced.value,
            }}
            onSync={id => void syncWallet(id)}
            onRemove={id => void removeWallet(id)}
          />
        ))}
      </Box>

      <ConnectWalletDialog
        open={dialogOpen}
        saving={connecting}
        serverError={dialogServerError}
        labels={{
          title: t.connect.value,
          useMetaMask: t.useMetaMask.value,
          manualHint: t.manualHint.value,
          addressLabel: t.addressLabel.value,
          nameLabel: t.nameLabel.value,
          invalidAddress: t.invalidAddress.value,
          noWallet: t.noWallet.value,
          readOnly: t.readOnly.value,
          connect: t.connect.value,
          cancel: t.cancel.value,
        }}
        onClose={() => setDialogOpen(false)}
        onSubmit={connectWallet}
      />
    </Box>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700}>
        {value}
      </Typography>
    </Paper>
  );
}
