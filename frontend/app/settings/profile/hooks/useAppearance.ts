'use client';

import { useEffect, useState } from 'react';
import type { User } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import { DEFAULT_CONTENT_BACKGROUND_DIM, toPresetBackground } from '@/app/lib/content-background';
import {
  resolveThemePreference,
  THEME_STORAGE_EVENT,
  type ThemePreference,
} from '@/app/lib/theme-preference';
import { notifyUserFormatChanged } from '@/app/lib/user-format-store';
import { getApiErrorMessage } from '@/app/settings/profile/profileHelpers';
import type { UiDensity } from '@/app/theme';

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
  contentBackground: string | null;
  contentBackgroundDim: number;
  previewContentBackgroundDim: (value: number) => void;
  saveContentBackgroundDim: (value: number) => void;
  selectPresetBackground: (fileName: string) => void;
  uploadContentBackground: (file: File) => Promise<void>;
  removeContentBackground: () => void;
};

type AppearancePatch = {
  uiDensity?: UiDensity;
  reduceMotion?: boolean;
  contentBackground?: string | null;
  contentBackgroundDim?: number;
};

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

    await (async () => {
      setAppearanceLoading(true);
      const response = await apiClient.patch('/users/me/preferences', patch);
      const nextUser = { ...(user || {}), ...(response.data?.user || {}), ...patch };

      setUser(nextUser as User);
      localStorage.setItem('user', JSON.stringify(nextUser));
      notifyUserFormatChanged();
      setAppearanceMessage(response.data?.message || messages.successFallback);
    })()
      .catch(async (error: unknown) => {
        setAppearanceError(getApiErrorMessage(error, messages.errorFallback));
      })
      .finally(async () => {
        setAppearanceLoading(false);
      });
  };

  const setDensity = (value: UiDensity) => {
    setDensityState(value);
    void savePatch({ uiDensity: value });
  };

  const setReduceMotion = (value: boolean) => {
    setReduceMotionState(value);
    void savePatch({ reduceMotion: value });
  };

  /** Follows the slider without a request; the value is saved on release. */
  const previewContentBackgroundDim = (value: number) => {
    setUser({ ...(user || {}), contentBackgroundDim: value } as User);
  };

  const saveContentBackgroundDim = (value: number) => {
    void savePatch({ contentBackgroundDim: value });
  };

  const selectPresetBackground = (fileName: string) => {
    void savePatch({ contentBackground: toPresetBackground(fileName) });
  };

  const removeContentBackground = () => {
    void savePatch({ contentBackground: null });
  };

  /** Throws on failure, so the card can show the error next to the upload button. */
  const uploadContentBackground = async (file: File) => {
    const formData = new FormData();
    formData.append('background', file);
    const response = await apiClient.post('/users/me/content-background', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const nextUser = {
      ...(user || {}),
      contentBackground: response.data?.contentBackground ?? null,
    } as User;

    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  const handleThemePreferenceChange = async (nextThemePreference: ThemePreference) => {
    setAppearanceMessage(null);
    setAppearanceError(null);

    await (async () => {
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
    })()
      .catch(async (error: unknown) => {
        setAppearanceError(getApiErrorMessage(error, messages.errorFallback));
      })
      .finally(async () => {
        setAppearanceLoading(false);
      });
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
    contentBackground: user?.contentBackground ?? null,
    contentBackgroundDim: user?.contentBackgroundDim ?? DEFAULT_CONTENT_BACKGROUND_DIM,
    previewContentBackgroundDim,
    saveContentBackgroundDim,
    selectPresetBackground,
    uploadContentBackground,
    removeContentBackground,
  };
}
