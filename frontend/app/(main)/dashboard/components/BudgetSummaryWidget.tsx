'use client';

import { PiggyBank } from '@/app/components/icons';
import apiClient from '@/app/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface BudgetSummary {
  id: string;
  name: string;
  category?: { name: string };
  limitAmount: number;
  spentAmount: number;
  percentUsed: number;
  currency: string;
}

function getColor(percent: number): 'success' | 'warning' | 'error' {
  if (percent >= 100) return 'error';
  if (percent >= 80) return 'warning';
  return 'success';
}

export function BudgetSummaryWidget() {
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiClient
      .get('/budgets')
      .then(res => {
        const data: BudgetSummary[] = res.data?.data ?? res.data ?? [];
        const sorted = [...data].sort((a, b) => b.percentUsed - a.percentUsed).slice(0, 5);
        setBudgets(sorted);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (budgets.length === 0) {
    return (
      <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <PiggyBank size={18} />
          <Typography variant="subtitle2" fontWeight={600}>Budgets</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Set up budgets to track spending by category.
        </Typography>
        <Button component={Link} href="/budgets" size="small" variant="text">
          Set up budgets
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PiggyBank size={18} />
          <Typography variant="subtitle2" fontWeight={600}>Budgets</Typography>
        </Box>
        <Button component={Link} href="/budgets" size="small" variant="text">
          View all
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {budgets.map(b => (
          <Box key={b.id}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: '60%' }}>
                {b.category?.name ?? b.name}
              </Typography>
              <Typography variant="caption" fontWeight={600} color={`${getColor(b.percentUsed)}.main`}>
                {Math.round(b.percentUsed)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(b.percentUsed, 100)}
              color={getColor(b.percentUsed)}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
