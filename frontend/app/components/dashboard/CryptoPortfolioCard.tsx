'use client';

import Link from 'next/link';
import type React from 'react';
import { useEffect, useState } from 'react';
import { ChevronRight } from '@/app/components/icons';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';

interface CryptoSummary {
  currency: string;
  portfolioValue: number;
  /** Booked value of transfers in and out during the requested month. */
  income: number;
  expense: number;
  walletCount: number;
  holdings: Array<{ asset: string; amount: string; value: number }>;
}

type CryptoPortfolioCardProps = {
  formatAmount: (value: number) => string;
  /** The dashboard's month as `YYYY-MM`; the in/out line follows it. */
  month: string;
  monthLabel: string;
};

/**
 * What the wallets are worth right now, plus how much crypto came in and went out
 * in the month the dashboard is showing — so months can be compared. The value is
 * always today's (past balances are not reconstructed); the flows are booked at
 * the rate on the transfer date. Shown only once a wallet exists.
 */
export function CryptoPortfolioCard({
  formatAmount,
  month,
  monthLabel,
}: CryptoPortfolioCardProps): React.JSX.Element | null {
  const { currentWorkspace } = useWorkspace();
  const t = useIntlayer('cryptoPage');
  const [summary, setSummary] = useState<CryptoSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get('/crypto/summary', { params: { month } })
      .then(response => {
        if (!cancelled) {
          setSummary(response.data?.data ?? response.data ?? null);
        }
      })
      // The dashboard must render without crypto: a failure here is not the
      // user's problem and the card simply stays hidden.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [currentWorkspace?.id, month]);

  if (!summary || summary.walletCount === 0) {
    return null;
  }

  return (
    <Link href="/crypto" className="lumio-dashboard__card" style={CARD_STYLE}>
      <div>
        <div className="lumio-dashboard__card-sub">{t.portfolio}</div>
        <div className="lumio-dashboard__stat-value" style={VALUE_STYLE}>
          {formatAmount(summary.portfolioValue)}
        </div>
        <div className="lumio-dashboard__card-sub">
          {monthLabel} ·{' '}
          <span className="lumio-dashboard__amount--positive">+{formatAmount(summary.income)}</span>{' '}
          ·{' '}
          <span className="lumio-dashboard__amount--negative">
            −{formatAmount(summary.expense)}
          </span>
        </div>
        {summary.holdings.length > 0 && (
          <div className="lumio-dashboard__card-sub">
            {summary.holdings
              .slice(0, 4)
              .map(holding => holding.asset)
              .join(' · ')}
          </div>
        )}
      </div>
      <ChevronRight size={18} />
    </Link>
  );
}

// The card class lays its children out in a column; this one reads as a row, with
// the value against the left edge and the chevron against the right.
const CARD_STYLE = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  textDecoration: 'none',
} as const;

const VALUE_STYLE = { fontSize: 22 } as const;
