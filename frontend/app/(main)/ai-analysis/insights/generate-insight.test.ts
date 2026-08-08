import { describe, expect, it } from 'vitest';
import { currentPeriodKey } from './generate-insight';

describe('currentPeriodKey', () => {
  it('formats as YYYY-MM, matching what the backend accepts', () => {
    expect(currentPeriodKey(new Date('2026-08-08T12:00:00Z'))).toBe('2026-08');
  });

  it('pads single-digit months so keys sort and compare as strings', () => {
    expect(currentPeriodKey(new Date('2026-01-31T12:00:00Z'))).toBe('2026-01');
  });

  it('changes with the month, so a new month gets its own insight', () => {
    expect(currentPeriodKey(new Date('2026-08-31T12:00:00Z'))).not.toBe(
      currentPeriodKey(new Date('2026-09-01T12:00:00Z')),
    );
  });

  it('is stable within a month, so reopening the page does not stack rows', () => {
    expect(currentPeriodKey(new Date('2026-08-01T00:00:00Z'))).toBe(
      currentPeriodKey(new Date('2026-08-28T23:00:00Z')),
    );
  });
});
