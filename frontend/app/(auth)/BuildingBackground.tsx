'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';

// Common base glass style
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(4px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
};

const WindowGrid = ({
  cols = 3,
  rows = 5,
  density = 0.4,
}: { cols?: number; rows?: number; density?: number }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: '8px',
      padding: '12px',
      opacity: 0.3,
    }}
  >
    {Array.from({ length: cols * rows }).map((_, i) => (
      <div
        // biome-ignore lint/suspicious/noArrayIndexKey: pure visual decoration
        key={i}
        style={{
          background: Math.random() > 1 - density ? 'white' : 'transparent',
          borderRadius: '2px',
        }}
      />
    ))}
  </div>
);

// Generic Base Block
const Block = ({
  w,
  h,
  children,
  style = {},
}: { w: number; h: number; children?: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ width: w, height: h, borderBottom: 'none', ...glassStyle, ...style }}>
    {children}
  </div>
);

// 1. Clock Tower
const ClockTower = ({ delay, duration, w = 120, h = 300, ...pos }: any) => (
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
    {/* Spire */}
    <div style={{ width: 4, height: 40, background: 'rgba(255,255,255,0.3)' }} />
    {/* Triangle Roof */}
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: `${w * 0.55}px solid transparent`,
        borderRight: `${w * 0.55}px solid transparent`,
        borderBottom: `60px solid rgba(255,255,255,0.1)`,
        marginBottom: '-1px',
      }}
    />
    {/* Clock Face Section */}
    <Block
      w={w * 0.9}
      h={w * 0.9}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        style={{
          width: w * 0.5,
          height: w * 0.5,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: '3px solid rgba(255,255,255,0.3)',
          position: 'relative',
          boxShadow: '0 0 15px rgba(255,255,255,0.1)',
        }}
      >
        {/* Hands */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 2,
            height: '30%',
            background: 'white',
            transformOrigin: 'bottom',
            transform: 'translate(-50%, -100%) rotate(45deg)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 2,
            height: '40%',
            background: 'white',
            transformOrigin: 'bottom',
            transform: 'translate(-50%, -100%) rotate(120deg)',
          }}
        />
      </div>
    </Block>
    {/* Base */}
    <Block w={w} h={h}>
      <WindowGrid cols={3} rows={Math.floor(h / 30)} density={0.2} />
    </Block>
  </motion.div>
);

// 2. Stepped Skyscraper
const SteppedSkyscraper = ({ delay, duration, w = 140, h = 350, ...pos }: any) => (
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
    {/* Antenna */}
    <div style={{ width: 2, height: 60, background: 'rgba(255,255,255,0.5)' }} />
    {/* Top Tier */}
    <Block w={w * 0.4} h={50}>
      <WindowGrid cols={2} rows={2} />
    </Block>
    {/* Mid Tier */}
    <Block w={w * 0.7} h={80}>
      <WindowGrid cols={4} rows={3} />
    </Block>
    {/* Base */}
    <Block w={w} h={h}>
      <WindowGrid cols={6} rows={Math.floor(h / 30)} />
    </Block>
  </motion.div>
);

// 3. Dome Building (Bank / Capitol)
const DomeBuilding = ({ delay, duration, w = 180, h = 180, ...pos }: any) => (
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
    {/* Small statue/pin */}
    <div style={{ width: 4, height: 15, background: 'rgba(255,255,255,0.4)' }} />
    {/* Dome */}
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
    {/* Pillars */}
    <Block
      w={w * 0.8}
      h={40}
      style={{ display: 'flex', justifyContent: 'space-evenly', paddingTop: 4 }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: pure visual decoration
        <div key={i} style={{ width: 4, height: '100%', background: 'rgba(255,255,255,0.2)' }} />
      ))}
    </Block>
    {/* Base */}
    <Block w={w} h={h}>
      <WindowGrid cols={8} rows={Math.floor(h / 30)} density={0.5} />
    </Block>
  </motion.div>
);

// 4. Modern Slanted
const ModernSlanted = ({ delay, duration, w = 120, h = 300, ...pos }: any) => (
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
    {/* Slant Top */}
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
    {/* Base */}
    <Block w={w} h={h}>
      <WindowGrid cols={4} rows={Math.floor(h / 30)} density={0.6} />
    </Block>
  </motion.div>
);

// 5. Gothic Cathedral/Castle
const GothicBuilding = ({ delay, duration, w = 160, h = 320, ...pos }: any) => (
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
    {/* Twin Spires & Central Rose Window Section */}
    <div
      style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: w }}
    >
      {/* Left Spire */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 2, height: 30, background: 'rgba(255,255,255,0.4)' }} />
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `15px solid transparent`,
            borderRight: `15px solid transparent`,
            borderBottom: `50px solid rgba(255,255,255,0.1)`,
            marginBottom: '-1px',
          }}
        />
        <Block w={30} h={60} style={{ borderBottom: 'none' }} />
      </div>

      {/* Center Section (Rose Window) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: -10,
        }}
      >
        {/* Triangle Pediment */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `30px solid transparent`,
            borderRight: `30px solid transparent`,
            borderBottom: `40px solid rgba(255,255,255,0.15)`,
            marginBottom: '-1px',
          }}
        />
        <Block w={60} h={80} style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          {/* Rose Window */}
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
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
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.4)',
              }}
            />
          </div>
        </Block>
      </div>

      {/* Right Spire */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 2, height: 30, background: 'rgba(255,255,255,0.4)' }} />
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `15px solid transparent`,
            borderRight: `15px solid transparent`,
            borderBottom: `50px solid rgba(255,255,255,0.1)`,
            marginBottom: '-1px',
          }}
        />
        <Block w={30} h={60} style={{ borderBottom: 'none' }} />
      </div>
    </div>

    {/* Main Base with arched windows */}
    <Block w={w} h={h} style={{ paddingTop: 20 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '15px',
          padding: '0 20px',
          opacity: 0.4,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: visual
          <div
            key={i}
            style={{
              height: 40,
              background: Math.random() > 0.3 ? 'white' : 'transparent',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
            }}
          />
        ))}
      </div>
      <WindowGrid cols={5} rows={Math.floor((h - 100) / 25)} density={0.3} />
    </Block>
  </motion.div>
);

// 6. Standard Building
const StandardBuilding = ({ delay, duration, w = 100, h = 250, ...pos }: any) => (
  <motion.div
    initial={{ y: 100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration, delay, ease: 'easeOut' }}
    style={{ position: 'absolute', bottom: 0, ...pos }}
  >
    <Block w={w} h={h} style={{ borderRadius: '8px 8px 0 0' }}>
      <WindowGrid cols={Math.floor(w / 25)} rows={Math.floor(h / 25)} density={0.3} />
    </Block>
  </motion.div>
);

const BuildingBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* City Skyline Layers */}

      {/* Back Layer - slower, darker, smaller */}
      <div className="absolute inset-x-0 bottom-0 h-96 opacity-30">
        {/* We need buildings on the far left that will safely sit behind the form */}
        <StandardBuilding left="5%" delay={0.2} duration={1.5} w={120} h={300} />
        <ModernSlanted left="25%" delay={0.4} duration={1.5} w={80} h={240} />

        {/* Fill the center */}
        <SteppedSkyscraper left="50%" delay={0.1} duration={1.5} w={110} h={320} />

        {/* We removed the DomeBuilding (small building) that was next to / behind the gothic building */}
        {/* <DomeBuilding left="72%" delay={0.5} duration={1.5} w={100} h={140} /> */}

        {/* We removed the right-most ModernSlanted from the back layer that was behind the gothic building */}
        {/* <ModernSlanted right="5%" delay={0.3} duration={1.5} w={90} h={260} /> */}
      </div>

      {/* Front Layer - faster, brighter, larger */}
      <div className="absolute inset-x-0 bottom-0 h-80 opacity-60">
        <SteppedSkyscraper left="5%" delay={0.6} duration={1.2} w={140} h={350} />

        {/* ClockTower on front layer has been completely removed to avoid showing under UI */}
        {/* <ClockTower left="36%" delay={0.8} duration={1.2} w={110} h={280} /> */}

        <ClockTower left="38%" delay={0.8} duration={1.2} w={110} h={280} />

        {/* Dome slightly shifted to fill center right */}
        <DomeBuilding left="60%" delay={0.7} duration={1.2} w={180} h={220} />

        {/* Gothic building securely on the far right. No other buildings behind it now. */}
        <GothicBuilding right="5%" delay={0.9} duration={1.2} w={170} h={360} />
      </div>
    </div>
  );
};

export default memo(BuildingBackground);
