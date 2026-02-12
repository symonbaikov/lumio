'use client';

import { Box, Grid, useMediaQuery, useTheme } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode } from 'react';
import BuildingBackground from './BuildingBackground';
import MoneyAnimation from './MoneyAnimation';

interface AuthLayoutProps {
  children: ReactNode;
  sideContent: ReactNode;
}

export default function AuthLayout({ children, sideContent }: AuthLayoutProps) {
  const theme = useTheme();
  // Deep blue palette
  const darkBlue = '#011e3c'; // Deep blue background
  const vibrantBlue = '#0a66c2'; // Brand color

  return (
    <Grid container sx={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* Left Side - Form (White/Light) */}
      <Grid
        size={{ xs: 12, md: 5, lg: 4 }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'background.paper',
          p: 6,
          position: 'relative',
          zIndex: 20,
          boxShadow: { md: '10px 0 30px rgba(0,0,0,0.1)' },
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', maxWidth: '400px' }}
        >
          {children}
        </motion.div>
      </Grid>

      {/* Right Side - Visual (Deep Blue) */}
      <Grid
        size={{ xs: 0, md: 7, lg: 8 }}
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          // Make transparent to show parent layout background
          background: 'transparent',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          p: 4,
        }}
      >
        {/* Content Overlay */}
        <Box sx={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '600px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {sideContent}
            </motion.div>
          </AnimatePresence>
        </Box>
      </Grid>
    </Grid>
  );
}
