'use client';

import { useIntlayer } from '@/app/i18n';
import type { SortingState } from '@tanstack/react-table';
import { useTheme } from 'next-themes';
import { useCallback, useMemo, useState } from 'react';
import type { ConditionalRule } from '../utils/conditionalRules';
import type {
  CustomTableCellValue,
  CustomTableColumn,
  CustomTableGridRow,
  CustomTableRowStyles,
} from '../utils/stylingUtils';
import { type UseCustomTableStateReturn, useCustomTableState } from './useCustomTableState';
import { useTanStackLabels } from './useTanStackLabels';
import type { CommonLabels } from './useTanStackLabels';

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
  const cell = useCallback(
    (o: { rowId: string; columnKey: string; value: CustomTableCellValue }) =>
      p.onUpdateCell(o.rowId, o.columnKey, o.value),
    [p.onUpdateCell],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useCallback(
    (o: { rowId: string; styles: CustomTableRowStyles }) => p.onUpdateRowStyle(o.rowId, o.styles),
    [p.onUpdateRowStyle],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const width = useCallback(
    (o: { columnKey: string; width: number }) => p.onPersistColumnWidth(o.columnKey, o.width),
    [p.onPersistColumnWidth],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const rename = useCallback(
    (o: { columnKey: string; nextTitle: string }) =>
      p.onRenameColumnTitle(o.columnKey, o.nextTitle),
    [p.onRenameColumnTitle],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const selection = useCallback(
    (o: { rowIds: string[] }) => p.onSelectedRowIdsChange(o.rowIds),
    [p.onSelectedRowIdsChange],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const deleteRow = useCallback((o: { rowId: string }) => p.onDeleteRow(o.rowId), [p.onDeleteRow]); // eslint-disable-line react-hooks/exhaustive-deps
  const deleteCol = useMemo(
    () =>
      p.onDeleteColumn ? (o: { columnKey: string }) => p.onDeleteColumn?.(o.columnKey) : undefined,
    [p.onDeleteColumn],
  ); // eslint-disable-line react-hooks/exhaustive-deps
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
