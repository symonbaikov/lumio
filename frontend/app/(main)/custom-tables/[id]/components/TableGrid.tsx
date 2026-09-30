'use client';

import type { SortingState } from '@tanstack/react-table';
import { useMemo } from 'react';
import {
  DataGrid,
  type GridColumnDef,
  selectionColumn,
  useDataGrid,
} from '@/app/components/data-grid';
import { Plus } from '@/app/components/icons';
import { Select } from '@/app/components/ui/select';
import { isMissingRequiredCell } from '../helpers/draftRowHelpers';
import { formatCellNumber } from '../utils/numberFormat';
import {
  AGGREGATE_FNS,
  type AggregateFn,
  type CustomTableColumn,
  type CustomTableGridRow,
} from '../utils/types';
import { type ColumnHeaderLabels, ColumnMenu } from './ColumnHeader';
import { type CellLabels, EditableCell, type UpdateCellFn } from './cells/EditableCell';
import { isNumericColumn, numberFormatFor } from './cells/formatCell';

export interface TableGridLabels extends CellLabels, ColumnHeaderLabels {
  selectAll: string;
  selectRow: string;
  rowNumber: string;
  addRow: string;
  emptyTitle: string;
  emptySubtitle: string;
  noTotal: string;
  aggregates: Record<AggregateFn, string>;
  caption: string;
}

export interface TableGridProps {
  columns: CustomTableColumn[];
  rows: CustomTableGridRow[];
  loading: boolean;
  /** Placeholder rows drawn while the first page of rows loads. */
  skeletonRows?: number;
  hasMore: boolean;
  fallbackCurrency: string;
  sorting: SortingState;
  onSortingChange: (next: SortingState) => void;
  rowSelection: Record<string, true>;
  onRowSelectionChange: (next: Record<string, true>) => void;
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (next: Record<string, boolean>) => void;
  aggregates: Record<string, AggregateFn>;
  aggregateValues: Record<string, number | string | null>;
  onAggregateChange: (columnKey: string, fn: AggregateFn | null) => void;
  onUpdateCell: UpdateCellFn;
  onAddRow: () => void;
  onLoadMore: () => void;
  onEditColumn: (column: CustomTableColumn) => void;
  onDeleteColumn: (column: CustomTableColumn) => void;
  labels: TableGridLabels;
}

export const ROW_HEIGHT = 44;

function AggregateFooter({
  column,
  fallbackCurrency,
  aggregates,
  aggregateValues,
  onAggregateChange,
  labels,
}: Pick<
  TableGridProps,
  'aggregates' | 'aggregateValues' | 'onAggregateChange' | 'fallbackCurrency' | 'labels'
> & {
  column: CustomTableColumn;
}) {
  const fn = aggregates[column.key] ?? '';
  const raw = aggregateValues[column.key];
  const format = numberFormatFor(column, fallbackCurrency);
  const value =
    typeof raw === 'number' ? formatCellNumber(raw, fn === 'count' ? {} : format) : (raw ?? '');
  return (
    <span className="lumio-ct__footer">
      <Select
        size="small"
        variant="standard"
        disableUnderline
        className="lumio-ct__footer-select"
        inputProps={{ 'aria-label': `${labels.noTotal}: ${column.title}` }}
        value={fn}
        onChange={next => onAggregateChange(column.key, (next || null) as AggregateFn | null)}
        options={[
          { value: '', label: labels.noTotal },
          ...AGGREGATE_FNS.map(item => ({ value: item, label: labels.aggregates[item] })),
        ]}
      />
      {fn ? <span className="lumio-ct__footer-value">{value}</span> : null}
    </span>
  );
}

const useGridColumns = (props: TableGridProps): GridColumnDef<CustomTableGridRow, unknown>[] => {
  const { columns, fallbackCurrency, labels, onUpdateCell, onEditColumn, onDeleteColumn } = props;
  const { aggregates, aggregateValues, onAggregateChange } = props;
  return useMemo(() => {
    const rowNumber: GridColumnDef<CustomTableGridRow, unknown> = {
      id: '__row',
      size: 52,
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="lumio-ct__row-number">#</span>,
      meta: { align: 'center', className: 'lumio-ct__row-number-cell', label: labels.rowNumber },
      cell: ({ row }) => <span className="lumio-ct__row-number">{row.original.rowNumber}</span>,
    };
    const dataColumns = columns.map<GridColumnDef<CustomTableGridRow, unknown>>(column => ({
      id: column.key,
      accessorFn: row => row.data?.[column.key],
      size: column.width ?? (isNumericColumn(column) ? 140 : 200),
      header: () => (
        <span className="lumio-ct__col-title" title={column.title}>
          {column.title}
          {column.isRequired ? <span className="lumio-ct__col-required">*</span> : null}
        </span>
      ),
      meta: {
        align: isNumericColumn(column) ? 'end' : 'start',
        className: isNumericColumn(column) ? 'lumio-grid__cell--numeric' : undefined,
        label: column.title,
        headerActions: (
          <ColumnMenu
            column={column}
            labels={labels}
            onEdit={onEditColumn}
            onDelete={onDeleteColumn}
          />
        ),
      },
      cell: ({ row }) => (
        <EditableCell
          column={column}
          row={row.original}
          fallbackCurrency={fallbackCurrency}
          missingRequired={isMissingRequiredCell(row.original, column)}
          onUpdate={onUpdateCell}
          labels={labels}
        />
      ),
      footer: isNumericColumn(column)
        ? () => (
            <AggregateFooter
              column={column}
              fallbackCurrency={fallbackCurrency}
              aggregates={aggregates}
              aggregateValues={aggregateValues}
              onAggregateChange={onAggregateChange}
              labels={labels}
            />
          )
        : undefined,
    }));
    return [
      selectionColumn<CustomTableGridRow>({
        selectAll: labels.selectAll,
        selectRow: labels.selectRow,
      }),
      rowNumber,
      ...dataColumns,
    ];
  }, [
    columns,
    fallbackCurrency,
    labels,
    onUpdateCell,
    onEditColumn,
    onDeleteColumn,
    aggregates,
    aggregateValues,
    onAggregateChange,
  ]);
};

/** The table body: columns come from the custom table, rows from the server. */
export function TableGrid(props: TableGridProps) {
  const { rows, loading, hasMore, sorting, rowSelection, columnVisibility, labels, columns } =
    props;
  const gridColumns = useGridColumns(props);
  const table = useDataGrid<CustomTableGridRow>({
    data: rows,
    columns: gridColumns,
    getRowId: row => row.id,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: updater =>
      props.onSortingChange(typeof updater === 'function' ? updater(sorting) : updater),
    onRowSelectionChange: updater =>
      props.onRowSelectionChange(typeof updater === 'function' ? updater(rowSelection) : updater),
    onColumnVisibilityChange: updater =>
      props.onColumnVisibilityChange(
        typeof updater === 'function' ? updater(columnVisibility) : updater,
      ),
    manualSorting: true,
    enableRowSelection: true,
  });
  const hasNumeric = columns.some(isNumericColumn);

  return (
    <DataGrid
      table={table}
      caption={labels.caption}
      loading={loading}
      skeletonRows={props.skeletonRows}
      className="lumio-ct__grid"
      maxHeight="calc(100vh - var(--global-nav-height, 0px) - 232px)"
      virtualization={{ rowHeight: ROW_HEIGHT }}
      onEndReached={hasMore && !loading ? props.onLoadMore : undefined}
      showFooter={hasNumeric}
      emptyState={
        <div className="lumio-ct__empty">
          <strong>{labels.emptyTitle}</strong>
          <span>{labels.emptySubtitle}</span>
        </div>
      }
      trailing={
        <tr className="lumio-ct__add-row">
          <td colSpan={table.getVisibleLeafColumns().length}>
            <button type="button" className="lumio-ct__add-row-btn" onClick={props.onAddRow}>
              <Plus size={14} aria-hidden />
              {labels.addRow}
            </button>
          </td>
        </tr>
      }
    />
  );
}
