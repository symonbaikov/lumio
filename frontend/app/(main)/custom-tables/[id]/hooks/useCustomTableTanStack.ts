'use client';

import type { SortingState } from '@tanstack/react-table';
import { useTheme } from 'next-themes';
import { useCallback, useMemo, useState } from 'react';
import { useIntlayer } from '@/app/i18n';
import type { ConditionalRule } from '../utils/conditionalRules';
import type {
  CustomTableCellValue,
  CustomTableColumn,
  CustomTableGridRow,
  CustomTableRowStyles,
} from '../utils/stylingUtils';
import { type UseCustomTableStateReturn, useCustomTableState } from './useCustomTableState';
import type { CommonLabels } from './useTanStackLabels';
import { useTanStackLabels } from './useTanStackLabels';

interface RawCb {
  onUpdateCell: (r: string, k: string, v: CustomTableCellValue) => Promise<void>;
  onUpdateRowStyle: (r: string, s: CustomTableRowStyles) => Promise<void>;
  onPersistColumnWidth: (k: string, w: number) => Promise<void>;
  onRenameColumnTitle: (k: string, t: string) => Promise<void>;
  onDeleteRow: (rowId: string) => void;
  onDeleteColumn?: (columnKey: string) => void;
  onSelectedRowIdsChange: (rowIds: string[]) => void;
}

export interface UseCustomTableTanStackParams extends RawCb {
  tableId?: string;
  rows: CustomTableGridRow[];
  columns: CustomTableColumn[];
  selectedRowIds: string[];
  columnWidths: Record<string, number>;
  stickyLeftColumnIds: string[];
  stickyRightColumnIds: string[];
  loadingRows: boolean;
  hasMore: boolean;
  sorting: SortingState;
  conditionalRules: ConditionalRule[];
  onSortingChange: (updater: SortingState | ((prev: SortingState) => SortingState)) => void;
  onCreateRow?: () => Promise<CustomTableGridRow | null>;
  onAddColumnClick?: () => void;
  onLoadMore: (opts?: { reset?: boolean; filtersParam?: string }) => void;
}

export interface UseCustomTableTanStackReturn {
  state: UseCustomTableStateReturn;
  /** Тип колонки по ключу — подвалу нужен, чтобы знать, что можно считать. */
  columnTypeByKey: Record<string, string>;
  isDark: boolean;
  colorPickerRowId: string | null;
  commonLabels: CommonLabels;
  mobileLabels: CommonLabels & { viewLabel: string; editLabel: string; deleteLabel: string };
}

function useBuildAdapters(p: RawCb): {
  cell: (o: { rowId: string; columnKey: string; value: CustomTableCellValue }) => Promise<void>;
  style: (o: { rowId: string; styles: CustomTableRowStyles }) => Promise<void>;
  width: (o: { columnKey: string; width: number }) => Promise<void>;
  rename: (o: { columnKey: string; nextTitle: string }) => Promise<void>;
  selection: (o: { rowIds: string[] }) => void;
  deleteRow: (o: { rowId: string }) => void;
  deleteCol: ((o: { columnKey: string }) => void) | undefined;
} {
  // Destructured so each adapter depends on its own callback (calling `p.x()`
  // would make the whole props object a dependency).
  const {
    onUpdateCell,
    onUpdateRowStyle,
    onPersistColumnWidth,
    onRenameColumnTitle,
    onSelectedRowIdsChange,
    onDeleteRow,
    onDeleteColumn,
  } = p;
  const cell = useCallback(
    (o: { rowId: string; columnKey: string; value: CustomTableCellValue }) =>
      onUpdateCell(o.rowId, o.columnKey, o.value),
    [onUpdateCell],
  );
  const style = useCallback(
    (o: { rowId: string; styles: CustomTableRowStyles }) => onUpdateRowStyle(o.rowId, o.styles),
    [onUpdateRowStyle],
  );
  const width = useCallback(
    (o: { columnKey: string; width: number }) => onPersistColumnWidth(o.columnKey, o.width),
    [onPersistColumnWidth],
  );
  const rename = useCallback(
    (o: { columnKey: string; nextTitle: string }) => onRenameColumnTitle(o.columnKey, o.nextTitle),
    [onRenameColumnTitle],
  );
  const selection = useCallback(
    (o: { rowIds: string[] }) => onSelectedRowIdsChange(o.rowIds),
    [onSelectedRowIdsChange],
  );
  const deleteRow = useCallback((o: { rowId: string }) => onDeleteRow(o.rowId), [onDeleteRow]);
  const deleteCol = useMemo(
    () =>
      onDeleteColumn ? (o: { columnKey: string }) => onDeleteColumn?.(o.columnKey) : undefined,
    [onDeleteColumn],
  );
  return { cell, style, width, rename, selection, deleteRow, deleteCol };
}

export function useCustomTableTanStack(
  params: UseCustomTableTanStackParams,
): UseCustomTableTanStackReturn {
  const t = useIntlayer('customTableDetailPage');
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [colorPickerRowId, setColorPickerRowId] = useState<string | null>(null);
  const { columnLabels, commonLabels } = useTanStackLabels(t);
  const adapters = useBuildAdapters(params);

  const state = useCustomTableState({
    tableId: params.tableId,
    rows: params.rows,
    columns: params.columns,
    selectedRowIds: params.selectedRowIds,
    columnWidths: params.columnWidths,
    stickyLeftColumnIds: params.stickyLeftColumnIds,
    stickyRightColumnIds: params.stickyRightColumnIds,
    loadingRows: params.loadingRows,
    hasMore: params.hasMore,
    sorting: params.sorting,
    onSortingChange: params.onSortingChange,
    conditionalRules: params.conditionalRules,
    isDark,
    onCreateRow: params.onCreateRow,
    onAddColumnClick: params.onAddColumnClick,
    onLoadMore: params.onLoadMore,
    colorPickerRowId,
    setColorPickerRowId,
    columnLabels,
    onUpdateCell: adapters.cell,
    onUpdateRowStyle: adapters.style,
    onDeleteRow: adapters.deleteRow,
    onPersistColumnWidth: adapters.width,
    onSelectedRowIdsChange: adapters.selection,
    onRenameColumnTitle: adapters.rename,
    onDeleteColumn: adapters.deleteCol,
  });

  const mobileLabels = useMemo(
    () => ({ ...commonLabels, viewLabel: 'View', editLabel: 'Edit', deleteLabel: 'Delete' }),
    [commonLabels],
  );

  const columnTypeByKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const col of params.columns) {
      map[col.key] = col.type;
    }
    return map;
  }, [params.columns]);

  return { state, columnTypeByKey, isDark, colorPickerRowId, commonLabels, mobileLabels };
}
