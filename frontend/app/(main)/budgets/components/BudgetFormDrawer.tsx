'use client';

import { ChevronLeft } from '@/app/components/icons';
import { CurrencyDrawer } from '@/app/components/receipts/components/CurrencyDrawer';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import apiClient from '@/app/lib/api';
import { DEFAULT_CURRENCY } from '@/app/lib/format-money';
import {
  type CurrencySearchItem,
  DEFAULT_RECENT_CURRENCIES,
  buildCurrencySearchIndex,
} from '@/app/lib/statement-expense-drawer';
import { Button, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BudgetDrawerIntent, BudgetFormData, BudgetItem } from '../hooks/useBudgetsPage';

type CategoryOption = { id: string; name: string; type: string };

interface BudgetFormDrawerProps {
  open: boolean;
  editing: BudgetItem | null;
  intent: BudgetDrawerIntent;
  formData: BudgetFormData;
  saving: boolean;
  onFormChange: (data: BudgetFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

type FieldChange = { field: keyof BudgetFormData; value: string | number };
type FormFieldsProps = Pick<BudgetFormDrawerProps, 'editing' | 'formData' | 'intent'> & {
  categories: CategoryOption[];
  onChange: (change: FieldChange) => void;
  onOpenCurrencyDrawer: () => void;
};

function useCurrencyPickerState(currency: string): {
  currencyDrawerOpen: boolean;
  setCurrencyDrawerOpen: (open: boolean) => void;
  currencySearch: string;
  setCurrencySearch: (value: string) => void;
  selectedCurrencyItem: CurrencySearchItem | undefined;
  selectedMatchesSearch: boolean;
  currencyQuery: string;
  recentCurrencyItems: CurrencySearchItem[];
  allCurrencyItems: CurrencySearchItem[];
  pushRecentCurrency: (code: string) => void;
} {
  const [currencyDrawerOpen, setCurrencyDrawerOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [recentCurrencies, setRecentCurrencies] = useState<string[]>([
    ...DEFAULT_RECENT_CURRENCIES,
  ]);
  const currencyItems = useMemo(() => buildCurrencySearchIndex(), []);
  const currencyByCode = useMemo(
    () => new Map(currencyItems.map(item => [item.code, item])),
    [currencyItems],
  );
  const normalizedCurrency = currency.trim().toUpperCase();
  const selectedCurrencyItem = currencyByCode.get(normalizedCurrency);
  const currencyQuery = currencySearch.trim().toLowerCase();
  const selectedMatchesSearch = selectedCurrencyItem
    ? currencyQuery.length === 0 || selectedCurrencyItem.searchText.includes(currencyQuery)
    : false;
  const recentCurrencyItems = useMemo(
    () =>
      recentCurrencies
        .map(code => currencyByCode.get(code))
        .filter((item): item is CurrencySearchItem => Boolean(item))
        .filter(item => item.code !== normalizedCurrency),
    [currencyByCode, normalizedCurrency, recentCurrencies],
  );
  const allCurrencyItems = useMemo(() => {
    const source =
      currencyQuery.length > 0
        ? currencyItems.filter(item => item.searchText.includes(currencyQuery))
        : currencyItems;
    return source.filter(item => item.code !== normalizedCurrency);
  }, [currencyItems, currencyQuery, normalizedCurrency]);

  const pushRecentCurrency = (code: string): void => {
    setRecentCurrencies(prev => [code, ...prev.filter(item => item !== code)]);
    setCurrencySearch('');
    setCurrencyDrawerOpen(false);
  };

  return {
    currencyDrawerOpen,
    setCurrencyDrawerOpen,
    currencySearch,
    setCurrencySearch,
    selectedCurrencyItem,
    selectedMatchesSearch,
    currencyQuery,
    recentCurrencyItems,
    allCurrencyItems,
    pushRecentCurrency,
  };
}

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

function DrawerTitle({
  editing,
  intent,
  onClose,
}: Pick<BudgetFormDrawerProps, 'editing' | 'intent' | 'onClose'>): React.JSX.Element {
  const title = intent === 'spending' ? 'Update Spending' : editing ? 'Edit Budget' : 'New Budget';

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
      <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>{title}</span>
    </div>
  );
}

function CurrencyField({
  value,
  onClick,
}: {
  value: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <TextField
      label="Currency"
      value={value}
      fullWidth
      inputProps={{ readOnly: true }}
      onClick={onClick}
      sx={{ cursor: 'pointer', '& input': { cursor: 'pointer' } }}
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
  const hasSelectedCategory = categories.some(category => category.id === value);

  return (
    <FormControl fullWidth>
      <InputLabel>Category</InputLabel>
      <Select
        value={value}
        label="Category"
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      >
        {value && !hasSelectedCategory ? (
          <MenuItem value={value}>
            {disabled ? 'Selected category' : 'Loading category...'}
          </MenuItem>
        ) : null}
        {categories.map(category => (
          <MenuItem key={category.id} value={category.id}>
            {category.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
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

function ManualSpentAmountField({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <TextField
      label="Manual spent"
      type="number"
      value={value || ''}
      onChange={event => onChange(Number(event.target.value))}
      fullWidth
      inputProps={{ min: 0, step: 1000 }}
    />
  );
}

function FormFields({
  editing,
  formData,
  intent,
  categories,
  onChange,
  onOpenCurrencyDrawer,
}: FormFieldsProps): React.JSX.Element {
  const isEditing = Boolean(editing);

  if (intent === 'spending') {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <ManualSpentAmountField
          value={formData.manualSpentAmount}
          onChange={value => onChange({ field: 'manualSpentAmount', value })}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
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
      <ManualSpentAmountField
        value={formData.manualSpentAmount}
        onChange={value => onChange({ field: 'manualSpentAmount', value })}
      />
      <CurrencyField value={formData.currency} onClick={onOpenCurrencyDrawer} />
      <PeriodField
        value={formData.periodType}
        disabled={isEditing}
        onChange={value => onChange({ field: 'periodType', value })}
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

function DrawerBody({
  editing,
  intent,
  formData,
  saving,
  onSave,
  onClose,
  categories,
  onChange,
  onOpenCurrencyDrawer,
}: Pick<
  BudgetFormDrawerProps,
  'editing' | 'intent' | 'formData' | 'saving' | 'onSave' | 'onClose'
> & {
  categories: CategoryOption[];
  onChange: (change: FieldChange) => void;
  onOpenCurrencyDrawer: () => void;
}): React.JSX.Element {
  const canSave =
    intent === 'spending'
      ? Number.isFinite(formData.manualSpentAmount) && formData.manualSpentAmount >= 0
      : Boolean(formData.name.trim() && formData.categoryId && formData.limitAmount > 0);

  return (
    <div className="lumio-payable-drawer__body">
      <FormFields
        editing={editing}
        intent={intent}
        formData={formData}
        categories={categories}
        onChange={onChange}
        onOpenCurrencyDrawer={onOpenCurrencyDrawer}
      />
      <DrawerFooter saving={saving} onSave={onSave} onClose={onClose} canSave={canSave} />
    </div>
  );
}

export function BudgetFormDrawer(props: BudgetFormDrawerProps): React.JSX.Element {
  const categories = useExpenseCategories(props.open);
  const currencyPicker = useCurrencyPickerState(props.formData.currency || DEFAULT_CURRENCY);
  const {
    currencyDrawerOpen,
    setCurrencyDrawerOpen,
    currencySearch,
    setCurrencySearch,
    selectedCurrencyItem,
    selectedMatchesSearch,
    currencyQuery,
    recentCurrencyItems,
    allCurrencyItems,
    pushRecentCurrency,
  } = currencyPicker;
  const handleChange = useCallback(
    (change: FieldChange): void => {
      props.onFormChange({ ...props.formData, [change.field]: change.value });
    },
    [props],
  );

  useEffect(() => {
    if (!props.open) {
      setCurrencyDrawerOpen(false);
      setCurrencySearch('');
    }
  }, [props.open, setCurrencyDrawerOpen, setCurrencySearch]);

  const handleSelectCurrency = (code: string): void => {
    props.onFormChange({ ...props.formData, currency: code });
    pushRecentCurrency(code);
  };

  return (
    <>
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
        title={
          <DrawerTitle editing={props.editing} intent={props.intent} onClose={props.onClose} />
        }
      >
        <DrawerBody
          {...props}
          categories={categories}
          onChange={handleChange}
          onOpenCurrencyDrawer={() => setCurrencyDrawerOpen(true)}
        />
      </DrawerShell>

      <CurrencyDrawer
        isOpen={props.open && currencyDrawerOpen}
        onClose={() => setCurrencyDrawerOpen(false)}
        currencySearch={currencySearch}
        setCurrencySearch={setCurrencySearch}
        selectedCurrencyItem={selectedCurrencyItem}
        selectedMatchesSearch={selectedMatchesSearch}
        currencyQuery={currencyQuery}
        recentCurrencyItems={recentCurrencyItems}
        allCurrencyItems={allCurrencyItems}
        handleSelectCurrency={handleSelectCurrency}
        zIndex={1400}
      />
    </>
  );
}
