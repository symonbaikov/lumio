'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import type { GoalFormData } from '../hooks/useGoals';

interface GoalFormDialogProps {
  open: boolean;
  title: string;
  form: GoalFormData;
  saving: boolean;
  labels: { name: string; target: string; date: string; save: string; cancel: string };
  onChange: (form: GoalFormData) => void;
  onClose: () => void;
  onSave: () => void;
}

export function GoalFormDialog({
  open,
  title,
  form,
  saving,
  labels,
  onChange,
  onClose,
  onSave,
}: GoalFormDialogProps) {
  const canSave = form.name.trim() !== '' && form.targetAmount > 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label={labels.name}
          size="small"
          autoFocus
          value={form.name}
          onChange={event => onChange({ ...form, name: event.target.value })}
        />
        <TextField
          label={labels.target}
          type="number"
          size="small"
          value={form.targetAmount || ''}
          onChange={event => onChange({ ...form, targetAmount: Number(event.target.value) })}
          slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
        />
        <TextField
          label={labels.date}
          type="date"
          size="small"
          value={form.targetDate}
          onChange={event => onChange({ ...form, targetDate: event.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{labels.cancel}</Button>
        <Button variant="contained" disabled={!canSave || saving} onClick={onSave}>
          {labels.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
