import { describe, expect, it } from 'vitest';
import {
  resolveDashboardDisplayDate,
  resolveDashboardEffectivePeriod,
} from './dashboard-effective-window';

describe('dashboard effective window helpers', () => {
  it('prefers explicit target date over effective end date', () => {
    expect(resolveDashboardDisplayDate('2025-06-15', '2025-05-31')).toBe('2025-06-15');
  });

  it('falls back to effective end date when target date is absent', () => {
    expect(resolveDashboardDisplayDate(null, '2025-05-31')).toBe('2025-05-31');
  });

  it('returns null when there is no display date', () => {
    expect(resolveDashboardDisplayDate(null, null)).toBeNull();
  });

  it('formats effective period only when both bounds are present', () => {
    expect(resolveDashboardEffectivePeriod('2025-05-01', '2025-05-31')).toBe(
      '2025-05-01 - 2025-05-31',
    );
    expect(resolveDashboardEffectivePeriod('2025-05-01', null)).toBeNull();
  });
});
