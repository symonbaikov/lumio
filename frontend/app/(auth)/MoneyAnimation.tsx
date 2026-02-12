'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';

const Coin = ({
  delay,
  x,
  y,
  size = 40,
}: { delay: number; x: string; y: string; size?: number }) => (
  <motion.div
    initial={{ y: 0, opacity: 0 }}
    animate={{
      y: [0, -20, 0, 20, 0],
      rotateY: [0, 180, 360],
      opacity: [0, 1, 1, 1, 0],
    }}
    transition={{
      duration: 5,
      delay,
      repeat: Number.POSITIVE_INFINITY,
      ease: 'easeInOut',
      repeatDelay: 1,
    }}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: size,
      height: size,
      zIndex: 10,
    }}
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-lg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        fontSize="14"
        fill="#B8860B"
        fontWeight="bold"
      >
        $
      </text>
    </svg>
  </motion.div>
);

const Bill = ({ delay, x, y, rotate }: { delay: number; x: string; y: string; rotate: number }) => (
  <motion.div
    initial={{ y: 100, opacity: 0, rotate: rotate - 10 }}
    animate={{
      y: -100,
      opacity: [0, 1, 0],
      rotate: rotate + 10,
    }}
    transition={{
      duration: 8,
      delay,
      repeat: Number.POSITIVE_INFINITY,
      ease: 'linear',
    }}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 80,
      height: 40,
      zIndex: 5,
    }}
  >
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#85bb65',
        border: '2px solid #5a8c43',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          width: '90%',
          height: '80%',
          border: '1px dashed #5a8c43',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1a472a',
          fontWeight: 'bold',
          fontSize: '12px',
        }}
      >
        $100
      </div>
    </div>
  </motion.div>
);

const MoneyAnimation = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating Coins */}
      <Coin delay={0} x="10%" y="20%" />
      <Coin delay={1.5} x="80%" y="15%" />
      <Coin delay={3} x="40%" y="40%" size={50} />
      <Coin delay={1} x="20%" y="70%" />
      <Coin delay={2.5} x="70%" y="60%" />

      {/* Floating Bills */}
      <Bill delay={0} x="10%" y="80%" rotate={15} />
      <Bill delay={2} x="60%" y="90%" rotate={-10} />
      <Bill delay={4} x="30%" y="85%" rotate={20} />
      <Bill delay={1} x="85%" y="75%" rotate={-5} />
    </div>
  );
};

export default memo(MoneyAnimation);
