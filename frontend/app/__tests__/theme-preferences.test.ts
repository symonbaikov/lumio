import { createAppTheme } from '@/app/theme';
import { describe, expect, it } from 'vitest';

describe('createAppTheme preferences', () => {
  it('leaves tables untouched by default', () => {
    const theme = createAppTheme('light');

    expect(theme.components?.MuiTableCell).toBeUndefined();
  });

  it('tightens table cells in compact density', () => {
    const theme = createAppTheme('light', { density: 'compact' });
    const root = theme.components?.MuiTableCell?.styleOverrides?.root as Record<string, unknown>;

    expect(root).toMatchObject({ paddingTop: 6, paddingBottom: 6, fontSize: '13px' });
  });

  it('keeps the existing component overrides when adding preferences', () => {
    const base = createAppTheme('light');
    const compact = createAppTheme('light', { density: 'compact' });

    // Density must extend the shared overrides, not replace them.
    expect(compact.components?.MuiTableContainer).toEqual(base.components?.MuiTableContainer);
    expect(compact.components?.MuiTab).toEqual(base.components?.MuiTab);
  });

  it('does not try to carry reduced motion in the theme', () => {
    // The app renders no <CssBaseline />, so a theme override would be dead
    // configuration; motion is handled by a document attribute instead.
    const theme = createAppTheme('dark', { reduceMotion: true });

    expect(theme.components?.MuiCssBaseline).toBeUndefined();
  });
});
