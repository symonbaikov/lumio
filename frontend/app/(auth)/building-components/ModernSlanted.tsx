'use client';

import { motion } from 'framer-motion';
import { Block } from './Block';
import type { BuildingProps } from './shared';
import { WindowGrid } from './WindowGrid';

export const ModernSlanted = ({
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
      alignItems: 'flex-end',
    }}
  >
    <div
      style={{
        width: w,
        height: 100,
        background: 'rgba(255,255,255,0.06)',
        clipPath: 'polygon(0 100%, 100% 0, 100% 100%)',
        borderRight: '1px solid rgba(255,255,255,0.2)',
        marginBottom: '-1px',
      }}
    />
    <Block w={w} h={h}>
      <WindowGrid cols={4} rows={Math.floor(h / 30)} density={0.6} />
    </Block>
  </motion.div>
);
