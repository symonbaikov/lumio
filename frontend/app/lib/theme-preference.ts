export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedAppTheme = 'light' | 'dark';

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'auto';

export const THEME_STORAGE_EVENT = 'lumio-theme-preference-change';

export const resolveThemePreference = (value: unknown): ThemePreference => {
  if (value === 'light' || value === 'dark' || value === 'auto') {
    return value;
  }

  return DEFAULT_THEME_PREFERENCE;
};

export const getStoredThemePreference = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_PREFERENCE;
  }

  try {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      return DEFAULT_THEME_PREFERENCE;
    }

    const parsedUser = JSON.parse(rawUser) as { themePreference?: string };
    return resolveThemePreference(parsedUser?.themePreference);
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
};

export const getStoredThemeTimeZone = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { timeZone?: string | null };
    return typeof parsed?.timeZone === 'string' && parsed.timeZone.trim() ? parsed.timeZone : null;
  } catch {
    return null;
  }
};

const getHourForTimeZone = (timeZone: string | null) => {
  if (!timeZone) {
    return new Date().getHours();
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone,
  }).formatToParts(new Date());

  const hourValue = parts.find(part => part.type === 'hour')?.value;
  const parsedHour = Number.parseInt(hourValue || '', 10);

  return Number.isFinite(parsedHour) ? parsedHour : new Date().getHours();
};

export const getScheduledTheme = (timeZone: string | null): ResolvedAppTheme => {
  const hour = getHourForTimeZone(timeZone);
  return hour >= 7 && hour < 19 ? 'light' : 'dark';
};

/**
 * Last resolved mode, mirrored into a cookie so the server can render MUI in it.
 * Without it the SSR markup (and everything until hydration) uses the light
 * palette on a dark page: white cards, white skeletons.
 */
export const PALETTE_MODE_COOKIE = 'lumio-palette-mode';

export const parsePaletteModeCookie = (value: string | undefined): ResolvedAppTheme =>
  value === 'dark' ? 'dark' : 'light';

export const persistPaletteModeCookie = (mode: ResolvedAppTheme): void => {
  document.cookie = `${PALETTE_MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
};
