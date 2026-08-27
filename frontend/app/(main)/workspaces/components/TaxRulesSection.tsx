'use client';

import apiClient from '@/app/lib/api';
import { tokens } from '@/lib/theme-tokens';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface WorkspaceRate {
  id: string;
  code: string | null;
  name: string;
  rate: string | number;
}

interface TaxRule {
  id: string;
  categoryId: string | null;
  taxRateCode: string;
  direction: 'expense' | 'income' | 'both';
  isEnabled: boolean;
}

const DIRECTIONS: Array<TaxRule['direction']> = ['both', 'expense', 'income'];

/**
 * Category-to-rate rules.
 *
 * Rules name a rate code rather than a rate, which is why the picker offers
 * codes: a rule written today has to keep working after the law changes, and
 * the code is what spans every version of a rate.
 */
export function TaxRulesSection(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<TaxRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rates, setRates] = useState<WorkspaceRate[]>([]);
  const [draft, setDraft] = useState<{
    categoryId: string;
    taxRateCode: string;
    direction: TaxRule['direction'];
  }>({ categoryId: '', taxRateCode: '', direction: 'both' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rulesResponse, categoriesResponse, ratesResponse] = await Promise.all([
        apiClient.get<TaxRule[]>('/tax/rules'),
        apiClient.get<Category[] | { data: Category[] }>('/categories'),
        apiClient.get<WorkspaceRate[]>('/tax/settings/rates'),
      ]);

      setRules(rulesResponse.data ?? []);
      const categoryData = categoriesResponse.data;
      setCategories(Array.isArray(categoryData) ? categoryData : (categoryData?.data ?? []));
      // Only coded rates can be named by a rule; hand-made ones have no code.
      setRates((ratesResponse.data ?? []).filter(rate => Boolean(rate.code)));
      setError(null);
    } catch {
      setError('Could not load tax rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addRule = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiClient.post('/tax/rules', {
        categoryId: draft.categoryId || undefined,
        taxRateCode: draft.taxRateCode,
        direction: draft.direction,
      });
      setDraft({ categoryId: '', taxRateCode: '', direction: 'both' });
      await load();
    } catch (caught) {
      // The server rejects a duplicate category/direction pair and an unknown
      // rate code, and says which; passing that through beats a generic line.
      const message = (caught as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(message ?? 'Could not add the rule.');
    } finally {
      setBusy(false);
    }
  };

  const removeRule = async (id: string) => {
    setBusy(true);
    try {
      await apiClient.delete(`/tax/rules/${id}`);
      await load();
    } catch {
      setError('Could not delete the rule.');
    } finally {
      setBusy(false);
    }
  };

  const nameOfCategory = (id: string | null) =>
    id
      ? (categories.find(category => category.id === id)?.name ?? 'Unknown category')
      : 'Any category';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Stack
      spacing={2}
      sx={{
        borderRadius: tokens.radius.lg,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary' }}>
          Tax rules
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 14, color: 'text.secondary' }}>
          Send a category to a particular rate. Anything without a rule uses the workspace default.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {rates.length === 0 ? (
        <Alert severity="info">Pick a tax jurisdiction first — rules need rates to point at.</Alert>
      ) : (
        <>
          {rules.length > 0 ? (
            <Stack
              component="ul"
              spacing={1}
              sx={{ listStyle: 'none', m: 0, p: 0 }}
              aria-label="Tax rules"
            >
              {rules.map(rule => (
                <Stack
                  component="li"
                  key={rule.id}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{
                    borderRadius: tokens.radius.md,
                    border: '1px solid',
                    borderColor: 'divider',
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 14, flex: 1, color: 'text.primary' }}>
                    {nameOfCategory(rule.categoryId)}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {rule.direction}
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
                    {rule.taxRateCode}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label={`Delete rule for ${nameOfCategory(rule.categoryId)}`}
                    disabled={busy}
                    onClick={() => removeRule(rule.id)}
                  >
                    ×
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              No rules yet. Every transaction uses the workspace default rate.
            </Typography>
          )}

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Select
              size="small"
              displayEmpty
              value={draft.categoryId}
              onChange={event => setDraft(d => ({ ...d, categoryId: event.target.value }))}
              inputProps={{ 'aria-label': 'Category' }}
              sx={{ minWidth: 180, borderRadius: tokens.radius.md }}
            >
              <MenuItem value="">Any category</MenuItem>
              {categories.map(category => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>

            <Select
              size="small"
              displayEmpty
              value={draft.taxRateCode}
              onChange={event => setDraft(d => ({ ...d, taxRateCode: event.target.value }))}
              inputProps={{ 'aria-label': 'Rate' }}
              sx={{ minWidth: 180, borderRadius: tokens.radius.md }}
            >
              <MenuItem value="">Choose a rate</MenuItem>
              {rates.map(rate => (
                <MenuItem key={rate.id} value={rate.code ?? ''}>
                  {rate.name}
                </MenuItem>
              ))}
            </Select>

            <Select
              size="small"
              value={draft.direction}
              onChange={event =>
                setDraft(d => ({ ...d, direction: event.target.value as TaxRule['direction'] }))
              }
              inputProps={{ 'aria-label': 'Direction' }}
              sx={{ minWidth: 130, borderRadius: tokens.radius.md }}
            >
              {DIRECTIONS.map(direction => (
                <MenuItem key={direction} value={direction}>
                  {direction}
                </MenuItem>
              ))}
            </Select>

            <Button
              variant="contained"
              onClick={addRule}
              disabled={busy || !draft.taxRateCode}
              sx={{ borderRadius: tokens.radius.md, textTransform: 'none', fontWeight: 600 }}
            >
              Add rule
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}
