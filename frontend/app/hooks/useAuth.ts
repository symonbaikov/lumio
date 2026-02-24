'use client';

import apiClient from '@/app/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
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
  lastLogin?: string | null;
  avatarUrl?: string | null;
  onboardingCompletedAt?: string | null;
}

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
          const nextUser = response.data as User;
          setUser(nextUser);

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
