'use client';

import {
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  Link,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import NextLink from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft } from '@/app/components/icons';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import apiClient from '@/app/lib/api';
import type { BudgetFormData, BudgetItem } from '../hooks/useBudgetsPage';

type CategoryOption = { id: string; name: string; type: string };
type GoalOption = { id: string; name: string };

const NO_GOAL = '';

interface BudgetFormDrawerProps {
  open: boolean;
  editing: BudgetItem | null;
  formData: BudgetFormData;
  saving: boolean;
  onFormChange: (data: BudgetFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

type FieldChange = { field: keyof BudgetFormData; value: string | number };

function useExpenseCategories(open: boolean): CategoryOption[] {
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    apiClient
      .get('/categories')
      .then(res => {
        const data = res.data?.data ?? res.data ?? [];
        setCategories(data.filter((category: CategoryOption) => category.type === 'expense'));
      })
      .catch(() => {
        setCategories([]);
      });
  }, [open]);

  return categories;
}

// null until the goals request settles, so the empty-state hint below never
// flashes while they are still loading.
function useGoals(open: boolean): GoalOption[] | null {
  const [goals, setGoals] = useState<GoalOption[] | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    apiClient
      .get('/goals')
      .then(res => {
        setGoals(res.data?.data ?? res.data ?? []);
      })
      // A member without goal.view keeps the picker empty and unexplained —
      // the budget is still saveable without a goal.
      .catch(() => {});
  }, [open]);

  return goals;
}

function DrawerTitle({
  editing,
  onClose,
}: Pick<BudgetFormDrawerProps, 'editing' | 'onClose'>): React.JSX.Element {
  return (
    <div className="lumio-payable-drawer__title-wrap">
      <button
        type="button"
        onClick={onClose}
        className="lumio-payable-drawer__back-btn"
        aria-label="Cancel"
      >
        <ChevronLeft size={20} />
      </button>
      <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>
        {editing ? 'Edit Budget' : 'New Budget'}
      </span>
    </div>
  );
}

function NameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <TextField
      label="Name"
      value={value}
      onChange={event => onChange(event.target.value)}
      fullWidth
    />
  );
}

function CategoryField({
  value,
  disabled,
  categories,
  onChange,
}: {
  value: string;
  disabled: boolean;
  categories: CategoryOption[];
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <FormControl fullWidth>
      <InputLabel>Category</InputLabel>
      <Select
        value={value}
        label="Category"
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      >
        {categories.map(category => (
          <MenuItem key={category.id} value={category.id}>
            {category.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function LimitAmountField({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <TextField
      label="Limit Amount"
      type="number"
      value={value || ''}
      onChange={event => onChange(Number(event.target.value))}
      fullWidth
      inputProps={{ min: 0, step: 1000 }}
    />
  );
}

function PeriodField({
  value,
  disabled,
  onChange,
}: {
  value: BudgetFormData['periodType'];
  disabled: boolean;
  onChange: (value: BudgetFormData['periodType']) => void;
}): React.JSX.Element {
  return (
    <FormControl fullWidth>
      <InputLabel>Period</InputLabel>
      <Select
        value={value}
        label="Period"
        onChange={event => onChange(event.target.value as BudgetFormData['periodType'])}
        disabled={disabled}
      >
        <MenuItem value="weekly">Weekly</MenuItem>
        <MenuItem value="monthly">Monthly</MenuItem>
        <MenuItem value="quarterly">Quarterly</MenuItem>
        <MenuItem value="annual">Annual</MenuItem>
      </Select>
    </FormControl>
  );
}

function GoalField({
  value,
  goals,
  onChange,
  onClose,
}: {
  value: string;
  goals: GoalOption[] | null;
  onChange: (value: string) => void;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <FormControl fullWidth>
      <InputLabel>Goal</InputLabel>
      <Select value={value} label="Goal" onChange={event => onChange(event.target.value)}>
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
  );
}

function StartsOnField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <TextField
      label="Starts on"
      type="date"
      value={value}
      onChange={event => onChange(event.target.value)}
      fullWidth
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );
}

function EndsOnField({
  value,
  invalid,
  onChange,
}: {
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <TextField
      label="Ends on"
      type="date"
      value={value}
      onChange={event => onChange(event.target.value)}
      fullWidth
      slotProps={{ inputLabel: { shrink: true } }}
      error={invalid}
      helperText={invalid ? 'Must not be earlier than the start date' : undefined}
    />
  );
}

function FormFields({
  editing,
  formData,
  categories,
  goals,
  hasBackwardsWindow,
  onChange,
  onClose,
}: Pick<BudgetFormDrawerProps, 'editing' | 'formData' | 'onClose'> & {
  categories: CategoryOption[];
  goals: GoalOption[] | null;
  hasBackwardsWindow: boolean;
  onChange: (change: FieldChange) => void;
}): React.JSX.Element {
  const isEditing = Boolean(editing);

  return (
    // The scroll container would clip the first field's floating label, which
    // sits above the input, so the padding keeps it inside.
    <div
      style={{
        display: 'grid',
        gap: 16,
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        padding: '10px 4px 4px',
      }}
    >
      <NameField value={formData.name} onChange={value => onChange({ field: 'name', value })} />
      <CategoryField
        value={formData.categoryId}
        disabled={isEditing}
        categories={categories}
        onChange={value => onChange({ field: 'categoryId', value })}
      />
      <LimitAmountField
        value={formData.limitAmount}
        onChange={value => onChange({ field: 'limitAmount', value })}
      />
      <PeriodField
        value={formData.periodType}
        disabled={isEditing}
        onChange={value => onChange({ field: 'periodType', value })}
      />
      <GoalField
        value={formData.goalId}
        goals={goals}
        onChange={value => onChange({ field: 'goalId', value })}
        onClose={onClose}
      />
      {/* A project budget runs only while the project does. Left empty — the
          normal case — the budget behaves as it always has and never ends. */}
      <StartsOnField
        value={formData.startsOn}
        onChange={value => onChange({ field: 'startsOn', value })}
      />
      <EndsOnField
        value={formData.endsOn}
        invalid={hasBackwardsWindow}
        onChange={value => onChange({ field: 'endsOn', value })}
      />
    </div>
  );
}

function DrawerFooter({
  saving,
  onSave,
  onClose,
  canSave,
}: Pick<BudgetFormDrawerProps, 'saving' | 'onSave' | 'onClose'> & {
  canSave: boolean;
}): React.JSX.Element {
  return (
    <div className="lumio-payable-drawer__footer">
      <Button variant="outlined" sx={{ flex: 1 }} onClick={onClose} disabled={saving}>
        Cancel
      </Button>
      <Button variant="contained" sx={{ flex: 1 }} onClick={onSave} disabled={saving || !canSave}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}

export function BudgetFormDrawer(props: BudgetFormDrawerProps): React.JSX.Element {
  const categories = useExpenseCategories(props.open);
  const goals = useGoals(props.open);
  const { formData, onFormChange } = props;
  const handleChange = useCallback(
    (change: FieldChange): void => {
      onFormChange({ ...formData, [change.field]: change.value });
    },
    [formData, onFormChange],
  );

  const hasBackwardsWindow = Boolean(
    formData.startsOn && formData.endsOn && formData.startsOn > formData.endsOn,
  );
  const canSave = Boolean(
    formData.name.trim() && formData.categoryId && formData.limitAmount > 0 && !hasBackwardsWindow,
  );

  return (
    <DrawerShell
      isOpen={props.open}
      onClose={props.onClose}
      position="right"
      width="lg"
      showCloseButton={false}
      sx={{
        maxWidth: '100%',
        borderLeft: 0,
        bgcolor: 'background.paper',
        '@media (min-width:600px)': { maxWidth: 512 },
      }}
      title={<DrawerTitle editing={props.editing} onClose={props.onClose} />}
    >
      <div className="lumio-payable-drawer__body">
        <FormFields
          editing={props.editing}
          formData={formData}
          categories={categories}
          goals={goals}
          hasBackwardsWindow={hasBackwardsWindow}
          onChange={handleChange}
          onClose={props.onClose}
        />
        <DrawerFooter
          saving={props.saving}
          onSave={props.onSave}
          onClose={props.onClose}
          canSave={canSave}
        />
      </div>
    </DrawerShell>
  );
}
