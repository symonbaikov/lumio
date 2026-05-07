'use client';

import { Plus } from '@/app/components/icons';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import type React from 'react';
import type { ReactNode } from 'react';
import type { BudgetFormData, BudgetItem } from '../hooks/useBudgetsPage';
import { BudgetCard } from './BudgetCard';
import { BudgetFormDrawer } from './BudgetFormDrawer';

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

interface SummaryCardProps {
  label: string;
  value: ReactNode;
}

interface BudgetSummary {
  totalLimit: number;
  totalSpent: number;
  overBudgetCount: number;
}

interface AmountFormatInput {
  amount: number;
  currency: string;
}

type BudgetListStateProps = Pick<
  BudgetsContentProps,
  'budgets' | 'loading' | 'error' | 'openCreate' | 'openEdit' | 'handleDelete'
>;

function SummaryCard({ label, value }: SummaryCardProps): React.JSX.Element {
  return (
    <Card variant="outlined">
      <CardContent
        sx={{
          py: { xs: 2, sm: 2 },
          px: { xs: 2, sm: 2 },
          '&:last-child': { pb: { xs: 2, sm: 2 } },
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: 16, sm: 14 } }}>
          {label}
        </Typography>
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ fontSize: { xs: 20, sm: 18 }, lineHeight: 1.2, mt: 0.5 }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function formatAmount({ amount, currency }: AmountFormatInput): string {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
}

function getBudgetSummary(budgets: BudgetItem[]): BudgetSummary {
  const summary = { totalLimit: 0, totalSpent: 0, overBudgetCount: 0 };

  for (const budget of budgets) {
    summary.totalLimit += budget.limitAmount;
    summary.totalSpent += budget.spentAmount;
    if (budget.percentUsed >= 100) {
      summary.overBudgetCount += 1;
    }
  }

  return summary;
}

function BudgetCreateButton({
  openCreate,
}: Pick<BudgetsContentProps, 'openCreate'>): React.JSX.Element {
  return (
    <Button
      variant="contained"
      startIcon={<Plus size={18} />}
      onClick={openCreate}
      aria-label="New Budget"
      sx={{
        flexShrink: 0,
        minWidth: { xs: 56, md: 'auto' },
        width: { xs: 56, md: 'auto' },
        height: { xs: 56, md: 36 },
        px: { xs: 0, md: 2 },
        '& .MuiButton-startIcon': { m: { xs: 0, md: '0 8px 0 -4px' } },
      }}
    >
      <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
        New Budget
      </Box>
    </Button>
  );
}

function BudgetHeader({ openCreate }: Pick<BudgetsContentProps, 'openCreate'>): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        mb: { xs: 2.5, sm: 3 },
      }}
    >
      <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: 28, sm: 24 } }}>
        Budgets
      </Typography>
      <BudgetCreateButton openCreate={openCreate} />
    </Box>
  );
}

function SummaryGrid({ summary }: { summary: BudgetSummary }): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'grid',
        width: '100%',
        minWidth: 0,
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: 'repeat(3, minmax(0, 1fr))',
        },
        gap: { xs: 1.5, md: 2 },
        mb: 3,
      }}
    >
      <SummaryCard
        label="Total limit"
        value={formatAmount({ amount: summary.totalLimit, currency: 'KZT' })}
      />
      <SummaryCard
        label="Spent"
        value={formatAmount({ amount: summary.totalSpent, currency: 'KZT' })}
      />
      <SummaryCard label="Over budget" value={summary.overBudgetCount} />
    </Box>
  );
}

function LoadingState(): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress />
    </Box>
  );
}

function ErrorState({ error }: { error: string }): React.JSX.Element {
  return (
    <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
      {error}
    </Typography>
  );
}

function EmptyState({ openCreate }: Pick<BudgetsContentProps, 'openCreate'>): React.JSX.Element {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        No budgets yet. Create one to start tracking your spending.
      </Typography>
      <Button variant="outlined" onClick={openCreate}>
        Create your first budget
      </Button>
    </Box>
  );
}

function BudgetGrid({
  budgets,
  openEdit,
  handleDelete,
}: Pick<BudgetListStateProps, 'budgets' | 'openEdit' | 'handleDelete'>): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: 'repeat(auto-fill, minmax(320px, 1fr))',
        },
        gap: { xs: 1.5, md: 2 },
        width: '100%',
        minWidth: 0,
      }}
    >
      {budgets.map(budget => (
        <BudgetCard key={budget.id} budget={budget} onEdit={openEdit} onDelete={handleDelete} />
      ))}
    </Box>
  );
}

function BudgetListState({
  budgets,
  loading,
  error,
  openCreate,
  openEdit,
  handleDelete,
}: BudgetListStateProps): React.JSX.Element {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (budgets.length === 0) {
    return <EmptyState openCreate={openCreate} />;
  }

  return <BudgetGrid budgets={budgets} openEdit={openEdit} handleDelete={handleDelete} />;
}

export function BudgetsContent(props: BudgetsContentProps): React.JSX.Element {
  const summary = getBudgetSummary(props.budgets);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        p: { xs: 2, md: 3 },
        pb: { xs: 10, md: 3 },
        flex: 1,
        minWidth: 0,
        overflowX: 'hidden',
      }}
    >
      <BudgetHeader openCreate={props.openCreate} />
      <SummaryGrid summary={summary} />
      <BudgetListState {...props} />

      <BudgetFormDrawer
        open={props.dialogOpen}
        editing={props.editingBudget}
        formData={props.formData}
        saving={props.saving}
        onFormChange={props.setFormData}
        onSave={props.handleSave}
        onClose={props.closeDialog}
      />
    </Box>
  );
}
