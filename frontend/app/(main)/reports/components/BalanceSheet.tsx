'use client';

import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  RefreshCcw,
} from 'lucide-react';
import { useIntlayer, useLocale } from 'next-intlayer';
import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../../lib/api';

type BalanceExportFormat = 'excel' | 'pdf';

type BalanceAccountNode = {
  id: string;
  code: string;
  name: string;
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

const resolveLocale = (locale: string) => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const collectEditableValues = (accounts: BalanceAccountNode[], result: Record<string, string>) => {
  for (const account of accounts) {
    if (account.isEditable) {
      result[account.id] = account.amount.toFixed(2);
    }
    if (account.children.length > 0) {
      collectEditableValues(account.children, result);
    }
  }
};

const collectExpandableDefaults = (
  accounts: BalanceAccountNode[],
  result: Record<string, boolean>,
) => {
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

export function BalanceSheet() {
  const t = useIntlayer('reportsPage');
  const { locale } = useLocale();
  const labels = t.labels as Record<string, { value?: string } | undefined>;
  const text = (key: string, fallback: string) => labels[key]?.value ?? fallback;

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
    async (date?: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get('/reports/balance/sheet', {
          params: date ? { date } : undefined,
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
      } catch (err: any) {
        setError(err?.response?.data?.message || t.errors.loadReport.value);
      } finally {
        setLoading(false);
      }
    },
    [t.errors.loadReport.value],
  );

  useEffect(() => {
    loadSheet(effectiveDate);
  }, [effectiveDate, loadSheet]);

  const saveSnapshot = useCallback(
    async (accountId: string) => {
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
      } catch (err: any) {
        setError(err?.response?.data?.message || t.errors.loadReport.value);
        setSaveHint('');
      } finally {
        setSavingAccountId(null);
      }
    },
    [editableValues, effectiveDate, loadSheet, sheet?.currency, t],
  );

  const downloadExport = useCallback(
    async (format: BalanceExportFormat) => {
      setExportingFormat(format);
      setExportMenuOpen(false);
      setError(null);

      try {
        const response = await apiClient.get('/reports/balance/export', {
          params: {
            format,
            ...(effectiveDate ? { date: effectiveDate } : {}),
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
      } catch (err: any) {
        setError(err?.response?.data?.message || t.errors.loadReport.value);
      } finally {
        setExportingFormat(null);
      }
    },
    [effectiveDate, sheet?.date, t.errors.loadReport.value],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const renderAccount = useCallback(
    (account: BalanceAccountNode, level = 0) => {
      const hasChildren = account.children.length > 0;
      const isExpanded = expanded[account.id] ?? true;
      const canToggle = account.isExpandable || hasChildren;
      const isSection = level === 0;

      return (
        <div key={account.id} className="border-b border-gray-100 last:border-b-0">
          <div className="flex items-center justify-between gap-3 py-3">
            <div
              className="flex min-w-0 items-center gap-2"
              style={{ paddingLeft: `${level * 18}px` }}
            >
              {canToggle ? (
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
                  onClick={() => toggleExpanded(account.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span className="h-5 w-5" />
              )}

              <span
                className={`truncate ${
                  isSection ? 'text-base font-semibold text-gray-900' : 'text-sm text-gray-700'
                }`}
              >
                {account.name}
              </span>
            </div>

            <div className="shrink-0">
              {account.isEditable ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    className="w-28 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-right text-sm text-gray-900 outline-none focus:border-primary"
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
                  <span className="text-sm font-medium text-gray-700">₸</span>
                  {savingAccountId === account.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
              ) : (
                <span
                  className={`text-sm ${
                    isSection ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'
                  }`}
                >
                  {formatCurrency(account.amount)}
                </span>
              )}
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div>
              {account.children
                .sort((a, b) => a.position - b.position)
                .map(child => renderAccount(child, level + 1))}
            </div>
          )}
        </div>
      );
    },
    [editableValues, expanded, formatCurrency, saveSnapshot, savingAccountId, toggleExpanded],
  );

  const balanceWarning = useMemo(() => {
    if (!sheet || sheet.isBalanced) return null;
    return `${text('balanceDifference', 'Balance difference')}: ${formatCurrency(sheet.difference)}`;
  }, [formatCurrency, sheet]);

  return (
    <div className="space-y-4" data-tour-id="reports-balance">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              <select
                className="border-none bg-transparent text-sm text-gray-700 outline-none"
                value={filterMode}
                onChange={event => setFilterMode(event.target.value as 'now' | 'date')}
              >
                <option value="now">{text('asOfNow', 'As of now')}</option>
                <option value="date">{text('asOfDate', 'As of date')}</option>
              </select>
            </div>

            {filterMode === 'date' && (
              <input
                type="date"
                value={selectedDate}
                onChange={event => setSelectedDate(event.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary"
              />
            )}

            <button
              type="button"
              onClick={() => loadSheet(effectiveDate)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:border-primary"
            >
              <RefreshCcw className="h-4 w-4" />
              {text('refresh', 'Refresh')}
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen(open => !open)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-primary"
              disabled={!!exportingFormat}
            >
              {exportingFormat ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {text('exportBalance', 'Export balance')}
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 z-10 mt-2 w-36 rounded-md border border-gray-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  className="block w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => downloadExport('excel')}
                >
                  {text('exportExcel', 'Excel')}
                </button>
                <button
                  type="button"
                  className="block w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => downloadExport('pdf')}
                >
                  {text('exportPdf', 'PDF')}
                </button>
              </div>
            )}
          </div>
        </div>

        {saveHint && <p className="mt-2 text-xs text-gray-500">{saveHint}</p>}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {balanceWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {balanceWarning}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          {text('loadingEllipsis', 'Loading...')}
        </div>
      ) : sheet ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-gray-900">
                {text('assets', 'Assets')} {formatCurrency(sheet.assets.total)}
              </h3>
            </div>
            <div>
              {sheet.assets.sections
                .sort((a, b) => a.position - b.position)
                .map(section => renderAccount(section))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-gray-900">
                {text('liabilities', 'Liabilities')} {formatCurrency(sheet.liabilities.total)}
              </h3>
            </div>
            <div>
              {sheet.liabilities.sections
                .sort((a, b) => a.position - b.position)
                .map(section => renderAccount(section))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          {text('noData', 'No data')}
        </div>
      )}
    </div>
  );
}

export default BalanceSheet;
