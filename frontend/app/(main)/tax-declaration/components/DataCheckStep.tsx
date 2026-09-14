'use client';

import { Alert, AlertTitle, Box, Button, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import type React from 'react';
import type { ReactNode } from 'react';
import { useIntlayer, useLocale } from '@/app/i18n';
import { completenessTone, issueTarget, type StepKey } from '../tax-declaration.helpers';
import type { CompletenessIssue, CompletenessReport, IssueCode } from '../tax-declaration.types';

const SEVERITY: Record<CompletenessIssue['severity'], 'error' | 'warning' | 'info'> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
};

function monthName(month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2000, month - 1, 1));
}

/** The specifics behind an issue: which accounts miss which months, which categories, which currencies. */
function IssueDetails({ issue }: { issue: CompletenessIssue }): React.ReactElement | null {
  const { locale } = useLocale();
  const params = issue.params ?? {};

  if (issue.code === 'statement_coverage_gaps') {
    const accounts = (params.accounts ?? []) as Array<{ account: string; months: number[] }>;
    return (
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {accounts.map(account => (
          <li key={account.account}>
            {account.account}: {account.months.map(month => monthName(month, locale)).join(', ')}
          </li>
        ))}
      </Box>
    );
  }
  if (issue.code === 'unmapped_categories') {
    const categories = (params.categories ?? []) as Array<{
      name: string;
      transactionCount: number;
    }>;
    return (
      <Typography sx={{ fontSize: 13 }}>
        {categories.map(category => `${category.name} (${category.transactionCount})`).join(', ')}
      </Typography>
    );
  }
  if (issue.code === 'missing_exchange_rates') {
    return (
      <Typography sx={{ fontSize: 13 }}>
        {((params.currencies ?? []) as string[]).join(', ')}
      </Typography>
    );
  }
  return null;
}

interface DataCheckStepProps {
  completeness: CompletenessReport;
  onGoToStep: (step: StepKey) => void;
}

export function DataCheckStep({
  completeness,
  onGoToStep,
}: DataCheckStepProps): React.ReactElement {
  const t = useIntlayer('taxDeclarationPage');
  const issueLabels = t.issues as unknown as Record<IssueCode, ReactNode>;
  const tone = completenessTone(completeness.score);

  const fixButton = (issue: CompletenessIssue): ReactNode => {
    const target = issueTarget(issue.code);
    if (target?.kind === 'route') {
      return (
        <Button component={Link} href={target.href} size="small" color="inherit">
          {t.fixAction}
        </Button>
      );
    }
    if (target?.kind === 'step') {
      return (
        <Button size="small" color="inherit" onClick={() => onGoToStep(target.step)}>
          {t.fixAction}
        </Button>
      );
    }
    return undefined;
  };

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 820 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: `${tone}.main` }}>
          {completeness.score}
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>/ 100 · {t.completenessLabel}</Typography>
      </Box>

      {completeness.activeDaysRatio !== null ? (
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          {t.activeDays}: {Math.round(completeness.activeDaysRatio * 100)}%
        </Typography>
      ) : null}

      <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{t.dataIntro}</Typography>

      {completeness.issues.length === 0 ? (
        <Alert severity="success">{t.noIssues}</Alert>
      ) : (
        <Stack spacing={1}>
          {completeness.issues.map(issue => (
            <Alert key={issue.code} severity={SEVERITY[issue.severity]} action={fixButton(issue)}>
              <AlertTitle sx={{ mb: 0.25 }}>
                {issueLabels[issue.code] ?? issue.code}: {issue.count}
              </AlertTitle>
              <IssueDetails issue={issue} />
            </Alert>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
