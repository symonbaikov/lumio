import type { SxProps, Theme } from '@mui/material';

export const bodySx = {
  flex: 1,
  overflowY: 'auto',
  px: { xs: 2, md: 5 },
  pt: { xs: 2.5, md: 3.5 },
  pb: 3,
} satisfies SxProps<Theme>;

export const eyebrowSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 1,
  color: 'var(--primary)',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
} satisfies SxProps<Theme>;

export const taglineSx = {
  mt: 1,
  fontSize: { xs: 22, md: 28 },
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: '-0.01em',
  color: 'var(--foreground)',
} satisfies SxProps<Theme>;

export const descriptionSx = {
  mt: 1,
  maxWidth: 760,
  fontSize: 15,
  lineHeight: 1.6,
  color: 'var(--muted-foreground)',
} satisfies SxProps<Theme>;

export const bentoSx = {
  mt: 3,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.44fr) minmax(0, 1fr)',
  gap: 2,
  '& > :first-of-type': { gridRow: 'span 2' },
} satisfies SxProps<Theme>;

export const pairSx = {
  mt: 3,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 2,
} satisfies SxProps<Theme>;

/** Holds the frame's proportions; the number sits on its corner, outside the screenshot. */
export function frameSlotSx(aspect: number): SxProps<Theme> {
  return { position: 'relative', aspectRatio: String(aspect) };
}

export const frameSx = {
  position: 'absolute',
  inset: 0,
  borderRadius: '14px',
  overflow: 'hidden',
  border: '1px solid var(--border-color)',
  bgcolor: 'var(--background)',
  boxShadow: '0 18px 40px -26px rgba(15, 23, 42, 0.5)',
} satisfies SxProps<Theme>;

export const badgeSx = {
  position: 'absolute',
  top: -9,
  insetInlineStart: -9,
  zIndex: 1,
  width: 24,
  height: 24,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  bgcolor: 'var(--primary-fill)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  boxShadow: '0 0 0 3px var(--card-bg)',
} satisfies SxProps<Theme>;

export function captionsSx(count: number): SxProps<Theme> {
  return {
    mt: 2,
    display: 'grid',
    gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
    gap: 2,
  };
}

export const captionSx = {
  display: 'flex',
  gap: 1.25,
  alignItems: 'flex-start',
} satisfies SxProps<Theme>;

export const captionNumberSx = {
  ...badgeSx,
  position: 'static',
  flexShrink: 0,
  boxShadow: 'none',
} satisfies SxProps<Theme>;

export const captionTitleSx = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--foreground)',
} satisfies SxProps<Theme>;

export const captionTextSx = {
  mt: 0.25,
  fontSize: 13,
  lineHeight: 1.5,
  color: 'var(--muted-foreground)',
} satisfies SxProps<Theme>;

export const scrollerSx = {
  mt: 2.5,
  mx: -2,
  px: 2,
  pb: 1,
  display: 'flex',
  gap: 1.5,
  overflowX: 'auto',
  scrollSnapType: 'x mandatory',
  // Snap to the padding, not to the edge, so the first frame's number stays visible.
  // Not a theme spacing key: sx passes it through as pixels.
  scrollPaddingInline: '16px',
  scrollbarWidth: 'none',
} satisfies SxProps<Theme>;

export const scrollItemSx = { flex: '0 0 86%', scrollSnapAlign: 'start' } satisfies SxProps<Theme>;

export const demoNoteSx = {
  mt: 2.5,
  fontSize: 12,
  color: 'var(--muted-foreground)',
} satisfies SxProps<Theme>;
