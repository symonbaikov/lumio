'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { Category } from '@/app/components/transactions/types';
import { Button } from '@/app/components/ui/button';
import { ModalShell } from '@/app/components/ui/modal-shell';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import { useIntlayer, useLocale } from '@/app/i18n';
import { formatMoney } from '@/app/lib/format-money';
import { type MarkPayablePaidInput, type Payable, payablesApi } from '@/app/lib/payables-api';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';
import {
  CandidateList,
  CashFields,
  type CashState,
  today,
  type WalletOption,
} from './MarkPaidFields';

type Mode = 'match' | 'cash' | 'plain';

type MarkPaidDialogProps = {
  /** The bill being settled; the dialog is closed while null. */
  payable: Payable | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (payable: Payable, payload: MarkPayablePaidInput) => void;
};

/**
 * Settles a bill three ways: against a transaction already on a statement,
 * as a cash payment the server records in a wallet, or as a bare status
 * change. Only the first two reach the books.
 */
export function MarkPaidDialog({
  payable,
  submitting,
  onClose,
  onConfirm,
}: MarkPaidDialogProps): React.JSX.Element | null {
  if (!payable) {
    return null;
  }
  // Keyed so that every bill opens with a fresh form.
  return (
    <MarkPaidForm
      key={payable.id}
      payable={payable}
      submitting={submitting}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

/** What the dialog offers for this bill: matching payments, wallets and categories. */
function usePaymentOptions(payable: Payable) {
  const workspaceId = useWorkspaceId();
  const currency = payable.currency.toUpperCase();
  const categoryType = payable.direction === 'receivable' ? 'income' : 'expense';

  const candidates = useQuery({
    queryKey: queryKeys.payablePaymentCandidates({ workspaceId, payableId: payable.id }),
    queryFn: () => payablesApi.paymentCandidates(payable.id),
  });
  const wallets = useQuery({
    queryKey: queryKeys.wallets(workspaceId),
    queryFn: ({ signal }) => apiQuery<WalletOption[]>({ url: '/wallets', signal }),
  });
  const categories = useQuery({
    queryKey: queryKeys.categories(workspaceId),
    queryFn: ({ signal }) => apiQuery<Category[]>({ url: '/categories', signal }),
  });

  return {
    currency,
    candidates: candidates.data ?? [],
    candidatesLoading: candidates.isPending,
    wallets: (wallets.data ?? []).filter(
      wallet => wallet.isActive !== false && wallet.currency.toUpperCase() === currency,
    ),
    walletsLoading: wallets.isPending,
    categories: (categories.data ?? []).filter(category => category.type === categoryType),
  };
}

function buildPayload(
  mode: Mode,
  selected: { transactionId: string | null; cash: CashState },
): MarkPayablePaidInput | null {
  if (mode === 'match') {
    return selected.transactionId ? { linkedTransactionId: selected.transactionId } : null;
  }
  if (mode === 'cash') {
    const { walletId, paidOn, categoryId } = selected.cash;
    return walletId
      ? { payFromWalletId: walletId, paidOn, categoryId: categoryId || undefined }
      : null;
  }
  return {};
}

function MarkPaidForm({
  payable,
  submitting,
  onClose,
  onConfirm,
}: MarkPaidDialogProps & { payable: Payable }): React.JSX.Element {
  const t = useIntlayer('payableMarkPaid');
  const { locale } = useLocale();
  const options = usePaymentOptions(payable);

  const [chosenMode, setMode] = useState<Mode | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [cash, setCash] = useState<CashState>({ walletId: null, paidOn: today(), categoryId: '' });

  // Until the user picks, open on the bank match when there is one to pick,
  // with the first candidate and the first wallet preselected.
  const mode: Mode = chosenMode ?? (options.candidates.length > 0 ? 'match' : 'plain');
  const selectedCash = { ...cash, walletId: cash.walletId ?? options.wallets[0]?.id ?? null };
  // A bill already linked (paid, then marked unpaid) keeps its payment unless the user picks another.
  const defaultTransaction =
    options.candidates.find(candidate => candidate.id === payable.linkedTransactionId)?.id ??
    options.candidates[0]?.id ??
    null;
  const payload = buildPayload(mode, {
    transactionId: transactionId ?? defaultTransaction,
    cash: selectedCash,
  });

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      size="sm"
      title={payable.direction === 'receivable' ? t.titleReceived.value : t.titlePaid.value}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t.cancel.value}
          </Button>
          <Button
            onClick={() => payload && onConfirm(payable, payload)}
            disabled={!payload || submitting}
          >
            {t.confirm.value}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {payable.vendor} · {formatMoney(Number(payable.amount), options.currency, locale)}
        </Typography>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_event, next: Mode | null) => next && setMode(next)}
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="match" sx={{ textTransform: 'none' }}>
            {t.modeMatch.value}
          </ToggleButton>
          <ToggleButton value="cash" sx={{ textTransform: 'none' }}>
            {t.modeCash.value}
          </ToggleButton>
          <ToggleButton value="plain" sx={{ textTransform: 'none' }}>
            {t.modePlain.value}
          </ToggleButton>
        </ToggleButtonGroup>

        {mode === 'match' && (
          <CandidateList
            candidates={options.candidates}
            loading={options.candidatesLoading}
            selected={transactionId ?? defaultTransaction}
            onSelect={setTransactionId}
            locale={locale}
          />
        )}
        {mode === 'cash' && (
          <CashFields
            currency={options.currency}
            wallets={options.wallets}
            walletsLoading={options.walletsLoading}
            categories={options.categories}
            value={selectedCash}
            onChange={setCash}
          />
        )}
        {mode === 'plain' && <Alert severity="warning">{t.plainHint.value}</Alert>}
      </Box>
    </ModalShell>
  );
}
