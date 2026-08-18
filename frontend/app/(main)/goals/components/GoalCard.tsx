'use client';

import { formatMoney } from '@/app/lib/format-money';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import type { Goal } from '../hooks/useGoals';

interface GoalCardProps {
  goal: Goal;
  locale: string;
  labels: {
    addContribution: string;
    edit: string;
    remove: string;
    reached: string;
    remaining: string;
  };
  onContribute: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

export function GoalCard({ goal, locale, labels, onContribute, onEdit, onDelete }: GoalCardProps) {
  const money = (value: number) => formatMoney(value, goal.currency, locale);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: tokens.radius.md,
        bgcolor: 'background.paper',
        p: 2.5,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1" fontWeight={600} noWrap>
            {goal.name}
          </Typography>
          {goal.targetDate && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {goal.targetDate}
            </Typography>
          )}
        </Box>
        <Typography variant="body1" fontWeight={600}>
          {money(goal.currentAmount)}{' '}
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
            / {money(goal.targetAmount)}
          </Typography>
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        // The bar stops at full even when the goal is overshot; the numbers
        // above it still show the real amount.
        value={Math.min(goal.percent, 100)}
        color={goal.isReached ? 'success' : 'primary'}
        sx={{ height: 8, borderRadius: tokens.radius.full, my: 1.5 }}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          variant="body2"
          sx={{ color: goal.isReached ? 'success.main' : 'text.secondary' }}
        >
          {goal.isReached
            ? labels.reached
            : `${money(goal.remaining)} ${labels.remaining} · ${goal.percent}%`}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => onContribute(goal)}>
            {labels.addContribution}
          </Button>
          <Button size="small" onClick={() => onEdit(goal)}>
            {labels.edit}
          </Button>
          <Button size="small" color="error" onClick={() => onDelete(goal)}>
            {labels.remove}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
