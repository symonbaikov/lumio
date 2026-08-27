'use client';

import { formatStoredDate } from '@/app/lib/user-format-store';
import type { RowSelectionState } from '@tanstack/react-table';
import type { CustomTableColumn, CustomTableGridRow } from '../utils/stylingUtils';

export function buildRowSelectionState(selectedRowIds: string[]): RowSelectionState {
  const next: RowSelectionState = {};
  for (const id of selectedRowIds) {
    next[id] = true;
  }
  return next;
}

export function buildNextSelectedIds(
  updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState),
  prev: RowSelectionState,
): string[] {
  const next = typeof updater === 'function' ? updater(prev) : updater;
  return Object.entries(next)
    .filter(([, v]) => v)
    .map(([k]) => k);
}

function isMissingCellValue(raw: unknown): boolean {
  return raw === null || raw === undefined || raw === '';
}

function formatDateCell(raw: unknown): string {
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return String(raw);
  }
  const date = new Date(raw as string | number);
  if (Number.isNaN(date.getTime())) {
    return String(raw);
  }
  return formatStoredDate(date);
}

function formatTypedCellValue(column: CustomTableColumn, raw: unknown): string {
  if (column.type === 'boolean') {
    return raw ? 'Yes' : 'No';
  }
  if (column.type === 'date') {
    return formatDateCell(raw);
  }
  if (column.type === 'multi_select' && Array.isArray(raw)) {
    return raw.join(', ');
  }
  return String(raw);
}

export function formatMobileCellValue(column: CustomTableColumn, row: CustomTableGridRow): string {
  const raw = row.data?.[column.key];
  if (isMissingCellValue(raw)) {
    return '—';
  }
  return formatTypedCellValue(column, raw);
}

interface BuildStickyOffsetsTable {
  getAllLeafColumns: () => { id: string; getSize: () => number }[];
}

export function buildStickyOffsets(
  table: BuildStickyOffsetsTable,
  leftIds: string[],
  rightIds: string[],
): { left: Record<string, number>; right: Record<string, number> } {
  const left: Record<string, number> = {};
  const right: Record<string, number> = {};
  const leftSet = new Set(leftIds);
  const rightSet = new Set(rightIds);
  const cols = table.getAllLeafColumns();
  let leftOffset = 0;
  for (const col of cols) {
    if (leftSet.has(col.id)) {
      left[col.id] = leftOffset;
      leftOffset += col.getSize();
    }
  }
  let rightOffset = 0;
  for (let i = cols.length - 1; i >= 0; i -= 1) {
    if (rightSet.has(cols[i].id)) {
      right[cols[i].id] = rightOffset;
      rightOffset += cols[i].getSize();
    }
  }
  return { left, right };
}
