export type AppLocale =
  | 'en'
  | 'ru'
  | 'kk'
  | 'zh'
  | 'de'
  | 'fr'
  | 'es'
  | 'uk'
  | 'pl'
  | 'sk'
  | 'pt'
  | 'tr'
  | 'ar'
  | 'it'
  | 'ja'
  | 'ko'
  | 'hi'
  | 'nl'
  | 'sv'
  | 'vi'
  | 'id';

export const DEFAULT_LOCALE: AppLocale = 'en';
export const LOCALE_COOKIE_NAME = 'INTLAYER_LOCALE';
export const SUPPORTED_LOCALES = [
  'ru',
  'en',
  'kk',
  'zh',
  'de',
  'fr',
  'es',
  'uk',
  'pl',
  'sk',
  'pt',
  'tr',
  'ar',
  'it',
  'ja',
  'ko',
  'hi',
  'nl',
  'sv',
  'vi',
  'id',
] as const satisfies readonly AppLocale[];
const LEGACY_LOCALE_COOKIE_NAME = 'intlayer-locale';
const LOCALE_COOKIE_ATTRIBUTES = 'path=/; max-age=31536000; samesite=lax';
const EXPIRED_COOKIE_ATTRIBUTES = 'path=/; max-age=0; samesite=lax';

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  if (value == null) return false;
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  return (
    document.cookie
      .split(';')
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith(`${name}=`))
      ?.split('=')[1] ?? null
  );
}

export function normalizeLocale(
  value: string | null | undefined,
  fallback: AppLocale = DEFAULT_LOCALE,
): AppLocale {
  return isSupportedLocale(value) ? value : fallback;
}

export function readLocaleFromCookie(): AppLocale | null {
  const primaryCookieLocale = readCookie(LOCALE_COOKIE_NAME);
  if (isSupportedLocale(primaryCookieLocale)) {
    return primaryCookieLocale;
  }

  const legacyCookieLocale = readCookie(LEGACY_LOCALE_COOKIE_NAME);
  return isSupportedLocale(legacyCookieLocale) ? legacyCookieLocale : null;
}

export function persistLocaleToCookie(locale: AppLocale) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; ${LOCALE_COOKIE_ATTRIBUTES}`;
  // Keep next-intlayer server reads and existing client helpers aligned across reloads.
  document.cookie = `${LEGACY_LOCALE_COOKIE_NAME}=${locale}; ${LOCALE_COOKIE_ATTRIBUTES}`;
}

export function syncLocaleFromUser(
  user: { locale?: string | null } | null | undefined,
  options?: { overwrite?: boolean },
) {
  if (!isSupportedLocale(user?.locale)) {
    return;
  }

  if (!options?.overwrite && readLocaleFromCookie() != null) {
    return;
  }

  persistLocaleToCookie(user.locale);
}
