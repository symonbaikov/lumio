'use client';

import { Box, Typography } from '@mui/material';
import { type CSSProperties, type ReactNode, useMemo, useState } from 'react';
import { ChevronDown } from '@/app/components/icons';
import { Checkbox } from '@/app/components/ui/checkbox';
import { CurrencyPickerDrawer } from '@/app/components/ui/currency-picker-drawer';
import {
  type CurrencySearchItem,
  buildCurrencySearchIndex,
} from '@/app/lib/statement-expense-drawer';

/** Kept in sync with `SheetColumnRole` in `backend/src/modules/import/sheets/column-roles.ts`. */
export type SheetColumnRole =
  | 'ignore'
  | 'date'
  | 'amount'
  | 'debit'
  | 'credit'
  | 'description'
  | 'counterparty'
  | 'category'
  | 'wallet'
  | 'currency'
  | 'externalId';

/** Every role except `ignore` may only be assigned to one column at a time. */
const SINGLE_SLOT_ROLES: ReadonlySet<SheetColumnRole> = new Set([
  'date',
  'amount',
  'debit',
  'credit',
  'description',
  'counterparty',
  'category',
  'wallet',
  'currency',
  'externalId',
]);

export interface TransactionMappingCardColumn {
  index: number;
  a1: string;
  title: string;
  suggestedRole: SheetColumnRole;
  samples: string[];
}

export interface TransactionMappingCardSummary {
  total: number;
  ok: number;
  invalid: number;
  duplicateCount: number;
}

export interface TransactionMappingCardContent {
  title: ReactNode;
  subtitle: ReactNode;
  emptyHint: ReactNode;
  columnHeaders: {
    letter: ReactNode;
    header: ReactNode;
    samples: ReactNode;
    // Interpolated into the per-row aria-label below (and rendered via `.value`
    // in the <th> too) — template-literal interpolation of an intlayer node
    // renders "[object Object]" instead of the localized text unless `.value`
    // is used explicitly.
    role: { value: string };
  };
  roles: Record<SheetColumnRole, ReactNode>;
  defaultCurrencyLabel: ReactNode;
  createMissingCategoriesLabel: ReactNode;
  walletLabel: ReactNode;
  walletNone: ReactNode;
  summary: { total: ReactNode; ok: ReactNode; duplicates: ReactNode; errors: ReactNode };
}

export interface TransactionMappingCardProps {
  columns: TransactionMappingCardColumn[];
  roles: SheetColumnRole[];
  onRolesChange: (roles: SheetColumnRole[]) => void;
  defaultCurrency: string;
  onDefaultCurrencyChange: (value: string) => void;
  createMissingCategories: boolean;
  onCreateMissingCategoriesChange: (value: boolean) => void;
  wallets: Array<{ id: string; name: string }>;
  walletName: string;
  onWalletNameChange: (value: string) => void;
  summary: TransactionMappingCardSummary | null;
  t: TransactionMappingCardContent;
}

const ROLE_ORDER: SheetColumnRole[] = [
  'ignore',
  'date',
  'amount',
  'debit',
  'credit',
  'description',
  'counterparty',
  'category',
  'wallet',
  'currency',
  'externalId',
];

/** Shown above the full list so the common picks are one tap away. */
const RECENT_CURRENCY_CODES = ['USD', 'EUR', 'KZT', 'RUB'];

/**
 * Search/open state for the currency drawer. The selected code itself stays
 * controlled by the owning page — only the drawer's own UI state lives here.
 */
function useCurrencyPicker(selectedCurrency: string): {
  isOpen: boolean;
  search: string;
  selectedItem: CurrencySearchItem | null;
  selectedMatchesSearch: boolean;
  recentItems: CurrencySearchItem[];
  allItems: CurrencySearchItem[];
  open: () => void;
  close: () => void;
  setSearch: (value: string) => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const items = useMemo(() => buildCurrencySearchIndex(), []);
  const byCode = useMemo(() => new Map(items.map(item => [item.code, item])), [items]);

  const code = selectedCurrency.trim().toUpperCase();
  const selectedItem = byCode.get(code) ?? null;
  const query = search.trim().toLowerCase();
  const selectedMatchesSearch =
    selectedItem !== null && (query.length === 0 || selectedItem.searchText.includes(query));
  const recentItems = useMemo(
    () =>
      RECENT_CURRENCY_CODES.map(recent => byCode.get(recent)).filter(
        (item): item is CurrencySearchItem => item !== undefined && item.code !== code,
      ),
    [byCode, code],
  );
  const allItems = useMemo(() => {
    const source = query.length > 0 ? items.filter(item => item.searchText.includes(query)) : items;
    return source.filter(item => item.code !== code);
  }, [items, query, code]);

  return {
    isOpen,
    search,
    selectedItem,
    selectedMatchesSearch,
    recentItems,
    allItems,
    open: () => setIsOpen(true),
    close: () => {
      setIsOpen(false);
      setSearch('');
    },
    setSearch,
  };
}

const inputStyle: CSSProperties = {
  marginTop: 4,
  width: '100%',
  border: '1px solid rgba(0, 0, 0, 0.15)',
  background: 'var(--card-bg)',
  padding: '8px 12px',
  fontSize: 14,
  boxSizing: 'border-box',
};

/**
 * Pure, controlled column-role mapping editor for the Google Sheets ->
 * transactions import. Does not fetch data or debounce anything itself —
 * the owning page (`page.tsx`) holds the roles/currency/wallet state and is
 * responsible for re-posting `/preview` when `onRolesChange` fires.
 */
export function TransactionMappingCard({
  columns,
  roles,
  onRolesChange,
  defaultCurrency,
  onDefaultCurrencyChange,
  createMissingCategories,
  onCreateMissingCategoriesChange,
  wallets,
  walletName,
  onWalletNameChange,
  summary,
  t,
}: TransactionMappingCardProps) {
  const currencyPicker = useCurrencyPicker(defaultCurrency);

  const handleSelectCurrency = (code: string) => {
    onDefaultCurrencyChange(code);
    currencyPicker.close();
  };

  const handleRoleChange = (columnIndex: number, nextRole: SheetColumnRole) => {
    const nextRoles = [...roles];
    if (SINGLE_SLOT_ROLES.has(nextRole)) {
      for (let i = 0; i < nextRoles.length; i++) {
        if (i !== columnIndex && nextRoles[i] === nextRole) {
          nextRoles[i] = 'ignore';
        }
      }
    }
    nextRoles[columnIndex] = nextRole;
    onRolesChange(nextRoles);
  };

  return (
    <Box>
      <Typography style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t.title}</Typography>
      <Typography style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.6)', marginBottom: 12 }}>
        {t.subtitle}
      </Typography>

      {columns.length === 0 ? (
        <Box
          sx={{
            border: '1px dashed rgba(0, 0, 0, 0.15)',
            p: 3,
            fontSize: 14,
            color: 'rgba(0, 0, 0, 0.6)',
          }}
        >
          {t.emptyHint}
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left', width: 60 }}>
                  {t.columnHeaders.letter}
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t.columnHeaders.header}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>
                  {t.columnHeaders.samples}
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'left', width: 200 }}>
                  {t.columnHeaders.role.value}
                </th>
              </tr>
            </thead>
            <tbody>
              {columns.map(column => (
                <tr key={column.index}>
                  <td style={{ padding: '8px 12px', color: 'rgba(0, 0, 0, 0.6)' }}>{column.a1}</td>
                  <td style={{ padding: '8px 12px' }}>{column.title}</td>
                  <td style={{ padding: '8px 12px', color: 'rgba(0, 0, 0, 0.6)' }}>
                    {column.samples.slice(0, 3).join(', ')}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <select
                      aria-label={`${t.columnHeaders.role.value} ${column.a1}`}
                      value={roles[column.index] ?? 'ignore'}
                      onChange={e =>
                        handleRoleChange(column.index, e.target.value as SheetColumnRole)
                      }
                      style={{
                        width: '100%',
                        border: '1px solid rgba(0, 0, 0, 0.15)',
                        background: 'var(--card-bg)',
                        padding: '6px 8px',
                        fontSize: 13,
                      }}
                    >
                      {ROLE_ORDER.map(role => (
                        <option key={role} value={role}>
                          {t.roles[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 2 }}>
        <Box>
          <label
            htmlFor="gs-import-default-currency"
            style={{ display: 'block', fontSize: 14, fontWeight: 500 }}
          >
            {t.defaultCurrencyLabel}
          </label>
          <button
            id="gs-import-default-currency"
            type="button"
            onClick={currencyPicker.open}
            style={{
              ...inputStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              textAlign: 'left',
              color: 'var(--foreground)',
              cursor: 'pointer',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currencyPicker.selectedItem?.label || defaultCurrency}
            </span>
            <ChevronDown size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
          </button>
        </Box>

        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{t.walletLabel}</span>
          <select
            value={walletName}
            onChange={e => onWalletNameChange(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t.walletNone}</option>
            {wallets.map(wallet => (
              <option key={wallet.id} value={wallet.name}>
                {wallet.name}
              </option>
            ))}
          </select>
        </label>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 14, mt: 2 }}>
        <Checkbox
          checked={createMissingCategories}
          onCheckedChange={onCreateMissingCategoriesChange}
          className="h-5 w-5"
        />
        {t.createMissingCategoriesLabel}
      </Box>

      {summary && (
        <Box
          sx={{
            mt: 2,
            border: '1px solid rgba(0, 0, 0, 0.15)',
            p: 1.5,
            fontSize: 13,
          }}
        >
          {summary.total} {t.summary.total} · {summary.ok} {t.summary.ok} · {summary.duplicateCount}{' '}
          {t.summary.duplicates} · {summary.invalid} {t.summary.errors}
        </Box>
      )}

      <CurrencyPickerDrawer
        isOpen={currencyPicker.isOpen}
        currencySearch={currencyPicker.search}
        selectedCurrencyItem={currencyPicker.selectedItem}
        selectedMatchesSearch={currencyPicker.selectedMatchesSearch}
        recentCurrencyItems={currencyPicker.recentItems}
        allCurrencyItems={currencyPicker.allItems}
        onSearchChange={currencyPicker.setSearch}
        onClose={currencyPicker.close}
        onSelect={handleSelectCurrency}
      />
    </Box>
  );
}

export default TransactionMappingCard;
