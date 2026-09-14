'use client';

import { Alert, Chip } from '@mui/material';
import type React from 'react';
import { useIntlayer } from '@/app/i18n';
import { completenessTone } from '../tax-declaration.helpers';

/**
 * Standing reminder on every step, deliberately without a close button: the
 * accuracy caveat has to stay next to the figures it qualifies.
 */
export function AccuracyBanner({ score }: { score: number | null }): React.ReactElement {
  const t = useIntlayer('taxDeclarationPage');

  return (
    <Alert
      severity="warning"
      sx={{ alignItems: 'center' }}
      action={
        score === null ? undefined : (
          <Chip
            color={completenessTone(score)}
            label={`${t.completenessLabel.value}: ${score}/100`}
            sx={{ fontWeight: 600 }}
          />
        )
      }
    >
      {t.bannerAccuracy}
    </Alert>
  );
}
