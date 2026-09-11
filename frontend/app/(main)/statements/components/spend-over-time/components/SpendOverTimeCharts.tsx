'use client';

import { LazyECharts } from '@/app/components/ui/lazy-echarts';

type ChartCardProps = {
  title: string;
  option: object;
  theme: string;
  height: number;
  wide?: boolean;
};
function ChartCard({ title, option, theme, height, wide }: ChartCardProps): React.JSX.Element {
  return (
    <div className={wide ? 'lumio-view-page__chart-card--wide' : 'lumio-view-page__chart-card'}>
      <div className="lumio-view-page__chart-header">
        <h3 className="lumio-view-page__chart-title">{title}</h3>
      </div>
      <LazyECharts style={{ height }} option={option} theme={theme} />
    </div>
  );
}

type Props = {
  trendChart: object;
  sourceChart: object;
  periodsChart: object;
  chartTheme: string;
  trendTitle: string;
  sourceSplitTitle: string;
  periodChartTitle: string;
};

export function SpendOverTimeCharts({
  trendChart,
  sourceChart,
  periodsChart,
  chartTheme,
  trendTitle,
  sourceSplitTitle,
  periodChartTitle,
}: Props): React.JSX.Element {
  return (
    <div className="lumio-view-page__chart-grid-wrapper">
      <div className="lumio-view-page__chart-grid">
        <ChartCard title={trendTitle} option={trendChart} theme={chartTheme} height={300} wide />
        <ChartCard title={sourceSplitTitle} option={sourceChart} theme={chartTheme} height={300} />
      </div>
      <ChartCard title={periodChartTitle} option={periodsChart} theme={chartTheme} height={320} />
    </div>
  );
}
