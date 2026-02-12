'use client';

import { Box, useMediaQuery, useTheme } from '@mui/material';
import BuildingBackground from './BuildingBackground';
import MoneyAnimation from './MoneyAnimation';

export default function AuthRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useTheme();
  // Deep blue palette
  const darkBlue = '#011e3c';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: `linear-gradient(180deg, ${darkBlue} 0%, #003366 100%)`,
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
