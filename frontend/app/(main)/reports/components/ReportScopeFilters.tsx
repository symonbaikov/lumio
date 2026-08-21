'use client';

import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import type React from 'react';
import { useEffect, useState } from 'react';

interface NamedOption {
  id: string;
  name: string;
}

export interface ReportScope {
  walletIds: string[];
  categoryIds: string[];
}

interface ReportScopeFiltersProps {
  value: ReportScope;
  onChange: (scope: ReportScope) => void;
}

const selectSx = {
  height: 36,
  fontSize: 12,
  bgcolor: 'var(--card)',
  borderRadius: tokens.radius.md,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted-foreground)',
};

/** Reads the `data` envelope used by the list endpoints, tolerating a bare array. */
function toOptions(payload: unknown): NamedOption[] {
  const rows = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown } | null)?.data ?? []);
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows
    .map(row => row as { id?: string; name?: string })
    .filter((row): row is NamedOption => Boolean(row.id && row.name))
    .map(row => ({ id: row.id, name: row.name }));
}

// eslint-disable-next-line max-lines-per-function
export function ReportScopeFilters({
  value,
  onChange,
}: ReportScopeFiltersProps): React.JSX.Element {
  const t = useIntlayer('reportsPage');
  const labels = t.labels as Record<string, { value?: string } | undefined>;
  // eslint-disable-next-line max-params
  const text = (key: string, fallback: string): string => labels[key]?.value ?? fallback;

  const [wallets, setWallets] = useState<NamedOption[]>([]);
  const [categories, setCategories] = useState<NamedOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      apiClient.get('/wallets').catch(() => null),
      apiClient.get('/categories').catch(() => null),
    ]).then(([walletsResponse, categoriesResponse]) => {
      if (cancelled) {
        return;
      }
      setWallets(toOptions(walletsResponse?.data));
      setCategories(toOptions(categoriesResponse?.data));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // eslint-disable-next-line max-lines-per-function, max-params
  const renderSelect = (
    options: NamedOption[],
    selected: string[],
    onSelect: (ids: string[]) => void,
    allLabel: string,
  ): React.JSX.Element => (
    <Select
      multiple
      displayEmpty
      size="small"
      value={selected}
      onChange={event => {
        const next = event.target.value;
        onSelect(typeof next === 'string' ? next.split(',') : next);
      }}
      renderValue={ids =>
        ids.length === 0
          ? allLabel
          : ids
              .map(id => options.find(option => option.id === id)?.name)
              .filter(Boolean)
              .join(', ')
      }
      sx={selectSx}
    >
      {options.map(option => (
        <MenuItem key={option.id} value={option.id} sx={{ fontSize: 12 }}>
          <Checkbox size="small" checked={selected.includes(option.id)} />
          <ListItemText primaryTypographyProps={{ fontSize: 12 }} primary={option.name} />
        </MenuItem>
      ))}
    </Select>
  );

  // Nothing to scope by yet (fresh workspace) — don't show empty dropdowns.
  if (wallets.length === 0 && categories.length === 0) {
    return <></>;
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
        gap: 2,
        mb: 2.5,
      }}
      data-tour-id="reports-scope-filters"
    >
      {wallets.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <span style={fieldLabelStyle}>{text('filterAccounts', 'Accounts')}</span>
          {renderSelect(
            wallets,
            value.walletIds,
            walletIds => onChange({ ...value, walletIds }),
            text('filterAllAccounts', 'All accounts'),
          )}
        </Box>
      )}

      {categories.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <span style={fieldLabelStyle}>{text('filterCategories', 'Categories')}</span>
          {renderSelect(
            categories,
            value.categoryIds,
            categoryIds => onChange({ ...value, categoryIds }),
            text('filterAllCategories', 'All categories'),
          )}
        </Box>
      )}
    </Box>
  );
}
