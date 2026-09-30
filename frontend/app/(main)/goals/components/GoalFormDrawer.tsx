'use client';

import TextField from '@mui/material/TextField';
import type { GoalFormData } from '../hooks/useGoals';
import { GoalSideDrawer } from './GoalSideDrawer';

interface GoalFormDrawerProps {
  open: boolean;
  title: string;
  form: GoalFormData;
  saving: boolean;
  labels: { name: string; target: string; date: string; save: string; cancel: string };
  onChange: (form: GoalFormData) => void;
  onClose: () => void;
  onSave: () => void;
}

export function GoalFormDrawer({
  open,
  title,
  form,
  saving,
  labels,
  onChange,
  onClose,
  onSave,
}: GoalFormDrawerProps) {
  const canSave = form.name.trim() !== '' && form.targetAmount > 0;

  return (
    <GoalSideDrawer
      open={open}
      title={title}
      saving={saving}
      canSave={canSave}
      labels={labels}
      onClose={onClose}
      onSave={onSave}
    >
      <TextField
        label={labels.name}
        autoFocus
        fullWidth
        value={form.name}
        onChange={event => onChange({ ...form, name: event.target.value })}
      />
      <TextField
        label={labels.target}
        type="number"
        fullWidth
        value={form.targetAmount || ''}
        onChange={event => onChange({ ...form, targetAmount: Number(event.target.value) })}
        slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
      />
      <TextField
        label={labels.date}
        type="date"
        fullWidth
        value={form.targetDate}
        onChange={event => onChange({ ...form, targetDate: event.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </GoalSideDrawer>
  );
}
