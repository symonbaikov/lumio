/** Income minus expense for the period. */
export function computeNet(income: number, expense: number): number {
  return income - expense;
}

/**
 * (income - expense) / income as a percentage. `null` when income is zero —
 * the ratio is undefined, not zero, so callers should render an em dash
 * rather than "0%".
 */
export function computeSavingsRate(income: number, expense: number): number | null {
  if (income === 0) {
    return null;
  }
  return ((income - expense) / income) * 100;
}
