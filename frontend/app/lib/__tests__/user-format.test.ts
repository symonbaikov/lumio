import {
  formatDate,
  formatDateTime,
  formatDateWithOptions,
  getWeekStart,
  resolveFirstDayOfWeek,
  resolveLocaleTag,
} from '@/app/lib/user-format';
import { describe, expect, it } from 'vitest';

const date = new Date(2026, 7, 5, 14, 30); // 5 August 2026, local time

describe('resolveLocaleTag', () => {
  it('adds a region to app locale keys that need one', () => {
    expect(resolveLocaleTag('ru')).toBe('ru-RU');
    expect(resolveLocaleTag('kk')).toBe('kk-KZ');
    expect(resolveLocaleTag('en')).toBe('en-US');
  });

  it('passes through locales that are already valid tags', () => {
    // These used to fall back to en-US, so German users got US formatting.
    expect(resolveLocaleTag('de')).toBe('de');
    expect(resolveLocaleTag('fr')).toBe('fr');
  });

  it('falls back to en-US only when nothing is set', () => {
    expect(resolveLocaleTag(undefined)).toBe('en-US');
    expect(resolveLocaleTag('')).toBe('en-US');
  });
});

describe('formatDate', () => {
  it('follows the language when set to auto', () => {
    expect(formatDate(date, { locale: 'ru', dateFormat: 'auto' })).toContain('2026');
    expect(formatDate(date, { locale: 'en', dateFormat: 'auto' })).toContain('2026');
  });

  it('forces the chosen order regardless of language', () => {
    expect(formatDate(date, { locale: 'en', dateFormat: 'dmy' })).toBe('05.08.2026');
    expect(formatDate(date, { locale: 'ru', dateFormat: 'mdy' })).toBe('08/05/2026');
    expect(formatDate(date, { locale: 'ru', dateFormat: 'ymd' })).toBe('2026-08-05');
  });

  it('returns an empty string for missing or invalid input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate('not-a-date')).toBe('');
  });

  it('accepts ISO strings and timestamps', () => {
    expect(formatDate('2026-08-05T00:00:00', { dateFormat: 'ymd' })).toBe('2026-08-05');
    expect(formatDate(date.getTime(), { dateFormat: 'ymd' })).toBe('2026-08-05');
  });
});

describe('formatDateTime', () => {
  it('appends the time to the formatted date', () => {
    expect(formatDateTime(date, { locale: 'ru', dateFormat: 'dmy' })).toMatch(/^05\.08\.2026, /);
  });

  it('stays empty for missing input', () => {
    expect(formatDateTime(null)).toBe('');
  });
});

describe('formatDateWithOptions', () => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

  it('keeps the call site look untouched on auto', () => {
    const native = new Intl.DateTimeFormat('ru-RU', options).format(date);
    expect(formatDateWithOptions(date, { locale: 'ru' }, options)).toBe(native);
    expect(formatDateWithOptions(date, { locale: 'ru', dateFormat: 'auto' }, options)).toBe(native);
  });

  it('lets an explicit order override the call site options', () => {
    expect(formatDateWithOptions(date, { locale: 'ru', dateFormat: 'ymd' }, options)).toBe(
      '2026-08-05',
    );
  });

  it('preserves the time part when the call site asked for one', () => {
    const withTime: Intl.DateTimeFormatOptions = { ...options, hour: '2-digit', minute: '2-digit' };
    expect(formatDateWithOptions(date, { locale: 'ru', dateFormat: 'dmy' }, withTime)).toMatch(
      /^05\.08\.2026, \d{2}[:.]\d{2}$/,
    );
  });

  it('leaves partial labels alone even with an explicit order', () => {
    const monthOnly: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    const dayMonth: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

    expect(formatDateWithOptions(date, { locale: 'ru', dateFormat: 'ymd' }, monthOnly)).toBe(
      new Intl.DateTimeFormat('ru-RU', monthOnly).format(date),
    );
    expect(formatDateWithOptions(date, { locale: 'ru', dateFormat: 'ymd' }, dayMonth)).toBe(
      new Intl.DateTimeFormat('ru-RU', dayMonth).format(date),
    );
  });

  it('stays empty for invalid input', () => {
    expect(formatDateWithOptions(null, { dateFormat: 'dmy' }, options)).toBe('');
  });
});

describe('first day of week', () => {
  it('defaults to Sunday for English and Monday elsewhere', () => {
    expect(resolveFirstDayOfWeek({ locale: 'en' })).toBe(0);
    expect(resolveFirstDayOfWeek({ locale: 'ru' })).toBe(1);
    expect(resolveFirstDayOfWeek({ locale: 'de' })).toBe(1);
  });

  it('honours an explicit choice, including Sunday', () => {
    expect(resolveFirstDayOfWeek({ locale: 'ru', firstDayOfWeek: 0 })).toBe(0);
    expect(resolveFirstDayOfWeek({ locale: 'en', firstDayOfWeek: 1 })).toBe(1);
  });

  it('walks back to the configured first weekday', () => {
    // 5 Aug 2026 is a Wednesday.
    expect(getWeekStart(date, { firstDayOfWeek: 1 }).getDate()).toBe(3); // Monday
    expect(getWeekStart(date, { firstDayOfWeek: 0 }).getDate()).toBe(2); // Sunday
  });

  it('keeps a date that already is the first weekday', () => {
    const monday = new Date(2026, 7, 3);
    expect(getWeekStart(monday, { firstDayOfWeek: 1 }).getDate()).toBe(3);
  });
});
