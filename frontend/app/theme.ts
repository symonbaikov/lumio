import { type ThemeOptions, alpha, createTheme } from '@mui/material/styles';
import { getAppSurfaceTokens } from './mantine-theme';

export type ThemeMode = 'light' | 'dark';

const sharedOptions: Pick<ThemeOptions, 'typography' | 'components'> = {
  typography: {
    fontFamily:
      'var(--font-manrope), "Manrope", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 650, fontSize: '2.5rem' },
    h2: { fontWeight: 650, fontSize: '2rem' },
    h3: { fontWeight: 620, fontSize: '1.75rem' },
    h4: { fontWeight: 620, fontSize: '1.5rem' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 999, padding: '8px 18px' },
        contained: {
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
};

const paletteByMode: Record<ThemeMode, ThemeOptions['palette']> = {
  light: {
    mode: 'light',
    primary: {
      main: '#0284c7',
      light: '#38bdf8',
      dark: '#0369a1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#475569',
      light: '#64748b',
      dark: '#334155',
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#4b5563',
    },
    divider: '#d7e2ef',
  },
  dark: {
    mode: 'dark',
    primary: {
      main: '#38bdf8',
      light: '#7dd3fc',
      dark: '#0ea5e9',
      contrastText: '#041019',
    },
    secondary: {
      main: '#93a4bf',
      light: '#c2cfdf',
      dark: '#6b7f9b',
      contrastText: '#081221',
    },
    background: {
      default: '#020617',
      paper: '#0b1220',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
    },
    divider: '#1d2b43',
  },
};

export const createAppTheme = (mode: ThemeMode) => {
  const surfaces = getAppSurfaceTokens(mode);

  return createTheme({
    ...sharedOptions,
    palette: {
      ...paletteByMode[mode],
      action: {
        hover: alpha(surfaces.primary, mode === 'dark' ? 0.12 : 0.08),
      },
    },
  });
};

export const lightTheme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');
