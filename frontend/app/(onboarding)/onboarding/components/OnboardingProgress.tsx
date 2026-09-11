'use client';

import { Box, Stack, Typography } from '@mui/material';
import { tokens } from '@/lib/theme-tokens';

interface OnboardingProgressProps {
  currentStep: number;
  stepLabels: string[];
}

export function OnboardingProgress({ currentStep, stepLabels }: OnboardingProgressProps) {
  const totalSteps = stepLabels.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          height: 8,
          width: '100%',
          overflow: 'hidden',
          borderRadius: tokens.radius.full,
          bgcolor: 'action.hover',
        }}
      >
        <Box
          sx={{
            height: '100%',
            borderRadius: tokens.radius.full,
            bgcolor: 'primary.main',
            transition: 'width 300ms ease',
            width: `${progress}%`,
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: `repeat(${totalSteps}, 1fr)`,
        }}
      >
        {stepLabels.map((label, index) => {
          const isActive = index === currentStep;
          const isPassed = index < currentStep;
          return (
            <Box
              key={label}
              sx={{
                borderRadius: tokens.radius.md,
                border: '1px solid',
                px: 1.5,
                py: 1,
                textAlign: 'center',
                fontSize: { xs: 12, sm: 14 },
                fontWeight: 600,
                transition: 'colors 0.2s',
                borderColor: isActive ? 'primary.main' : isPassed ? 'primary.light' : 'divider',
                bgcolor: isActive ? 'primary.50' : isPassed ? 'primary.50' : 'background.paper',
                color: isActive || isPassed ? 'primary.main' : 'text.secondary',
              }}
            >
              <Typography
                component="span"
                style={{
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  color: 'inherit',
                }}
              >
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
