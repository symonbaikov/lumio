'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useIntlayer } from '@/app/i18n';
import {
  type ReceiptMatchCandidate,
  type ReceiptRecord,
  type ReceiptSplitSuggestion,
  receiptsApi,
} from '@/app/lib/api';
import { tokens } from '@/lib/theme-tokens';

interface Props {
  receipt: ReceiptRecord;
  saving: boolean;
  /** Approves through the page's own flow (autosave, then approve) with the given target. */
  onApprove: (options: { transactionId?: string | null }) => Promise<void>;
  /** Reloads the receipt after a split. */
  onChanged: () => Promise<void>;
}

const formatMoney = (amount: number, currency: string, locale: string): string =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

/**
 * The bank row a parsed receipt documents, with the two ways to approve it,
 * and — once attached — the one-click split of that row by line items.
 */
// eslint-disable-next-line max-lines-per-function
export function ReceiptTransactionMatch({ receipt, saving, onApprove, onChanged }: Props) {
  const t = useIntlayer('receiptDocumentPage');
  const [candidates, setCandidates] = useState<ReceiptMatchCandidate[]>([]);
  const [suggestion, setSuggestion] = useState<ReceiptSplitSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const match = receipt.metadata?.transactionMatch ?? null;
  const approved = receipt.status === 'approved' && Boolean(receipt.transactionId);
  const lineItems = (receipt.parsedData?.lineItems ?? []).filter(item => item.amount > 0);
  const locale = typeof navigator === 'undefined' ? 'en' : navigator.language;

  useEffect(() => {
    if (approved || !match) {
      setCandidates([]);
      return;
    }
    let active = true;
    receiptsApi
      .transactionMatches(receipt.id)
      .then(result => {
        if (active) setCandidates(result.data.filter(row => match.transactionIds.includes(row.id)));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [receipt.id, approved, match]);

  const loadSplit = useCallback(async () => {
    setBusy(true);
    await receiptsApi
      .splitSuggestion(receipt.id)
      .then(setSuggestion)
      .catch(() => toast.error(t.splitFailed.value));
    setBusy(false);
  }, [receipt.id, t.splitFailed.value]);

  const applySplit = useCallback(async () => {
    setBusy(true);
    await receiptsApi
      .splitByLineItems(receipt.id)
      .then(async () => {
        toast.success(t.splitDone.value);
        setSuggestion(null);
        await onChanged();
      })
      .catch(() => toast.error(t.splitFailed.value));
    setBusy(false);
  }, [receipt.id, onChanged, t.splitDone.value, t.splitFailed.value]);

  if (!(approved || match)) return null;
  if (approved && lineItems.length < 2) return null;

  return (
    <Box
      data-testid="receipt-transaction-match"
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: tokens.radius.md,
        p: 2,
        display: 'grid',
        gap: 1,
      }}
    >
      {!approved && match && (
        <>
          <Typography variant="subtitle2">
            {match.kind === 'multi' ? t.matchMulti.value : t.matchTitle.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t.matchHelp.value}
          </Typography>
          {candidates.map(row => (
            <Typography key={row.id} variant="body2">
              {row.transactionDate.slice(0, 10)} · {row.counterpartyName} ·{' '}
              {formatMoney(row.amount, row.currency, locale)}
            </Typography>
          ))}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="contained"
              disabled={saving}
              onClick={() => void onApprove({})}
            >
              {t.approveAttach.value}
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={saving}
              onClick={() => void onApprove({ transactionId: null })}
            >
              {t.approveNew.value}
            </Button>
          </Box>
        </>
      )}

      {approved &&
        (suggestion ? (
          <>
            <Typography variant="subtitle2">{t.splitPreview.value}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {suggestion.parts.map(part => (
                <Chip
                  key={`${part.categoryId ?? 'none'}-${part.amount}`}
                  size="small"
                  label={`${part.categoryName ?? t.uncategorised.value}: ${formatMoney(part.amount, suggestion.currency, locale)}`}
                  title={part.items.join(', ')}
                />
              ))}
            </Box>
            {suggestion.splittable ? (
              <Button
                size="small"
                variant="contained"
                disabled={busy}
                onClick={() => void applySplit()}
              >
                {t.splitApply.value}
              </Button>
            ) : (
              <Typography variant="caption" color="text.secondary">
                {t.splitOneCategory.value}
              </Typography>
            )}
          </>
        ) : (
          <Button size="small" variant="outlined" disabled={busy} onClick={() => void loadSplit()}>
            {t.splitByItems.value}
          </Button>
        ))}
    </Box>
  );
}
