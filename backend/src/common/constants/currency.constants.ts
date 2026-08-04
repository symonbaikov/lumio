/**
 * Fallback currency used when a workspace has no explicit currency configured.
 *
 * Prefer resolving the workspace's own `currency` column (see
 * `WorkspaceCurrencyService`) — this constant is only the last resort when no
 * workspace context is available or the stored value is missing/invalid.
 */
export const DEFAULT_CURRENCY = 'USD';

/**
 * Validates and normalises a currency code to a 3-letter ISO 4217 uppercase
 * string. Returns `fallback` when the input is empty or not a valid code.
 */
export function normalizeCurrency(
  value: string | null | undefined,
  fallback: string = DEFAULT_CURRENCY,
): string {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
}
