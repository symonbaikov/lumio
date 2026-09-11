'use client';

import { motion } from 'framer-motion';
import { Block } from './Block';
import type { BuildingProps } from './shared';
import { WindowGrid } from './WindowGrid';

export const SteppedSkyscraper = ({
  delay,
  duration,
  w = 140,
  h = 350,
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
    <div style={{ width: 2, height: 60, background: 'rgba(255,255,255,0.5)' }} />
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
