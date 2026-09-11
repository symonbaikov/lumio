'use client';

import { motion } from 'framer-motion';
import { tokens } from '@/lib/theme-tokens';
import { Block } from './Block';
import type { BuildingProps } from './shared';
import { stableWindowNoise } from './shared';
import { WindowGrid } from './WindowGrid';

const WINDOW_COUNT = 6;
const WINDOW_NOISE_OFFSET = 1000;
const WINDOW_NOISE_THRESHOLD = 0.7;

const GothicSpire = (): React.JSX.Element => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <div style={{ width: 2, height: 30, background: 'rgba(255,255,255,0.4)' }} />
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: '15px solid transparent',
        borderRight: '15px solid transparent',
        borderBottom: '50px solid rgba(255,255,255,0.1)',
        marginBottom: '-1px',
      }}
    />
    <Block w={30} h={60} style={{ borderBottom: 'none' }} />
  </div>
);

const GothicRoseWindow = (): React.JSX.Element => (
  <div
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: -10 }}
  >
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: '30px solid transparent',
        borderRight: '30px solid transparent',
        borderBottom: '40px solid rgba(255,255,255,0.15)',
        marginBottom: '-1px',
      }}
    />
    <Block w={60} h={80} style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: tokens.radius.full,
          background: 'rgba(255,255,255,0.2)',
          border: '2px solid rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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

const GothicArchWindows = ({ h }: { h: number }): React.JSX.Element => (
  <Block w={160} h={h} style={{ paddingTop: 20 }}>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '15px',
        padding: '0 20px',
        opacity: 0.4,
      }}
    >
      {[...Array(WINDOW_COUNT).keys()].map(i => {
        const windowKey = `window-${i}`;
        return (
          <div
            key={windowKey}
            style={{
              height: 40,
              background:
                stableWindowNoise(WINDOW_NOISE_OFFSET + i) < WINDOW_NOISE_THRESHOLD
                  ? 'white'
                  : 'transparent',
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

export const GothicBuilding = ({
  delay,
  duration,
  w = 160,
  h = 320,
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
    <div
      style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: w }}
    >
      <GothicSpire />
      <GothicRoseWindow />
      <GothicSpire />
    </div>
    <GothicArchWindows h={h} />
  </motion.div>
);
