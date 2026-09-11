'use client';

import { motion } from 'framer-motion';
import { Block } from './Block';
import type { BuildingProps } from './shared';
import { WindowGrid } from './WindowGrid';

export const StandardBuilding = ({
  delay,
  duration,
  w = 100,
  h = 250,
  ...pos
}: BuildingProps): React.JSX.Element => (
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
