'use client';

import { AnalyticsComparisonLine } from '@/app/(main)/statements/components/analytics/AnalyticsComparisonLine';
import type { getComparisonDelta } from '@/app/(main)/statements/components/shared-analytics.utils';
import { ArrowDown, ArrowUp, ChartPie, Mail } from '@/app/components/icons';
import { formatMoney } from '@/app/lib/analytics-common';

type ComparisonItem = ReturnType<typeof getComparisonDelta> | null;
type Comparison = {
  total: ComparisonItem;
  statementsAmount: ComparisonItem;
  receiptsAmount: ComparisonItem;
  operations: ComparisonItem;
  avgPerPeriod: ComparisonItem;
} | null;
type Totals = {
  income: number;
  expense: number;
  statementAmount: number;
  gmailAmount: number;
  count: number;
  avgPerPeriod: number;
};

type Props = {
  totals: Totals;
  comparison: Comparison;
  isIncomeView: boolean;
  primaryMetricLabel: string;
  statementsLabel: string;
  receiptsLabel: string;
  operationsLabel: string;
  avgPerPeriodLabel: string;
  currency: string;
  noDataLabel: string;
  vsPreviousPeriodLabel: string;
};

type CardProps = {
  label: string;
  value: string;
  icon: React.JSX.Element;
  comparisonItem: ComparisonItem;
  currency: string;
  noDataLabel: string;
  vsPreviousPeriodLabel: string;
  isMoney?: boolean;
};

type CmpKey = keyof NonNullable<Comparison>;
type GetCmpParams = { c: Comparison; key: CmpKey };
const getCmp = ({ c, key }: GetCmpParams): ComparisonItem => c?.[key] ?? null;

function StatCard({
  label,
  value,
  icon,
  comparisonItem,
  currency,
  noDataLabel,
  vsPreviousPeriodLabel,
  isMoney = true,
}: CardProps): React.JSX.Element {
  return (
    <div className="lumio-view-page__stat-card">
      <div className="lumio-view-page__stat-header">
        <span className="lumio-view-page__stat-label">{label}</span>
        {icon}
      </div>
      <div className="lumio-view-page__stat-value">{value}</div>
      <AnalyticsComparisonLine
        item={comparisonItem}
        currency={currency}
        isMoney={isMoney}
        noDataLabel={noDataLabel}
        vsPreviousPeriodLabel={vsPreviousPeriodLabel}
      />
    </div>
  );
}

export function SpendOverTimeStatCards({
  totals,
  comparison,
  isIncomeView,
  primaryMetricLabel,
  statementsLabel,
  receiptsLabel,
  operationsLabel,
  avgPerPeriodLabel,
  currency,
  noDataLabel,
  vsPreviousPeriodLabel,
}: Props): React.JSX.Element {
  const cp = { currency, noDataLabel, vsPreviousPeriodLabel };
  const primaryValue = formatMoney(isIncomeView ? totals.income : totals.expense, currency);
  const primaryIcon = isIncomeView ? (
    <ArrowUp size={16} color="#10b981" />
  ) : (
    <ArrowDown size={16} color="#ef4444" />
  );
  return (
    <div className="lumio-view-page__stat-grid">
      <StatCard
        label={primaryMetricLabel}
        value={primaryValue}
        icon={primaryIcon}
        comparisonItem={getCmp({ c: comparison, key: 'total' })}
        {...cp}
      />
      <StatCard
        label={statementsLabel}
        value={formatMoney(totals.statementAmount, currency)}
        icon={<ChartPie size={16} color="var(--primary)" />}
        comparisonItem={getCmp({ c: comparison, key: 'statementsAmount' })}
        {...cp}
      />
      <StatCard
        label={receiptsLabel}
        value={formatMoney(totals.gmailAmount, currency)}
        icon={<Mail size={16} color="#10b981" />}
        comparisonItem={getCmp({ c: comparison, key: 'receiptsAmount' })}
        {...cp}
      />
      <StatCard
        label={operationsLabel}
        value={String(totals.count)}
        icon={
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)' }}>#</span>
        }
        comparisonItem={getCmp({ c: comparison, key: 'operations' })}
        isMoney={false}
        {...cp}
      />
      <StatCard
        label={avgPerPeriodLabel}
        value={formatMoney(totals.avgPerPeriod, currency)}
        icon={
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)' }}>
            AVG
          </span>
        }
        comparisonItem={getCmp({ c: comparison, key: 'avgPerPeriod' })}
        {...cp}
      />
    </div>
  );
}
