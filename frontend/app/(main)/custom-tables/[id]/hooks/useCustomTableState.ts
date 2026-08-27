'use client';

import {
  type ColumnResizeMode,
  type RowSelectionState,
  type SortingState,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildNextSelectedIds,
  buildRowSelectionState,
  buildStickyOffsets,
  formatMobileCellValue,
} from '../helpers/tableStateHelpers';
import { buildColumns } from '../utils/columnDefinitions';
import type { ConditionalRule } from '../utils/conditionalRules';
import type {
  CustomTableCellValue,
  CustomTableColumn,
  CustomTableGridRow,
  CustomTableRowStyles,
} from '../utils/stylingUtils';
import { useColorPickerInteraction } from './useColorPickerInteraction';
import { useMobileSelection } from './useMobileSelection';

interface CellUpdateOpts {
  rowId: string;
  columnKey: string;
  value: CustomTableCellValue;
}
interface RowStyleUpdateOpts {
  rowId: string;
  styles: CustomTableRowStyles;
}
interface ColumnWidthOpts {
  columnKey: string;
  width: number;
}
interface RenameTitleOpts {
  columnKey: string;
  nextTitle: string;
}

interface UseCustomTableStateParams {
  tableId?: string;
  rows: CustomTableGridRow[];
  columns: CustomTableColumn[];
  selectedRowIds: string[];
  columnWidths: Record<string, number>;
  stickyLeftColumnIds: string[];
  stickyRightColumnIds: string[];
  loadingRows: boolean;
  hasMore: boolean;
  isDark: boolean;
  sorting: SortingState;
  conditionalRules: ConditionalRule[];
  onSortingChange: (updater: SortingState | ((prev: SortingState) => SortingState)) => void;
  onUpdateCell: (opts: CellUpdateOpts) => Promise<void>;
  onUpdateRowStyle: (opts: RowStyleUpdateOpts) => Promise<void>;
  onCreateRow?: () => Promise<CustomTableGridRow | null>;
  onDeleteRow: (opts: { rowId: string }) => void;
  onPersistColumnWidth: (opts: ColumnWidthOpts) => Promise<void>;
  onSelectedRowIdsChange: (opts: { rowIds: string[] }) => void;
  onRenameColumnTitle: (opts: RenameTitleOpts) => Promise<void>;
  onDeleteColumn?: (opts: { columnKey: string }) => void;
  onAddColumnClick?: () => void;
  onLoadMore: (opts?: { reset?: boolean; filtersParam?: string }) => void;
  colorPickerRowId: string | null;
  setColorPickerRowId: (id: string | null) => void;
  columnLabels: {
    actionsHeaderLabel: string;
    colorTooltipLabel: string;
    deleteLabel: string;
    addRowLabel: string;
  };
}

export interface UseCustomTableStateReturn {
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
  colorPickerValue: string;
  colorPickerAnchorPosition: { top: number; left: number } | null;
  orderedColumns: CustomTableColumn[];
  table: ReturnType<typeof useReactTable<CustomTableGridRow>>;
  stickyOffsets: { left: Record<string, number>; right: Record<string, number> };
  selectedRowsSet: Set<string>;
  allRowsSelectedMobile: boolean;
  someRowsSelectedMobile: boolean;
  virtualItems: ReturnType<
    typeof useVirtualizer<HTMLDivElement, Element>
  >['getVirtualItems'] extends () => infer R
    ? R
    : never;
  rowVirtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
  formatMobileCellValue: (column: CustomTableColumn, row: CustomTableGridRow) => string;
  handleMobileSelectAll: (checked: boolean | 'indeterminate') => void;
  handleMobileSelectRow: (rowId: string, checked: boolean) => void;
  handleScroll: () => void;
  handleColorPickerClose: () => void;
  handleColorPickerChange: (next: string) => void;
  handleResizeMouseDown: (columnId: string, event: React.MouseEvent | React.TouchEvent) => void;
}

function buildCellAdapter(
  fn: (opts: CellUpdateOpts) => Promise<void>,
): (r: string, k: string, v: CustomTableCellValue) => Promise<void> {
  return (rowId, columnKey, value) => fn({ rowId, columnKey, value });
}
function buildWidthAdapter(
  fn: (opts: ColumnWidthOpts) => Promise<void>,
): (k: string, w: number) => Promise<void> {
  return (columnKey, width) => fn({ columnKey, width });
}
function buildRenameAdapter(
  fn: (opts: RenameTitleOpts) => Promise<void>,
): (k: string, t: string) => Promise<void> {
  return (columnKey, nextTitle) => fn({ columnKey, nextTitle });
}

export function useCustomTableState(params: UseCustomTableStateParams): UseCustomTableStateReturn {
  const {
    tableId,
    rows,
    columns,
    selectedRowIds,
    columnWidths,
    stickyLeftColumnIds,
    stickyRightColumnIds,
    loadingRows,
    hasMore,
    sorting,
    onSortingChange,
    conditionalRules,
    onUpdateCell,
    onPersistColumnWidth,
    onSelectedRowIdsChange,
    onRenameColumnTitle,
    onDeleteColumn,
    onAddColumnClick,
    onLoadMore,
    onCreateRow,
    onDeleteRow,
    setColorPickerRowId,
    columnLabels,
  } = params;
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [columnResizing, setColumnResizing] = useState<Record<string, number>>({});
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const mobile = useMobileSelection({ rows, selectedRowIds, onSelectedRowIdsChange });
  const colorPicker = useColorPickerInteraction({ rows, setColorPickerRowId });
  const rowSelection = useMemo(() => buildRowSelectionState(selectedRowIds), [selectedRowIds]);
  const onRowSelectionChange = useCallback(
    (updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)): void => {
      onSelectedRowIdsChange({ rowIds: buildNextSelectedIds(updater, rowSelection) });
    },
    [onSelectedRowIdsChange, rowSelection],
  );
  const orderedColumns = useMemo(
    () => [...columns].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [columns],
  );
  const cellAdapter = useMemo(() => buildCellAdapter(onUpdateCell), [onUpdateCell]);
  const widthAdapter = useMemo(
    () => buildWidthAdapter(onPersistColumnWidth),
    [onPersistColumnWidth],
  );
  const renameAdapter = useMemo(
    () => buildRenameAdapter(onRenameColumnTitle),
    [onRenameColumnTitle],
  );
  const deleteRowAdapter = useCallback(
    (rowId: string): void => onDeleteRow({ rowId }),
    [onDeleteRow],
  );
  const deleteColAdapter = useCallback(
    (columnKey: string): void => onDeleteColumn?.({ columnKey }),
    [onDeleteColumn],
  );
  const builtColumns = useMemo(
    () =>
      buildColumns({
        orderedColumns,
        columnWidths,
        onUpdateCell: cellAdapter,
        onRenameColumnTitle: renameAdapter,
        onDeleteColumn: onDeleteColumn ? deleteColAdapter : undefined,
        onAddColumnClick,
        onOpenColorPicker: colorPicker.openColorPickerForRow,
        onDeleteRow: deleteRowAdapter,
        conditionalRules,
        tableId,
        ...columnLabels,
      }),
    [
      orderedColumns,
      columnWidths,
      cellAdapter,
      renameAdapter,
      onDeleteColumn,
      deleteColAdapter,
      onAddColumnClick,
      colorPicker.openColorPickerForRow,
      deleteRowAdapter,
      conditionalRules,
      tableId,
      columnLabels,
    ],
  );
  const table = useReactTable({
    data: rows,
    columns: builtColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.id,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange' as ColumnResizeMode,
    // Сортирует сервер по всей таблице: клиент видит лишь подгруженное окно строк,
    // поэтому сортировка на клиенте показала бы порядок внутри окна, а не всей таблицы.
    manualSorting: true,
    state: { rowSelection, columnSizing: columnResizing, sorting },
    onRowSelectionChange,
    onSortingChange,
    onColumnSizingChange: setColumnResizing,
    meta: { onUpdateCell: cellAdapter, onCreateRow },
  });
  const stickyOffsets = useMemo(
    () => buildStickyOffsets(table, stickyLeftColumnIds, stickyRightColumnIds),
    [table, stickyLeftColumnIds, stickyRightColumnIds],
  );
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });
  const handleScroll = useCallback((): void => {
    const c = tableContainerRef.current;
    if (!c || loadingRows || !hasMore) {
      return;
    }
    if (c.scrollHeight - c.scrollTop - c.clientHeight < 200) {
      onLoadMore();
    }
  }, [loadingRows, hasMore, onLoadMore]);
  useEffect(() => {
    if (!resizingColumnId) {
      return;
    }
    const handleEnd = (): void => {
      const col = table.getColumn(resizingColumnId);
      if (col) {
        void widthAdapter(resizingColumnId, col.getSize());
      }
      setResizingColumnId(null);
    };
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [resizingColumnId, widthAdapter, table]);
  const handleResizeMouseDown = useCallback(
    (columnId: string, event: React.MouseEvent | React.TouchEvent): void => {
      setResizingColumnId(columnId);
      const header = table
        .getHeaderGroups()
        .flatMap(g => g.headers)
        .find(h => h.column.id === columnId);
      if (header) {
        header.getResizeHandler()(event);
      }
    },
    [table],
  );
  return {
    tableContainerRef,
    colorPickerValue: colorPicker.colorPickerValue,
    colorPickerAnchorPosition: colorPicker.colorPickerAnchorPosition,
    orderedColumns,
    table,
    stickyOffsets,
    selectedRowsSet: mobile.selectedRowsSet,
    allRowsSelectedMobile: mobile.allRowsSelectedMobile,
    someRowsSelectedMobile: mobile.someRowsSelectedMobile,
    virtualItems: rowVirtualizer.getVirtualItems(),
    rowVirtualizer,
    formatMobileCellValue,
    handleMobileSelectAll: mobile.handleMobileSelectAll,
    handleMobileSelectRow: mobile.handleMobileSelectRow,
    handleScroll,
    handleColorPickerClose: colorPicker.handleColorPickerClose,
    handleColorPickerChange: colorPicker.handleColorPickerChange,
    handleResizeMouseDown,
  };
}
