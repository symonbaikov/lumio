'use client';

import { Pencil, Trash2 } from '@/app/components/icons';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import type { BudgetItem } from '../hooks/useBudgetsPage';

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

function getProgressColor(percent: number): 'success' | 'warning' | 'error' {
  if (percent >= 100) return 'error';
  if (percent >= 80) return 'warning';
  return 'success';
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ` ${currency}`;
}

interface BudgetCardProps {
  budget: BudgetItem;
  onEdit: (budget: BudgetItem) => void;
  onDelete: (id: string) => void;
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const color = getProgressColor(budget.percentUsed);
  const progressValue = Math.min(budget.percentUsed, 100);

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        '&:hover': { borderColor: 'action.hover' },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {budget.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {budget.category?.name ?? 'Unknown category'} · {PERIOD_LABELS[budget.periodType]}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => onEdit(budget)}>
            <Pencil size={16} />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(budget.id)}>
            <Trash2 size={16} />
          </IconButton>
        </Box>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progressValue}
        color={color}
        sx={{ height: 8, borderRadius: 4, mb: 1 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {formatAmount(budget.spentAmount, budget.currency)} / {formatAmount(budget.limitAmount, budget.currency)}
        </Typography>
        <Typography variant="body2" fontWeight={600} color={`${color}.main`}>
          {Math.round(budget.percentUsed)}%
        </Typography>
      </Box>
    </Box>
  );
}
