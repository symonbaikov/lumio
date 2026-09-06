import { tokens } from '@/lib/theme-tokens';

type TrendPoint = { date: string; income: number; expense: number };
type CategoryPoint = { name: string; amount: number };

function palette(isDark: boolean): {
  tooltipBg: string;
  tooltipText: string;
  muted: string;
  grid: string;
  income: string;
  expense: string;
  incomeArea: string;
  expenseArea: string;
  surface: string;
} {
  const c = isDark ? tokens.dark.color : tokens.color;
  return {
    tooltipBg: isDark ? c.surfaceMuted : c.ink900,
    tooltipText: isDark ? c.ink900 : c.white,
    muted: c.ink500,
    grid: c.border,
    income: c.success,
    expense: c.danger,
    incomeArea: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(16, 185, 129, 0.08)',
    expenseArea: isDark ? 'rgba(251, 113, 133, 0.12)' : 'rgba(225, 29, 72, 0.08)',
    surface: c.surface,
  };
}

const FONT = 'var(--font-dashboard-sans)';

export interface DailyTrendLabels {
  income: string;
  expense: string;
  forecastSuffix: string;
  forecastLabel: string;
}

interface DailyTrendInput {
  actual: TrendPoint[];
  forecast: TrendPoint[];
  isDark: boolean;
  labels: DailyTrendLabels;
}

function lineSeries(
  name: string,
  data: Array<number | null>,
  color: string,
  area: string,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  return {
    name,
    type: 'line',
    smooth: true,
    data,
    areaStyle: { color: area },
    lineStyle: { color, width: 2 },
    itemStyle: { color },
    ...extra,
  };
}

/** Income/expense lines with an optional dashed forecast continuation. */
export function buildDailyTrendOption({
  actual,
  forecast,
  isDark,
  labels,
}: DailyTrendInput): object | null {
  if (!actual.length) {
    return null;
  }
  const p = palette(isDark);
  const hasForecast = forecast.length > 0;
  const last = actual[actual.length - 1];
  const gap = actual.slice(0, -1).map(() => null);
  const pad = forecast.map(() => null);
  const symbols =
    actual.length <= 2
      ? { symbol: 'circle', symbolSize: 7, showSymbol: true }
      : { symbol: 'none', showSymbol: false };
  const markLine = hasForecast
    ? {
        markLine: {
          data: [{ xAxis: last.date }],
          lineStyle: { color: p.muted, type: 'dashed', width: 1 },
          label: {
            show: true,
            formatter: labels.forecastLabel,
            fontSize: 10,
            color: p.muted,
            fontFamily: FONT,
          },
          symbol: 'none',
          silent: true,
        },
      }
    : {};
  const series = [
    lineSeries(labels.income, [...actual.map(x => x.income), ...pad], p.income, p.incomeArea, {
      ...symbols,
      ...markLine,
    }),
    lineSeries(
      labels.expense,
      [...actual.map(x => x.expense), ...pad],
      p.expense,
      p.expenseArea,
      symbols,
    ),
  ];
  if (hasForecast) {
    const dashed = {
      lineStyle: { width: 2, type: 'dashed' },
      symbol: 'none',
      legendHoverLink: false,
    };
    series.push(
      lineSeries(
        `${labels.income}${labels.forecastSuffix}`,
        [...gap, last.income, ...forecast.map(x => x.income)],
        p.income,
        'transparent',
        { ...dashed, lineStyle: { ...dashed.lineStyle, color: p.income } },
      ),
      lineSeries(
        `${labels.expense}${labels.forecastSuffix}`,
        [...gap, last.expense, ...forecast.map(x => x.expense)],
        p.expense,
        'transparent',
        { ...dashed, lineStyle: { ...dashed.lineStyle, color: p.expense } },
      ),
    );
  }
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: p.tooltipBg,
      borderColor: 'transparent',
      textStyle: { color: p.tooltipText, fontSize: 12 },
    },
    legend: {
      data: [labels.income, labels.expense],
      top: 0,
      right: 0,
      textStyle: { color: p.muted, fontSize: 11, fontFamily: FONT },
      icon: 'rect',
      itemWidth: 12,
      itemHeight: 6,
    },
    grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: [...actual.map(x => x.date), ...forecast.map(x => x.date)],
      axisLabel: { color: p.muted, fontSize: 10, fontFamily: FONT },
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: p.muted, fontSize: 10, fontFamily: FONT },
      splitLine: { lineStyle: { color: p.grid } },
    },
    series,
  };
}

interface CategoryRoseInput {
  categories: CategoryPoint[];
  isDark: boolean;
  seriesName: string;
  colorFor: (name: string) => string;
}

/** Rose pie without a built-in legend; the card renders its own icon list. */
export function buildCategoryRoseOption({
  categories,
  isDark,
  seriesName,
  colorFor,
}: CategoryRoseInput): object | null {
  if (!categories.length) {
    return null;
  }
  const p = palette(isDark);
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: p.tooltipBg,
      borderColor: 'transparent',
      textStyle: { color: p.tooltipText, fontSize: 12 },
    },
    series: [
      {
        name: seriesName,
        type: 'pie',
        radius: ['22%', '78%'],
        center: ['50%', '50%'],
        roseType: 'radius',
        label: { show: false },
        itemStyle: { borderColor: p.surface, borderWidth: 2, borderRadius: 4 },
        data: categories.map(c => ({
          name: c.name,
          value: Number(c.amount.toFixed(2)),
          itemStyle: { color: colorFor(c.name) },
        })),
      },
    ],
  };
}
