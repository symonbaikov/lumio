/**
 * Tour progress indicator component
 */

'use client';

import { Box, LinearProgress, Typography } from '@mui/material';

interface TourProgressProps {
  current: number;
  total: number;
  className?: string;
}

export function TourProgress({ current, total, className = '' }: TourProgressProps) {
  const progress = (current / total) * 100;

  return (
    <Box className={className} sx={{ width: '100%', maxWidth: 300 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          Tour progress
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {current}/{total}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: 'action.hover',
          '& .MuiLinearProgress-bar': {
            borderRadius: 3,
          },
        }}
      />
    </Box>
  );
}
