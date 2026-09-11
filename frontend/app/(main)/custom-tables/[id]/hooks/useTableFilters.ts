'use client';

import type { Locale } from 'date-fns';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import type { RowFilter } from '../utils/stylingUtils';
import type { CustomTablePageColumn } from '../utils/tableTypes';
import type { ColumnFilterState, RowFilterOp } from './useColumnConfig';

function buildRangeFilter(
  colKey: string,
  lower: number | undefined,
  upper: number | undefined,
): RowFilter | null {
  if (lower !== undefined && upper !== undefined) {
    return { col: colKey, op: 'between', value: [lower, upper] };
  }
  if (lower !== undefined) {
    return { col: colKey, op: 'gte', value: lower };
  }
  if (upper !== undefined) {
    return { col: colKey, op: 'lte', value: upper };
  }
  return null;
}

function buildNumberFilter(colKey: string, state: ColumnFilterState): RowFilter | null {
  const min = state.min !== undefined && state.min !== '' ? Number(state.min) : undefined;
  const max = state.max !== undefined && state.max !== '' ? Number(state.max) : undefined;
  const validMin = min !== undefined && Number.isFinite(min) ? min : undefined;
  const validMax = max !== undefined && Number.isFinite(max) ? max : undefined;
  return buildRangeFilter(colKey, validMin, validMax);
}

function buildDateFilter(
  colKey: string,
  state: ColumnFilterState,
  dateFnsLocale: Locale,
): RowFilter | null {
  const from = state.from ? new Date(`${state.from}T00:00:00`) : undefined;
  const to = state.to ? new Date(`${state.to}T00:00:00`) : undefined;
  const toIso = (d: Date) => format(d, 'yyyy-MM-dd', { locale: dateFnsLocale });
  const validFrom = from && !Number.isNaN(from.getTime()) ? toIso(from) : undefined;
  const validTo = to && !Number.isNaN(to.getTime()) ? toIso(to) : undefined;
  return buildRangeFilter(colKey, validFrom as unknown as number, validTo as unknown as number);
}

function buildTextFilter(colKey: string, state: ColumnFilterState): RowFilter | null {
  const op: RowFilterOp = state.op || 'contains';
  if (op === 'isEmpty' || op === 'isNotEmpty') {
    return { col: colKey, op };
  }
  const value = (typeof state.value === 'string' ? state.value : String(state.value ?? '')).trim();
  return value ? { col: colKey, op, value } : null;
}

function buildColumnFilter(
  col: CustomTablePageColumn,
  state: ColumnFilterState,
  dateFnsLocale: Locale,
): RowFilter | null {
  if (col.type === 'number') {
    return buildNumberFilter(col.key, state);
  }
  if (col.type === 'date') {
    return buildDateFilter(col.key, state, dateFnsLocale);
  }
  return buildTextFilter(col.key, state);
}

interface UseTableFiltersParams {
  orderedColumns: CustomTablePageColumn[];
  columnFilters: Record<string, ColumnFilterState>;
  gridFiltersParam: string | undefined;
  activeTabFilter: RowFilter | null;
  searchQuery: string;
  dateFnsLocale: Locale;
}

export interface UseTableFiltersReturn {
  dateFrom: string | null;
  setDateFrom: React.Dispatch<React.SetStateAction<string | null>>;
  dateTo: string | null;
  setDateTo: React.Dispatch<React.SetStateAction<string | null>>;
  combinedFiltersParam: string | undefined;
}

function parseDateValue(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  const raw = typeof value === 'string' ? value : String(value);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseFiltersParam(raw: string | undefined): RowFilter[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RowFilter[]) : [];
  } catch {
    return [];
  }
}

export function useTableFilters({
  orderedColumns,
  columnFilters,
  gridFiltersParam,
  activeTabFilter,
  searchQuery,
  dateFnsLocale,
}: UseTableFiltersParams): UseTableFiltersReturn {
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const requestFilters = useMemo<RowFilter[]>(() => {
    return orderedColumns
      .map(col => {
        const state = columnFilters[col.key];
        if (!state) {
          return null;
        }
        return buildColumnFilter(col, state, dateFnsLocale);
      })
      .filter((f): f is RowFilter => f !== null);
  }, [orderedColumns, columnFilters, dateFnsLocale]);

  const dateFilterColKey = useMemo(() => {
    const firstDateCol = orderedColumns.find(c => c.type === 'date');
    return firstDateCol?.key || null;
  }, [orderedColumns]);

  const dateFilters = useMemo<RowFilter[]>(() => {
    if (!dateFilterColKey) {
      return [];
    }
    const toIso = (d: Date) => format(d, 'yyyy-MM-dd', { locale: dateFnsLocale });
    const from = parseDateValue(dateFrom);
    const to = parseDateValue(dateTo);
    const validFrom = from && !Number.isNaN(from.getTime()) ? toIso(from) : undefined;
    const validTo = to && !Number.isNaN(to.getTime()) ? toIso(to) : undefined;
    const filter = buildRangeFilter(
      dateFilterColKey,
      validFrom as unknown as number,
      validTo as unknown as number,
    );
    return filter ? [filter] : [];
  }, [dateFilterColKey, dateFrom, dateTo, dateFnsLocale]);

  const searchFilter = useMemo<RowFilter | null>(() => {
    const value = searchQuery.trim();
    if (!value) {
      return null;
    }
    return { col: '__search__', op: 'search', value };
  }, [searchQuery]);

  const combinedFiltersParam = useMemo(() => {
    const base = parseFiltersParam(gridFiltersParam);
    const tabFilters = activeTabFilter ? [activeTabFilter] : [];
    const searchFilters = searchFilter ? [searchFilter] : [];
    const overrideCols = new Set<string>([
      ...requestFilters.map(f => f.col),
      ...dateFilters.map(f => f.col),
      ...tabFilters.map(f => f.col),
      ...searchFilters.map(f => f.col),
    ]);
    const baseWithoutOverrides = base.filter(f => !overrideCols.has(f.col));
    const merged = [
      ...baseWithoutOverrides,
      ...requestFilters,
      ...dateFilters,
      ...tabFilters,
      ...searchFilters,
    ];
    return merged.length ? JSON.stringify(merged) : undefined;
  }, [gridFiltersParam, requestFilters, dateFilters, activeTabFilter, searchFilter]);

  return { dateFrom, setDateFrom, dateTo, setDateTo, combinedFiltersParam };
}
