'use client';

import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import { tokens } from '@/lib/theme-tokens';

interface OnboardingNavigationProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  showSkip: boolean;
  showSkipAll?: boolean;
  canExitOnBack?: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onSkipAll: () => void;
  labels: {
    back: string;
    next: string;
    finish: string;
    skip: string;
    skipAll: string;
    saving: string;
  };
}

export function OnboardingNavigation({
  currentStep,
  totalSteps,
  isSubmitting,
  showSkip,
  showSkipAll = true,
  canExitOnBack = false,
  onBack,
  onNext,
  onSkip,
  onSkipAll,
  labels,
}: OnboardingNavigationProps) {
  const isFirstStep = currentStep === 0;
  const disableBack = (isFirstStep && !canExitOnBack) || isSubmitting;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <Stack spacing={2} sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          disabled={disableBack}
          sx={{
            borderRadius: tokens.radius.md,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            color: 'text.primary',
            fontWeight: 600,
            fontSize: 14,
            textTransform: 'none',
            px: 2.5,
            py: 1,
            '&:hover': { bgcolor: 'action.hover' },
            '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
          }}
        >
          {labels.back}
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showSkip ? (
            <Button
              variant="text"
              onClick={onSkip}
              disabled={isSubmitting}
              sx={{
                borderRadius: tokens.radius.md,
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: 14,
                textTransform: 'none',
                px: 2,
                py: 1,
                '&:hover': { bgcolor: 'action.hover' },
                '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
              }}
            >
              {labels.skip}
            </Button>
          ) : null}

          <Button
            variant="contained"
            onClick={onNext}
            disabled={isSubmitting}
            sx={{
              borderRadius: tokens.radius.md,
              fontWeight: 600,
              fontSize: 14,
              textTransform: 'none',
              px: 2.5,
              py: 1,
              '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
            }}
          >
            {isLastStep ? (isSubmitting ? labels.saving : labels.finish) : labels.next}
          </Button>
        </Box>
      </Box>

      {!isLastStep && showSkipAll ? (
        <button
          type="button"
          onClick={onSkipAll}
          disabled={isSubmitting}
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--mui-palette-text-secondary)',
            background: 'transparent',
            border: 'none',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          {labels.skipAll}
        </button>
      ) : null}
    </Stack>
  );
}
