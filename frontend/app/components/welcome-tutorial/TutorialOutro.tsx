'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { Check, HelpCircle, Upload, User } from '@/app/components/icons';
import { useIntlayer } from '@/app/i18n';
import { DEFAULT_APP_ROUTE } from '@/app/lib/default-app-route';
import { BackIcon } from './TutorialFooter';
import { TutorialHeader } from './TutorialStepView';
import { useFocusTitleOnMount } from './useFocusTitleOnMount';
import { enterSx, focusableTitleSx, footerSx, TITLE_ID } from './welcome-tutorial.styles';
import {
  hintIconSx,
  hintSx,
  hintsSx,
  outroActionsSx,
  outroBadgeSx,
  outroSx,
  outroTextSx,
  outroTitleSx,
} from './welcome-tutorial-hero.styles';
import { eyebrowSx } from './welcome-tutorial-step.styles';

interface TutorialOutroProps {
  onBack: () => void;
  onClose: () => void;
}

// Same link as the sidebar's "New statement" button.
const UPLOAD_ROUTE = '/statements?upload=1';

function OutroHints(): React.JSX.Element {
  const { outro } = useIntlayer('welcomeTutorial');
  return (
    <Box sx={hintsSx}>
      <Box sx={hintSx}>
        <Box sx={hintIconSx}>
          <User size={18} />
        </Box>
        <span>{outro.avatarHint}</span>
      </Box>
      <Box sx={hintSx}>
        <Box sx={hintIconSx}>
          <HelpCircle size={18} />
        </Box>
        <span>{outro.toursHint}</span>
      </Box>
    </Box>
  );
}

function OutroActions({ onClose }: Pick<TutorialOutroProps, 'onClose'>): React.JSX.Element {
  const { outro } = useIntlayer('welcomeTutorial');
  const router = useRouter();
  const goTo = (path: string) => (): void => {
    onClose();
    router.push(path);
  };
  return (
    <Box sx={outroActionsSx}>
      <Button
        variant="contained"
        size="large"
        startIcon={<Upload size={18} />}
        onClick={goTo(UPLOAD_ROUTE)}
      >
        {outro.upload}
      </Button>
      <Button variant="outlined" size="large" onClick={goTo(DEFAULT_APP_ROUTE)}>
        {outro.dashboard}
      </Button>
    </Box>
  );
}

function OutroFooter({ onBack, onClose }: TutorialOutroProps): React.JSX.Element {
  const { controls } = useIntlayer('welcomeTutorial');
  return (
    <Box component="footer" sx={[footerSx, { justifyContent: 'space-between' }]}>
      <Button variant="outlined" onClick={onBack} startIcon={BackIcon}>
        {controls.back}
      </Button>
      <Button variant="contained" onClick={onClose}>
        {controls.finish}
      </Button>
    </Box>
  );
}

/** The end of the tour: where to start, and where to find help later. */
export function TutorialOutro({ onBack, onClose }: TutorialOutroProps): React.JSX.Element {
  const { outro } = useIntlayer('welcomeTutorial');
  useFocusTitleOnMount();
  return (
    <>
      <TutorialHeader onClose={onClose} />
      <Box sx={[outroSx, enterSx]}>
        <Box sx={outroBadgeSx}>
          <Check size={32} />
        </Box>
        <Box sx={[eyebrowSx, { mt: 4 }]}>{outro.eyebrow}</Box>
        <Typography
          id={TITLE_ID}
          component="h2"
          tabIndex={-1}
          sx={[outroTitleSx, focusableTitleSx]}
        >
          {outro.title}
        </Typography>
        <Typography sx={outroTextSx}>{outro.text}</Typography>
        <OutroActions onClose={onClose} />
        <OutroHints />
      </Box>
      <OutroFooter onBack={onBack} onClose={onClose} />
    </>
  );
}
