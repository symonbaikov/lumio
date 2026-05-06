import { type ThemeOptions, alpha, createTheme } from '@mui/material/styles';
import { tokens } from '@/lib/theme-tokens';

export type ThemeMode = 'light' | 'dark';

type AppSurfaceTokens = {
  primary: string;
};

const SURFACE_TOKENS: Record<ThemeMode, AppSurfaceTokens> = {
  light: { primary: '#168118' },
  dark: { primary: '#5cc462' },
};

const getSharedOptions = (mode: ThemeMode): Pick<ThemeOptions, 'shape' | 'typography' | 'components'> => {
  const c = mode === 'dark' ? tokens.dark.color : tokens.color;
  return {
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      'var(--font-geist), "Geist", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    h1: { fontWeight: 650, fontSize: '2.5rem', letterSpacing: '-0.02em' },
    h2: { fontWeight: 650, fontSize: '2rem', letterSpacing: '-0.02em' },
    h3: { fontWeight: 620, fontSize: '1.75rem', letterSpacing: '-0.015em' },
    h4: { fontWeight: 620, fontSize: '1.5rem', letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.md,
          padding: '6px 14px',
          height: 36,
          fontSize: '13px',
          fontWeight: 500,
          letterSpacing: '-0.005em',
          whiteSpace: 'nowrap',
          transition: 'background-color .12s, border-color .12s, color .12s, transform .06s',
          '&:active': { transform: 'translateY(1px)' },
        },
        contained: {
          boxShadow: '0 1px 0 0 rgba(12, 12, 20, 0.04)',
          '&:hover': {
            boxShadow: '0 1px 0 0 rgba(12, 12, 20, 0.04)',
          },
        },
        containedPrimary: ({ theme }: { theme: import('@mui/material/styles').Theme }) => ({
          '&:hover': {
            backgroundColor: theme.palette.primary.main,
          },
        }),
        outlined: {
          boxShadow: '0 1px 0 0 rgba(12, 12, 20, 0.04)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.sm,
          '&:hover': { backgroundColor: c.ink100 },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          padding: 0,
          '& .MuiSvgIcon-root': {
            fontSize: 20,
          },
          '&.MuiCheckbox-sizeSmall .MuiSvgIcon-root': {
            fontSize: 16,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.lg,
          boxShadow: '0 1px 0 0 rgba(12, 12, 20, 0.04)',
          backgroundImage: 'none',
          border: `1px solid ${c.ink150}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: tokens.radius.lg },
        elevation1: { boxShadow: '0 1px 2px 0 rgba(12, 12, 20, 0.05)' },
        elevation2: { boxShadow: '0 4px 16px -4px rgba(12, 12, 20, 0.08)' },
        elevation3: { boxShadow: '0 20px 40px -12px rgba(12, 12, 20, 0.12)' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.radius.xl,
          boxShadow: '0 30px 80px -20px rgba(15, 23, 42, 0.35), 0 8px 16px -4px rgba(15, 23, 42, 0.1)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.md,
          height: 36,
          fontSize: '13px',
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            boxShadow: `0 0 0 3px ${c.primary50}`,
          },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: { root: { borderRadius: tokens.radius.md } },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.full,
          height: 22,
          fontSize: '11.5px',
          fontWeight: 500,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.md,
          fontSize: '13px',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.radius.md,
          boxShadow: '0 4px 16px -4px rgba(12, 12, 20, 0.08), 0 1px 2px rgba(12, 12, 20, 0.04)',
          border: `1px solid ${c.ink150}`,
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.radius.md,
          boxShadow: '0 4px 16px -4px rgba(12, 12, 20, 0.08)',
          border: `1px solid ${c.ink150}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: tokens.radius.sm,
          fontSize: '12px',
          fontWeight: 500,
          padding: '5px 10px',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: { root: { borderRadius: tokens.radius.lg } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: '13px',
          fontWeight: 500,
          textTransform: 'none',
          minHeight: 44,
        },
      },
    },
    // Avatar, Switch, CircularProgress intentionally NOT overridden (stay round)
  },
  };
};

const paletteByMode: Record<ThemeMode, ThemeOptions['palette']> = {
  light: {
    mode: 'light',
    primary: {
      main: '#168118',
      light: '#3e9c35',
      dark: '#036704',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4a4a58',
      light: '#6b6b78',
      dark: '#2a2a35',
      contrastText: '#ffffff',
    },
    error: {
      main: '#e11d48',
      light: '#fb7185',
      dark: '#be123c',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    info: {
      main: '#0ea5e9',
      light: '#38bdf8',
      dark: '#0284c7',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8f8f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#0b0b10',
      secondary: '#4a4a58',
    },
    divider: '#ececef',
  },
  dark: {
    mode: 'dark',
    primary: {
      main: '#5cc462',
      light: '#7dd687',
      dark: '#168118',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#252b26',
      light: '#333b34',
      dark: '#1c211d',
      contrastText: '#e8e8f0',
    },
    error: {
      main: '#fb7185',
      light: '#fda4af',
      dark: '#e11d48',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#fbbf24',
      light: '#fcd34d',
      dark: '#f59e0b',
      contrastText: '#0b0b10',
    },
    success: {
      main: '#34d399',
      light: '#6ee7b7',
      dark: '#10b981',
      contrastText: '#0b0b10',
    },
    info: {
      main: '#38bdf8',
      light: '#7dd3fc',
      dark: '#0ea5e9',
      contrastText: '#0b0b10',
    },
    background: {
      default: '#0f1210',
      paper: '#161b17',
    },
    text: {
      primary: '#e8e8f0',
      secondary: '#a0a0b4',
    },
    divider: '#252b26',
  },
};

export const createAppTheme = (mode: ThemeMode) => {
  const surfaces = SURFACE_TOKENS[mode];

  return createTheme({
    ...getSharedOptions(mode),
    palette: {
      ...paletteByMode[mode],
      action: {
        hover: alpha(surfaces.primary, mode === 'dark' ? 0.12 : 0.06),
        selected: alpha(surfaces.primary, mode === 'dark' ? 0.16 : 0.08),
      },
    },
  });
};

export const lightTheme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');
