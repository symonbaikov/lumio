const normalizeLocale = (locale: string | undefined): string | null => {
  if (!locale) {
    return null;
  }

  const normalized = locale.trim().replace('_', '-').toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalized;
};

const getLocaleCandidates = (locale: string | undefined): string[] => {
  const normalized = normalizeLocale(locale);
  if (!normalized) {
    return [];
  }

  const base = normalized.split('-')[0] || normalized;
  const candidates = [locale || '', normalized, base].map(item => item.trim()).filter(Boolean);

  return Array.from(new Set(candidates));
};

const readLocalizedFromRecord = (source: unknown, candidates: string[]): string | null => {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const record = source as Record<string, unknown>;

  for (const key of candidates) {
    const direct = record[key];
    if (typeof direct === 'string' && direct.length > 0) {
      return direct;
    }

    const lowerKey = key.toLowerCase();
    const lower = record[lowerKey];
    if (typeof lower === 'string' && lower.length > 0) {
      return lower;
    }
  }

  return null;
};

const isMeaningfulStringified = (value: string): boolean => {
  return value.length > 0 && value !== '[object Object]';
};

export function resolveOnboardingText(
  token: unknown,
  fallback = '',
  preferredLocale?: string,
): string {
  if (typeof token === 'string') {
    return token;
  }

  const candidates = getLocaleCandidates(preferredLocale);

  if (candidates.length > 0) {
    const localizedFromToken = readLocalizedFromRecord(token, candidates);
    if (localizedFromToken) {
      return localizedFromToken;
    }

    if (token && typeof token === 'object' && 'value' in token) {
      const localizedFromValue = readLocalizedFromRecord(
        (token as { value?: unknown }).value,
        candidates,
      );
      if (localizedFromValue) {
        return localizedFromValue;
      }
    }
  }

  if (token !== null && token !== undefined) {
    const stringified = String(token);
    if (isMeaningfulStringified(stringified)) {
      return stringified;
    }
  }

  if (token && typeof token === 'object' && 'value' in token) {
    const value = (token as { value?: unknown }).value;
    if (typeof value === 'string') {
      return value;
    }
  }

  return fallback;
}
