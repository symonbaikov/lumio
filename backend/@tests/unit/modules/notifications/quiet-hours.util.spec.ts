import { getLocalHour, isWithinQuietHours } from '@/modules/notifications/quiet-hours.util';

describe('isWithinQuietHours', () => {
  it('is off when either bound is missing', () => {
    expect(isWithinQuietHours(3, null, 7)).toBe(false);
    expect(isWithinQuietHours(3, 22, null)).toBe(false);
    expect(isWithinQuietHours(3, null, null)).toBe(false);
  });

  it('is off when the window is empty', () => {
    expect(isWithinQuietHours(9, 9, 9)).toBe(false);
  });

  it('handles a same-day window', () => {
    expect(isWithinQuietHours(13, 12, 14)).toBe(true);
    expect(isWithinQuietHours(12, 12, 14)).toBe(true);
    expect(isWithinQuietHours(14, 12, 14)).toBe(false);
    expect(isWithinQuietHours(11, 12, 14)).toBe(false);
  });

  it('handles a window that wraps past midnight', () => {
    expect(isWithinQuietHours(23, 22, 7)).toBe(true);
    expect(isWithinQuietHours(3, 22, 7)).toBe(true);
    expect(isWithinQuietHours(22, 22, 7)).toBe(true);
    expect(isWithinQuietHours(7, 22, 7)).toBe(false);
    expect(isWithinQuietHours(12, 22, 7)).toBe(false);
  });
});

describe('getLocalHour', () => {
  // 2026-08-21T23:30:00Z
  const instant = new Date(Date.UTC(2026, 7, 21, 23, 30));

  it('reads the hour in the given time zone', () => {
    expect(getLocalHour(instant, 'UTC')).toBe(23);
    expect(getLocalHour(instant, 'Europe/Moscow')).toBe(2); // UTC+3, next day
    expect(getLocalHour(instant, 'America/New_York')).toBe(19); // UTC-4
  });

  it('falls back to the server hour for an unknown zone', () => {
    expect(getLocalHour(instant, 'Not/AZone')).toBe(instant.getHours());
    expect(getLocalHour(instant, null)).toBe(instant.getHours());
  });

  it('normalises midnight to 0', () => {
    const midnight = new Date(Date.UTC(2026, 7, 21, 0, 5));
    expect(getLocalHour(midnight, 'UTC')).toBe(0);
  });
});
