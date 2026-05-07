'use client';

import { Box } from '@mui/material';
import type React from 'react';
import { SubscriptionsContent } from './components/SubscriptionsContent';
import { useSubscriptionsPage } from './hooks/useSubscriptionsPage';

export default function SubscriptionsPage(): React.JSX.Element {
  const state = useSubscriptionsPage();
  return (
    <Box
      component="main"
      sx={{
        minHeight: 'calc(100vh - var(--global-nav-height,0px))',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '100vw',
        minWidth: 0,
        overflowX: 'hidden',
      }}
    >
      <SubscriptionsContent {...state} />
    </Box>
  );
}
