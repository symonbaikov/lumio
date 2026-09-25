import type { ColumnDef } from '@tanstack/react-table';
import type { ColumnMenuLabels, ColumnStylePatch } from '../components/headers/ColumnHeaderMenu';
import type { ConditionalRule } from './conditionalRules';
import type { CustomTableCellValue, CustomTableColumn, CustomTableGridRow } from './stylingUtils';

export type UpdateCellFn = (
  rowId: string,
  columnKey: string,
  value: CustomTableCellValue,
) => Promise<void>;
export type RenameColumnFn = (columnKey: string, nextTitle: string) => Promise<void>;
export type DeleteColumnFn = (columnKey: string) => void;
export type DeleteRowFn = (rowId: string) => void;
export type OpenColorPickerFn = (
  rowId: string,
  event: { clientX: number; clientY: number },
) => void;

export interface GridHeaderMeta {
  icon: string | null;
  labels: ColumnMenuLabels;
  isPinned: boolean;
  onRename: RenameColumnFn;
  onDelete?: DeleteColumnFn;
  onEdit?: (columnKey: string) => void;
  onSetStyle?: (opts: { columnKey: string; style: ColumnStylePatch }) => Promise<void>;
  onTogglePin?: (columnKey: string) => void;
  onHide?: (columnKey: string) => void;
}

/**
 * Что грид кладёт в meta колонки TanStack. td/th читают отсюда колонку и
 * правила, а шапка — свои колбэки: так компонент шапки остаётся одним и тем же
 * между перестройками колонок и не теряет состояние (открытое меню, ввод).
 */
export interface GridColumnMeta {
  gridColumn: CustomTableColumn;
  conditionalRules: ConditionalRule[];
  header?: GridHeaderMeta;
}

export const readGridColumnMeta = (
  columnDef: ColumnDef<CustomTableGridRow>,
): GridColumnMeta | undefined => {
  const meta = columnDef.meta as Partial<GridColumnMeta> | undefined;
  return meta?.gridColumn ? (meta as GridColumnMeta) : undefined;
};
