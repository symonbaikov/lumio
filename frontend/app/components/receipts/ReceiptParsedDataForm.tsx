/* eslint-disable max-lines */
'use client';

import CustomDatePicker from '@/app/components/CustomDatePicker';
import { Check, ChevronDown, ChevronLeft, Plus, Search, Trash2 } from '@/app/components/icons';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { useLocale } from '@/app/i18n';
import { getCategoryDisplayName } from '@/app/lib/statement-categories';
import {
  type CurrencySearchItem,
  buildCurrencySearchIndex,
} from '@/app/lib/statement-expense-drawer';
import { tokens } from '@/lib/theme-tokens';
import { Box, IconButton, Typography } from '@mui/material';
import MuiButton from '@mui/material/Button';
import { useTheme } from 'next-themes';
import { useMemo, useState } from 'react';
import type { EditableReceiptParsedData, ReceiptCategoryOption } from './receipt-types';

const DEFAULT_RECENT_CURRENCIES = ['KZT', 'USD', 'EUR', 'RUB'] as const;

/** Fields are stacked one per row so the form reads as a single column. */
const FORM_MAX_WIDTH = 520;

function Field({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  return (
    <Box>
      <Box
        component="label"
        htmlFor={htmlFor}
        sx={{ display: 'block', mb: 0.75, fontSize: 14, fontWeight: 500, color: c.ink700 }}
      >
        {label}
      </Box>
      {children}
    </Box>
  );
}

export interface ReceiptParsedDataFormProps {
  value: EditableReceiptParsedData;
  categories: ReceiptCategoryOption[];
  onChange: (value: EditableReceiptParsedData) => void;
  onCurrencyChange?: (value: EditableReceiptParsedData) => void | Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, max-lines-per-function, complexity
export function ReceiptParsedDataForm({
  value,
  categories,
  onChange,
  onCurrencyChange,
}: ReceiptParsedDataFormProps) {
  const { locale } = useLocale();
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const enabledCategories = categories.filter(category => category.isEnabled !== false);
  const [currencyDrawerOpen, setCurrencyDrawerOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [recentCurrencies, setRecentCurrencies] = useState<string[]>([
    ...DEFAULT_RECENT_CURRENCIES,
  ]);

  const currencyItems = useMemo(() => buildCurrencySearchIndex(), []);
  const currencyByCode = useMemo(
    () => new Map(currencyItems.map(item => [item.code, item] as const)),
    [currencyItems],
  );
  const selectedCurrencyItem = value.currency ? currencyByCode.get(value.currency) : null;
  const currencyQuery = currencySearch.trim().toLowerCase();

  const selectedMatchesSearch = useMemo(() => {
    if (!selectedCurrencyItem) {
      return false;
    }
    if (!currencyQuery) {
      return true;
    }
    return selectedCurrencyItem.searchText.includes(currencyQuery);
  }, [selectedCurrencyItem, currencyQuery]);

  const recentCurrencyItems = useMemo(
    () =>
      recentCurrencies
        .map(code => currencyByCode.get(code))
        .filter((item): item is CurrencySearchItem => Boolean(item))
        .filter(item => item.code !== value.currency),
    [recentCurrencies, currencyByCode, value.currency],
  );

  const allCurrencyItems = useMemo(() => {
    const source =
      currencyQuery.length > 0
        ? currencyItems.filter(item => item.searchText.includes(currencyQuery))
        : currencyItems;

    return source.filter(item => item.code !== value.currency);
  }, [currencyItems, currencyQuery, value.currency]);

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const pushRecentCurrency = (currencyCode: string) => {
    setRecentCurrencies(prev => [currencyCode, ...prev.filter(item => item !== currencyCode)]);
  };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleSelectCurrency = (currencyCode: string) => {
    const nextValue = { ...value, currency: currencyCode };

    onChange(nextValue);
    void onCurrencyChange?.(nextValue);
    pushRecentCurrency(currencyCode);
    setCurrencySearch('');
    setCurrencyDrawerOpen(false);
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: FORM_MAX_WIDTH }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Field htmlFor="receipt-vendor" label="Vendor">
            <Input
              id="receipt-vendor"
              aria-label="Vendor"
              value={value.vendor}
              onChange={event => onChange({ ...value, vendor: event.target.value })}
            />
          </Field>

          <Field htmlFor="receipt-date-picker" label="Date">
            <CustomDatePicker
              large
              value={value.date}
              onChange={date => onChange({ ...value, date })}
              containerTestId="receipt-date-picker"
            />
          </Field>

          <Field htmlFor="receipt-amount" label="Amount">
            <Input
              id="receipt-amount"
              aria-label="Amount"
              type="number"
              value={value.amount}
              onChange={event =>
                onChange({
                  ...value,
                  amount: event.target.value === '' ? '' : Number(event.target.value),
                })
              }
            />
          </Field>

          <Field htmlFor="receipt-currency-trigger" label="Currency">
            <Box
              component="button"
              id="receipt-currency-trigger"
              aria-label="Currency"
              type="button"
              onClick={() => setCurrencyDrawerOpen(true)}
              sx={{
                display: 'flex',
                height: 48,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid rgba(0, 0, 0, 0.23)',
                borderRadius: tokens.radius.md,
                bgcolor: 'transparent',
                px: 1.75,
                fontSize: 16,
                cursor: 'pointer',
                '&:hover': { borderColor: 'text.primary' },
                '&:focus-visible': {
                  borderColor: 'primary.main',
                  boxShadow: `0 0 0 3px ${c.primary50}`,
                  outline: 'none',
                },
              }}
            >
              <Box
                component="span"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {selectedCurrencyItem?.code || value.currency || 'Select a currency'}
              </Box>
              <ChevronDown style={{ width: 18, height: 18, color: c.ink400 }} />
            </Box>
          </Field>

          <Field htmlFor="receipt-tax" label="Tax">
            <Input
              id="receipt-tax"
              aria-label="Tax"
              type="number"
              value={value.tax}
              onChange={event =>
                onChange({
                  ...value,
                  tax: event.target.value === '' ? '' : Number(event.target.value),
                })
              }
            />
          </Field>

          <Field htmlFor="receipt-payment-method" label="Payment method">
            <Select
              id="receipt-payment-method"
              aria-label="Payment method"
              value={value.paymentMethod}
              onChange={event => onChange({ ...value, paymentMethod: event.target.value })}
            >
              <option value="">Select payment method</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </Select>
          </Field>

          <Field htmlFor="receipt-transaction-type" label="Transaction type">
            <Select
              id="receipt-transaction-type"
              aria-label="Transaction type"
              value={value.transactionType}
              onChange={event =>
                onChange({
                  ...value,
                  transactionType: event.target
                    .value as EditableReceiptParsedData['transactionType'],
                })
              }
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
              <option value="unknown">Unknown</option>
            </Select>
          </Field>

          <Field htmlFor="receipt-category" label="Category">
            <Select
              id="receipt-category"
              aria-label="Category"
              value={value.categoryId}
              onChange={event => onChange({ ...value, categoryId: event.target.value })}
            >
              <option value="">Select category</option>
              {enabledCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {getCategoryDisplayName(category, locale)}
                </option>
              ))}
            </Select>
          </Field>
        </Box>

        <Box>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
          >
            <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink900 }}>
              Line items
            </Typography>
            <MuiButton
              variant="text"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() =>
                onChange({
                  ...value,
                  lineItems: [
                    ...value.lineItems,
                    {
                      id: `line-${Date.now()}`,
                      description: '',
                      amount: 0,
                    },
                  ],
                })
              }
            >
              Add item
            </MuiButton>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              border: `1px solid ${c.ink150}`,
              bgcolor: 'var(--muted)',
              p: 2,
            }}
          >
            {/* eslint-disable-next-line max-lines-per-function, max-params */}
            {value.lineItems.map((lineItem, index) => (
              <Box
                key={lineItem.id}
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) 140px 48px' },
                  alignItems: 'center',
                }}
              >
                <Input
                  aria-label={index === 0 ? 'Line item description' : undefined}
                  value={lineItem.description}
                  onChange={event =>
                    onChange({
                      ...value,
                      lineItems: value.lineItems.map(currentItem =>
                        currentItem.id === lineItem.id
                          ? { ...currentItem, description: event.target.value }
                          : currentItem,
                      ),
                    })
                  }
                />
                <Input
                  aria-label={index === 0 ? 'Line item amount' : undefined}
                  type="number"
                  value={lineItem.amount}
                  onChange={event =>
                    onChange({
                      ...value,
                      lineItems: value.lineItems.map(currentItem =>
                        currentItem.id === lineItem.id
                          ? { ...currentItem, amount: Number(event.target.value) }
                          : currentItem,
                      ),
                    })
                  }
                />
                <IconButton
                  aria-label={`Remove line item ${lineItem.description || index + 1}`}
                  size="small"
                  onClick={() =>
                    onChange({
                      ...value,
                      lineItems: value.lineItems.filter(
                        currentItem => currentItem.id !== lineItem.id,
                      ),
                    })
                  }
                >
                  <Trash2 size={16} />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <DrawerShell
        isOpen={currencyDrawerOpen}
        onClose={() => {
          setCurrencyDrawerOpen(false);
          setCurrencySearch('');
        }}
        position="right"
        width="lg"
        showCloseButton={false}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton
              size="small"
              onClick={() => {
                setCurrencyDrawerOpen(false);
                setCurrencySearch('');
              }}
              aria-label="Close currency drawer"
              sx={{ borderRadius: tokens.radius.md }}
            >
              <ChevronLeft style={{ width: 20, height: 20 }} />
            </IconButton>
            <Typography style={{ fontSize: 18, fontWeight: 600 }}>Select a currency</Typography>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              overflowY: 'auto',
              pb: 2,
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Search
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: c.ink400,
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={currencySearch}
                onChange={event => setCurrencySearch(event.target.value)}
                placeholder="Search"
                style={{
                  width: '100%',
                  border: `1px solid ${c.ink150}`,
                  borderRadius: tokens.radius.md,
                  background: 'var(--card-bg)',
                  padding: '12px 16px 12px 40px',
                  fontSize: 14,
                }}
              />
            </Box>

            {selectedCurrencyItem && selectedMatchesSearch ? (
              <Box
                component="button"
                type="button"
                onClick={() => handleSelectCurrency(selectedCurrencyItem.code)}
                sx={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: 'var(--muted)',
                  px: 2,
                  py: 2,
                  textAlign: 'left',
                  border: 'none',
                  borderRadius: tokens.radius.md,
                  cursor: 'pointer',
                }}
              >
                <Typography style={{ fontSize: 16, fontWeight: 600 }}>
                  {selectedCurrencyItem.label}
                </Typography>
                <Check style={{ width: 20, height: 20, color: 'var(--color-primary, #168118)' }} />
              </Box>
            ) : null}

            {currencyQuery.length === 0 && recentCurrencyItems.length > 0 ? (
              <Box>
                <Typography style={{ paddingLeft: 4, fontSize: 14, color: c.ink400 }}>
                  Recents
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {recentCurrencyItems.map(item => (
                    <Box
                      key={`recent-${item.code}`}
                      component="button"
                      type="button"
                      onClick={() => handleSelectCurrency(item.code)}
                      sx={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1.5,
                        py: 1.5,
                        textAlign: 'left',
                        border: 'none',
                        borderRadius: tokens.radius.md,
                        bgcolor: 'transparent',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography style={{ fontSize: 16, fontWeight: 600 }}>
                        {item.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : null}

            <Box>
              <Typography style={{ paddingLeft: 4, fontSize: 14, color: c.ink400 }}>All</Typography>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {allCurrencyItems.length > 0 ? (
                  allCurrencyItems.map(item => (
                    <Box
                      key={item.code}
                      component="button"
                      type="button"
                      onClick={() => handleSelectCurrency(item.code)}
                      sx={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1.5,
                        py: 1.5,
                        textAlign: 'left',
                        border: 'none',
                        borderRadius: tokens.radius.md,
                        bgcolor: 'transparent',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography style={{ fontSize: 16, fontWeight: 600 }}>
                        {item.label}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography
                    sx={{ bgcolor: 'var(--muted)', p: 1.5, fontSize: 14, color: c.ink400 }}
                  >
                    No currencies found
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </DrawerShell>
    </>
  );
}
