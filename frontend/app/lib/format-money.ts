/**
 * Shared currency formatting utilities used across transaction and analytics views.
 */

/** Maps app locale keys to BCP 47 locale strings for Intl.NumberFormat. */
export const resolveLocale = (locale?: string): string => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

/**
 * Fallback currency used when a workspace has no explicit currency configured.
 *
 * Prefer the workspace's own `currency` (via `useWorkspace()` / the currency
 * display context) — this constant is only the last resort.
 */
export const DEFAULT_CURRENCY = 'USD';

/**
 * Validates and normalises a currency code to a 3-letter ISO 4217 uppercase string.
 * Returns `fallback` if the input is empty or invalid.
 */
export const resolveCurrencyCode = (
  currency: string | null | undefined,
  fallback: string = DEFAULT_CURRENCY,
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
 * @param currency  - ISO 4217 currency code (e.g. 'USD', 'EUR').
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
