// lib/theme-tokens.ts
// JS/TS token constants — mirrors abstracts/_variables.scss and _variables-dark.scss.
// Use these wherever CSS custom properties (var(--lumio-*)) were used in JS/TSX.
//
// For dark-mode-aware colors in client components:
//   import { useTheme } from 'next-themes';
//   import { tokens } from '@/lib/theme-tokens';
//   const { resolvedTheme } = useTheme();
//   const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;

export const tokens = {
  // ── Static (same in both themes) ───────────────────────────
  radius: {
    none: '0',
    xs: '6px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '999px',
  },
  space: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
  },
  font: {
    size: {
      xs: '12px',
      sm: '13px',
      base: '14px',
      md: '15px',
      lg: '16px',
      xl: '18px',
    },
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
    },
  },
  zIndex: {
    dropdown: 1000,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
  },

  // ── Light theme colors (default) ────────────────────────────
  color: {
    primary: '#168118',
    // Background of a filled control carrying white text. Same as `primary`
    // here; deliberately different in `dark` below — see the note there.
    primaryFill: '#168118',
    primaryFillHover: '#157811',
    primaryHover: '#157811',
    primaryDark: '#036704',
    forest: '#0e2a10',
    lime: '#9fe870',
    primary50: '#edf7ed',
    primary100: '#d4edd4',
    primary200: '#a8d5a8',
    primaryContrast: '#ffffff',
    ink900: '#0b0b10',
    ink800: '#171720',
    ink700: '#2a2a35',
    ink600: '#4a4a58',
    ink500: '#6b6b78',
    ink400: '#8e8e9a',
    ink300: '#b7b7c0',
    ink200: '#dcdce1',
    ink150: '#ececef',
    ink100: '#f2f2f4',
    ink50: '#f8f8f9',
    white: '#ffffff',
    success: '#10b981',
    successSoft: '#ecfdf5',
    warning: '#f59e0b',
    warningSoft: '#fffbeb',
    danger: '#e11d48',
    dangerSoft: '#fff1f2',
    info: '#0ea5e9',
    infoSoft: '#f0f9ff',
    bg: '#f7f8f7',
    surface: '#ffffff',
    surfaceMuted: '#f2f2f4',
    surfaceWarning: '#fffbeb',
    surfaceError: '#fff1f2',
    textPrimary: '#0b0b10',
    textSecondary: '#4a4a58',
    border: '#ececef',
    borderStrong: '#dcdce1',
    catFood: '#f59e0b',
    catTransport: '#0ea5e9',
    catHousing: '#8b5cf6',
    catShopping: '#ec4899',
    catIncome: '#10b981',
    catOther: '#64748b',
  },

  shadow: {
    xs: '0 1px 0 0 rgba(12, 12, 20, 0.04)',
    sm: '0 1px 2px 0 rgba(12, 12, 20, 0.05), 0 1px 0 0 rgba(12, 12, 20, 0.02)',
    md: '0 4px 16px -4px rgba(12, 12, 20, 0.08), 0 1px 2px rgba(12, 12, 20, 0.04)',
    lg: '0 20px 40px -12px rgba(12, 12, 20, 0.12), 0 2px 6px rgba(12, 12, 20, 0.04)',
  },

  // ── Dark theme colors ───────────────────────────────────────
  dark: {
    color: {
      primary: '#5cc462',
      // Not `primary`: white text on #5cc462 is 2.2:1, well under the 4.5:1
      // minimum. Filled controls (buttons, badges) use this instead — same
      // brand green as the light theme, 5.2:1 with white text. Mirrors
      // --primary-fill in styles/themes/_globals.scss; keep both in step.
      primaryFill: '#168118',
      primaryFillHover: '#1c9c22',
      primaryHover: '#3e9c35',
      primaryDark: '#168118',
      forest: '#0e2a10',
      lime: '#9fe870',
      primary50: 'rgba(62, 156, 53, 0.1)',
      primary100: 'rgba(62, 156, 53, 0.2)',
      primary200: 'rgba(62, 156, 53, 0.35)',
      primaryContrast: '#ffffff',
      ink900: '#f0f0f5',
      ink800: '#d4d4de',
      ink700: '#a8a8b8',
      ink600: '#7c7c8e',
      ink500: '#5c5c6e',
      ink400: '#3e4240',
      ink300: '#2c302d',
      ink200: '#222622',
      ink150: '#1e221f',
      ink100: '#181c19',
      ink50: '#121513',
      white: '#1e221f',
      success: '#34d399',
      successSoft: 'rgba(52, 211, 153, 0.12)',
      warning: '#fbbf24',
      warningSoft: 'rgba(251, 191, 36, 0.12)',
      danger: '#fb7185',
      dangerSoft: 'rgba(251, 113, 133, 0.12)',
      info: '#38bdf8',
      infoSoft: 'rgba(56, 189, 248, 0.12)',
      bg: '#0f1210',
      surface: '#161b17',
      surfaceMuted: '#1c211d',
      surfaceWarning: 'rgba(251, 191, 36, 0.12)',
      surfaceError: 'rgba(251, 113, 133, 0.12)',
      textPrimary: '#e8e8f0',
      textSecondary: '#a0a0b4',
      border: '#252b26',
      borderStrong: '#333b34',
      catFood: '#f59e0b',
      catTransport: '#38bdf8',
      catHousing: '#a78bfa',
      catShopping: '#f472b6',
      catIncome: '#34d399',
      catOther: '#94a3b8',
    },
    shadow: {
      xs: '0 1px 0 0 rgba(0, 0, 0, 0.2)',
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 16px -4px rgba(0, 0, 0, 0.4)',
      lg: '0 20px 40px -12px rgba(0, 0, 0, 0.5)',
    },
  },
} as const;

export type ThemeColor = keyof typeof tokens.color;
