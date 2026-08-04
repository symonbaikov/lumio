import { DEFAULT_CURRENCY } from '@/app/lib/format-money';
import type { Transaction } from '../types';

export function formatNumber(
  value: number | undefined | null,
  locale: string,
  currency = DEFAULT_CURRENCY,
): string {
  if (value === undefined || value === null) return '—';
  return `${new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} ${currency}`;
}

export function formatDate(dateString: string | null | undefined, locale: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function computeTransactionSummary(transactions: Transaction[]): {
  totalIncome: number;
  totalExpense: number;
  netChange: number;
} {
  const totalIncome = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  const totalExpense = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  const netChange = totalIncome - totalExpense;
  return { totalIncome, totalExpense, netChange };
}
