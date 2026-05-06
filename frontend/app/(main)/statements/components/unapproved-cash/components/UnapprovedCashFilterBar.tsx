'use client';

import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Search, X } from '@/app/components/icons';
import type {
  UnapprovedQueueFilters,
  UnapprovedReasonId,
  UnapprovedSource,
} from '../../unapproved-cash-utils';
import { toCalendarDate, toFilterDateValue } from '../hooks/useUnapprovedCashViewModel';
import { tokens } from '@/lib/theme-tokens';

type ReasonOption = { id: UnapprovedReasonId; label: string };
type SourceOption = { id: UnapprovedSource; label: string };

interface UnapprovedCashFilterBarProps {
  filters: UnapprovedQueueFilters;
  reasonOptions: ReasonOption[];
  sourceOptions: SourceOption[];
  labels: {
    searchPlaceholder: string;
    filters: Record<string, string>;
  };
  setFilters: (updater: ((prev: UnapprovedQueueFilters) => UnapprovedQueueFilters)) => void;
  resetFilters: () => void;
}

const INPUT_STYLE: React.CSSProperties = {
  border: '1px solid var(--border-color)',
  background: 'var(--card-bg)',
  padding: '8px 12px',
  fontSize: 14,
  color: 'var(--foreground)',
  borderRadius: tokens.radius.md,
};

type SetFilters = (updater: ((prev: UnapprovedQueueFilters) => UnapprovedQueueFilters)) => void;

// eslint-disable-next-line max-params
function applyReasonFilter(value: string, setFilters: SetFilters): void {
  setFilters(prev => ({
    ...prev,
    reasons: value === 'all' ? [] : [value as UnapprovedReasonId],
  }));
}

// eslint-disable-next-line max-lines-per-function
export function UnapprovedCashFilterBar({
  filters,
  reasonOptions,
  sourceOptions,
  labels,
  setFilters,
  resetFilters,
}: UnapprovedCashFilterBarProps): React.ReactElement {
  const { searchPlaceholder, filters: filterLabels } = labels;

  return (
    <div style={{ border: '1px solid var(--border-color)', background: 'var(--card-bg)', padding: 12, borderRadius: tokens.radius.lg }}>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(7, 1fr)' }}>
        <div style={{ position: 'relative', gridColumn: 'span 2' }}>
          <Search style={{ pointerEvents: 'none', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--muted-foreground)' }} />
          <input
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder={searchPlaceholder}
            style={{ ...INPUT_STYLE, width: '100%', paddingLeft: 36, paddingRight: 12 }}
          />
        </div>
        <select
          value={filters.reasons[0] || 'all'}
          onChange={e => applyReasonFilter(e.target.value, setFilters)}
          style={INPUT_STYLE}
          aria-label={filterLabels.reason}
        >
          <option value="all">{`${filterLabels.reason}: ${filterLabels.allReasons}`}</option>
          {reasonOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
        </select>
        <select
          value={filters.source}
          onChange={e => setFilters(prev => ({ ...prev, source: e.target.value as UnapprovedQueueFilters['source'] }))}
          style={INPUT_STYLE}
          aria-label={filterLabels.source}
        >
          <option value="all">{`${filterLabels.source}: ${filterLabels.allSources}`}</option>
          {sourceOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
        </select>
        <input
          type="number"
          value={filters.amountMin ?? ''}
          onChange={e => setFilters(prev => ({ ...prev, amountMin: e.target.value.trim() === '' ? null : Number(e.target.value.trim()) }))}
          placeholder={filterLabels.amountFrom}
          style={INPUT_STYLE}
        />
        <input
          type="number"
          value={filters.amountMax ?? ''}
          onChange={e => setFilters(prev => ({ ...prev, amountMax: e.target.value.trim() === '' ? null : Number(e.target.value.trim()) }))}
          placeholder={filterLabels.amountTo}
          style={INPUT_STYLE}
        />
        <button
          type="button"
          onClick={resetFilters}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', padding: '8px 12px', fontSize: 14, fontWeight: 500, color: 'var(--foreground)', cursor: 'pointer', borderRadius: tokens.radius.md }}
        >
          <X style={{ width: 16, height: 16 }} />
          {filterLabels.reset}
        </button>
      </div>
      <div style={{ marginTop: 8, display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <DatePicker
          label={filterLabels.dateFrom}
          value={toCalendarDate(filters.dateFrom)}
          onChange={(value: Date | null) => setFilters(prev => ({ ...prev, dateFrom: toFilterDateValue(value) }))}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
        <DatePicker
          label={filterLabels.dateTo}
          value={toCalendarDate(filters.dateTo)}
          onChange={(value: Date | null) => setFilters(prev => ({ ...prev, dateTo: toFilterDateValue(value) }))}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
      </div>
    </div>
  );
}
