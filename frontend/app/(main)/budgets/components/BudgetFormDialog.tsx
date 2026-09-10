'use client';

import apiClient from '@/app/lib/api';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import NextLink from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { BudgetFormData, BudgetItem } from '../hooks/useBudgetsPage';

interface CategoryOption {
  id: string;
  name: string;
  type: string;
}

interface GoalOption {
  id: string;
  name: string;
}

const NO_GOAL = '';

interface BudgetFormDialogProps {
  open: boolean;
  editing: BudgetItem | null;
  formData: BudgetFormData;
  saving: boolean;
  onFormChange: (data: BudgetFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

export function BudgetFormDialog({
  open,
  editing,
  formData,
  saving,
  onFormChange,
  onSave,
  onClose,
}: BudgetFormDialogProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  // null until the goals request settles, so the empty-state hint below never
  // flashes while they are still loading.
  const [goals, setGoals] = useState<GoalOption[] | null>(null);

  useEffect(() => {
    if (!open) return;
    apiClient
      .get('/categories')
      .then(res => {
        const data = res.data?.data ?? res.data ?? [];
        setCategories(data.filter((c: CategoryOption) => c.type === 'expense'));
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    apiClient
      .get('/goals')
      .then(res => {
        setGoals(res.data?.data ?? res.data ?? []);
      })
      // A member without goal.view keeps the picker empty and unexplained —
      // the budget is still saveable without a goal.
      .catch(() => {});
  }, [open]);

  const handleChange = useCallback(
    (field: keyof BudgetFormData, value: string | number) => {
      onFormChange({ ...formData, [field]: value });
    },
    [formData, onFormChange],
  );

  const hasBackwardsWindow = Boolean(
    formData.startsOn && formData.endsOn && formData.startsOn > formData.endsOn,
  );
  const isValid =
    formData.name.trim() && formData.categoryId && formData.limitAmount > 0 && !hasBackwardsWindow;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Edit Budget' : 'New Budget'}</DialogTitle>
      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}
      >
        <TextField
          label="Name"
          value={formData.name}
          onChange={e => handleChange('name', e.target.value)}
          fullWidth
          size="small"
        />

        <FormControl fullWidth size="small">
          <InputLabel>Category</InputLabel>
          <Select
            value={formData.categoryId}
            label="Category"
            onChange={e => handleChange('categoryId', e.target.value)}
            disabled={!!editing}
          >
            {categories.map(cat => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Limit Amount"
          type="number"
          value={formData.limitAmount || ''}
          onChange={e => handleChange('limitAmount', Number(e.target.value))}
          fullWidth
          size="small"
          inputProps={{ min: 0, step: 1000 }}
        />

        <FormControl fullWidth size="small">
          <InputLabel>Period</InputLabel>
          <Select
            value={formData.periodType}
            label="Period"
            onChange={e => handleChange('periodType', e.target.value)}
            disabled={!!editing}
          >
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="quarterly">Quarterly</MenuItem>
            <MenuItem value="annual">Annual</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Goal</InputLabel>
          <Select
            value={formData.goalId}
            label="Goal"
            onChange={e => handleChange('goalId', e.target.value)}
          >
            <MenuItem value={NO_GOAL}>
              <em>No goal</em>
            </MenuItem>
            {(goals ?? []).map(goal => (
              <MenuItem key={goal.id} value={goal.id}>
                {goal.name}
              </MenuItem>
            ))}
          </Select>
          {/* Budgets only link to goals; goals themselves are created on their
              own page, so an empty picker points the way there. */}
          {goals?.length === 0 && (
            <FormHelperText>
              No goals yet —{' '}
              <Link component={NextLink} href="/goals" onClick={onClose}>
                create one on the Goals page
              </Link>
            </FormHelperText>
          )}
        </FormControl>

        {/* A project budget runs only while the project does. Left empty — the
            normal case — the budget behaves as it always has and never ends. */}
        <TextField
          label="Starts on"
          type="date"
          value={formData.startsOn}
          onChange={e => handleChange('startsOn', e.target.value)}
          fullWidth
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <TextField
          label="Ends on"
          type="date"
          value={formData.endsOn}
          onChange={e => handleChange('endsOn', e.target.value)}
          fullWidth
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          error={hasBackwardsWindow}
          helperText={hasBackwardsWindow ? 'Must not be earlier than the start date' : undefined}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained" disabled={!isValid || saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
