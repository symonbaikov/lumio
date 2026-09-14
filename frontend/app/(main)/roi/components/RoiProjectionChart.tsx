'use client';

import { useMemo } from 'react';
import { LazyRoiLines } from '@/app/components/charts/lazy-charts';
import { useIntlayer, useLocale } from '@/app/i18n';
import type { ProjectionPoint } from '../roi-model';

interface RoiProjectionChartProps {
  points: ProjectionPoint[];
  compoundLabel: string;
  simpleLabel: string;
}

export function RoiProjectionChart({
  points,
  compoundLabel,
  simpleLabel,
}: RoiProjectionChartProps) {
  const t = useIntlayer('roiPage');
  const { locale } = useLocale();
  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale],
  );

  return (
    <div className="lumio-chart__box">
      <LazyRoiLines
        points={points}
        labels={{ compound: compoundLabel, simple: simpleLabel, year: t.yearColumn.value }}
        formatValue={value => formatter.format(value)}
      />
    </div>
  );
}
