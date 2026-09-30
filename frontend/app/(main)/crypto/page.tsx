'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type React from 'react';
import { useState } from 'react';
import { RefreshCcw } from '@/app/components/icons';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Spinner } from '@/app/components/ui/spinner';
import { useIntlayer, useLocale } from '@/app/i18n';
import { formatMoney } from '@/app/lib/format-money';
import { ConnectWalletDrawer } from './components/ConnectWalletDrawer';
import { CryptoTransactionsTable } from './components/CryptoTransactionsTable';
import { CryptoWalletCard } from './components/CryptoWalletCard';
import { HoldingsTable } from './components/HoldingsTable';
import { useCrypto } from './hooks/useCrypto';

export default function CryptoPage(): React.JSX.Element {
  const t = useIntlayer('cryptoPage');
  const { locale } = useLocale();
  const {
    wallets,
    summary,
    transactions,
    networks,
    isPending,
    error,
    refetch,
    busyWalletId,
    connecting,
    connectWallet,
    syncWallet,
    removeWallet,
  } = useCrypto();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const currency = summary?.currency ?? 'USD';
  const money = (value: number): string => formatMoney(value, currency, locale);

  // A duplicate address belongs next to the field the user must change; every
  // other failure is a page-level problem and is reported above the list.
  const hasData = wallets.length > 0 || summary !== null;

  const drawerServerError = error === 'duplicate' ? t.duplicate.value : null;

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
        <Button variant="contained" onClick={() => setDrawerOpen(true)}>
          {t.connect}
        </Button>
      </Box>

      {isPending && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Spinner size={32} />
        </Box>
      )}

      {/* Nothing to show at all: the illustrated state replaces the page. With data
          already on screen (a failed sync), a slim alert keeps that data visible. */}
      {error === 'failed' && !isPending && !hasData && (
        <EmptyState
          illustration="load-error"
          size="lg"
          title={t.error}
          description={t.errorHint}
          action={
            <Button variant="outlined" startIcon={<RefreshCcw size={16} />} onClick={refetch}>
              {t.retry}
            </Button>
          }
        />
      )}

      {error === 'failed' && !isPending && hasData && (
        <Alert
          severity="error"
          variant="outlined"
          sx={{ mb: 3, alignItems: 'center' }}
          action={
            <Button color="inherit" size="small" onClick={refetch}>
              {t.retry}
            </Button>
          }
        >
          {t.error}
        </Alert>
      )}

      {!isPending && summary && wallets.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <SummaryTile
            label={t.portfolio.value}
            value={money(summary.portfolioValue)}
            change={summary.portfolioChangeSinceYesterday}
            changeLabel={t.sinceYesterday.value}
            locale={locale}
          />
          <SummaryTile label={t.income.value} value={money(summary.income)} />
          <SummaryTile label={t.expense.value} value={money(summary.expense)} />
        </Box>
      )}

      {!isPending && wallets.length === 0 && error !== 'failed' && (
        <EmptyState illustration="integrations" description={t.empty} />
      )}

      {!isPending && wallets.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 7fr) minmax(0, 5fr)' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            {summary && summary.holdings.length > 0 && (
              <HoldingsTable
                holdings={summary.holdings}
                locale={locale}
                money={money}
                labels={{
                  title: t.holdings.value,
                  asset: t.asset.value,
                  balance: t.balance.value,
                  price: t.price.value,
                  worth: t.worth.value,
                }}
              />
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {t.connectedWallets}
              </Typography>
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
                  onSync={id => syncWallet(id)}
                  onRemove={id => removeWallet(id)}
                />
              ))}
            </Box>
          </Box>

          <CryptoTransactionsTable
            transactions={transactions}
            locale={locale}
            labels={{
              title: t.recentTransactions.value,
              empty: t.noTransactions.value,
              date: t.date.value,
              wallet: t.wallet.value,
              counterparty: t.counterparty.value,
              amount: t.amount.value,
              worth: t.worth.value,
              received: t.received.value,
              sent: t.sent.value,
            }}
          />
        </Box>
      )}

      <ConnectWalletDrawer
        open={drawerOpen}
        saving={connecting}
        serverError={drawerServerError}
        labels={{
          title: t.connect.value,
          useMetaMask: t.useMetaMask.value,
          manualHint: t.manualHint.value,
          addressLabel: t.addressLabel.value,
          nameLabel: t.nameLabel.value,
          invalidAddress: t.invalidAddress.value,
          networksHint: t.networksHint.value,
          networksLabel: t.networksLabel.value,
          networkDetected: t.networkDetected.value,
          noNetworkSelected: t.noNetworkSelected.value,
          noWallet: t.noWallet.value,
          readOnly: t.readOnly.value,
          connect: t.connect.value,
          cancel: t.cancel.value,
        }}
        onClose={() => setDrawerOpen(false)}
        networks={networks}
        onSubmit={connectWallet}
      />
    </Box>
  );
}

type SummaryTileProps = {
  label: string;
  value: string;
  /** Percent change; the caption is hidden when this is null or absent. */
  change?: number | null;
  changeLabel?: string;
  locale?: string;
};

function SummaryTile({
  label,
  value,
  change,
  changeLabel,
  locale,
}: SummaryTileProps): React.JSX.Element {
  const hasChange = typeof change === 'number';
  const rising = hasChange && change >= 0;
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography
        sx={{ fontSize: '1.625rem', fontWeight: 700, lineHeight: 1.25, mt: 0.5 }}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </Typography>
      {hasChange && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          <Box
            component="span"
            sx={{ color: rising ? 'success.main' : 'error.main', fontWeight: 600 }}
          >
            {rising ? '+' : '−'}
            {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Math.abs(change))}%
          </Box>{' '}
          {changeLabel}
        </Typography>
      )}
    </Paper>
  );
}
