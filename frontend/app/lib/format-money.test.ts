import { describe, expect, it } from 'vitest';
import { DEFAULT_CURRENCY, formatMoney, resolveCurrencyCode, resolveLocale } from './format-money';

describe('DEFAULT_CURRENCY', () => {
  it('is a valid ISO 4217 code and not tied to any single market', () => {
    expect(DEFAULT_CURRENCY).toMatch(/^[A-Z]{3}$/);
    expect(DEFAULT_CURRENCY).not.toBe('KZT');
  });
});

describe('resolveCurrencyCode', () => {
  it('keeps a valid code, uppercasing and trimming it', () => {
    expect(resolveCurrencyCode('eur')).toBe('EUR');
    expect(resolveCurrencyCode('  gbp  ')).toBe('GBP');
    expect(resolveCurrencyCode('USD')).toBe('USD');
  });

  it('falls back to DEFAULT_CURRENCY when the value is missing', () => {
    expect(resolveCurrencyCode(null)).toBe(DEFAULT_CURRENCY);
    expect(resolveCurrencyCode(undefined)).toBe(DEFAULT_CURRENCY);
    expect(resolveCurrencyCode('')).toBe(DEFAULT_CURRENCY);
    expect(resolveCurrencyCode('   ')).toBe(DEFAULT_CURRENCY);
  });

  it('falls back when the value is not a 3-letter code', () => {
    expect(resolveCurrencyCode('EURO')).toBe(DEFAULT_CURRENCY);
    expect(resolveCurrencyCode('12')).toBe(DEFAULT_CURRENCY);
    expect(resolveCurrencyCode('€')).toBe(DEFAULT_CURRENCY);
  });

  it('prefers an explicit fallback over DEFAULT_CURRENCY', () => {
    expect(resolveCurrencyCode(null, 'EUR')).toBe('EUR');
    expect(resolveCurrencyCode('nope', 'EUR')).toBe('EUR');
  });

  it('lets a valid value win over the fallback', () => {
    expect(resolveCurrencyCode('GBP', 'EUR')).toBe('GBP');
  });
});

describe('resolveLocale', () => {
  it('maps app locale keys to BCP 47 locales', () => {
    expect(resolveLocale('ru')).toBe('ru-RU');
    expect(resolveLocale('kk')).toBe('kk-KZ');
    expect(resolveLocale('en')).toBe('en-US');
    expect(resolveLocale(undefined)).toBe('en-US');
  });
});

describe('formatMoney', () => {
  it('formats using the given currency', () => {
    expect(formatMoney(1234.5, 'EUR', 'en')).toContain('1,234.50');
    expect(formatMoney(1234.5, 'EUR', 'en')).toContain('€');
  });

  it('uses DEFAULT_CURRENCY when no currency is supplied', () => {
    const withMissing = formatMoney(10, '', 'en');
    const withDefault = formatMoney(10, DEFAULT_CURRENCY, 'en');
    expect(withMissing).toBe(withDefault);
  });

  it('returns a dash for NaN', () => {
    expect(formatMoney(Number.NaN, 'EUR')).toBe('—');
  });

  it('always renders two fraction digits', () => {
    expect(formatMoney(5, 'USD', 'en')).toContain('5.00');
  });
});
