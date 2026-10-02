'use client';

import { ChartRangeFooter } from '@/app/components/charts/ChartParts';
import { formatDayLabel } from '@/app/components/charts/chart-format';
import { LazyNetWorthArea } from '@/app/components/charts/lazy-charts';
import { useLocale } from '@/app/i18n';
import type { ForecastDay } from '../hooks/useForecast';

interface ForecastChartProps {
  days: ForecastDay[];
  formatValue: (value: number) => string;
}

/** The projected balance, coloured by whether it ends above where it started. */
export function ForecastChart({ days, formatValue }: ForecastChartProps) {
  const { locale } = useLocale();
  const points = days.map(day => ({ date: day.date, value: day.balance }));
  const positive = days.length === 0 || days[days.length - 1].balance >= 0;

  return (
    <>
      <div className="lumio-chart__box">
        <LazyNetWorthArea
          points={points}
          positive={positive}
          locale={locale}
          formatValue={formatValue}
        />
      </div>
      {points.length > 1 && (
        <ChartRangeFooter
          start={formatDayLabel(points[0].date, locale)}
          end={formatDayLabel(points[points.length - 1].date, locale)}
        />
      )}
    </>
  );
}
