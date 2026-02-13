'use client';

import { Button } from '@/app/components/ui/button';
import { resolveBankLogo } from '@bank-logos';
import { Download, FileText, FileUp, TrendingDown, TrendingUp } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useIntlayer, useLocale } from 'next-intlayer';
import React, { useMemo } from 'react';
import type { StatementDetails, Transaction } from './types';

interface SummaryBarProps {
  statement: StatementDetails;
  transactions: Transaction[];
  onExport?: () => void;
  onFixIssues?: () => void;
  onDownload?: () => void;
  fixing?: boolean;
}

const getBankDisplayName = (bankName: string) => {
  const resolved = resolveBankLogo(bankName);
  if (!resolved) return bankName;
  return resolved.key !== 'other' ? resolved.displayName : bankName;
};

/**
 * Summary bar component showing file metadata, parsing status, and financial totals
 */
export default function SummaryBar({
  statement,
  transactions,
  onExport,
  onFixIssues,
  onDownload,
  fixing = false,
}: SummaryBarProps) {
  const { locale } = useLocale();
  const t = useIntlayer('transactionsSummaryBar');

  const stats = useMemo(() => {
    const totalParsed = transactions.length;
    const totalWarnings = transactions.filter(tx => tx.hasWarnings).length;
    const totalErrors = transactions.filter(tx => tx.hasErrors).length;
    const uncategorized = transactions.filter(tx => !tx.category).length;

    // Safely convert debit and credit to numbers, handling string values or NaN
    const debitTotal = transactions.reduce((sum, tx) => {
      const debitValue = Number(tx.debit);
      return sum + (Number.isNaN(debitValue) ? 0 : debitValue);
    }, 0);

    const creditTotal = transactions.reduce((sum, tx) => {
      const creditValue = Number(tx.credit);
      return sum + (Number.isNaN(creditValue) ? 0 : creditValue);
    }, 0);

    const currency = transactions[0]?.currency || 'KZT';

    return {
      totalParsed,
      totalWarnings,
      totalErrors,
      uncategorized,
      debitTotal,
      creditTotal,
      currency,
    };
  }, [transactions]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
    );
  };

  const formatAmount = (amount: number, currency: string): string => {
    if (Number.isNaN(amount)) return '—';
    return new Intl.NumberFormat(locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US', {
      style: 'currency',
      currency: currency || 'KZT',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left section: File metadata and parsing status */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <FileText className="h-4 w-4" />
                <span className="font-semibold">{getBankDisplayName(statement.bankName)}</span>
                {statement.metadata?.accountNumber && (
                  <>
                    <span>•</span>
                    <span>{statement.metadata.accountNumber}</span>
                  </>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {t.uploadedAt.value}: {formatDate(statement.createdAt)}
              </div>
            </div>
          </div>

          {/* Parsing status */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              {t.parsed.value}: {stats.totalParsed}
            </div>
            {stats.totalWarnings > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                {t.warnings.value}: {stats.totalWarnings}
              </div>
            )}
            {stats.totalErrors > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                {t.errors.value}: {stats.totalErrors}
              </div>
            )}
            {stats.uncategorized > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                {t.uncategorized.value}: {stats.uncategorized}
              </div>
            )}
          </div>
        </div>

        {/* Right section: Financial totals and actions */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Debit Total */}
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
                <TrendingDown className="h-4 w-4" />
                {t.debitTotal.value}
              </div>
              <div className="mt-1 text-lg font-semibold text-red-700">
                {formatAmount(stats.debitTotal, stats.currency)}
              </div>
            </div>

            {/* Credit Total */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <TrendingUp className="h-4 w-4" />
                {t.creditTotal.value}
              </div>
              <div className="mt-1 text-lg font-semibold text-emerald-700">
                {formatAmount(stats.creditTotal, stats.currency)}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {(stats.totalErrors > 0 || stats.uncategorized > 0) && (
              <Button
                variant={stats.totalErrors > 0 ? 'destructive' : 'secondary'}
                size="sm"
                onClick={onFixIssues}
                disabled={fixing}
                className={fixing ? 'opacity-70 cursor-not-allowed' : ''}
              >
                {fixing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.fixIssues.value}
                  </>
                ) : stats.totalErrors > 0 ? (
                  `${t.showErrors.value} (${stats.totalErrors})`
                ) : (
                  t.fixIssues.value
                )}
              </Button>
            )}
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                {t.download?.value || 'Download'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onExport}>
              <FileUp className="mr-2 h-4 w-4" />
              {t.export.value}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
