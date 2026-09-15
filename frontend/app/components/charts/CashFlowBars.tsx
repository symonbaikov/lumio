/*
 * Chart design adapted from Aurum by ZProger (https://github.com/ZProger/Aurum).
 * Reimplemented for Lumio; no Aurum source code was copied.
 */
'use client';

import type React from 'react';
import { Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ChartTooltipCard } from './ChartParts';
import {
  computeYearTicks,
  formatMonthLabel,
  formatSignedAmount,
  monthAtIndex,
} from './chart-format';
import { CHART_MARGIN, CHART_TICK, INACTIVE_BAR_OPACITY, LEGEND_STYLE } from './chart-theme';

export interface CashFlowBarPoint {
  /** YYYY-MM */
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface CashFlowBarsProps {
  points: CashFlowBarPoint[];
  locale: string;
  labels: { income: string; expense: string; net: string };
  formatAmount: (value: number) => string;
  /** Picked month (YYYY-MM); when it is on the chart, the other months are dimmed. */
  activeMonth?: string;
  onSelectMonth?: (month: string) => void;
}

/** Grouped monthly income/expense bars; fills its parent box. */
export function CashFlowBars({
  points,
  locale,
  labels,
  formatAmount,
  activeMonth,
  onSelectMonth,
}: CashFlowBarsProps): React.JSX.Element {
  const yearTicks = computeYearTicks(points.map(point => point.month));
  const dimOthers = points.some(point => point.month === activeMonth);
  const cells = points.map(point => (
    <Cell
      key={point.month}
      fillOpacity={!dimOthers || point.month === activeMonth ? 1 : INACTIVE_BAR_OPACITY}
    />
  ));
  const cursor = onSelectMonth ? 'pointer' : undefined;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={points}
        margin={CHART_MARGIN}
        onClick={state => {
          const month = monthAtIndex(points, state?.activeIndex);
          if (month) {
            onSelectMonth?.(month);
          }
        }}
      >
        {yearTicks.length > 0 && (
          <XAxis
            dataKey="month"
            ticks={yearTicks}
            tickFormatter={(key: string) => key.slice(0, 4)}
            axisLine={false}
            tickLine={false}
            tick={CHART_TICK}
            interval="preserveStartEnd"
          />
        )}
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as CashFlowBarPoint | undefined;
            if (!(active && point)) {
              return null;
            }
            return (
              <ChartTooltipCard
                title={formatMonthLabel(point.month, locale)}
                rows={[
                  { label: labels.income, value: formatAmount(point.income), tone: 'positive' },
                  { label: labels.expense, value: formatAmount(point.expense), tone: 'negative' },
                  {
                    label: labels.net,
                    value: formatSignedAmount(point.net, formatAmount),
                    tone: 'strong',
                  },
                ]}
              />
            );
          }}
        />
        <Legend
          verticalAlign="top"
          height={24}
          iconType="square"
          iconSize={10}
          wrapperStyle={LEGEND_STYLE}
        />
        <Bar
          dataKey="income"
          name={labels.income}
          fill="var(--ff-dash-success)"
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
          cursor={cursor}
        >
          {cells}
        </Bar>
        <Bar
          dataKey="expense"
          name={labels.expense}
          fill="var(--ff-dash-critical)"
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
          cursor={cursor}
        >
          {cells}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
