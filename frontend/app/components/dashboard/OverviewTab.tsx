'use client';

import { BudgetSummaryWidget } from '@/app/(main)/dashboard/components/BudgetSummaryWidget';
import { CashRunwayWidget } from '@/app/(main)/dashboard/components/CashRunwayWidget';
import { formatDateOnly } from '@/app/(main)/dashboard/helpers/dashboard-helpers';
import { FileUp } from '@/app/components/icons';
import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import type { DashboardData } from '@/app/hooks/useDashboard';
import { useIntlayer } from '@/app/i18n';
import Link from 'next/link';
import type React from 'react';
import { useMemo } from 'react';
import { Spinner } from '../ui/spinner';
import { CryptoPortfolioCard } from './CryptoPortfolioCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { TopCategoriesCard } from './TopCategoriesCard';
import { computeNet, computeSavingsRate } from './dashboard-stats.util';
import { CardLink, DashboardCard, KpiCard } from './ui';
import { useMonthLabel } from './use-month-label';

interface OverviewTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  isLoading?: boolean;
  displayMonth: Date;
}

const SPARK_POINTS = 10;

function sparkSeries(data: DashboardData): {
  income?: number[];
  expense?: number[];
  net?: number[];
} {
  const points = data.cashFlow.slice(-SPARK_POINTS);
  if (points.length < 2) {
    return {};
  }
  return {
    income: points.map(p => p.income),
    expense: points.map(p => p.expense),
    net: points.map(p => p.income - p.expense),
  };
}

function monthRangeHref(displayMonth: Date): string {
  const start = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
  const end = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0);
  return `/statements/transactions?startDate=${formatDateOnly(start)}&endDate=${formatDateOnly(end)}`;
}

function signed(value: number, formatAmount: (value: number) => string): string {
  return `${value >= 0 ? '+' : '−'}${formatAmount(Math.abs(value))}`;
}

function OverviewEmptyState(): React.JSX.Element {
  const t = useIntlayer('overviewTab');
  return (
    <div className="lumio-dashboard__empty">
      <EmptyStateIllustration name="dashboard" size="lg" />
      <h2 className="lumio-dashboard__empty-title">{t.emptyTitle}</h2>
      <p className="lumio-dashboard__empty-desc">{t.emptyDescription}</p>
      <Link href="/statements?openExpenseDrawer=scan" className="lumio-dashboard__empty-cta">
        <FileUp size={16} />
        {t.emptyCta}
      </Link>
    </div>
  );
}

interface KpiRowProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  monthLabel: string;
  isLoading?: boolean;
}

function KpiRow({ data, formatAmount, monthLabel, isLoading }: KpiRowProps): React.JSX.Element {
  const t = useIntlayer('overviewTab');
  const { income30d: income, expense30d: expense } = data.snapshot;
  const net = computeNet(income, expense);
  const savingsRate = computeSavingsRate(income, expense);
  const spark = sparkSeries(data);
  const spinner = isLoading ? <Spinner size={12} /> : null;
  const netTone = net >= 0 ? 'positive' : 'negative';
  return (
    <div className="lumio-dashboard__stat-grid">
      <KpiCard
        label={t.income.value}
        value={spinner || formatAmount(income)}
        tone="positive"
        caption={monthLabel}
        spark={spark.income && { points: spark.income }}
      />
      <KpiCard
        label={t.spentLabel.value}
        value={spinner || formatAmount(expense)}
        tone="negative"
        caption={monthLabel}
        spark={spark.expense && { points: spark.expense }}
      />
      <KpiCard
        label={t.netLabel.value}
        value={spinner || signed(net, formatAmount)}
        tone={netTone}
        caption={t.netCaption.value}
        spark={spark.net && { points: spark.net }}
      />
      <KpiCard
        label={t.savingsRateLabel.value}
        value={spinner || (savingsRate === null ? '—' : `${Math.round(savingsRate)}%`)}
        tone={savingsRate === null ? 'neutral' : savingsRate >= 0 ? 'positive' : 'negative'}
        caption={t.savingsRateCaption.value}
      />
    </div>
  );
}

export function OverviewTab({
  data,
  formatAmount,
  isLoading,
  displayMonth,
}: OverviewTabProps): React.JSX.Element {
  const t = useIntlayer('overviewTab');
  const monthLabel = useMonthLabel(displayMonth);
  const viewAllHref = useMemo(() => monthRangeHref(displayMonth), [displayMonth]);

  // A workspace that never imported anything gets the onboarding CTA; a month
  // without transactions still shows zeroed KPIs and empty cards.
  if (!data.dataHealth?.lastUploadDate) {
    return <OverviewEmptyState />;
  }

  return (
    <div className="lumio-dashboard__tab">
      <KpiRow
        data={data}
        formatAmount={formatAmount}
        monthLabel={monthLabel}
        isLoading={isLoading}
      />
      <CryptoPortfolioCard formatAmount={formatAmount} />
      <div className="lumio-dashboard__grid lumio-dashboard__grid--split">
        <DashboardCard
          title={t.topCategoriesTitle}
          subtitle={monthLabel}
          action={<CardLink href="/reports">{t.viewAll}</CardLink>}
        >
          <TopCategoriesCard categories={data.topCategories ?? []} formatAmount={formatAmount} />
        </DashboardCard>
        <RecentTransactionsCard
          transactions={data.recentTransactions ?? []}
          formatAmount={formatAmount}
          viewAllHref={viewAllHref}
        />
      </div>
      <div className="lumio-dashboard__grid lumio-dashboard__grid--pair">
        <BudgetSummaryWidget />
        <CashRunwayWidget formatAmount={formatAmount} />
      </div>
    </div>
  );
}
