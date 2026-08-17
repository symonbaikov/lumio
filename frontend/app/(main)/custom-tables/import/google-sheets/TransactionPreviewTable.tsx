'use client';

import { tokens } from '@/lib/theme-tokens';
import { Box, Typography } from '@mui/material';
import { useTheme } from 'next-themes';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** Kept in sync with `SheetRowIssue` in `backend/src/modules/import/sheets/map-sheet-rows.ts`. */
export type SheetRowIssue =
  | 'invalid_date'
  | 'invalid_amount'
  | 'zero_amount'
  | 'missing_required'
  | 'duplicate_in_file'
  | 'unknown_currency';

export interface TransactionPreviewTableRow {
  rowNumber: number;
  status: 'ok' | 'invalid' | 'skipped';
  issues: SheetRowIssue[];
  /** Only meaningful when `status === 'ok'`. */
  sessionStatus?: 'new' | 'matched' | 'conflicted' | 'failed';
  /** Id of the pre-existing transaction this row matched/conflicted against. */
  existingTransactionId?: string;
  transaction?: {
    transactionDate: string;
    counterpartyName: string;
    debit?: number;
    credit?: number;
    currency?: string;
  };
  raw: Array<string | null>;
}

type DisplayStatus = 'new' | 'duplicate' | 'error' | 'skipped';

type FilterMode = 'all' | 'issues' | 'duplicates';

/** Maps a row's raw `status`/`sessionStatus` to one of the plan's 4 display categories. */
const getDisplayStatus = (row: TransactionPreviewTableRow): DisplayStatus => {
  if (row.status === 'invalid') {
    return 'error';
  }
  if (row.status === 'skipped') {
    return 'skipped';
  }
  // status === 'ok'
  if (row.sessionStatus === 'matched' || row.sessionStatus === 'conflicted') {
    return 'duplicate';
  }
  if (row.sessionStatus === 'failed') {
    return 'error';
  }
  return 'new';
};

const matchesFilter = (row: TransactionPreviewTableRow, filter: FilterMode): boolean => {
  if (filter === 'all') {
    return true;
  }
  const displayStatus = getDisplayStatus(row);
  if (filter === 'issues') {
    return displayStatus === 'error';
  }
  return displayStatus === 'duplicate';
};

export interface TransactionPreviewTableContent {
  title: ReactNode;
  emptyHint: ReactNode;
  // Used both as visible label text and as the filter <Select>'s aria-label, so
  // (like `TransactionMappingCard`'s `columnHeaders.role`) it needs `.value` — a
  // real intlayer leaf node interpolated/used raw as a string attribute renders
  // "[object Object]" instead of the localized text.
  filterLabel: { value: string };
  filterOptions: { all: ReactNode; issues: ReactNode; duplicates: ReactNode };
  statusChips: { new: ReactNode; duplicate: ReactNode; error: ReactNode; skipped: ReactNode };
  // Joined via .join(', ') and interpolated into a template literal below, so
  // (like `filterLabel`) these need `.value` rather than the raw intlayer node.
  issueLabels: Record<SheetRowIssue, { value: string }>;
  sessionFailedLabel: ReactNode;
  existingTransactionPrefix: { value: string };
  columnHeaders: { row: ReactNode; details: ReactNode; status: ReactNode };
  noRowsForFilter: ReactNode;
  /** Template with `{skipped}`/`{importing}` placeholders, e.g. "{skipped} rows will be skipped, the remaining {importing} will be imported". */
  summaryTemplate: { value: string };
}

export interface TransactionPreviewTableSummary {
  total: number;
  ok: number;
  invalid: number;
  skipped: number;
}

export interface TransactionPreviewTableProps {
  rows: TransactionPreviewTableRow[];
  summary: TransactionPreviewTableSummary | null;
  t: TransactionPreviewTableContent;
}

const interpolate = (template: string, values: Record<string, number>): string =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );

const formatRowDetails = (row: TransactionPreviewTableRow): string => {
  if (row.transaction) {
    const amount = row.transaction.debit ?? row.transaction.credit;
    const amountText =
      amount !== undefined ? `${amount} ${row.transaction.currency ?? ''}`.trim() : '';
    return [row.transaction.transactionDate, row.transaction.counterpartyName, amountText]
      .filter(Boolean)
      .join(' · ');
  }
  return row.raw.filter(Boolean).join(' · ') || '—';
};

/**
 * Per-row import-validation display for the Google Sheets -> transactions preview.
 * Pure, controlled: takes the full `rows` array from the transactions preview
 * response and renders a chip + left-border color per row (green new, amber
 * duplicate, red error, grey skipped), a filter for narrowing the view, and a
 * "N will be skipped, M will be imported" summary. Does not fetch data itself
 * and never hides `ok` rows from the commit — filtering here only affects what
 * is displayed, not what `page.tsx` sends on commit.
 */
export function TransactionPreviewTable({ rows, summary, t }: TransactionPreviewTableProps) {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const [filter, setFilter] = useState<FilterMode>('all');

  const filteredRows = useMemo(
    () => rows.filter(row => matchesFilter(row, filter)),
    [rows, filter],
  );

  const statusStyles: Record<
    DisplayStatus,
    { border: string; bg: string; fg: string; label: ReactNode }
  > = {
    new: { border: c.success, bg: c.successSoft, fg: c.success, label: t.statusChips.new },
    duplicate: {
      border: c.warning,
      bg: c.warningSoft,
      fg: c.warning,
      label: t.statusChips.duplicate,
    },
    error: { border: c.danger, bg: c.dangerSoft, fg: c.danger, label: t.statusChips.error },
    skipped: { border: c.ink300, bg: c.ink50, fg: c.ink500, label: t.statusChips.skipped },
  };

  const renderRowReason = (row: TransactionPreviewTableRow): ReactNode => {
    const displayStatus = getDisplayStatus(row);
    if (displayStatus === 'error') {
      if (row.status === 'invalid' && row.issues.length > 0) {
        return row.issues.map(issue => t.issueLabels[issue].value).join(', ');
      }
      return t.sessionFailedLabel;
    }
    if (displayStatus === 'duplicate' && row.existingTransactionId) {
      return `${t.existingTransactionPrefix.value} ${row.existingTransactionId}`;
    }
    return null;
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink900 }}>
          {t.title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography style={{ fontSize: 12, color: c.ink500 }}>{t.filterLabel.value}</Typography>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as FilterMode)}
            aria-label={t.filterLabel.value}
            style={{
              border: `1px solid ${c.ink150}`,
              background: 'var(--card-bg)',
              padding: '6px 8px',
              fontSize: 13,
              color: c.ink800,
            }}
          >
            <option value="all">{t.filterOptions.all}</option>
            <option value="issues">{t.filterOptions.issues}</option>
            <option value="duplicates">{t.filterOptions.duplicates}</option>
          </select>
        </Box>
      </Box>

      {summary && (
        <Box
          sx={{
            mb: 1.5,
            border: `1px solid ${c.ink150}`,
            bgcolor: 'background.paper',
            p: 1.5,
            fontSize: 13,
            color: c.ink700,
          }}
        >
          {interpolate(t.summaryTemplate.value, {
            skipped: summary.invalid + summary.skipped,
            importing: summary.ok,
          })}
        </Box>
      )}

      {rows.length === 0 ? (
        <Box
          sx={{
            border: `1px dashed ${c.ink150}`,
            bgcolor: c.ink50,
            p: 3,
            fontSize: 14,
            color: c.ink700,
          }}
        >
          {t.emptyHint}
        </Box>
      ) : filteredRows.length === 0 ? (
        <Box
          sx={{
            border: `1px dashed ${c.ink150}`,
            bgcolor: c.ink50,
            p: 3,
            fontSize: 14,
            color: c.ink700,
          }}
        >
          {t.noRowsForFilter}
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left', width: 60, color: c.ink800 }}>
                  {t.columnHeaders.row}
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: c.ink800 }}>
                  {t.columnHeaders.details}
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'left', width: 220, color: c.ink800 }}>
                  {t.columnHeaders.status}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => {
                const displayStatus = getDisplayStatus(row);
                const style = statusStyles[displayStatus];
                const reason = renderRowReason(row);
                return (
                  <tr key={row.rowNumber} style={{ borderLeft: `3px solid ${style.border}` }}>
                    <td style={{ padding: '8px 12px', color: c.ink500 }}>{row.rowNumber}</td>
                    <td style={{ padding: '8px 12px', color: c.ink800 }}>
                      {formatRowDetails(row)}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          bgcolor: style.bg,
                          color: style.fg,
                          px: 1,
                          py: 0.25,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {style.label}
                      </Box>
                      {reason && (
                        <Typography style={{ fontSize: 12, color: c.ink500, marginTop: 4 }}>
                          {reason}
                        </Typography>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
      )}
    </Box>
  );
}

export default TransactionPreviewTable;
