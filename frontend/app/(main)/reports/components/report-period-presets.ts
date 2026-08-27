import { toDateInputValue } from './balance-sheet-utils';

export interface PeriodPreset {
  labelKey: string;
  fallback: string;
  /** [from, to], inclusive. */
  range: () => [Date, Date];
}

/** Covers the ranges people actually ask for; anything else uses the two pickers. */
export const PERIOD_PRESETS: PeriodPreset[] = [
  {
    labelKey: 'presetThisMonth',
    fallback: 'This month',
    range: (): [Date, Date] => {
      const now = new Date();
      return [new Date(now.getFullYear(), now.getMonth(), 1), now];
    },
  },
  {
    labelKey: 'presetLastMonth',
    fallback: 'Last month',
    range: (): [Date, Date] => {
      const now = new Date();
      return [
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
        // Day 0 of the current month is the last day of the previous one.
        new Date(now.getFullYear(), now.getMonth(), 0),
      ];
    },
  },
  {
    labelKey: 'presetThisQuarter',
    fallback: 'This quarter',
    range: (): [Date, Date] => {
      const now = new Date();
      return [new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), now];
    },
  },
  {
    labelKey: 'presetYearToDate',
    fallback: 'Year to date',
    range: (): [Date, Date] => {
      const now = new Date();
      return [new Date(now.getFullYear(), 0, 1), now];
    },
  },
];

/** Convenience for callers that just want the two input strings. */
export function presetRangeValues(preset: PeriodPreset): [string, string] {
  const [from, to] = preset.range();
  return [toDateInputValue(from), toDateInputValue(to)];
}
