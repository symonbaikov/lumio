const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string): Intl.NumberFormat {
  const cached = formatterCache.get(locale);
  if (cached) {
    return cached;
  }

  // Every app locale code (ru, en, kk, ...) is a valid Intl tag on its own —
  // no region suffix needed — so this never throws for a supported locale.
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  formatterCache.set(locale, formatter);
  return formatter;
}

/** Defaults to 'ru' to keep every existing call site (which predates
 * per-user locale support) formatted exactly as before. */
export function formatMoney(value: number | null | undefined, locale = 'ru'): string {
  if (value == null) {
    return '';
  }
  return getFormatter(locale).format(value);
}
