'use client';

import { AnalyticsComparisonLine } from '@/app/(main)/statements/components/analytics/AnalyticsComparisonLine';
import type { getComparisonDelta } from '@/app/(main)/statements/components/shared-analytics.utils';
import { ArrowDown, ArrowUp, ChartPie } from '@/app/components/icons';
import { formatMoney } from '@/app/lib/analytics-common';

type ComparisonItem = ReturnType<typeof getComparisonDelta> | null;
type Totals = { total: number; statementTotal: number; receiptTotal: number; operations: number };
type Comparison = {
  total: ComparisonItem;
  statementTotal: ComparisonItem;
  receiptTotal: ComparisonItem;
  operations: ComparisonItem;
} | null;

type Props = {
  totals: Totals;
  comparison: Comparison;
  isIncomeView: boolean;
  primaryMetricLabel: string;
  statementsLabel: string;
  receiptsLabel: string;
  operationsLabel: string;
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

type CmpParams = { c: Comparison; key: keyof NonNullable<Comparison> };
const getCmp = ({ c, key }: CmpParams): ComparisonItem => c?.[key] ?? null;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--muted-foreground)',
          }}
        >
          {label}
        </span>
        {icon}
      </div>
      <div style={{ marginTop: 8, fontSize: 18, fontWeight: 600 }}>{value}</div>
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

export function TopCategoriesStatCards({
  totals,
  comparison,
  isIncomeView,
  primaryMetricLabel,
  statementsLabel,
  receiptsLabel,
  operationsLabel,
  currency,
  noDataLabel,
  vsPreviousPeriodLabel,
}: Props): React.JSX.Element {
  const cp = { currency, noDataLabel, vsPreviousPeriodLabel };
  const icon0 = isIncomeView ? (
    <ArrowUp size={16} color="#10b981" />
  ) : (
    <ArrowDown size={16} color="#ef4444" />
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      <StatCard
        label={primaryMetricLabel}
        value={formatMoney(totals.total, currency)}
        icon={icon0}
        comparisonItem={getCmp({ c: comparison, key: 'total' })}
        {...cp}
      />
      <StatCard
        label={statementsLabel}
        value={formatMoney(totals.statementTotal, currency)}
        icon={<ChartPie size={16} color="var(--primary)" />}
        comparisonItem={getCmp({ c: comparison, key: 'statementTotal' })}
        {...cp}
      />
      <StatCard
        label={receiptsLabel}
        value={formatMoney(totals.receiptTotal, currency)}
        icon={<ArrowUp size={16} color="#10b981" />}
        comparisonItem={getCmp({ c: comparison, key: 'receiptTotal' })}
        {...cp}
      />
      <StatCard
        label={operationsLabel}
        value={String(totals.operations)}
        icon={
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)' }}>#</span>
        }
        comparisonItem={getCmp({ c: comparison, key: 'operations' })}
        isMoney={false}
        {...cp}
      />
    </div>
  );
}
