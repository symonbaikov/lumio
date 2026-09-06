'use client';

import { parseDateOnly, resolveLocale } from '@/app/(main)/dashboard/helpers/dashboard-helpers';
import type { DashboardData } from '@/app/hooks/useDashboard';
import { useIntlayer, useLocale } from '@/app/i18n';
import clsx from 'clsx';
import type React from 'react';
import { useMemo } from 'react';
import { CategoryIconBadge } from './CategoryIconBadge';
import { CardLink, DashboardCard, ListRow } from './ui';

interface RecentTransactionsCardProps {
  transactions: DashboardData['recentTransactions'];
  formatAmount: (value: number) => string;
  viewAllHref: string;
}

export function RecentTransactionsCard({
  transactions,
  formatAmount,
  viewAllHref,
}: RecentTransactionsCardProps): React.JSX.Element {
  const t = useIntlayer('recentTransactionsCard');
  const { locale } = useLocale();
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(resolveLocale(locale), { day: 'numeric', month: 'short' }),
    [locale],
  );

  return (
    <DashboardCard title={t.title} action={<CardLink href={viewAllHref}>{t.viewAll}</CardLink>}>
      {transactions.length === 0 ? (
        <div className="lumio-dashboard__card-empty">{t.empty}</div>
      ) : (
        <div className="lumio-dashboard__list">
          {transactions.map(tx => {
            const isPositive = tx.amount >= 0;
            return (
              <ListRow
                key={tx.id}
                leading={
                  <div title={tx.categoryName ?? t.uncategorized.value}>
                    <CategoryIconBadge
                      name={tx.categoryName}
                      color={tx.categoryColor}
                      icon={tx.categoryIcon}
                      size={36}
                    />
                  </div>
                }
                primary={tx.description}
                secondary={`${dateFormatter.format(parseDateOnly(tx.date))} · ${tx.account}`}
                trailing={
                  <span className={clsx(isPositive && 'lumio-dashboard__amount--positive')}>
                    {isPositive ? '+' : ''}
                    {formatAmount(tx.amount)}
                  </span>
                }
              />
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}
