'use client';

import Box from '@mui/material/Box';
import { BudgetsContent } from './components/BudgetsContent';
import { useBudgetsPage } from './hooks/useBudgetsPage';

export default function BudgetsPage() {
  const state = useBudgetsPage();

  return (
    <Box component="main" sx={{ minHeight: 'calc(100vh - var(--global-nav-height,0px))', display: 'flex', flexDirection: 'column' }}>
      <BudgetsContent {...state} />
    </Box>
  );
}
