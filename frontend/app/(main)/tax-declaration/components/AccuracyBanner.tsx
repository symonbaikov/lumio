'use client';

import { Alert } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type React from 'react';
import { useIntlayer } from '@/app/i18n';

/**
 * Standing reminder on every step, deliberately without a close button: the
 * accuracy caveat has to stay next to the figures it qualifies. Styled as a
 * soft, low-contrast notice rather than a hard-edged warning bar — the
 * completeness score has its own place in the page header.
 */
export function AccuracyBanner(): React.ReactElement {
  const t = useIntlayer('taxDeclarationPage');

  return (
    <Alert
      severity="warning"
      sx={{
        alignItems: 'center',
        borderRadius: 2,
        bgcolor: theme => alpha(theme.palette.warning.main, 0.1),
        border: theme => `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
      }}
    >
      {t.bannerAccuracy}
    </Alert>
  );
}
