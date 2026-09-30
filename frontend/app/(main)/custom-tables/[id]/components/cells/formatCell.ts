import { formatStoredDate } from '@/app/lib/user-format-store';
import { formatCellNumber } from '../../utils/numberFormat';
import { findOption, normalizeSelectOptions } from '../../utils/selectOptions';
import type {
  CustomTableCellValue,
  CustomTableColumn,
  CustomTableGridRow,
  SelectOptionDef,
} from '../../utils/types';

export const EMPTY_CELL = '—';

const asNumber = (value: CustomTableCellValue): number | null =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value)
      : null;

export function numberFormatFor(column: CustomTableColumn, fallbackCurrency: string) {
  const config = column.config ?? {};
  return {
    currency:
      column.type === 'currency'
        ? typeof config.currency === 'string'
          ? config.currency
          : fallbackCurrency
        : undefined,
    precision: typeof config.precision === 'number' ? config.precision : undefined,
    format: config.format === 'percent' ? ('percent' as const) : ('plain' as const),
  };
}

export function selectedOptions(
  column: CustomTableColumn,
  value: CustomTableCellValue,
): SelectOptionDef[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];
  const options = normalizeSelectOptions(column.config);
  return values.map(v => findOption(options, v) ?? { value: v });
}

/** Plain-text rendering of a cell, used for read-only display and titles. */
export function formatCellText(
  column: CustomTableColumn,
  row: CustomTableGridRow,
  fallbackCurrency: string,
  booleanLabels: { yes: string; no: string },
): string {
  const value = row.data?.[column.key] ?? null;
  switch (column.type) {
    case 'number':
    case 'currency':
    case 'formula': {
      const n = asNumber(value);
      return n === null || Number.isNaN(n)
        ? EMPTY_CELL
        : formatCellNumber(n, numberFormatFor(column, fallbackCurrency));
    }
    case 'date':
      return typeof value === 'string' && value ? formatStoredDate(new Date(value)) : EMPTY_CELL;
    case 'boolean':
      return value === true ? booleanLabels.yes : value === false ? booleanLabels.no : EMPTY_CELL;
    case 'select':
    case 'multi_select':
      return (
        selectedOptions(column, value)
          .map(o => o.label ?? o.value)
          .join(', ') || EMPTY_CELL
      );
    case 'relation':
      return (
        row.relationLabels?.[column.key] ??
        (typeof value === 'string' && value ? value : EMPTY_CELL)
      );
    default:
      return value === null || value === undefined || value === '' ? EMPTY_CELL : String(value);
  }
}

export const isNumericColumn = (column: CustomTableColumn): boolean =>
  column.type === 'number' || column.type === 'currency' || column.type === 'formula';

export const isEditableColumn = (column: CustomTableColumn): boolean =>
  column.type !== 'formula' && column.type !== 'relation' && column.type !== 'ai';
