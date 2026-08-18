import {
  daysInMonth,
  getMonthWindowBounds,
  getWindowBounds,
} from '../../../../src/modules/dashboard/dashboard-window.util';

describe('getWindowBounds', () => {
  it('spans the requested number of days ending at the target date', () => {
    const { since, endDate } = getWindowBounds(30, new Date('2026-03-15T12:00:00'));

    expect(endDate.toISOString()).toBe(new Date('2026-03-15T23:59:59.999').toISOString());
    expect(since.toISOString()).toBe(new Date('2026-02-13T00:00:00.000').toISOString());
  });
});

describe('getMonthWindowBounds', () => {
  it('spans the full calendar month for a mid-month anchor', () => {
    const { since, endDate } = getMonthWindowBounds(new Date('2026-03-15T12:00:00'));

    expect(since.toISOString()).toBe(new Date('2026-03-01T00:00:00.000').toISOString());
    expect(endDate.toISOString()).toBe(new Date('2026-03-31T23:59:59.999').toISOString());
  });

  it('handles the first day of the month as the anchor', () => {
    const { since, endDate } = getMonthWindowBounds(new Date('2026-03-01T00:00:00'));

    expect(since.toISOString()).toBe(new Date('2026-03-01T00:00:00.000').toISOString());
    expect(endDate.toISOString()).toBe(new Date('2026-03-31T23:59:59.999').toISOString());
  });

  it('handles the last day of the month as the anchor', () => {
    const { since, endDate } = getMonthWindowBounds(new Date('2026-03-31T23:00:00'));

    expect(since.toISOString()).toBe(new Date('2026-03-01T00:00:00.000').toISOString());
    expect(endDate.toISOString()).toBe(new Date('2026-03-31T23:59:59.999').toISOString());
  });

  it('handles February in a leap year', () => {
    const { since, endDate } = getMonthWindowBounds(new Date('2028-02-10T00:00:00'));

    expect(since.toISOString()).toBe(new Date('2028-02-01T00:00:00.000').toISOString());
    expect(endDate.toISOString()).toBe(new Date('2028-02-29T23:59:59.999').toISOString());
  });

  it('handles February in a non-leap year', () => {
    const { endDate } = getMonthWindowBounds(new Date('2026-02-10T00:00:00'));

    expect(endDate.toISOString()).toBe(new Date('2026-02-28T23:59:59.999').toISOString());
  });

  it('rolls over the year boundary for December', () => {
    const { since, endDate } = getMonthWindowBounds(new Date('2025-12-25T00:00:00'));

    expect(since.toISOString()).toBe(new Date('2025-12-01T00:00:00.000').toISOString());
    expect(endDate.toISOString()).toBe(new Date('2025-12-31T23:59:59.999').toISOString());
  });
});

describe('daysInMonth', () => {
  it('returns 31 for a 31-day month', () => {
    expect(daysInMonth(new Date('2026-03-15'))).toBe(31);
  });

  it('returns 30 for a 30-day month', () => {
    expect(daysInMonth(new Date('2026-04-15'))).toBe(30);
  });

  it('returns 29 for February in a leap year', () => {
    expect(daysInMonth(new Date('2028-02-15'))).toBe(29);
  });

  it('returns 28 for February in a non-leap year', () => {
    expect(daysInMonth(new Date('2026-02-15'))).toBe(28);
  });
});
