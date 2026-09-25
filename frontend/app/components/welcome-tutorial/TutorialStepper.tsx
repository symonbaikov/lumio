'use client';

import Box from '@mui/material/Box';
import type React from 'react';
import { useIntlayer } from '@/app/i18n';
import { type StepperState, stepStateOf } from './tutorial-pager';
import { stepButtonSx, stepperListSx } from './welcome-tutorial.styles';
import type { TutorialStep } from './welcome-tutorial-steps';

interface TutorialStepperProps {
  steps: TutorialStep[];
  current: number;
  onSelect: (index: number) => void;
}

interface StepperButtonProps {
  step: TutorialStep;
  state: StepperState;
  onClick: () => void;
}

function StepperButton({ step, state, onClick }: StepperButtonProps): React.JSX.Element {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-current={state === 'active' ? 'step' : undefined}
      aria-label={step.title}
      title={step.title}
      sx={stepButtonSx(state)}
    >
      {step.icon}
      {state === 'active' ? <span>{step.label}</span> : null}
    </Box>
  );
}

/** The sidebar's icons in a row: where you are in the tour, and a way to jump. */
export function TutorialStepper({
  steps,
  current,
  onSelect,
}: TutorialStepperProps): React.JSX.Element {
  const { controls } = useIntlayer('welcomeTutorial');
  return (
    <Box
      component="nav"
      aria-label={controls.stepsLabel.value}
      sx={{ display: { xs: 'none', md: 'block' }, flex: 1, minWidth: 0 }}
    >
      <Box component="ol" sx={stepperListSx}>
        {[...steps.entries()].map(([index, step]) => (
          <li key={step.id}>
            <StepperButton
              step={step}
              state={stepStateOf(index, current)}
              onClick={() => onSelect(index)}
            />
          </li>
        ))}
      </Box>
    </Box>
  );
}
