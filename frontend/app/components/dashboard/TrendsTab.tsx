'use client';

import { Spinner } from '@/app/components/ui/spinner';
import type { DashboardData, DashboardTrends } from '@/app/hooks/useDashboard';
import { useDashboardTrends } from '@/app/hooks/useDashboard';
import { useIntlayer } from '@/app/i18n';
import { categoryColorFor } from '@/app/lib/category-defaults';
import { resolveDashboardEffectivePeriod } from '@/app/lib/dashboard-effective-window';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import type React from 'react';
import { useMemo, useState } from 'react';
import { CashFlowCard } from './CashFlowCard';
import { CategoryIconBadge } from './CategoryIconBadge';
import { buildCategoryRoseOption, buildDailyTrendOption } from './helpers/trends-chart-options';
import { DAY_OPTIONS } from './helpers/trends-constants';
import { Chip, ChipGroup, DashboardCard, KpiCard, ListRow } from './ui';
import { useMonthLabel } from './use-month-label';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

const DEFAULT_DAYS = 30;
const LEGEND_LIMIT = 10;

interface TrendsTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  displayMonth: Date;
}

type Formatter = (value: number) => string;

function TrendsKpis({
  trends,
  formatAmount,
}: {
  trends: DashboardTrends;
  formatAmount: Formatter;
}): React.JSX.Element {
  const t = useIntlayer('trendsTab');
  const { income, expense } = trends.sources.statements;
  const net = income - expense;
  return (
    <div className="lumio-dashboard__stat-grid lumio-dashboard__stat-grid--auto">
      <KpiCard
        label={t.statementsTitle.value}
        value={formatAmount(income)}
        tone="positive"
        caption={`${t.expense.value}: ${formatAmount(expense)}`}
      />
      <KpiCard
        label={t.netFlowTitle.value}
        value={`${net >= 0 ? '+' : '−'}${formatAmount(Math.abs(net))}`}
        tone={net >= 0 ? 'positive' : 'negative'}
        caption={`${t.categories.value}: ${trends.categories.length}`}
      />
      <KpiCard
        label={t.counterpartiesTitle.value}
        value={trends.counterparties.length}
        caption={t.totalFound.value}
      />
    </div>
  );
}

interface SectionState {
  loading: boolean;
  error: string | null;
  trends: DashboardTrends | null;
}

/** Shared loading / error / empty rendering for the two chart cards. */
function CardState({
  state,
  emptyLabel,
  children,
}: {
  state: SectionState;
  emptyLabel: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  if (state.loading) {
    return (
      <div className="lumio-dashboard__card-empty">
        <Spinner size={24} />
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="lumio-dashboard__card-empty lumio-dashboard__amount--negative">
        {state.error}
      </div>
    );
  }
  if (!state.trends) {
    return <div className="lumio-dashboard__card-empty">{emptyLabel}</div>;
  }
  return <>{children}</>;
}

function SpendTrendCard({
  state,
  days,
  onDaysChange,
}: {
  state: SectionState;
  days: number;
  onDaysChange: (days: number) => void;
}): React.JSX.Element {
  const t = useIntlayer('trendsTab');
  const { resolvedTheme } = useTheme();
  const option = useMemo(
    () =>
      state.trends
        ? buildDailyTrendOption({
            actual: state.trends.dailyTrend,
            forecast: state.trends.forecast ?? [],
            isDark: resolvedTheme === 'dark',
            labels: {
              income: t.income.value,
              expense: t.expense.value,
              forecastSuffix: t.forecastSuffix.value,
              forecastLabel: t.forecastLabel.value,
            },
          })
        : null,
    [state.trends, resolvedTheme, t],
  );
  return (
    <DashboardCard
      title={t.spendTrendTitle}
      action={
        <ChipGroup size="sm">
          {DAY_OPTIONS.map(opt => (
            <Chip
              key={opt.value}
              size="sm"
              active={days === opt.value}
              onClick={() => onDaysChange(opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </ChipGroup>
      }
    >
      <CardState state={state} emptyLabel={t.noTrendDataForPeriod}>
        {option ? (
          <div className="lumio-dashboard__chart">
            <ReactECharts
              style={{ height: '100%', width: '100%' }}
              option={option}
              notMerge
              lazyUpdate
            />
          </div>
        ) : (
          <div className="lumio-dashboard__card-empty">{t.noTrendDataForRange}</div>
        )}
      </CardState>
    </DashboardCard>
  );
}

function CategoryBreakdownCard({
  state,
  formatAmount,
}: {
  state: SectionState;
  formatAmount: Formatter;
}): React.JSX.Element {
  const t = useIntlayer('trendsTab');
  const { resolvedTheme } = useTheme();
  const top = useMemo(() => state.trends?.categories.slice(0, LEGEND_LIMIT) ?? [], [state.trends]);
  const option = useMemo(
    () =>
      buildCategoryRoseOption({
        categories: top,
        isDark: resolvedTheme === 'dark',
        seriesName: t.expenseCategoriesSeriesName.value,
        colorFor: name => categoryColorFor(name),
      }),
    [top, resolvedTheme, t],
  );
  return (
    <DashboardCard title={t.categoryBreakdownTitle}>
      <CardState state={state} emptyLabel={t.noTrendDataForPeriod}>
        {option ? (
          <>
            <div className="lumio-dashboard__donut lumio-dashboard__donut--wide">
              <ReactECharts
                style={{ height: '100%', width: '100%' }}
                option={option}
                notMerge
                lazyUpdate
              />
            </div>
            <div className="lumio-dashboard__list">
              {top.map(c => (
                <ListRow
                  key={c.name}
                  leading={<CategoryIconBadge name={c.name} size={28} />}
                  primary={c.name}
                  trailing={formatAmount(c.amount)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="lumio-dashboard__card-empty">{t.noCategorizedTransactions}</div>
        )}
      </CardState>
    </DashboardCard>
  );
}

export function TrendsTab({ data, formatAmount, displayMonth }: TrendsTabProps): React.JSX.Element {
  const t = useIntlayer('trendsTab');
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  const monthLabel = useMonthLabel(displayMonth);
  const { data: trends, loading, error } = useDashboardTrends(days);
  const state: SectionState = { loading, error, trends };
  const effectivePeriod = resolveDashboardEffectivePeriod(
    trends?.effectiveSince,
    trends?.effectiveEndDate,
  );

  return (
    <div className="lumio-dashboard__tab">
      {effectivePeriod && (
        <div className="lumio-dashboard__period-banner">
          {`${t.showingPeriodPrefix.value} ${effectivePeriod}`}
        </div>
      )}
      <CashFlowCard data={data.cashFlow} monthLabel={monthLabel} />
      {trends && <TrendsKpis trends={trends} formatAmount={formatAmount} />}
      <div className="lumio-dashboard__grid lumio-dashboard__grid--wide">
        <SpendTrendCard state={state} days={days} onDaysChange={setDays} />
        <CategoryBreakdownCard state={state} formatAmount={formatAmount} />
      </div>
    </div>
  );
}
