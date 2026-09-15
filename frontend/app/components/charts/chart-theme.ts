/*
 * Chart design adapted from Aurum by ZProger (https://github.com/ZProger/Aurum).
 * Reimplemented for Lumio; no Aurum source code was copied.
 *
 * Colours are CSS variables written straight into SVG attributes, so the `.dark` theme switch
 * repaints charts without a React re-render.
 */

export const CHART_MARGIN = { top: 8, right: 4, bottom: 0, left: 4 };

export const CHART_TICK = {
  fill: 'var(--muted-foreground)',
  fontSize: 11,
  fontFamily: 'var(--font-dashboard-sans)',
};

/** Bars other than the picked month are dimmed to this opacity. */
export const INACTIVE_BAR_OPACITY = 0.45;

export const LEGEND_STYLE = { fontSize: 12, fontFamily: 'var(--font-dashboard-sans)' };
