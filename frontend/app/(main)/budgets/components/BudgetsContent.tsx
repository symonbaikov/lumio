'use client';

import { Plus } from '@/app/components/icons';
import { Spinner } from '@/app/components/ui/spinner';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { BudgetFormData, BudgetItem } from '../hooks/useBudgetsPage';
import { BudgetCard } from './BudgetCard';
import { BudgetFormDialog } from './BudgetFormDialog';

interface BudgetsContentProps {
  budgets: BudgetItem[];
  loading: boolean;
  error: string | null;
  dialogOpen: boolean;
  editingBudget: BudgetItem | null;
  formData: BudgetFormData;
  saving: boolean;
  setFormData: (data: BudgetFormData) => void;
  openCreate: () => void;
  openEdit: (budget: BudgetItem) => void;
  closeDialog: () => void;
  handleSave: () => void;
  handleDelete: (id: string) => void;
}

export function BudgetsContent({
  budgets,
  loading,
  error,
  dialogOpen,
  editingBudget,
  formData,
  saving,
  setFormData,
  openCreate,
  openEdit,
  closeDialog,
  handleSave,
  handleDelete,
}: BudgetsContentProps) {
  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto', width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Budgets
        </Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={openCreate}>
          New Budget
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Spinner size={32} />
        </Box>
      )}

      {error && !loading && (
        <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
          {error}
        </Typography>
      )}

      {!loading && !error && budgets.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No budgets yet. Create one to start tracking your spending.
          </Typography>
          <Button variant="outlined" onClick={openCreate}>
            Create your first budget
          </Button>
        </Box>
      )}

      {!loading && !error && budgets.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {budgets.map(budget => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </Box>
      )}

      <BudgetFormDialog
        open={dialogOpen}
        editing={editingBudget}
        formData={formData}
        saving={saving}
        onFormChange={setFormData}
        onSave={handleSave}
        onClose={closeDialog}
      />
    </Box>
  );
}
