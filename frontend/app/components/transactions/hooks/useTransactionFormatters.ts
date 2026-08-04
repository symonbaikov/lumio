import { useMemo } from 'react';
import {
  formatAmount,
  formatDate,
  resolveDisplayAmount,
  resolveDisplayCurrency,
} from '../helpers/transactionFormatters';
import type { Transaction, TransactionRowFormatters } from '../types';

export function useTransactionFormatters(
  locale: string,
  showConverted: boolean,
  fallbackCurrency: string,
): TransactionRowFormatters {
  return useMemo(
    () => ({
      formatDate: (d: string): string => formatDate(d, locale),
      formatAmount: (amount: number, currency: string): string =>
        formatAmount(amount, currency, locale),
      resolveDisplayAmount: (tx: Transaction, raw: number): number =>
        resolveDisplayAmount(tx, raw, showConverted),
      resolveDisplayCurrency: (tx: Transaction): string =>
        resolveDisplayCurrency(tx, showConverted, fallbackCurrency),
    }),
    [locale, showConverted, fallbackCurrency],
  );
}
