'use client';

import {
  THEME_STORAGE_EVENT,
  getStoredThemePreference,
  resolveThemePreference,
} from '@/app/lib/theme-preference';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ThemeProvider } from '@mui/material/styles';
import { useTheme as useNextTheme } from 'next-themes';
import React, { useEffect, useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { IntlayerProviderContent } from 'react-intlayer';
import { type AppLocale, isSupportedLocale, persistLocaleToCookie, readLocaleFromCookie } from '@/app/lib/locale';
import { KeyboardShortcutsProvider } from './components/keyboard-shortcuts-provider';
import { SidePanelProvider } from './components/side-panel';
import { CurrencyDisplayProvider } from './contexts/CurrencyDisplayContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { useAutoTheme } from './hooks/useAutoTheme';
import { useHTMLLanguage } from './hooks/useHTMLLanguage';
import { createAppTheme } from './theme';
import { TourAutoStarter } from './tours/components/TourAutoStarter';

const SIDE_PANEL_PROPS = { defaultWidth: 'md' as const, defaultPosition: 'left' as const, defaultCollapsed: false, persistState: true, storageKey: 'lumio-side-panel' };
const TOASTER_OPTS = { duration: 3000, style: { fontSize: '14px', background: 'var(--card-bg)', color: 'var(--foreground)', border: '1px solid var(--border-color)' } };

function HTMLLanguageSync(): null {
  useHTMLLanguage();
  return null;
}

function ThemePreferenceSync(): null {
  const [themePreference, setThemePreference] = useState(getStoredThemePreference);

  useEffect(() => {
    const syncThemePreference = (): void => {
      setThemePreference(resolveThemePreference(getStoredThemePreference()));
    };
    const handleThemePreferenceEvent = (): void => { syncThemePreference(); };
    window.addEventListener('storage', syncThemePreference);
    window.addEventListener(THEME_STORAGE_EVENT, handleThemePreferenceEvent);
    return (): void => {
      window.removeEventListener('storage', syncThemePreference);
      window.removeEventListener(THEME_STORAGE_EVENT, handleThemePreferenceEvent);
    };
  }, []);

  useAutoTheme(themePreference);
  return null;
}

function WorkspaceScopedProviders({ children, mounted }: { children: React.ReactNode; mounted: boolean }): React.JSX.Element {
  const { currentWorkspace } = useWorkspace();
  return (
    <React.Fragment key={currentWorkspace?.id ?? 'no-workspace'}>
      <CurrencyDisplayProvider>
        <NotificationProvider>
          <SidePanelProvider {...SIDE_PANEL_PROPS}>
            <KeyboardShortcutsProvider>
              {mounted ? <Toaster position="top-center" toastOptions={TOASTER_OPTS} /> : null}
              {children}
            </KeyboardShortcutsProvider>
          </SidePanelProvider>
        </NotificationProvider>
      </CurrencyDisplayProvider>
    </React.Fragment>
  );
}

export function Providers({ children, initialLocale }: { children: React.ReactNode; initialLocale: AppLocale }): React.JSX.Element {
  const { resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<AppLocale>(() => readLocaleFromCookie() ?? initialLocale);
  const paletteMode = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
  const muiTheme = useMemo(() => createAppTheme(paletteMode), [paletteMode]);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setLocale(readLocaleFromCookie() ?? initialLocale); }, [initialLocale]);
  useEffect(() => { persistLocaleToCookie(locale); }, [locale]);
  const handleLocaleChange = (nextLocale: string): void => {
    if (!isSupportedLocale(nextLocale)) return;
    persistLocaleToCookie(nextLocale);
    setLocale(nextLocale);
  };
  return (
    <IntlayerProviderContent locale={locale} setLocale={handleLocaleChange}>
      <HTMLLanguageSync />
      <ThemePreferenceSync />
      <TourAutoStarter />
      <ThemeProvider theme={muiTheme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <WorkspaceProvider>
            <WorkspaceScopedProviders mounted={mounted}>{children}</WorkspaceScopedProviders>
          </WorkspaceProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </IntlayerProviderContent>
  );
}
