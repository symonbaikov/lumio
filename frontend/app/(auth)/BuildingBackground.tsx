'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';

const Building = ({
  width,
  height,
  left,
  delay,
  duration,
}: {
  width: string;
  height: string;
  left: string;
  delay: number;
  duration: number;
}) => (
  <motion.div
    initial={{ y: 100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{
      duration,
      delay,
      ease: 'easeOut',
    }}
    style={{
      position: 'absolute',
      bottom: 0,
      left,
      width,
      height,
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '8px 8px 0 0',
      backdropFilter: 'blur(4px)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderBottom: 'none',
    }}
  >
    {/* Windows pattern */}
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(10px, 1fr))',
        gridTemplateRows: 'repeat(auto-fill, minmax(15px, 1fr))',
        gap: '8px',
        padding: '12px',
        opacity: 0.3,
      }}
    >
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: pure visual decoration
          key={i}
          style={{
            background: Math.random() > 0.6 ? 'white' : 'transparent',
            borderRadius: '2px',
          }}
        />
      ))}
    </div>
  </motion.div>
);

const BuildingBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* City Skyline Layers */}

      {/* Back Layer - slower, darker, smaller */}
      <div className="absolute inset-x-0 bottom-0 h-96 opacity-30">
        <Building width="120px" height="300px" left="5%" delay={0.2} duration={1.5} />
        <Building width="100px" height="250px" left="25%" delay={0.4} duration={1.5} />
        <Building width="140px" height="280px" left="45%" delay={0.1} duration={1.5} />
        <Building width="90px" height="220px" left="70%" delay={0.5} duration={1.5} />
        <Building width="110px" height="260px" left="85%" delay={0.3} duration={1.5} />
      </div>

      {/* Front Layer - faster, brighter, larger */}
      <div className="absolute inset-x-0 bottom-0 h-80 opacity-60">
        <Building width="160px" height="400px" left="15%" delay={0.6} duration={1.2} />
        <Building width="180px" height="500px" left="35%" delay={0.8} duration={1.2} />
        <Building width="140px" height="350px" left="60%" delay={0.7} duration={1.2} />
        <Building width="200px" height="450px" left="80%" delay={0.9} duration={1.2} />
      </div>
    </div>
  );
};

export default memo(BuildingBackground);
