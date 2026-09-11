'use client';

import React from 'react';
import { tokens } from '@/lib/theme-tokens';
import { Block, BuildingProps, motion, stableWindowNoise, WindowGrid } from './shared';

function GothicSpire(): React.JSX.Element {
  const NEEDLE_STYLE: React.CSSProperties = {
    width: 2,
    height: 30,
    background: 'rgba(255,255,255,0.4)',
  };
  const TRIANGLE_STYLE: React.CSSProperties = {
    width: 0,
    height: 0,
    borderLeft: '15px solid transparent',
    borderRight: '15px solid transparent',
    borderBottom: '50px solid rgba(255,255,255,0.1)',
    marginBottom: '-1px',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={NEEDLE_STYLE} />
      <div style={TRIANGLE_STYLE} />
      <Block w={30} h={60} style={{ borderBottom: 'none' }} />
    </div>
  );
}

function GothicRoseWindow(): React.JSX.Element {
  const PEDIMENT: React.CSSProperties = {
    width: 0,
    height: 0,
    borderLeft: '30px solid transparent',
    borderRight: '30px solid transparent',
    borderBottom: '40px solid rgba(255,255,255,0.15)',
    marginBottom: '-1px',
  };
  const WINDOW_STYLE: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: tokens.radius.full,
    background: 'rgba(255,255,255,0.2)',
    border: '2px solid rgba(255,255,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: -10 }}
    >
      <div style={PEDIMENT} />
      <Block w={60} h={80} style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
        <div style={WINDOW_STYLE}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: tokens.radius.full,
              border: '1px solid rgba(255,255,255,0.4)',
            }}
          />
        </div>
      </Block>
    </div>
  );
}

function GothicArches({ w, h }: { w: number; h: number }): React.JSX.Element {
  const GRID_STYLE: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    padding: '0 20px',
    opacity: 0.4,
  };
  return (
    <Block w={w} h={h} style={{ paddingTop: 20 }}>
      <div style={GRID_STYLE}>
        {[...Array(6).keys()].map(i => {
          const windowKey = `window-${i}`;
          const isLit = stableWindowNoise(1000 + i) < 0.7;
          return (
            <div
              key={windowKey}
              style={{
                height: 40,
                background: isLit ? 'white' : 'transparent',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
              }}
            />
          );
        })}
      </div>
      <WindowGrid cols={5} rows={Math.floor((h - 100) / 25)} density={0.3} />
    </Block>
  );
}

export function GothicBuilding({
  delay,
  duration,
  w = 160,
  h = 320,
  ...pos
}: BuildingProps): React.JSX.Element {
  const HEADER_STYLE: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: w,
  };
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        bottom: 0,
        ...pos,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={HEADER_STYLE}>
        <GothicSpire />
        <GothicRoseWindow />
        <GothicSpire />
      </div>
      <GothicArches w={w} h={h} />
    </motion.div>
  );
}
