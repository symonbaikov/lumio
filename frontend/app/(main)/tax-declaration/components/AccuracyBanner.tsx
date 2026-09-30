'use client';

import { Box, Stack, Typography } from '@mui/material';
import type React from 'react';
import { TriangleAlert } from '@/app/components/icons';
import { useIntlayer } from '@/app/i18n';

/**
 * Standing reminder on every step, deliberately without a close button: the
 * accuracy caveat has to stay next to the figures it qualifies. One notice with
 * a thin amber rule on the left and no fill; a step with warnings of its own
 * (the draft) passes them as `notes` so they join this block instead of stacking
 * a second one under it.
 */
export function AccuracyBanner({ notes = [] }: { notes?: React.ReactNode[] }): React.ReactElement {
  const t = useIntlayer('taxDeclarationPage');

  return (
    <Box
      role="note"
      sx={{
        display: 'flex',
        gap: 1.25,
        pl: 1.5,
        py: 0.25,
        borderLeft: '2px solid',
        borderColor: 'warning.main',
      }}
    >
      <Box
        component="span"
        sx={{ display: 'inline-flex', color: 'warning.main', flexShrink: 0, mt: '2px' }}
      >
        <TriangleAlert size={16} aria-hidden />
      </Box>
      <Stack spacing={0.5}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t.bannerAccuracy}</Typography>
        {notes.map((note, index) => (
          // Notes are plain text lines in a fixed order; nothing reorders them.
          // biome-ignore lint/suspicious/noArrayIndexKey: static list, see above
          <Typography key={index} sx={{ fontSize: 13, color: 'text.primary' }}>
            {note}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}
