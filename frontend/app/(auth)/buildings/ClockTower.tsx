'use client';

import React from 'react';
import { tokens } from '@/lib/theme-tokens';
import { Block, BuildingProps, motion, WindowGrid } from './shared';

const FACE_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const HAND_BASE: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: 2,
  background: 'white',
  transformOrigin: 'bottom',
};

function ClockFace({ w }: { w: number }): React.JSX.Element {
  const circleStyle: React.CSSProperties = {
    width: w * 0.5,
    height: w * 0.5,
    borderRadius: tokens.radius.full,
    background: 'rgba(255,255,255,0.15)',
    border: '3px solid rgba(255,255,255,0.3)',
    position: 'relative',
    boxShadow: '0 0 15px rgba(255,255,255,0.1)',
  };
  return (
    <div style={circleStyle}>
      <div
        style={{ ...HAND_BASE, height: '30%', transform: 'translate(-50%, -100%) rotate(45deg)' }}
      />
      <div
        style={{ ...HAND_BASE, height: '40%', transform: 'translate(-50%, -100%) rotate(120deg)' }}
      />
    </div>
  );
}

export function ClockTower({
  delay,
  duration,
  w = 120,
  h = 300,
  ...pos
}: BuildingProps): React.JSX.Element {
  const SPIRE_STYLE: React.CSSProperties = {
    width: 4,
    height: 40,
    background: 'rgba(255,255,255,0.3)',
  };
  const ROOF_STYLE: React.CSSProperties = {
    width: 0,
    height: 0,
    borderLeft: `${w * 0.55}px solid transparent`,
    borderRight: `${w * 0.55}px solid transparent`,
    borderBottom: '60px solid rgba(255,255,255,0.1)',
    marginBottom: '-1px',
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
      <div style={SPIRE_STYLE} />
      <div style={ROOF_STYLE} />
      <Block w={w * 0.9} h={w * 0.9} style={FACE_STYLE}>
        <ClockFace w={w} />
      </Block>
      <Block w={w} h={h}>
        <WindowGrid cols={3} rows={Math.floor(h / 30)} density={0.2} />
      </Block>
    </motion.div>
  );
}
