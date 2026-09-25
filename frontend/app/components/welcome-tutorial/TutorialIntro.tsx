'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
import type React from 'react';
import { PlayCircle, X } from '@/app/components/icons';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import { enterSx, TITLE_ID } from './welcome-tutorial.styles';
import {
  collageCardSx,
  collageSx,
  introActionsSx,
  introCloseSx,
  introEyebrowSx,
  introHintSx,
  introSubtitleSx,
  introSx,
  introTitleSx,
  introWordmarkSx,
  skipButtonSx,
  startButtonSx,
} from './welcome-tutorial-hero.styles';
import { TUTORIAL_SCREENS } from './welcome-tutorial-screens';

interface TutorialIntroProps {
  onStart: () => void;
  onClose: () => void;
}

// A taste of what the tour covers; purely decorative.
const COLLAGE = [
  { key: 'dashboard', fragment: TUTORIAL_SCREENS.dashboard[0] },
  { key: 'net-worth', fragment: TUTORIAL_SCREENS.netWorth[0] },
  { key: 'budgets', fragment: TUTORIAL_SCREENS.budgets[0] },
];

function TutorialCollage(): React.JSX.Element {
  const mode = useTheme().palette.mode;
  return (
    <Box sx={collageSx} aria-hidden>
      {[...COLLAGE.entries()].map(([index, { key, fragment }]) => (
        <Box key={key} sx={collageCardSx(index)}>
          <Image
            src={fragment[mode]}
            alt=""
            fill
            sizes="(max-width: 899px) 60vw, 420px"
            placeholder="blur"
            preload={index === 0}
            style={{ objectFit: 'cover', objectPosition: 'top left' }}
          />
        </Box>
      ))}
    </Box>
  );
}

function useIntroTitle(): string {
  const { intro } = useIntlayer('welcomeTutorial');
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0];
  return firstName ? intro.title.value.replace('{{name}}', firstName) : intro.titleNoName.value;
}

function IntroText({ onStart, onClose }: TutorialIntroProps): React.JSX.Element {
  const { intro } = useIntlayer('welcomeTutorial');
  const title = useIntroTitle();
  return (
    <Box sx={enterSx}>
      <Box sx={introWordmarkSx}>Lumio</Box>
      <Box sx={introEyebrowSx}>
        <PlayCircle size={16} />
        {intro.eyebrow}
      </Box>
      <Typography id={TITLE_ID} component="h2" sx={introTitleSx}>
        {title}
      </Typography>
      <Typography sx={introSubtitleSx}>{intro.subtitle}</Typography>
      <Box sx={introActionsSx}>
        <Button variant="contained" size="large" onClick={onStart} sx={startButtonSx}>
          {intro.start}
        </Button>
        <Button variant="text" size="large" onClick={onClose} sx={skipButtonSx}>
          {intro.skip}
        </Button>
      </Box>
      <Typography sx={introHintSx}>{intro.reopenHint}</Typography>
    </Box>
  );
}

export function TutorialIntro(props: TutorialIntroProps): React.JSX.Element {
  const { controls } = useIntlayer('welcomeTutorial');
  return (
    <Box sx={introSx}>
      <IconButton aria-label={controls.close.value} onClick={props.onClose} sx={introCloseSx}>
        <X size={20} />
      </IconButton>
      <IntroText {...props} />
      <TutorialCollage />
    </Box>
  );
}
