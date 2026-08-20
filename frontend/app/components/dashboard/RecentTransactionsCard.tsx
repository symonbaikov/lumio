'use client';

import { parseDateOnly, resolveLocale } from '@/app/(main)/dashboard/helpers/dashboard-helpers';
import { ArrowRight } from '@/app/components/icons';
import type { DashboardData } from '@/app/hooks/useDashboard';
import { useIntlayer, useLocale } from '@/app/i18n';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useMemo } from 'react';
import { CategoryIconBadge } from './CategoryIconBadge';

interface RecentTransactionsCardProps {
  transactions: DashboardData['recentTransactions'];
  formatAmount: (value: number) => string;
  viewAllHref: string;
}

export function RecentTransactionsCard({
  transactions,
  formatAmount,
  viewAllHref,
}: RecentTransactionsCardProps) {
  const t = useIntlayer('recentTransactionsCard');
  const { locale } = useLocale();
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(resolveLocale(locale), { day: 'numeric', month: 'short' }),
    [locale],
  );

  return (
    <div className="lumio-dashboard__card-shell lumio-dashboard__activity">
      <div className="lumio-dashboard__card-shell-head">
        <div className="lumio-dashboard__card-title">{t.title}</div>
        <Link href={viewAllHref} className="lumio-dashboard__card-link-btn">
          {t.viewAll} <ArrowRight size={13} />
        </Link>
      </div>
      <div className="lumio-dashboard__card-shell-body">
        {transactions.length === 0 ? (
          <Box
            sx={{ display: 'flex', height: 128, alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography sx={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
              {t.empty}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {transactions.map(tx => {
              const isPositive = tx.amount >= 0;
              const categoryLabel = tx.categoryName ?? t.uncategorized.value;
              return (
                <Box key={tx.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <div title={categoryLabel}>
                    <CategoryIconBadge color={tx.categoryColor} icon={tx.categoryIcon} size={36} />
                  </div>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {tx.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                      {dateFormatter.format(parseDateOnly(tx.date))} · {tx.account}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ color: isPositive ? 'success.main' : 'text.primary', flexShrink: 0 }}
                  >
                    {isPositive ? '+' : ''}
                    {formatAmount(tx.amount)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </div>
    </div>
  );
}
