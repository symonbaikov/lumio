'use client';

import { Alert, Box, Chip, Link as MuiLink, Stack, Typography } from '@mui/material';
import type React from 'react';
import type { ReactNode } from 'react';
import { useIntlayer, useLocale } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import { formatFilingDate, isDeadlinePassed } from '../filing-info.helpers';
import type { FilingInfo } from '../tax-declaration.types';

/**
 * Form, deadlines and portal for the country and year, from verified entries
 * only. Where the authority prepares the return itself, that is said up front:
 * the draft is then something to check the authority's figures against.
 */
export function FilingInfoCard({ info }: { info: FilingInfo }): React.ReactElement {
  const t = useIntlayer('taxDeclarationPage');
  const { locale } = useLocale();
  const kindLabels = t.deadlineKinds as unknown as Record<string, ReactNode>;
  const preparationLabels = t.authority as unknown as Record<string, ReactNode>;

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: tokens.radius.md, p: 2 }}>
      <Stack spacing={1}>
        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>
          {t.filingTitle}: {info.formName}
        </Typography>

        {info.filingOpens ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {t.filingOpens} {formatFilingDate(info.filingOpens, locale)}
          </Typography>
        ) : null}

        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {info.deadlines.map(deadline => (
            <li key={`${deadline.kind}-${deadline.date}`}>
              <Typography component="span" sx={{ fontSize: 14 }}>
                {formatFilingDate(deadline.date, locale)} —{' '}
                {kindLabels[deadline.kind] ?? deadline.kind}
              </Typography>
              {isDeadlinePassed(deadline.date) ? (
                <Chip size="small" label={t.deadlinePassed.value} sx={{ ml: 1 }} />
              ) : null}
            </li>
          ))}
        </Box>

        {info.portal ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {t.portalLabel}: {info.portal}
          </Typography>
        ) : null}

        {info.authorityPreparation ? (
          <Alert severity="info">{preparationLabels[info.authorityPreparation]}</Alert>
        ) : null}

        <MuiLink
          href={info.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ fontSize: 12, alignSelf: 'flex-start' }}
        >
          {t.sourceLabel}
        </MuiLink>
      </Stack>
    </Box>
  );
}
