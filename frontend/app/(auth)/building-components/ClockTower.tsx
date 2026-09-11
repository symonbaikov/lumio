'use client';

import { motion } from 'framer-motion';
import { tokens } from '@/lib/theme-tokens';
import { Block } from './Block';
import type { BuildingProps } from './shared';
import { WindowGrid } from './WindowGrid';

const handStyle = (rotation: string): React.CSSProperties => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: 2,
  height: '35%',
  background: 'white',
  transformOrigin: 'bottom',
  transform: `translate(-50%, -100%) rotate(${rotation})`,
});

const ClockFace = ({ size }: { size: number }): React.JSX.Element => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: tokens.radius.full,
      background: 'rgba(255,255,255,0.15)',
      border: '3px solid rgba(255,255,255,0.3)',
      position: 'relative',
      boxShadow: '0 0 15px rgba(255,255,255,0.1)',
    }}
  >
    <div style={handStyle('45deg')} />
    <div style={handStyle('120deg')} />
  </div>
);

const ClockFaceBlock = ({ w }: { w: number }): React.JSX.Element => (
  <Block
    w={w * 0.9}
    h={w * 0.9}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <ClockFace size={w * 0.5} />
  </Block>
);

export const ClockTower = ({
  delay,
  duration,
  w = 120,
  h = 300,
  ...pos
}: BuildingProps): React.JSX.Element => (
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
    <div style={{ width: 4, height: 40, background: 'rgba(255,255,255,0.3)' }} />
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: `${w * 0.55}px solid transparent`,
        borderRight: `${w * 0.55}px solid transparent`,
        borderBottom: '60px solid rgba(255,255,255,0.1)',
        marginBottom: '-1px',
      }}
    />
    <ClockFaceBlock w={w} />
    <Block w={w} h={h}>
      <WindowGrid cols={3} rows={Math.floor(h / 30)} density={0.2} />
    </Block>
  </motion.div>
);
