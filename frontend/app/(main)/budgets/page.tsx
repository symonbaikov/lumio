'use client';

import Box from '@mui/material/Box';
import type React from 'react';
import { BudgetsContent } from './components/BudgetsContent';
import { useBudgetsPage } from './hooks/useBudgetsPage';

export default function BudgetsPage(): React.JSX.Element {
  const state = useBudgetsPage();

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
      <BudgetsContent {...state} />
    </Box>
  );
}
