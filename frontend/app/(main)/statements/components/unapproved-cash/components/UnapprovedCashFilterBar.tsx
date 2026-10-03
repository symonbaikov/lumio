'use client';

import Popover from '@mui/material/Popover';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import React, { useState } from 'react';
import { resolveLocale } from '@/app/(main)/dashboard/helpers/dashboard-helpers';
import { StatementsToolbarButton } from '@/app/(main)/statements/components/StatementsToolbarButton';
import { CalendarDays, SlidersHorizontal, X } from '@/app/components/icons';
import { Select } from '@/app/components/ui/select';
import { useLocale } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import type {
  UnapprovedQueueFilters,
  UnapprovedReasonId,
  UnapprovedSource,
} from '../../unapproved-cash-utils';
import { toCalendarDate, toFilterDateValue } from '../hooks/useUnapprovedCashViewModel';

type ReasonOption = { id: UnapprovedReasonId; label: string };
type SourceOption = { id: UnapprovedSource; label: string };
type SetFilters = (updater: (prev: UnapprovedQueueFilters) => UnapprovedQueueFilters) => void;

interface UnapprovedCashFilterBarProps {
  filters: UnapprovedQueueFilters;
  reasonOptions: ReasonOption[];
  sourceOptions: SourceOption[];
  labels: {
    filters: Record<string, string>;
  };
  setFilters: SetFilters;
  resetFilters: () => void;
}

/** One height for every control, so the toolbar reads as a single line. */
const CONTROL_HEIGHT = 36;

const INPUT_STYLE: React.CSSProperties = {
  height: CONTROL_HEIGHT,
  border: '1px solid var(--border-color)',
  background: 'var(--card-bg)',
  padding: '0 12px',
  fontSize: 14,
  color: 'var(--foreground)',
  borderRadius: tokens.radius.md,
};

const BUTTON_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const POPOVER_PAPER = {
  sx: { mt: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, width: 280 },
};

const parseAmount = (raw: string): number | null => (raw.trim() === '' ? null : Number(raw.trim()));

function useShortDate(): (value: string | null) => string | null {
  const { locale } = useLocale();
  const formatter = new Intl.DateTimeFormat(resolveLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return value => {
    const date = toCalendarDate(value);
    return date ? formatter.format(date) : null;
  };
}

type PopoverButtonProps = {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

/** A toolbar button that opens its fields in a popover instead of a second row. */
function PopoverButton({ label, icon, children }: PopoverButtonProps): React.JSX.Element {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  return (
    <>
      <StatementsToolbarButton
        aria-haspopup="dialog"
        aria-expanded={Boolean(anchor)}
        onClick={event => setAnchor(event.currentTarget)}
      >
        {icon}
        {label}
      </StatementsToolbarButton>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: POPOVER_PAPER }}
      >
        {children}
      </Popover>
    </>
  );
}

function DateRangeButton({
  filters,
  labels,
  setFilters,
}: Pick<UnapprovedCashFilterBarProps, 'filters' | 'setFilters'> & {
  labels: Record<string, string>;
}): React.JSX.Element {
  const shortDate = useShortDate();
  const from = shortDate(filters.dateFrom);
  const to = shortDate(filters.dateTo);
  const range = from || to ? `${from ?? '…'} – ${to ?? '…'}` : labels.anyDate;
  return (
    <PopoverButton
      label={`${labels.date}: ${range}`}
      icon={<CalendarDays style={{ width: 16, height: 16 }} />}
    >
      <DatePicker
        label={labels.dateFrom}
        value={toCalendarDate(filters.dateFrom)}
        onChange={(value: Date | null) =>
          setFilters(prev => ({ ...prev, dateFrom: toFilterDateValue(value) }))
        }
        slotProps={{ textField: { size: 'small', fullWidth: true } }}
      />
      <DatePicker
        label={labels.dateTo}
        value={toCalendarDate(filters.dateTo)}
        onChange={(value: Date | null) =>
          setFilters(prev => ({ ...prev, dateTo: toFilterDateValue(value) }))
        }
        slotProps={{ textField: { size: 'small', fullWidth: true } }}
      />
    </PopoverButton>
  );
}

function FiltersButton({
  filters,
  reasonOptions,
  sourceOptions,
  labels,
  setFilters,
  resetFilters,
}: Pick<
  UnapprovedCashFilterBarProps,
  'filters' | 'reasonOptions' | 'sourceOptions' | 'setFilters' | 'resetFilters'
> & {
  labels: Record<string, string>;
}): React.JSX.Element {
  const activeCount =
    (filters.reasons.length > 0 ? 1 : 0) +
    (filters.source !== 'all' ? 1 : 0) +
    [filters.amountMin, filters.amountMax].filter(v => v !== null).length;
  return (
    <PopoverButton
      label={activeCount > 0 ? `${labels.more} (${activeCount})` : labels.more}
      icon={<SlidersHorizontal style={{ width: 16, height: 16 }} />}
    >
      <Select
        size="small"
        value={filters.reasons[0] || 'all'}
        onChange={value =>
          setFilters(prev => ({
            ...prev,
            reasons: value === 'all' ? [] : [value as UnapprovedReasonId],
          }))
        }
        inputProps={{ 'aria-label': labels.reason }}
        options={[
          { value: 'all', label: `${labels.reason}: ${labels.allReasons}` },
          ...reasonOptions.map(opt => ({ value: opt.id, label: opt.label })),
        ]}
      />
      <Select
        size="small"
        value={filters.source}
        onChange={value =>
          setFilters(prev => ({ ...prev, source: value as UnapprovedQueueFilters['source'] }))
        }
        inputProps={{ 'aria-label': labels.source }}
        options={[
          { value: 'all', label: `${labels.source}: ${labels.allSources}` },
          ...sourceOptions.map(opt => ({ value: opt.id, label: opt.label })),
        ]}
      />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>
        {labels.amount}
      </span>
      <input
        type="number"
        aria-label={labels.amountFrom}
        value={filters.amountMin ?? ''}
        onChange={e => setFilters(prev => ({ ...prev, amountMin: parseAmount(e.target.value) }))}
        placeholder={labels.amountFrom}
        style={INPUT_STYLE}
      />
      <input
        type="number"
        aria-label={labels.amountTo}
        value={filters.amountMax ?? ''}
        onChange={e => setFilters(prev => ({ ...prev, amountMax: parseAmount(e.target.value) }))}
        placeholder={labels.amountTo}
        style={INPUT_STYLE}
      />
      {hasActiveFilters(filters) ? (
        <button
          type="button"
          onClick={resetFilters}
          style={{
            ...BUTTON_STYLE,
            border: 'none',
            background: 'none',
            color: 'var(--muted-foreground)',
          }}
        >
          <X style={{ width: 16, height: 16 }} />
          {labels.reset}
        </button>
      ) : null}
    </PopoverButton>
  );
}

const hasActiveFilters = (filters: UnapprovedQueueFilters): boolean =>
  Boolean(filters.search.trim()) ||
  filters.reasons.length > 0 ||
  filters.source !== 'all' ||
  filters.amountMin !== null ||
  filters.amountMax !== null ||
  Boolean(filters.dateFrom) ||
  Boolean(filters.dateTo);

/** Two toolbar buttons, the way every other statements page carries its filters:
 *  the date range behind Date, everything else behind Filters. */
export function UnapprovedCashFilterBar({
  filters,
  reasonOptions,
  sourceOptions,
  labels,
  setFilters,
  resetFilters,
}: UnapprovedCashFilterBarProps): React.ReactElement {
  const { filters: filterLabels } = labels;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <DateRangeButton filters={filters} labels={filterLabels} setFilters={setFilters} />
      <FiltersButton
        filters={filters}
        reasonOptions={reasonOptions}
        sourceOptions={sourceOptions}
        labels={filterLabels}
        setFilters={setFilters}
        resetFilters={resetFilters}
      />
    </div>
  );
}
