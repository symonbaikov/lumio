/**
 * Shared currency formatting utilities used across transaction and analytics views.
 */

import { resolveLocaleTag } from '@/app/lib/user-format';

/**
 * Maps app locale keys to BCP 47 locale strings for Intl.NumberFormat.
 * Delegates to the shared resolver so money and dates cannot drift apart.
 */
export const resolveLocale = (locale?: string): string => resolveLocaleTag(locale);

/**
 * Validates and normalises a currency code to a 3-letter ISO 4217 uppercase string.
 * Returns `fallback` if the input is empty or invalid.
 */
export const resolveCurrencyCode = (
  currency: string | null | undefined,
  fallback = 'KZT',
): string => {
  const normalized = String(currency ?? '')
    .trim()
    .toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
};

/**
 * Formats a numeric `value` as a localised currency string.
 *
 * @param value     - Numeric amount to format.
 * @param currency  - ISO 4217 currency code (e.g. 'KZT', 'USD').
 * @param locale    - App locale key ('en' | 'ru' | 'kk').  Defaults to 'en'.
 */
export const formatMoney = (value: number, currency: string, locale = 'en'): string => {
  if (Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(resolveLocale(locale), {
    style: 'currency',
    currency: resolveCurrencyCode(currency),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
