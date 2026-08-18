'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';

interface ContributionDialogProps {
  open: boolean;
  title: string;
  amount: string;
  note: string;
  saving: boolean;
  labels: { amount: string; note: string; save: string; cancel: string };
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function ContributionDialog({
  open,
  title,
  amount,
  note,
  saving,
  labels,
  onAmountChange,
  onNoteChange,
  onClose,
  onSave,
}: ContributionDialogProps) {
  // Zero would be a no-op row in the log; anything else, including a
  // negative withdrawal, is a real movement.
  const canSave = amount.trim() !== '' && Number(amount) !== 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label={labels.amount}
          type="number"
          size="small"
          autoFocus
          value={amount}
          onChange={event => onAmountChange(event.target.value)}
          slotProps={{ htmlInput: { step: '0.01' } }}
        />
        <TextField
          label={labels.note}
          size="small"
          value={note}
          onChange={event => onNoteChange(event.target.value)}
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
