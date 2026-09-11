'use client';

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import type React from 'react';
import type { GoalFlowResponse } from '@/app/lib/goals-api';
import { tokens } from '@/lib/theme-tokens';

export interface GoalProgressHeaderProps {
  goal: GoalFlowResponse['goal'];
  labels: { reached: string; remaining: string };
  formatAmount: (value: number) => string;
}

export function GoalProgressHeader({
  goal,
  labels,
  formatAmount,
}: GoalProgressHeaderProps): React.JSX.Element {
  const isReached = goal.remaining === 0;

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          {goal.name}
        </Typography>
        <Typography variant="body1" fontWeight={600}>
          {formatAmount(goal.currentAmount)}{' '}
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
            / {formatAmount(goal.targetAmount)}
          </Typography>
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        // The bar stops at full even when the goal is overshot; the numbers
        // above it still show the real amount.
        value={progressPercent(goal.currentAmount, goal.targetAmount)}
        color={isReached ? 'success' : 'primary'}
        sx={{ height: 8, borderRadius: tokens.radius.full, my: 1.5 }}
      />

      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {isReached ? labels.reached : `${formatAmount(goal.remaining)} ${labels.remaining}`}
        {goal.targetDate ? ` · ${goal.targetDate}` : ''}
      </Typography>
    </Box>
  );
}

function progressPercent(current: number, target: number): number {
  return target > 0 ? Math.min((current / target) * 100, 100) : 0;
}
