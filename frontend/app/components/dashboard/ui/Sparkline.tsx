import type React from 'react';

export interface SparklineProps {
  points: number[];
  color?: string;
  fill?: boolean;
  h?: number;
  w?: number;
}

/**
 * Tiny inline SVG line used inside KPI cards. Renders nothing for fewer than two
 * points. Defaults to `currentColor` so the theme decides the hue via CSS and
 * server and client markup stay identical.
 */
export function Sparkline({
  points,
  color = 'currentColor',
  fill = true,
  h = 38,
  w = 120,
}: SparklineProps): React.JSX.Element | null {
  if (points.length < 2) {
    return null;
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    // eslint-disable-next-line max-params
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / range) * h}`)
    .join(' ');
  const fillD = `${d} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {fill && <path d={fillD} fill={color} opacity="0.08" />}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
