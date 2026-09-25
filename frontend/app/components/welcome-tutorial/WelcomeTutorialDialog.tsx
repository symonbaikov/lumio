'use client';

import Dialog from '@mui/material/Dialog';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type React from 'react';
import { TutorialIntro } from './TutorialIntro';
import { TutorialOutro } from './TutorialOutro';
import { TutorialStepView } from './TutorialStepView';
import { type TutorialPager, useTutorialPager } from './useTutorialPager';
import { useTutorialSteps } from './useTutorialSteps';
import { paperSx, TITLE_ID } from './welcome-tutorial.styles';
import type { TutorialStep } from './welcome-tutorial-steps';

interface WelcomeTutorialDialogProps {
  open: boolean;
  onClose: () => void;
}

interface TutorialScreenProps {
  steps: TutorialStep[];
  pager: TutorialPager;
  onClose: () => void;
}

function TutorialScreen({ steps, pager, onClose }: TutorialScreenProps): React.JSX.Element {
  if (pager.state.view === 'intro') {
    return <TutorialIntro onStart={pager.next} onClose={onClose} />;
  }
  if (pager.state.view === 'outro') {
    return <TutorialOutro onBack={pager.back} onClose={onClose} />;
  }
  return <TutorialStepView steps={steps} pager={pager} onClose={onClose} />;
}

/** Welcome tutorial: an intro, one screen per sidebar page, and an outro. */
export default function WelcomeTutorialDialog({
  open,
  onClose,
}: WelcomeTutorialDialogProps): React.JSX.Element {
  const fullScreen = useMediaQuery(useTheme().breakpoints.down('md'));
  const steps = useTutorialSteps();
  const pager = useTutorialPager(steps.length);
  // Closing marks the tutorial seen for good, so a stray click beside it does not close it.
  // eslint-disable-next-line max-params -- MUI's onClose signature
  const handleClose = (_event: object, reason: 'backdropClick' | 'escapeKeyDown'): void => {
    if (reason !== 'backdropClick') {
      onClose();
    }
  };
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      maxWidth={false}
      aria-labelledby={TITLE_ID}
      onKeyDown={pager.onKeyDown}
      slotProps={{ paper: { sx: paperSx } }}
    >
      <TutorialScreen steps={steps} pager={pager} onClose={onClose} />
    </Dialog>
  );
}
