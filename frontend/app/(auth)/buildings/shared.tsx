'use client';

import { motion } from 'framer-motion';

export interface BuildingProps {
  delay: number;
  duration: number;
  w?: number;
  h?: number;
  left?: string;
  right?: string;
}

// Deterministic pseudo-random value in [0, 1) using only integer operations.
export const stableWindowNoise = (seed: number): number => {
  let value = seed | 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  value ^= value >>> 16;

  return (value >>> 0) / 0x100000000;
};

export const glassStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(4px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
};

type WindowGridProps = { cols?: number; rows?: number; density?: number };

export function WindowGrid({
  cols = 3,
  rows = 5,
  density: Density = 0.4,
}: WindowGridProps): React.JSX.Element {
  const GRID_STYLE: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gap: '8px',
    padding: '12px',
    opacity: 0.3,
  };

  return (
    <div style={GRID_STYLE}>
      {[...Array(cols * rows).keys()].map(i => (
        <div
          key={i}
          style={{
            background: 'rgba(255, 255, 255, 0.28)',
          }}
        />
      ))}
    </div>
  );
}

type BlockProps = { w: number; h: number; children?: React.ReactNode; style?: React.CSSProperties };

export function Block({ w, h, children, style = {} }: BlockProps): React.JSX.Element {
  return (
    <div style={{ width: w, height: h, borderBottom: 'none', ...glassStyle, ...style }}>
      {children}
    </div>
  );
}

export { motion };
