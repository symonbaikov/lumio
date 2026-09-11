'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type React from 'react';
import { useIntlayer } from '@/app/i18n';
import type { GoalPlanResponse, GoalPlanStatus } from '@/app/lib/goals-api';
import { tokens } from '@/lib/theme-tokens';

export interface GoalPlanCardProps {
  plan: GoalPlanResponse;
  locale: string;
  /** Formats an amount already converted to the workspace currency. */
  formatAmount: (value: number) => string;
}

/**
 * What the goal demands per month, what it is actually getting, and whether the
 * income left over after the existing budgets can carry either number.
 *
 * The three figures are shown side by side on purpose: a required amount means
 * nothing without the free cash flow it has to come out of, and a pace means
 * nothing without the date it is racing.
 */
export function GoalPlanCard({ plan, locale, formatAmount }: GoalPlanCardProps): React.JSX.Element {
  const t = useIntlayer('goalDetailPage');

  const statusLabels: Record<GoalPlanStatus, string> = {
    reached: t.statusReached.value,
    on_track: t.statusOnTrack.value,
    tight: t.statusTight.value,
    not_feasible: t.statusNotFeasible.value,
    no_deadline: t.statusNoDeadline.value,
  };

  const forecastLabel = plan.forecast.month
    ? formatMonth(plan.forecast.month, locale)
    : t.planNoHistory.value;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: tokens.radius.md,
        bgcolor: 'background.paper',
        p: 2,
        mt: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          {t.planTitle}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {plan.monthsLeft !== null && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t.planMonthsLeft.value.replace('{{count}}', String(plan.monthsLeft))}
            </Typography>
          )}
          <Chip size="small" label={statusLabels[plan.status]} color={statusColor(plan.status)} />
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <Stat
          label={t.planRequired}
          value={plan.requiredPerMonth === null ? '—' : formatAmount(plan.requiredPerMonth)}
        />
        <Stat label={t.planPace} value={formatAmount(plan.pace.perMonth)} />
        <Stat
          label={t.planForecast}
          value={forecastLabel}
          hint={
            plan.forecast.monthsLate
              ? t.planLate.value.replace('{{count}}', String(plan.forecast.monthsLate))
              : undefined
          }
          tone={plan.forecast.monthsLate ? 'error' : undefined}
        />
        <Stat
          label={t.planFree}
          value={formatAmount(plan.capacity.free)}
          tone={plan.capacity.free <= 0 ? 'error' : undefined}
        />
      </Box>

      {/* Only the shortfall is called out. A plan that fits needs no commentary,
          and repeating "you have room" on every goal trains the eye to skip it. */}
      {plan.gap !== null && plan.gap > 0 && (
        <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 600 }}>
          {t.planGap}: {formatAmount(plan.gap)}
        </Typography>
      )}
    </Box>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: React.ReactNode;
  value: string;
  hint?: string;
  tone?: 'error';
}): React.JSX.Element {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body1" fontWeight={600} color={tone === 'error' ? 'error' : undefined}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color={tone === 'error' ? 'error' : 'text.secondary'}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}

function statusColor(status: GoalPlanStatus): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'reached':
    case 'on_track':
      return 'success';
    case 'tight':
      return 'warning';
    case 'not_feasible':
      return 'error';
    case 'no_deadline':
      return 'default';
  }
}

/** `YYYY-MM` as a month the reader recognises, e.g. "октябрь 2026". */
function formatMonth(month: string, locale: string): string {
  const [year, index] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, index - 1, 1));
}
