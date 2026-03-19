import { type CSSVariablesResolver, type MantineColorsTuple, createTheme } from '@mantine/core';

export type AppThemeMode = 'light' | 'dark';

type AppSurfaceTokens = {
  background: string;
  foreground: string;
  card: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryHover: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  border: string;
  input: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
  glow: string;
  successGlow: string;
};

const ocean: MantineColorsTuple = [
  '#e0f2ff',
  '#b8e4ff',
  '#89d2ff',
  '#5abfff',
  '#38bdf8',
  '#0ea5e9',
  '#0284c7',
  '#0369a1',
  '#075985',
  '#0c4a6e',
];

const slate: MantineColorsTuple = [
  '#f8fafc',
  '#f1f5f9',
  '#e2e8f0',
  '#cbd5e1',
  '#94a3b8',
  '#64748b',
  '#475569',
  '#334155',
  '#1e293b',
  '#0f172a',
];

const emerald: MantineColorsTuple = [
  '#ecfdf5',
  '#d1fae5',
  '#a7f3d0',
  '#6ee7b7',
  '#34d399',
  '#22c55e',
  '#16a34a',
  '#15803d',
  '#166534',
  '#14532d',
];

const TOKENS: Record<AppThemeMode, AppSurfaceTokens> = {
  light: {
    background: '#ffffff',
    foreground: '#0f172a',
    card: '#ffffff',
    muted: '#edf3fb',
    mutedForeground: '#4b5563',
    primary: '#0284c7',
    primaryHover: '#0369a1',
    primaryForeground: '#ffffff',
    secondary: '#475569',
    secondaryForeground: '#ffffff',
    border: '#d7e2ef',
    input: '#c8d7e7',
    ring: '#38bdf8',
    destructive: '#dc2626',
    destructiveForeground: '#ffffff',
    glow: 'rgba(2, 132, 199, 0.14)',
    successGlow: 'rgba(34, 197, 94, 0.12)',
  },
  dark: {
    background: '#020617',
    foreground: '#e2e8f0',
    card: '#0b1220',
    muted: '#111a2e',
    mutedForeground: '#94a3b8',
    primary: '#38bdf8',
    primaryHover: '#0ea5e9',
    primaryForeground: '#041019',
    secondary: '#93a4bf',
    secondaryForeground: '#081221',
    border: '#1d2b43',
    input: '#1a2a43',
    ring: '#38bdf8',
    destructive: '#ef4444',
    destructiveForeground: '#11090a',
    glow: 'rgba(56, 189, 248, 0.24)',
    successGlow: 'rgba(34, 197, 94, 0.2)',
  },
};

export const getAppSurfaceTokens = (mode: AppThemeMode) => TOKENS[mode];

export const mantineTheme = createTheme({
  primaryColor: 'ocean',
  primaryShade: { light: 6, dark: 4 },
  defaultRadius: 'md',
  cursorType: 'pointer',
  fontFamily:
    'var(--font-manrope), "Manrope", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace:
    'var(--font-geist-mono), "Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
  headings: {
    fontFamily:
      'var(--font-manrope), "Manrope", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  colors: {
    ocean,
    slate,
    emerald,
  },
});

export const mantineCssVariablesResolver: CSSVariablesResolver = () => {
  const light = getAppSurfaceTokens('light');
  const dark = getAppSurfaceTokens('dark');

  return {
    variables: {
      '--radius': '0.5rem',
      '--radius-sm': '0.5rem',
      '--radius-md': '0.5rem',
      '--radius-lg': '0.5rem',
      '--radius-xl': '0.5rem',
      '--radius-2xl': '0.5rem',
      '--radius-3xl': '0.5rem',
      '--radius-full': '9999px',
      '--global-nav-height': '104px',
    },
    light: {
      '--background': light.background,
      '--foreground': light.foreground,
      '--primary': light.primary,
      '--primary-hover': light.primaryHover,
      '--primary-foreground': light.primaryForeground,
      '--secondary': light.secondary,
      '--secondary-foreground': light.secondaryForeground,
      '--muted': light.muted,
      '--muted-foreground': light.mutedForeground,
      '--card-bg': light.card,
      '--card-foreground': light.foreground,
      '--border-color': light.border,
      '--input': light.input,
      '--ring': light.ring,
      '--destructive': light.destructive,
      '--destructive-foreground': light.destructiveForeground,
      '--surface-glow': light.glow,
      '--surface-success-glow': light.successGlow,
    },
    dark: {
      '--background': dark.background,
      '--foreground': dark.foreground,
      '--primary': dark.primary,
      '--primary-hover': dark.primaryHover,
      '--primary-foreground': dark.primaryForeground,
      '--secondary': dark.secondary,
      '--secondary-foreground': dark.secondaryForeground,
      '--muted': dark.muted,
      '--muted-foreground': dark.mutedForeground,
      '--card-bg': dark.card,
      '--card-foreground': dark.foreground,
      '--border-color': dark.border,
      '--input': dark.input,
      '--ring': dark.ring,
      '--destructive': dark.destructive,
      '--destructive-foreground': dark.destructiveForeground,
      '--surface-glow': dark.glow,
      '--surface-success-glow': dark.successGlow,
    },
  };
};
