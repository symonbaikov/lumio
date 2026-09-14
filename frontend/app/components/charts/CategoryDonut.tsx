/*
 * Chart design adapted from Aurum by ZProger (https://github.com/ZProger/Aurum).
 * Reimplemented for Lumio; no Aurum source code was copied.
 */
'use client';

import type React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltipCard } from './ChartParts';

export interface DonutSlice {
  key: string;
  name: string;
  value: number;
  color: string;
}

export interface CategoryDonutProps {
  slices: DonutSlice[];
  formatAmount: (value: number) => string;
}

/** Share of each slice in percent, one decimal. */
export function slicePercent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

/** Donut without labels or legend; the card renders its own list beside it. */
export function CategoryDonut({ slices, formatAmount }: CategoryDonutProps): React.JSX.Element {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip
          content={({ active, payload }) => {
            const slice = payload?.[0]?.payload as DonutSlice | undefined;
            if (!(active && slice)) {
              return null;
            }
            return (
              <ChartTooltipCard
                title={slice.name}
                rows={[
                  {
                    value: `${formatAmount(slice.value)} · ${slicePercent(slice.value, total)}%`,
                    tone: 'strong',
                  },
                ]}
              />
            );
          }}
        />
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          innerRadius="62%"
          outerRadius="100%"
          paddingAngle={slices.length > 1 ? 2 : 0}
          stroke="var(--card)"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {slices.map(slice => (
            <Cell key={slice.key} fill={slice.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
