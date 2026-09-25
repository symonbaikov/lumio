import type { SxProps, Theme } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import type { StepperState } from './tutorial-pager';

/** The dialog is labelled by the heading of whichever screen is showing. */
export const TITLE_ID = 'welcome-tutorial-title';

const enter = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
`;

// CSS animations, not JS ones: the app's reduce-motion setting and the OS preference
// both switch CSS animations off already.
export const enterSx = {
  animation: `${enter} 320ms cubic-bezier(0.22, 1, 0.36, 1) both`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
} as const;

export const paperSx = {
  width: { md: 'min(1180px, calc(100vw - 48px))' },
  maxWidth: { md: 'none' },
  // A fixed height: the dialog does not jump from step to step, the body scrolls instead.
  height: { md: 'min(860px, calc(100vh - 48px))' },
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  bgcolor: 'var(--card-bg)',
  backgroundImage: 'none',
} satisfies SxProps<Theme>;

export const wordmarkSx = {
  fontFamily: 'var(--font-manrope), sans-serif',
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: '0.32em',
  textTransform: 'uppercase',
  color: 'var(--foreground)',
  whiteSpace: 'nowrap',
} as const;

export const headerSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  px: { xs: 2, md: 4 },
  py: 1.5,
  borderBottom: '1px solid var(--border-color)',
} satisfies SxProps<Theme>;

export const closeButtonSx = {
  // Logical, not `ml`: the app has no RTL style plugin, and right to left the button
  // has to stay at the far end of the header.
  marginInlineStart: 'auto',
  color: 'var(--muted-foreground)',
} satisfies SxProps<Theme>;

/** Headings take programmatic focus when their screen appears; they are not controls. */
export const focusableTitleSx = { '&:focus': { outline: 'none' } } as const;

export const stepperListSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  m: 0,
  p: 0.5,
  listStyle: 'none',
  flex: 1,
  minWidth: 0,
  overflowX: 'auto',
  scrollbarWidth: 'none',
} satisfies SxProps<Theme>;

const STEP_COLOR: Record<StepperState, string> = {
  active: 'var(--primary)',
  done: 'var(--primary)',
  todo: 'var(--muted-foreground)',
};

/** Same pill as the active sidebar item, so the steps read as the sidebar they explain. */
export function stepButtonSx(state: StepperState): SxProps<Theme> {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.75,
    height: 34,
    minWidth: 34,
    px: state === 'active' ? 1.5 : 0,
    justifyContent: 'center',
    border: 0,
    borderRadius: 999,
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    color: STEP_COLOR[state],
    bgcolor: state === 'active' ? 'var(--primary-light)' : 'transparent',
    opacity: state === 'todo' ? 0.72 : 1,
    transition: 'background-color 150ms ease, opacity 150ms ease',
    '&:hover': {
      opacity: 1,
      bgcolor: state === 'active' ? 'var(--primary-light)' : 'var(--muted)',
    },
  };
}

export const footerSx = {
  display: 'flex',
  alignItems: 'center',
  gap: { xs: 1, md: 2 },
  px: { xs: 2, md: 4 },
  py: 1.75,
  borderTop: '1px solid var(--border-color)',
} satisfies SxProps<Theme>;

export const progressSx = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1.5,
  minWidth: 0,
  fontSize: 13,
  color: 'var(--muted-foreground)',
} satisfies SxProps<Theme>;

export const progressTrackSx = {
  display: { xs: 'none', sm: 'block' },
  width: 160,
  height: 4,
  borderRadius: 999,
  overflow: 'hidden',
  bgcolor: 'var(--muted)',
} satisfies SxProps<Theme>;

export function progressBarSx(ratio: number): SxProps<Theme> {
  return {
    height: '100%',
    width: `${ratio * 100}%`,
    bgcolor: 'var(--primary)',
    transition: 'width 240ms ease',
  };
}

export const hideButtonSx = {
  color: 'var(--muted-foreground)',
  fontWeight: 500,
} satisfies SxProps<Theme>;

// Chevrons point the way the pages turn, which is the other way round right-to-left.
export const directionalIconSx = {
  display: 'inline-flex',
  '[dir="rtl"] &': { transform: 'scaleX(-1)' },
} satisfies SxProps<Theme>;
