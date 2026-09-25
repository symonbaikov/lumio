import type { SxProps, Theme } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { wordmarkSx } from './welcome-tutorial.styles';

const LIME = '#9fe870';
const FOREST = '#0e2a10';

// The login screen's forest gradient, lit from the corner the screenshots sit in.
const INTRO_BACKGROUND = [
  'radial-gradient(900px 480px at 88% 12%, rgba(159, 232, 112, 0.18), transparent 60%)',
  'radial-gradient(760px 520px at 0% 100%, rgba(22, 129, 24, 0.42), transparent 62%)',
  'linear-gradient(180deg, #021a0e 0%, #0a3d20 100%)',
].join(', ');

const float = keyframes`
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -8px; }
`;

export const introSx = {
  position: 'relative',
  flex: 1,
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.95fr) minmax(0, 1.05fr)' },
  alignItems: 'center',
  gap: { xs: 4, md: 6 },
  minHeight: { md: 600 },
  p: { xs: 3, sm: 5, md: 7 },
  overflowY: 'auto',
  overflowX: 'hidden',
  color: '#fff',
  background: INTRO_BACKGROUND,
} satisfies SxProps<Theme>;

export const introCloseSx = {
  position: 'absolute',
  top: 12,
  insetInlineEnd: 12,
  zIndex: 2,
  color: 'rgba(255, 255, 255, 0.72)',
  '&:hover': { color: '#fff', bgcolor: 'rgba(255, 255, 255, 0.08)' },
} satisfies SxProps<Theme>;

export const introWordmarkSx = { ...wordmarkSx, color: '#fff' } as const;

export const introEyebrowSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 1,
  mt: { xs: 3, md: 5 },
  px: 1.5,
  py: 0.5,
  borderRadius: 999,
  bgcolor: 'rgba(159, 232, 112, 0.14)',
  color: LIME,
  fontSize: 13,
  fontWeight: 600,
} satisfies SxProps<Theme>;

export const introTitleSx = {
  mt: 2,
  fontSize: { xs: 30, md: 42 },
  fontWeight: 700,
  lineHeight: 1.1,
  letterSpacing: '-0.02em',
} satisfies SxProps<Theme>;

export const introSubtitleSx = {
  mt: 2,
  maxWidth: 460,
  fontSize: 16,
  lineHeight: 1.6,
  color: 'rgba(255, 255, 255, 0.78)',
} satisfies SxProps<Theme>;

export const introActionsSx = {
  mt: 4,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 1.5,
} satisfies SxProps<Theme>;

export const startButtonSx = {
  px: 3,
  bgcolor: LIME,
  color: FOREST,
  '&:hover': { bgcolor: '#b4f08c' },
} satisfies SxProps<Theme>;

export const skipButtonSx = {
  px: 2.5,
  color: 'rgba(255, 255, 255, 0.88)',
  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
} satisfies SxProps<Theme>;

export const introHintSx = {
  mt: 2,
  fontSize: 13,
  color: 'rgba(255, 255, 255, 0.6)',
} satisfies SxProps<Theme>;

export const collageSx = {
  position: 'relative',
  display: { xs: 'none', sm: 'block' },
  height: { sm: 320, md: 440 },
} satisfies SxProps<Theme>;

const COLLAGE_PLACES = [
  { width: '78%', top: '2%', insetInlineStart: 0, rotate: '-4deg', zIndex: 1 },
  { width: '58%', top: '36%', insetInlineEnd: 0, rotate: '3deg', zIndex: 2 },
  { width: '50%', bottom: 0, insetInlineStart: '10%', rotate: '-1.5deg', zIndex: 3 },
];

export function collageCardSx(index: number): SxProps<Theme> {
  return {
    position: 'absolute',
    aspectRatio: '1.55',
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    boxShadow: '0 30px 60px -20px rgba(0, 0, 0, 0.6)',
    ...COLLAGE_PLACES[index],
    animation: `${float} 7s ease-in-out ${index * -2.3}s infinite`,
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  };
}

export const outroSx = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  // `safe`: when the content is taller than the dialog it starts at the top instead of being cut.
  justifyContent: 'safe center',
  textAlign: 'center',
  px: { xs: 3, md: 6 },
  py: { xs: 4, md: 6 },
} satisfies SxProps<Theme>;

export const outroBadgeSx = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  bgcolor: 'var(--primary-light)',
  color: 'var(--primary)',
  boxShadow: '0 0 0 12px var(--surface-glow)',
} satisfies SxProps<Theme>;

export const outroTitleSx = {
  mt: 3.5,
  fontSize: { xs: 26, md: 34 },
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: 'var(--foreground)',
} satisfies SxProps<Theme>;

export const outroTextSx = {
  mt: 1.5,
  maxWidth: 520,
  fontSize: 16,
  lineHeight: 1.6,
  color: 'var(--muted-foreground)',
} satisfies SxProps<Theme>;

export const outroActionsSx = {
  mt: 3.5,
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 1.5,
} satisfies SxProps<Theme>;

export const hintsSx = {
  mt: 5,
  width: '100%',
  maxWidth: 680,
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
  gap: 1.5,
} satisfies SxProps<Theme>;

export const hintSx = {
  display: 'flex',
  gap: 1.5,
  alignItems: 'flex-start',
  p: 2,
  textAlign: 'start',
  fontSize: 14,
  lineHeight: 1.5,
  color: 'var(--foreground)',
  borderRadius: '14px',
  border: '1px solid var(--border-color)',
  bgcolor: 'var(--background)',
} satisfies SxProps<Theme>;

export const hintIconSx = {
  width: 32,
  height: 32,
  flexShrink: 0,
  borderRadius: '10px',
  display: 'grid',
  placeItems: 'center',
  bgcolor: 'var(--primary-light)',
  color: 'var(--primary)',
} satisfies SxProps<Theme>;
