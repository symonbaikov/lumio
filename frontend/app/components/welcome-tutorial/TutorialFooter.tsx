'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import type React from 'react';
import { ChevronLeft, ChevronRight } from '@/app/components/icons';
import { useIntlayer } from '@/app/i18n';
import {
  directionalIconSx,
  footerSx,
  hideButtonSx,
  progressBarSx,
  progressSx,
  progressTrackSx,
} from './welcome-tutorial.styles';

interface TutorialFooterProps {
  current: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onHide: () => void;
}

export const BackIcon = (
  <Box component="span" sx={directionalIconSx}>
    <ChevronLeft size={18} />
  </Box>
);

const NextIcon = (
  <Box component="span" sx={directionalIconSx}>
    <ChevronRight size={18} />
  </Box>
);

function Progress({
  current,
  total,
}: Pick<TutorialFooterProps, 'current' | 'total'>): React.JSX.Element {
  const { controls } = useIntlayer('welcomeTutorial');
  const label = controls.progress.value
    .replace('{{current}}', String(current + 1))
    .replace('{{total}}', String(total));
  return (
    <Box sx={progressSx}>
      <Box sx={progressTrackSx}>
        <Box sx={progressBarSx((current + 1) / total)} />
      </Box>
      <span>{label}</span>
    </Box>
  );
}

export function TutorialFooter({
  current,
  total,
  onBack,
  onNext,
  onHide,
}: TutorialFooterProps): React.JSX.Element {
  const { controls } = useIntlayer('welcomeTutorial');
  return (
    <Box component="footer" sx={footerSx}>
      <Button
        variant="text"
        onClick={onHide}
        sx={[hideButtonSx, { display: { xs: 'none', sm: 'inline-flex' } }]}
      >
        {controls.hide}
      </Button>
      <Progress current={current} total={total} />
      <Button variant="outlined" onClick={onBack} startIcon={BackIcon}>
        {controls.back}
      </Button>
      <Button variant="contained" onClick={onNext} endIcon={NextIcon}>
        {controls.next}
      </Button>
    </Box>
  );
}
