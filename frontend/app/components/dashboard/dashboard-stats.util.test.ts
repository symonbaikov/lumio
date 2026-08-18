import { describe, expect, it } from 'vitest';
import { computeNet, computeSavingsRate } from './dashboard-stats.util';

describe('computeNet', () => {
  it('subtracts expense from income', () => {
    expect(computeNet(1000, 400)).toBe(600);
  });

  it('goes negative when expense exceeds income', () => {
    expect(computeNet(400, 1000)).toBe(-600);
  });

  it('is zero when income and expense are both zero', () => {
    expect(computeNet(0, 0)).toBe(0);
  });
});

describe('computeSavingsRate', () => {
  it('returns the share of income left over as a percentage', () => {
    expect(computeSavingsRate(1000, 400)).toBe(60);
  });

  it('returns null when income is zero, not a divide-by-zero artifact', () => {
    expect(computeSavingsRate(0, 0)).toBeNull();
    expect(computeSavingsRate(0, 500)).toBeNull();
  });

  it('goes negative when expense exceeds income', () => {
    expect(computeSavingsRate(400, 1000)).toBe(-150);
  });

  it('is 100 when there is no expense at all', () => {
    expect(computeSavingsRate(1000, 0)).toBe(100);
  });

  it('is 0 when expense exactly equals income', () => {
    expect(computeSavingsRate(1000, 1000)).toBe(0);
  });
});
