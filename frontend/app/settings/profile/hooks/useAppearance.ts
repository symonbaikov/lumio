'use client';

import type { User } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import {
  THEME_STORAGE_EVENT,
  type ThemePreference,
  resolveThemePreference,
} from '@/app/lib/theme-preference';
import { notifyUserFormatChanged } from '@/app/lib/user-format-store';
import { getApiErrorMessage } from '@/app/settings/profile/profileHelpers';
import type { UiDensity } from '@/app/theme';
import { useEffect, useState } from 'react';

export type UseAppearanceMessages = {
  successFallback: string;
  errorFallback: string;
};

export type UseAppearanceReturn = {
  themePreference: ThemePreference;
  appearanceMessage: string | null;
  appearanceError: string | null;
  appearanceLoading: boolean;
  handleThemePreferenceChange: (nextTheme: ThemePreference) => Promise<void>;
  density: UiDensity;
  setDensity: (value: UiDensity) => void;
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
};

type AppearancePatch = { uiDensity?: UiDensity; reduceMotion?: boolean };

export function useAppearance(
  user: User | null | undefined,
  setUser: (user: User) => void,
  messages: UseAppearanceMessages,
): UseAppearanceReturn {
  const [themePreference, setThemePreference] = useState<ThemePreference>('auto');
  const [density, setDensityState] = useState<UiDensity>('comfortable');
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [appearanceMessage, setAppearanceMessage] = useState<string | null>(null);
  const [appearanceError, setAppearanceError] = useState<string | null>(null);
  const [appearanceLoading, setAppearanceLoading] = useState(false);

  useEffect(() => {
    setThemePreference(resolveThemePreference(user?.themePreference));
  }, [user?.themePreference]);

  useEffect(() => {
    setDensityState(user?.uiDensity === 'compact' ? 'compact' : 'comfortable');
    setReduceMotionState(Boolean(user?.reduceMotion));
  }, [user?.uiDensity, user?.reduceMotion]);

  /** Saves one appearance flag and re-themes the app straight away. */
  const savePatch = async (patch: AppearancePatch) => {
    setAppearanceMessage(null);
    setAppearanceError(null);

    try {
      setAppearanceLoading(true);
      const response = await apiClient.patch('/users/me/preferences', patch);
      const nextUser = { ...(user || {}), ...(response.data?.user || {}), ...patch };

      setUser(nextUser as User);
      localStorage.setItem('user', JSON.stringify(nextUser));
      notifyUserFormatChanged();
      setAppearanceMessage(response.data?.message || messages.successFallback);
    } catch (error: unknown) {
      setAppearanceError(getApiErrorMessage(error, messages.errorFallback));
    } finally {
      setAppearanceLoading(false);
    }
  };

  const setDensity = (value: UiDensity) => {
    setDensityState(value);
    void savePatch({ uiDensity: value });
  };

  const setReduceMotion = (value: boolean) => {
    setReduceMotionState(value);
    void savePatch({ reduceMotion: value });
  };

  const handleThemePreferenceChange = async (nextThemePreference: ThemePreference) => {
    setAppearanceMessage(null);
    setAppearanceError(null);

    try {
      setAppearanceLoading(true);
      const response = await apiClient.patch('/users/me/preferences', {
        themePreference: nextThemePreference,
      });

      const responseUser = response.data?.user;
      const nextUser = responseUser
        ? { ...(user || {}), ...responseUser, themePreference: nextThemePreference }
        : user
          ? { ...user, themePreference: nextThemePreference }
          : null;

      setThemePreference(nextThemePreference);

      if (nextUser) {
        setUser(nextUser as User);
        localStorage.setItem('user', JSON.stringify(nextUser));
        window.dispatchEvent(
          new CustomEvent(THEME_STORAGE_EVENT, {
            detail: { themePreference: nextThemePreference },
          }),
        );
      }

      setAppearanceMessage(response.data?.message || messages.successFallback);
    } catch (error: unknown) {
      setAppearanceError(getApiErrorMessage(error, messages.errorFallback));
    } finally {
      setAppearanceLoading(false);
    }
  };

  return {
    themePreference,
    appearanceMessage,
    appearanceError,
    appearanceLoading,
    handleThemePreferenceChange,
    density,
    setDensity,
    reduceMotion,
    setReduceMotion,
  };
}
