'use client';

import React from 'react';
import { Block, BuildingProps, motion, WindowGrid } from './shared';

export function SteppedSkyscraper({
  delay,
  duration,
  w = 140,
  h = 350,
  ...pos
}: BuildingProps): React.JSX.Element {
  const ANTENNA_STYLE: React.CSSProperties = {
    width: 2,
    height: 60,
    background: 'rgba(255,255,255,0.5)',
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
      <div style={ANTENNA_STYLE} />
      <Block w={w * 0.4} h={50}>
        <WindowGrid cols={2} rows={2} />
      </Block>
      <Block w={w * 0.7} h={80}>
        <WindowGrid cols={4} rows={3} />
      </Block>
      <Block w={w} h={h}>
        <WindowGrid cols={6} rows={Math.floor(h / 30)} />
      </Block>
    </motion.div>
  );
}

export function DomeBuilding({
  delay,
  duration,
  w = 180,
  h = 180,
  ...pos
}: BuildingProps): React.JSX.Element {
  const STATUE_STYLE: React.CSSProperties = {
    width: 4,
    height: 15,
    background: 'rgba(255,255,255,0.4)',
  };
  const DOME_STYLE: React.CSSProperties = {
    width: w * 0.6,
    height: w * 0.3,
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    borderTopLeftRadius: '100px',
    borderTopRightRadius: '100px',
    borderBottom: 'none',
    marginBottom: '-1px',
  };
  const PILLAR_STYLE: React.CSSProperties = {
    width: 4,
    height: '100%',
    background: 'rgba(255,255,255,0.2)',
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
      <div style={STATUE_STYLE} />
      <div style={DOME_STYLE} />
      <Block
        w={w * 0.8}
        h={40}
        style={{ display: 'flex', justifyContent: 'space-evenly', paddingTop: 4 }}
      >
        {[...Array(6).keys()].map(i => (
          <div key={i} style={PILLAR_STYLE} />
        ))}
      </Block>
      <Block w={w} h={h}>
        <WindowGrid cols={8} rows={Math.floor(h / 30)} density={0.5} />
      </Block>
    </motion.div>
  );
}

export function ModernSlanted({
  delay,
  duration,
  w = 120,
  h = 300,
  ...pos
}: BuildingProps): React.JSX.Element {
  const SLANT_STYLE: React.CSSProperties = {
    width: w,
    height: 100,
    background: 'rgba(255,255,255,0.06)',
    clipPath: 'polygon(0 100%, 100% 0, 100% 100%)',
    borderRight: '1px solid rgba(255,255,255,0.2)',
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
        alignItems: 'flex-end',
      }}
    >
      <div style={SLANT_STYLE} />
      <Block w={w} h={h}>
        <WindowGrid cols={4} rows={Math.floor(h / 30)} density={0.6} />
      </Block>
    </motion.div>
  );
}

export function StandardBuilding({
  delay,
  duration,
  w = 100,
  h = 250,
  ...pos
}: BuildingProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      style={{ position: 'absolute', bottom: 0, ...pos }}
    >
      <Block w={w} h={h}>
        <WindowGrid cols={Math.floor(w / 25)} rows={Math.floor(h / 25)} density={0.3} />
      </Block>
    </motion.div>
  );
}
