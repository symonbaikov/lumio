'use client';

import apiClient from '@/app/lib/api';
import { readLocaleFromCookie, syncLocaleFromUser } from '@/app/lib/locale';
import { getQueryClient } from '@/app/lib/query-client';
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_EVENT,
  type ThemePreference,
  resolveThemePreference,
} from '@/app/lib/theme-preference';
import type { DateFormatPreference } from '@/app/lib/user-format';
import { notifyUserFormatChanged } from '@/app/lib/user-format-store';
import { usePathname, useRouter } from 'next/navigation';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  workspaceId?: string | null;
  permissions?: string[] | null;
  telegramId?: string | null;
  telegramChatId?: string | null;
  locale?: string;
  timeZone?: string | null;
  dateFormat?: DateFormatPreference;
  firstDayOfWeek?: number | null;
  uiDensity?: 'comfortable' | 'compact';
  reduceMotion?: boolean;
  themePreference?: ThemePreference;
  lastLogin?: string | null;
  avatarUrl?: string | null;
  onboardingCompletedAt?: string | null;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeUser = (user: User): User => ({
  ...user,
  themePreference: resolveThemePreference(user.themePreference ?? DEFAULT_THEME_PREFERENCE),
});

const clearStoredSession = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  // Кэш React Query переживает смену пользователя в той же вкладке, поэтому
  // чистится вместе с токенами — и на логауте, и на невалидном /auth/me.
  getQueryClient().clear();
};

const needsOnboarding = (user: User, pathname: string): boolean =>
  user.onboardingCompletedAt == null &&
  !pathname.startsWith('/onboarding') &&
  !pathname.startsWith('/login') &&
  !pathname.startsWith('/register') &&
  !pathname.startsWith('/invite/');

/**
 * Single owner of the signed-in user. Every `useAuth()` call used to hold its
 * own copy of this state and issue its own `/auth/me` request; now the profile
 * is loaded once per access token and shared through context.
 */
export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Token the current profile was loaded for. Re-checked on navigation so a
  // login (new token) or logout (token removed) in this tab is picked up
  // without a full reload.
  const loadedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      if (loadedTokenRef.current !== null) {
        loadedTokenRef.current = null;
        setUser(null);
      }
      setLoading(false);
      return;
    }
    if (token === loadedTokenRef.current) {
      return;
    }
    loadedTokenRef.current = token;

    apiClient
      .get('/auth/me')
      .then(response => {
        const nextUser = normalizeUser(response.data as User);
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
        notifyUserFormatChanged();
        if (readLocaleFromCookie() == null) {
          syncLocaleFromUser(nextUser);
        }
        window.dispatchEvent(new CustomEvent(THEME_STORAGE_EVENT));
        if (needsOnboarding(nextUser, window.location.pathname)) {
          router.push('/onboarding');
        }
      })
      .catch(() => {
        // Token invalid, clear storage
        loadedTokenRef.current = null;
        clearStoredSession();
        router.push('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router, pathname]);

  const logout = useCallback(async () => {
    // No try/finally: React Compiler skips components containing one.
    await apiClient.post('/auth/logout').catch((error: unknown) => {
      console.error('Logout error:', error);
    });
    loadedTokenRef.current = null;
    clearStoredSession();
    setUser(null);
    router.push('/login');
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, logout, setUser }),
    [user, loading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
