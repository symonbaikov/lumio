'use client';

import Alert from '@mui/material/Alert';
import type React from 'react';
import { useIntlayer } from '@/app/i18n';
import type { LedgerIntegrity } from '../ledger.types';

/**
 * Says how far the ledger has caught up with the transactions. Rows that
 * failed (a missing exchange rate, usually) are called out separately: they
 * do not clear by waiting.
 */
export function LedgerFreshness({
  integrity,
}: {
  integrity: LedgerIntegrity;
}): React.ReactElement | null {
  const t = useIntlayer('ledgerPage');
  const waiting = integrity.pendingTransactions - integrity.failingTransactions;

  if (integrity.upToDate && integrity.failingTransactions === 0) {
    return null;
  }
  return (
    <>
      {waiting > 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t.catchingUp}: {waiting}
        </Alert>
      ) : null}
      {integrity.failingTransactions > 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t.failingLabel}: {integrity.failingTransactions}. {t.failingHint}
        </Alert>
      ) : null}
    </>
  );
}
