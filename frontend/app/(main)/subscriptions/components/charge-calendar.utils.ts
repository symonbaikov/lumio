/**
 * How strongly a cell should be tinted: its share of the biggest charge in the
 * same month. Colour is decoration only — every non-empty cell also prints its
 * amount — so this never has to carry meaning on its own.
 */
export const cellIntensity = (amount: number, monthPeak: number): number => {
  if (!(amount > 0 && monthPeak > 0)) {
    return 0;
  }
  return Math.min(1, amount / monthPeak);
};

/** The largest single charge in each month, used to scale that column's tint. */
export const monthPeaks = (rows: { amounts: number[] }[], months: number): number[] =>
  Array.from({ length: months }, (_, index) =>
    rows.reduce((peak, row) => Math.max(peak, row.amounts[index] ?? 0), 0),
  );
