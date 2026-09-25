'use client';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type React from 'react';
import { X } from '@/app/components/icons';
import { useIntlayer } from '@/app/i18n';
import { TutorialFooter } from './TutorialFooter';
import { TutorialFragments } from './TutorialFragments';
import { TutorialStepper } from './TutorialStepper';
import type { TutorialPager } from './useTutorialPager';
import { closeButtonSx, enterSx, headerSx, TITLE_ID, wordmarkSx } from './welcome-tutorial.styles';
import {
  bodySx,
  demoNoteSx,
  descriptionSx,
  eyebrowSx,
  taglineSx,
} from './welcome-tutorial-step.styles';
import type { TutorialStep } from './welcome-tutorial-steps';

interface TutorialStepViewProps {
  steps: TutorialStep[];
  pager: TutorialPager;
  onClose: () => void;
}

export function TutorialHeader({
  children,
  onClose,
}: {
  children?: React.ReactNode;
  onClose: () => void;
}): React.JSX.Element {
  const { controls } = useIntlayer('welcomeTutorial');
  return (
    <Box component="header" sx={headerSx}>
      <Box sx={wordmarkSx}>Lumio</Box>
      {children}
      <IconButton aria-label={controls.close.value} onClick={onClose} sx={closeButtonSx}>
        <X size={20} />
      </IconButton>
    </Box>
  );
}

function StepText({ step }: { step: TutorialStep }): React.JSX.Element {
  const { steps } = useIntlayer('welcomeTutorialSteps');
  const text = steps[step.id];
  return (
    <>
      <Box sx={eyebrowSx}>
        {step.icon}
        {step.label}
      </Box>
      <Typography id={TITLE_ID} component="h2" sx={taglineSx}>
        {text.tagline}
      </Typography>
      <Typography sx={descriptionSx}>{text.description}</Typography>
    </>
  );
}

/** One sidebar page: what it is for, and its main parts as numbered screenshots. */
export function TutorialStepView({
  steps,
  pager,
  onClose,
}: TutorialStepViewProps): React.JSX.Element {
  const { controls } = useIntlayer('welcomeTutorial');
  const index = pager.state.index;
  const step = steps[index];
  return (
    <>
      <TutorialHeader onClose={onClose}>
        <TutorialStepper steps={steps} current={index} onSelect={pager.goTo} />
      </TutorialHeader>
      <Box key={step.id} sx={[bodySx, enterSx]}>
        <StepText step={step} />
        <TutorialFragments step={step} />
        <Typography sx={demoNoteSx}>{controls.demoNote}</Typography>
      </Box>
      <TutorialFooter
        current={index}
        total={steps.length}
        onBack={pager.back}
        onNext={pager.next}
        onHide={onClose}
      />
    </>
  );
}
