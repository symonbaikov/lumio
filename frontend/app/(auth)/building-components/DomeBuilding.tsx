'use client';

import { motion } from 'framer-motion';
import { Block } from './Block';
import type { BuildingProps } from './shared';
import { glassStyle } from './shared';
import { WindowGrid } from './WindowGrid';

const PILLAR_COUNT = 6;

const DomePillarRow = ({ w }: { w: number }): React.JSX.Element => (
  <Block
    w={w * 0.8}
    h={40}
    style={{ display: 'flex', justifyContent: 'space-evenly', paddingTop: 4 }}
  >
    {[...Array(PILLAR_COUNT).keys()].map(i => (
      <div key={i} style={{ width: 4, height: '100%', background: 'rgba(255,255,255,0.2)' }} />
    ))}
  </Block>
);

export const DomeBuilding = ({
  delay,
  duration,
  w = 180,
  h = 180,
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
    <div style={{ width: 4, height: 15, background: 'rgba(255,255,255,0.4)' }} />
    <div
      style={{
        width: w * 0.6,
        height: w * 0.3,
        ...glassStyle,
        borderTopLeftRadius: '100px',
        borderTopRightRadius: '100px',
        borderBottom: 'none',
        marginBottom: '-1px',
      }}
    />
    <DomePillarRow w={w} />
    <Block w={w} h={h}>
      <WindowGrid cols={8} rows={Math.floor(h / 30)} density={0.5} />
    </Block>
  </motion.div>
);
