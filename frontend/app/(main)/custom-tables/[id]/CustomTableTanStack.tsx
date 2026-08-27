'use client';

import { useIsMobile } from '@/app/hooks/useIsMobile';
import type { SortingState } from '@tanstack/react-table';
import { DesktopTableView } from './components/DesktopTableView';
import { MobileTableView } from './components/MobileTableView';
import {
  type UseCustomTableTanStackParams,
  type UseCustomTableTanStackReturn,
  useCustomTableTanStack,
} from './hooks/useCustomTableTanStack';
import type { AggregateFn, AggregateSelection, AggregateValues } from './hooks/useTableAggregates';
import type { ConditionalRule } from './utils/conditionalRules';
import type {
  CustomTableCellValue,
  CustomTableColumn,
  CustomTableGridRow,
  CustomTableRowStyles,
} from './utils/stylingUtils';

interface CustomTableTanStackProps {
  tableId: string;
  columns: CustomTableColumn[];
  rows: CustomTableGridRow[];
  selectedRowIds: string[];
  columnWidths: Record<string, number>;
  isFullscreen: boolean;
  loadingRows: boolean;
  hasMore: boolean;
  stickyLeftColumnIds: string[];
  stickyRightColumnIds: string[];
  showAddRow?: boolean;
  onLoadMore: (opts?: { reset?: boolean; filtersParam?: string }) => void;
  onFiltersParamChange: (filtersParam: string | undefined) => void;
  // eslint-disable-next-line max-params
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
  // eslint-disable-next-line max-params
  onUpdateRowStyle: (rowId: string, styles: CustomTableRowStyles) => Promise<void>;
  onCreateRow?: () => Promise<CustomTableGridRow | null>;
  onViewRow?: (rowId: string) => void;
  onEditRow?: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  // eslint-disable-next-line max-params
  onPersistColumnWidth: (columnKey: string, width: number) => Promise<void>;
  selectedColumnKeys: string[];
  onSelectedColumnKeysChange: (keys: string[]) => void;
  // eslint-disable-next-line max-params
  onRenameColumnTitle: (columnKey: string, nextTitle: string) => Promise<void>;
  onDeleteColumn?: (columnKey: string) => void;
  onSelectedRowIdsChange: (rowIds: string[]) => void;
  onAddColumnClick?: () => void;
  isPrintMode?: boolean;
  sorting: SortingState;
  onSortingChange: (updater: SortingState | ((prev: SortingState) => SortingState)) => void;
  conditionalRules: ConditionalRule[];
  aggregateSelection: AggregateSelection;
  aggregateValues: AggregateValues;
  onAggregateChange: (columnKey: string, fn: AggregateFn | null) => void;
}

interface ViewProps {
  props: CustomTableTanStackProps;
  ctx: UseCustomTableTanStackReturn;
}

function MobileView({ props: p, ctx }: ViewProps): React.JSX.Element {
  return (
    <MobileTableView
      isDark={ctx.isDark}
      rows={p.rows}
      orderedColumns={ctx.state.orderedColumns}
      selectedRowsSet={ctx.state.selectedRowsSet}
      selectedRowIds={p.selectedRowIds}
      allRowsSelectedMobile={ctx.state.allRowsSelectedMobile}
      someRowsSelectedMobile={ctx.state.someRowsSelectedMobile}
      loadingRows={p.loadingRows}
      isFullscreen={p.isFullscreen}
      onCreateRow={p.onCreateRow}
      onViewRow={p.onViewRow}
      onEditRow={p.onEditRow}
      onDeleteRow={p.onDeleteRow}
      onSelectAll={ctx.state.handleMobileSelectAll}
      onSelectRow={ctx.state.handleMobileSelectRow}
      onScroll={ctx.state.handleScroll}
      tableContainerRef={ctx.state.tableContainerRef}
      labels={ctx.mobileLabels}
      formatMobileCellValue={ctx.state.formatMobileCellValue}
    />
  );
}

function DesktopView({ props: p, ctx }: ViewProps): React.JSX.Element {
  return (
    <DesktopTableView
      isDark={ctx.isDark}
      isPrintMode={p.isPrintMode ?? false}
      isFullscreen={p.isFullscreen}
      table={ctx.state.table}
      virtualItems={ctx.state.virtualItems}
      rowVirtualizer={ctx.state.rowVirtualizer}
      stickyOffsets={ctx.state.stickyOffsets}
      colorPickerRowId={ctx.colorPickerRowId}
      colorPickerValue={ctx.state.colorPickerValue}
      colorPickerAnchorPosition={ctx.state.colorPickerAnchorPosition}
      loadingRows={p.loadingRows}
      onScroll={ctx.state.handleScroll}
      tableContainerRef={ctx.state.tableContainerRef}
      onColorPickerClose={ctx.state.handleColorPickerClose}
      onColorPickerChange={ctx.state.handleColorPickerChange}
      onResizeMouseDown={ctx.state.handleResizeMouseDown}
      onCreateRow={p.onCreateRow}
      columnTypeByKey={ctx.columnTypeByKey}
      aggregateSelection={p.aggregateSelection}
      aggregateValues={p.aggregateValues}
      onAggregateChange={p.onAggregateChange}
      labels={ctx.commonLabels}
    />
  );
}

function propsToHookParams(props: CustomTableTanStackProps): UseCustomTableTanStackParams {
  return {
    tableId: props.tableId,
    rows: props.rows,
    columns: props.columns,
    selectedRowIds: props.selectedRowIds,
    columnWidths: props.columnWidths,
    stickyLeftColumnIds: props.stickyLeftColumnIds,
    stickyRightColumnIds: props.stickyRightColumnIds,
    loadingRows: props.loadingRows,
    hasMore: props.hasMore,
    onUpdateCell: props.onUpdateCell,
    onUpdateRowStyle: props.onUpdateRowStyle,
    onCreateRow: props.onCreateRow,
    onDeleteRow: props.onDeleteRow,
    onPersistColumnWidth: props.onPersistColumnWidth,
    onSelectedRowIdsChange: props.onSelectedRowIdsChange,
    onRenameColumnTitle: props.onRenameColumnTitle,
    onDeleteColumn: props.onDeleteColumn,
    onAddColumnClick: props.onAddColumnClick,
    onLoadMore: props.onLoadMore,
    sorting: props.sorting,
    onSortingChange: props.onSortingChange,
    conditionalRules: props.conditionalRules,
  };
}

export function CustomTableTanStack(props: CustomTableTanStackProps): React.JSX.Element {
  const isMobile = useIsMobile();
  const ctx = useCustomTableTanStack(propsToHookParams(props));
  if (isMobile) {
    return <MobileView props={props} ctx={ctx} />;
  }
  return <DesktopView props={props} ctx={ctx} />;
}
