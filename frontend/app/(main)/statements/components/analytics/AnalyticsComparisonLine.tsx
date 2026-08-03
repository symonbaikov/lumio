'use client';

import { formatPercentage } from '@/app/(main)/statements/components/analytics/analytics-format';
import type { getComparisonDelta } from '@/app/(main)/statements/components/shared-analytics.utils';
import { formatMoney } from '@/app/lib/analytics-common';

type ComparisonItem = ReturnType<typeof getComparisonDelta>;

type Props = {
  item: ComparisonItem | null;
  currency: string;
  isMoney?: boolean;
  noDataLabel: string;
  vsPreviousPeriodLabel: string;
};

const TREND_COLORS: Record<string, string> = {
  up: 'var(--ff-dash-success)',
  down: 'var(--ff-dash-critical)',
  flat: 'var(--muted-foreground)',
};

const resolveDeltaPrefix = (delta: number): string => {
  if (delta > 0) {
    return '+';
  }
  if (delta < 0) {
    return '-';
  }
  return '';
};

export function AnalyticsComparisonLine({
  item,
  currency,
  isMoney = true,
  noDataLabel,
  vsPreviousPeriodLabel,
}: Props): React.JSX.Element {
  if (!item) {
    return (
      <p style={{ marginTop: 4, fontSize: 12, color: 'var(--muted-foreground)' }}>{noDataLabel}</p>
    );
  }

  const deltaColor = TREND_COLORS[item.trend] ?? 'var(--muted-foreground)';
  const prefix = resolveDeltaPrefix(item.delta);
  const deltaValue = isMoney
    ? formatMoney(Math.abs(item.delta), currency)
    : Math.abs(Math.round(item.delta)).toString();

  return (
    <p style={{ marginTop: 4, fontSize: 12, color: deltaColor }}>
      {formatPercentage(item.percentage)} ({prefix}
      {deltaValue}) {vsPreviousPeriodLabel}
    </p>
  );
}
