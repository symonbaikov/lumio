'use client';

import Box from '@mui/material/Box';
import { NetWorthContent } from './components/NetWorthContent';

export default function NetWorthPage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: 'calc(100vh - var(--global-nav-height,0px))',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <NetWorthContent />
    </Box>
  );
}
