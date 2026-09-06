'use client';

import { ChevronRight } from '@/app/components/icons';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import Link from 'next/link';
import type React from 'react';
import { useEffect, useState } from 'react';

interface CryptoSummary {
  currency: string;
  portfolioValue: number;
  walletCount: number;
  holdings: Array<{ asset: string; amount: string; value: number }>;
}

type CryptoPortfolioCardProps = {
  formatAmount: (value: number) => string;
};

/**
 * Crypto income and spending already reach every dashboard total: the sync writes
 * ordinary transactions. What those totals cannot show is what the wallets are
 * worth right now, so that is all this card adds — and only once a wallet exists.
 */
export function CryptoPortfolioCard({
  formatAmount,
}: CryptoPortfolioCardProps): React.JSX.Element | null {
  const { currentWorkspace } = useWorkspace();
  const t = useIntlayer('cryptoPage');
  const [summary, setSummary] = useState<CryptoSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get('/crypto/summary')
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
  }, [currentWorkspace?.id]);

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

const CARD_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  textDecoration: 'none',
} as const;

const VALUE_STYLE = { fontSize: 22 } as const;
