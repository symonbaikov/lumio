'use client';

import apiClient from '@/app/lib/api';
import { readLocaleFromCookie, syncLocaleFromUser } from '@/app/lib/locale';
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_EVENT,
  type ThemePreference,
  resolveThemePreference,
} from '@/app/lib/theme-preference';
import type { DateFormatPreference } from '@/app/lib/user-format';
import { notifyUserFormatChanged } from '@/app/lib/user-format-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

const normalizeUser = (user: User): User => ({
  ...user,
  themePreference: resolveThemePreference(user.themePreference ?? DEFAULT_THEME_PREFERENCE),
});

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Fetch user profile
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

          const currentPath = window.location.pathname;
          const isOnboardingRoute = currentPath.startsWith('/onboarding');
          const isAuthRoute =
            currentPath.startsWith('/login') || currentPath.startsWith('/register');
          const isInviteRoute = currentPath.startsWith('/invite/');

          if (
            nextUser?.onboardingCompletedAt == null &&
            !isOnboardingRoute &&
            !isAuthRoute &&
            !isInviteRoute
          ) {
            router.push('/onboarding');
          }
        })
        .catch(() => {
          // Token invalid, clear storage
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          router.push('/login');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [router]);

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
      router.push('/login');
    }
  };

  return { user, loading, logout, setUser };
}
