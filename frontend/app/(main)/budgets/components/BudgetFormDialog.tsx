'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/app/lib/api';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import type { BudgetFormData, BudgetItem } from '../hooks/useBudgetsPage';

interface CategoryOption {
  id: string;
  name: string;
  type: string;
}

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

  useEffect(() => {
    if (!open) return;
    apiClient.get('/categories').then(res => {
      const data = res.data?.data ?? res.data ?? [];
      setCategories(data.filter((c: CategoryOption) => c.type === 'expense'));
    }).catch(() => {});
  }, [open]);

  const handleChange = useCallback(
    (field: keyof BudgetFormData, value: string | number) => {
      onFormChange({ ...formData, [field]: value });
    },
    [formData, onFormChange],
  );

  const isValid = formData.name.trim() && formData.categoryId && formData.limitAmount > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Edit Budget' : 'New Budget'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
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
