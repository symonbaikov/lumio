/* eslint-disable max-lines */
'use client';

import type React from 'react';
import CustomDatePicker from '@/app/components/CustomDatePicker';
import { useIntlayer, useLocale } from '@/app/i18n';
import { getApiErrorMessage } from '@/app/lib/api-error';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { CalendarDays, ChevronDown, ChevronRight, Download, RefreshCcw } from '@/app/components/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../../lib/api';
import { tokens } from '@/lib/theme-tokens';

type BalanceExportFormat = 'excel' | 'pdf';

type BalanceAccountNode = {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  nameKk: string | null;
  accountType: 'asset' | 'liability' | 'equity';
  isEditable: boolean;
  isAutoComputed: boolean;
  isExpandable: boolean;
  amount: number;
  children: BalanceAccountNode[];
  position: number;
};

type BalanceSheetResponse = {
  date: string;
  currency: string;
  assets: {
    total: number;
    sections: BalanceAccountNode[];
  };
  liabilities: {
    total: number;
    sections: BalanceAccountNode[];
  };
  difference: number;
  isBalanced: boolean;
};

const resolveLocale = (locale: string): string => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// eslint-disable-next-line max-params
const collectEditableValues = (accounts: BalanceAccountNode[], result: Record<string, string>): void => {
  for (const account of accounts) {
    if (account.isEditable) {
      result[account.id] = account.amount.toFixed(2);
    }
    if (account.children.length > 0) {
      collectEditableValues(account.children, result);
    }
  }
};

// eslint-disable-next-line max-params
const collectExpandableDefaults = (accounts: BalanceAccountNode[], result: Record<string, boolean>): void => {
  for (const account of accounts) {
    if (account.isExpandable || account.children.length > 0) {
      result[account.id] = true;
    }
    if (account.children.length > 0) {
      collectExpandableDefaults(account.children, result);
    }
  }
};

const parseContentDispositionFileName = (contentDisposition?: string): string | null => {
  if (!contentDisposition) return null;

  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const asciiMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return null;
};

// eslint-disable-next-line max-lines-per-function, complexity
function BalanceSheet(): React.JSX.Element {
  const t = useIntlayer('reportsPage');
  const { locale } = useLocale();
  const labels = t.labels as Record<string, { value?: string } | undefined>;
  // eslint-disable-next-line max-params
  const text = (key: string, fallback: string): string => labels[key]?.value ?? fallback;

  const [sheet, setSheet] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'now' | 'date'>('now');
  const [selectedDate, setSelectedDate] = useState<string>(toDateInputValue(new Date()));
  const [editableValues, setEditableValues] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string>('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<BalanceExportFormat | null>(null);

  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat(resolveLocale(locale), {
        style: 'currency',
        currency: sheet?.currency || 'KZT',
        minimumFractionDigits: 2,
      }).format(value),
    [locale, sheet?.currency],
  );

  const effectiveDate = filterMode === 'date' ? selectedDate : undefined;

  const loadSheet = useCallback(
    // eslint-disable-next-line max-lines-per-function
    async (date?: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get('/reports/balance/sheet', {
          params: {
            ...(date ? { date } : {}),
            locale,
          },
        });
        const payload: BalanceSheetResponse = response.data?.data || response.data;
        setSheet(payload);

        const nextEditableValues: Record<string, string> = {};
        collectEditableValues(payload.assets.sections, nextEditableValues);
        collectEditableValues(payload.liabilities.sections, nextEditableValues);
        setEditableValues(nextEditableValues);

        setExpanded(prevExpanded => {
          const defaults: Record<string, boolean> = {};
          collectExpandableDefaults(payload.assets.sections, defaults);
          collectExpandableDefaults(payload.liabilities.sections, defaults);

          const merged = { ...defaults };
          for (const [id, isOpen] of Object.entries(prevExpanded)) {
            if (id in merged) {
              merged[id] = isOpen;
            }
          }
          return merged;
        });
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, t.errors.loadReport.value));
      } finally {
        setLoading(false);
      }
    },
    [locale, t.errors.loadReport.value],
  );

  useEffect(() => {
    void loadSheet(effectiveDate);
  }, [effectiveDate, loadSheet]);

  const saveSnapshot = useCallback(
    async (accountId: string): Promise<void> => {
      const rawValue = editableValues[accountId];
      if (rawValue === undefined) return;

      const normalized = rawValue.replace(',', '.').trim();
      const parsed = Number.parseFloat(normalized);
      if (!Number.isFinite(parsed)) {
        setSaveHint(t.errors.loadReport.value);
        return;
      }

      setSavingAccountId(accountId);
      setSaveHint(text('savingBalance', 'Saving...'));
      setError(null);

      try {
        await apiClient.put('/reports/balance/snapshot', {
          accountId,
          amount: parsed,
          date: effectiveDate,
          currency: sheet?.currency || 'KZT',
        });

        setSaveHint(text('balanceSaved', 'Balance saved'));
        await loadSheet(effectiveDate);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, t.errors.loadReport.value));
        setSaveHint('');
      } finally {
        setSavingAccountId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editableValues, effectiveDate, loadSheet, sheet?.currency, t],
  );

  const downloadExport = useCallback(
    // eslint-disable-next-line max-lines-per-function, complexity
    async (format: BalanceExportFormat): Promise<void> => {
      setExportingFormat(format);
      setExportMenuOpen(false);
      setError(null);

      try {
        const response = await apiClient.get('/reports/balance/export', {
          params: {
            format,
            ...(effectiveDate ? { date: effectiveDate } : {}),
            locale,
          },
          responseType: 'blob',
        });

        const fallbackName = `balance-sheet-${sheet?.date || toDateInputValue(new Date())}.${
          format === 'excel' ? 'xlsx' : 'pdf'
        }`;
        const fileName =
          parseContentDispositionFileName(response.headers['content-disposition']) || fallbackName;

        const blob = new Blob([response.data], {
          type: response.headers['content-type'] || 'application/octet-stream',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, t.errors.loadReport.value));
      } finally {
        setExportingFormat(null);
      }
    },
    [effectiveDate, locale, sheet?.date, t.errors.loadReport.value],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const renderAccount = useCallback(
    // eslint-disable-next-line max-lines-per-function, max-params, complexity
    (account: BalanceAccountNode, level = 0): React.JSX.Element => {
      const hasChildren = account.children.length > 0;
      const isExpanded = expanded[account.id] ?? true;
      const canToggle = account.isExpandable || hasChildren;
      const isSection = level === 0;

      return (
        <Box key={account.id} sx={{ borderBottom: '1px solid var(--border)', '&:last-child': { borderBottom: 'none' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, py: 1.5 }}>
            <Box
              sx={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 1 }}
              style={{ paddingLeft: `${level * 18}px` }}
            >
              {canToggle ? (
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted-foreground)',
                    flexShrink: 0,
                  }}
                  onClick={() => toggleExpanded(account.id)}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              ) : (
                <span style={{ width: 20, height: 20, flexShrink: 0, display: 'inline-block' }} />
              )}

              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: isSection ? 16 : 14,
                  fontWeight: isSection ? 600 : 400,
                  color: 'var(--foreground)',
                }}
              >
                {account.name}
              </span>
            </Box>

            <Box sx={{ flexShrink: 0 }}>
              {account.isEditable ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="number"
                    step="0.01"
                    style={{
                      width: 112,
                      border: '1px solid var(--border)',
                      background: 'var(--muted)',
                      padding: '4px 8px',
                      textAlign: 'right',
                      fontSize: 14,
                      color: 'var(--foreground)',
                      }}
                    value={editableValues[account.id] ?? '0.00'}
                    onChange={event =>
                      setEditableValues(prev => ({
                        ...prev,
                        [account.id]: event.target.value,
                      }))
                    }
                    onBlur={() => saveSnapshot(account.id)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.currentTarget.blur();
                      }
                    }}
                    disabled={savingAccountId === account.id}
                    aria-label={account.name}
                  />
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)' }}>₸</span>
                  {savingAccountId === account.id && <CircularProgress size={16} sx={{ color: 'var(--primary)' }} />}
                </Box>
              ) : (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: isSection ? 600 : 500,
                    color: 'var(--foreground)',
                  }}
                >
                  {formatCurrency(account.amount)}
                </span>
              )}
            </Box>
          </Box>

          {hasChildren && isExpanded && (
            <Box>
              {account.children
                // eslint-disable-next-line max-params
                .sort((a, b) => a.position - b.position)
                .map(child => renderAccount(child, level + 1))}
            </Box>
          )}
        </Box>
      );
    },
    [editableValues, expanded, formatCurrency, saveSnapshot, savingAccountId, toggleExpanded],
  );

  const balanceWarning = useMemo(() => {
    if (!sheet || sheet.isBalanced) return null;
    return `${text('balanceDifference', 'Balance difference')}: ${formatCurrency(sheet.difference)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatCurrency, sheet]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} data-tour-id="reports-balance">
      <Box sx={{ border: '1px solid var(--border)', bgcolor: 'var(--card)', p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: { md: 'space-between' }, gap: 1.5 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                border: '1px solid var(--border)',
                bgcolor: 'var(--card)',
                px: 1.5,
                py: 1,
                fontSize: 14,
                color: 'var(--foreground)',
              }}
            >
              <CalendarDays size={16} style={{ color: 'var(--muted-foreground)' }} />
              <select
                style={{ border: 'none', background: 'transparent', fontSize: 14, color: 'var(--foreground)' }}
                value={filterMode}
                onChange={event => setFilterMode(event.target.value as 'now' | 'date')}
              >
                <option value="now">{text('asOfNow', 'As of now')}</option>
                <option value="date">{text('asOfDate', 'As of date')}</option>
              </select>
            </Box>

            {filterMode === 'date' && (
              <Box sx={{ minWidth: 180 }}>
                <CustomDatePicker
                  label={text('asOfDate', 'As of date')}
                  value={selectedDate}
                  onChange={setSelectedDate}
                />
              </Box>
            )}

            <button
              type="button"
              onClick={() => void loadSheet(effectiveDate)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                padding: '8px 12px',
                fontSize: 14,
                color: 'var(--muted-foreground)',
                cursor: 'pointer',
                borderRadius: tokens.radius.md,
              }}
            >
              <RefreshCcw size={16} />
              {text('refresh', 'Refresh')}
            </button>
          </Box>

          <Box sx={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setExportMenuOpen(open => !open)}
              disabled={!!exportingFormat}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                padding: '8px 12px',
                fontSize: 14,
                color: 'var(--foreground)',
                cursor: 'pointer',
                borderRadius: tokens.radius.md,
              }}
            >
              {exportingFormat ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <Download size={16} />}
              {text('exportBalance', 'Export balance')}
            </button>

            {exportMenuOpen && (
              <Box
                sx={{
                  position: 'absolute',
                  right: 0,
                  zIndex: 10,
                  mt: 0.5,
                  width: 144,
                  border: '1px solid var(--border)',
                  bgcolor: 'var(--card)',
                  p: 0.5,
                  boxShadow: 1,
                }}
              >
                <button
                  type="button"
                  style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: 14, color: 'var(--foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => void downloadExport('excel')}
                >
                  {text('exportExcel', 'Excel')}
                </button>
                <button
                  type="button"
                  style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: 14, color: 'var(--foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => void downloadExport('pdf')}
                >
                  {text('exportPdf', 'PDF')}
                </button>
              </Box>
            )}
          </Box>
        </Box>

        {saveHint && (
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'var(--muted-foreground)' }}>
            {saveHint}
          </Typography>
        )}
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {balanceWarning && <Alert severity="warning">{balanceWarning}</Alert>}

      {loading ? (
        <Box sx={{ border: '1px solid var(--border)', bgcolor: 'var(--card)', px: 2, py: 5, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : sheet ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, 1fr)' }, gap: 2 }}>
          <Box sx={{ border: '1px solid var(--border)', bgcolor: 'var(--card)', p: 2 }}>
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
                {text('assets', 'Assets')} {formatCurrency(sheet.assets.total)}
              </Typography>
            </Box>
            <Box>
              {sheet.assets.sections
                // eslint-disable-next-line max-params
                .sort((a, b) => a.position - b.position)
                .map(section => renderAccount(section))}
            </Box>
          </Box>

          <Box sx={{ border: '1px solid var(--border)', bgcolor: 'var(--card)', p: 2 }}>
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
                {text('liabilities', 'Liabilities')} {formatCurrency(sheet.liabilities.total)}
              </Typography>
            </Box>
            <Box>
              {sheet.liabilities.sections
                // eslint-disable-next-line max-params
                .sort((a, b) => a.position - b.position)
                .map(section => renderAccount(section))}
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ border: '1px solid var(--border)', bgcolor: 'var(--card)', px: 2, py: 5, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'var(--muted-foreground)' }}>
            {text('noData', 'No data')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default BalanceSheet;
