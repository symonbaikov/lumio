'use client';

import { Box } from '@mui/material';
import BuildingBackground from './BuildingBackground';
import MoneyAnimation from './MoneyAnimation';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export default function AuthRootLayout({ children }: { children: React.ReactNode }) {
  // Deep green palette
  const darkGreen = '#021a0e';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: `linear-gradient(180deg, ${darkGreen} 0%, #0a3d20 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Persistent Background Elements */}
      {/* We only want these visible on the right side on desktop, 
          but simpler to render full screen and let the form cover the left side. */}

      {/* Apply a mask or positioning so buildings/money don't appear under the form? 
          Actually, if the form is opaque white, it doesn't matter if they are behind it.
          Visuals might be "wasted" GPU cycles but acceptable.
          However, for "Money" popping out, we might want them restricted to right side?
          Let's just keep them full screen for now; it might look cool if a coin flies behind the form.
      */}
      <BuildingBackground />
      <MoneyAnimation />

      {/* Page Content */}
      <Box sx={{ position: 'relative', zIndex: 10 }}>{children}</Box>
    </Box>
  );
}
