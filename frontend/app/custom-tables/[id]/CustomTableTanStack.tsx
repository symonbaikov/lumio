'use client';

import { EditableBooleanCell } from '@/app/custom-tables/[id]/components/cells/EditableBooleanCell';
import { EditableDateCell } from '@/app/custom-tables/[id]/components/cells/EditableDateCell';
import { EditableNumberCell } from '@/app/custom-tables/[id]/components/cells/EditableNumberCell';
import { EditableSelectCell } from '@/app/custom-tables/[id]/components/cells/EditableSelectCell';
import { EditableTextCell } from '@/app/custom-tables/[id]/components/cells/EditableTextCell';
import { EditableHeader } from '@/app/custom-tables/[id]/components/headers/EditableHeader';
import type {
  CustomTableColumn,
  CustomTableGridRow,
} from '@/app/custom-tables/[id]/utils/stylingUtils';
import { getCellStyle, getRowStyle } from '@/app/custom-tables/[id]/utils/stylingUtils';
import { Popover } from '@mui/material';
import {
  type ColumnDef,
  type ColumnResizeMode,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { GripVertical, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useTheme } from 'next-themes';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

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
  onUpdateCell: (rowId: string, columnKey: string, value: any) => Promise<void>;
  onUpdateRowStyle: (rowId: string, styles: Record<string, any>) => Promise<void>;

  onCreateRow?: () => Promise<CustomTableGridRow | null>;
  onViewRow?: (rowId: string) => void;
  onEditRow?: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onPersistColumnWidth: (columnKey: string, width: number) => Promise<void>;
  selectedColumnKeys: string[];
  onSelectedColumnKeysChange: (keys: string[]) => void;
  onRenameColumnTitle: (columnKey: string, nextTitle: string) => Promise<void>;
  onDeleteColumn?: (columnKey: string) => void;
  onSelectedRowIdsChange: (rowIds: string[]) => void;
  onAddColumnClick?: () => void;
}

export function CustomTableTanStack(props: CustomTableTanStackProps) {
  const t = useIntlayer('customTableDetailPage');
  const { resolvedTheme } = useTheme();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowSelection = useMemo<RowSelectionState>(() => {
    const next: RowSelectionState = {};
    for (const id of props.selectedRowIds) next[id] = true;
    return next;
  }, [props.selectedRowIds]);
  const onRowSelectionChange = useCallback(
    (updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      const nextIds = Object.entries(next)
        .filter(([, isSelected]) => isSelected)
        .map(([id]) => id);
      props.onSelectedRowIdsChange(nextIds);
    },
    [props.onSelectedRowIdsChange, rowSelection],
  );
  const [columnResizing, setColumnResizing] = useState({});
  const [colorPickerRowId, setColorPickerRowId] = useState<string | null>(null);
  const [colorPickerValue, setColorPickerValue] = useState('#ff8a00');
  const [colorPickerAnchorPosition, setColorPickerAnchorPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const addRowFooterRef = useRef<HTMLDivElement>(null);

  const parseHexFromColor = (value: string | null | undefined) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (trimmed.startsWith('#')) {
      const hex = trimmed.replace('#', '');
      if (hex.length === 3 || hex.length === 6) return `#${hex}`;
    }
    const match = trimmed.match(/rgba?\\((\\d+),\\s*(\\d+)),\\s*(\\d+)/i);
    if (match) {
      const r = Math.max(0, Math.min(255, Number(match[1])));
      const g = Math.max(0, Math.min(255, Number(match[2])));
      const b = Math.max(0, Math.min(255, Number(match[3])));
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    return null;
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const clean = hex.replace('#', '');
    const full =
      clean.length === 3
        ? clean
            .split('')
            .map(c => c + c)
            .join('')
        : clean;
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    const a = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  const orderedColumns = useMemo(() => {
    return [...props.columns].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [props.columns]);

  // Build column definitions
  const columns = useMemo<ColumnDef<CustomTableGridRow>[]>(() => {
    const cols: ColumnDef<CustomTableGridRow>[] = [
      // Selection column (pinned left)
      {
        id: '__select',
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              aria-label="Select all rows"
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/30"
              checked={table.getIsAllRowsSelected()}
              ref={input => {
                if (input) {
                  input.indeterminate = table.getIsSomeRowsSelected();
                }
              }}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          </div>
        ),
        size: 44,
        minSize: 44,
        maxSize: 44,
        enableResizing: false,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              aria-label={`Select row ${row.original.rowNumber}`}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/30"
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
            />
          </div>
        ),
      },
      // Row number column (pinned left)
      {
        id: '__rowNumber',
        header: '#',
        size: 80,
        minSize: 60,
        maxSize: 120,
        enableResizing: false,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            {row.original.rowNumber}
          </div>
        ),
      },
    ];

    // Add data columns
    for (const col of orderedColumns) {
      const baseStyle = col.style?.cell || {};

      cols.push({
        id: col.key,
        header: ({ column, table }) => (
          <EditableHeader
            column={column}
            table={table}
            title={col.title}
            icon={col.config?.icon}
            onRename={props.onRenameColumnTitle}
            onDelete={props.onDeleteColumn}
          />
        ),
        size: props.columnWidths[col.key] || 180,
        minSize: 80,
        maxSize: 1200,
        enableResizing: true,
        cell: ({ row, column, table }) => {
          const cellProps = {
            row: row,
            column: column,
            table: table as any,
            cellType: col.type,
            onUpdateCell: props.onUpdateCell,
          };

          const cellStyle = getCellStyle(row.original, col.key, baseStyle);

          // Render appropriate cell based on column type
          switch (col.type) {
            case 'boolean':
              return <EditableBooleanCell {...cellProps} style={cellStyle} />;
            case 'date':
              return <EditableDateCell {...cellProps} style={cellStyle} />;
            case 'number':
              return <EditableNumberCell {...cellProps} style={cellStyle} />;
            case 'select':
              return (
                <EditableSelectCell
                  {...cellProps}
                  options={col.config?.options}
                  style={cellStyle}
                />
              );
            case 'multi_select':
              return (
                <EditableSelectCell
                  {...cellProps}
                  options={col.config?.options}
                  multiple
                  style={cellStyle}
                />
              );
            default:
              return <EditableTextCell {...cellProps} style={cellStyle} />;
          }
        },
      });
    }

    // Add Actions column
    cols.push({
      id: '__actions',
      header: () => (
        <div className="text-center font-semibold text-gray-600">
          {(t as any).actions.actionsHeader.value}
        </div>
      ),
      size: 120,
      minSize: 100,
      maxSize: 150,
      enableResizing: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={event => {
              const currentFill = parseHexFromColor(row.original.styles?.manualFill);
              setColorPickerValue(currentFill || '#ff8a00');
              setColorPickerRowId(row.original.id);
              setColorPickerAnchorPosition({
                top: event.clientY,
                left: event.clientX,
              });
            }}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
            title={t.fill.colorTooltip.value}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => props.onDeleteRow(row.original.id)}
            type="button"
            className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title={(t as any).actions.delete.value}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    });

    // Add "Add Column" column
    cols.push({
      id: '__add_column',
      header: () => (
        <button
          onClick={props.onAddColumnClick}
          className="flex h-full w-full items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          title="Add Column"
        >
          <Plus className="h-4 w-4" />
        </button>
      ),
      size: 50,
      minSize: 50,
      maxSize: 50,
      enableResizing: false,
      cell: () => null,
    });

    return cols;
  }, [
    orderedColumns,
    props.columnWidths,
    props.onRenameColumnTitle,
    props.onDeleteColumn,
    props.onUpdateCell,
    props.onAddColumnClick,
  ]);

  const table = useReactTable({
    data: props.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.id,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange' as ColumnResizeMode,
    state: {
      rowSelection,
      columnSizing: columnResizing,
    },
    onRowSelectionChange,
    onColumnSizingChange: setColumnResizing,
    meta: {
      onUpdateCell: props.onUpdateCell,
      onCreateRow: props.onCreateRow,
    },
  });

  const stickyLeftSet = useMemo(
    () => new Set(props.stickyLeftColumnIds),
    [props.stickyLeftColumnIds],
  );
  const stickyRightSet = useMemo(
    () => new Set(props.stickyRightColumnIds),
    [props.stickyRightColumnIds],
  );

  const stickyOffsets = useMemo(() => {
    const left: Record<string, number> = {};
    const right: Record<string, number> = {};
    const leafColumns = table.getAllLeafColumns();
    let leftOffset = 0;
    for (const col of leafColumns) {
      if (stickyLeftSet.has(col.id)) {
        left[col.id] = leftOffset;
        leftOffset += col.getSize();
      }
    }
    let rightOffset = 0;
    for (let i = leafColumns.length - 1; i >= 0; i -= 1) {
      const col = leafColumns[i];
      if (stickyRightSet.has(col.id)) {
        right[col.id] = rightOffset;
        rightOffset += col.getSize();
      }
    }
    return { left, right };
  }, [table, stickyLeftSet, stickyRightSet, props.columnWidths, columnResizing]);

  const isDark = resolvedTheme === 'dark';

  const parseColor = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('rgb')) {
      const match = trimmed.match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1].split(',').map(part => part.trim());
      if (parts.length < 3) return null;
      const r = Number(parts[0]);
      const g = Number(parts[1]);
      const b = Number(parts[2]);
      const a = parts.length >= 4 ? Number(parts[3]) : 1;
      if (![r, g, b, a].every(n => Number.isFinite(n))) return null;
      return {
        r: Math.max(0, Math.min(255, r)),
        g: Math.max(0, Math.min(255, g)),
        b: Math.max(0, Math.min(255, b)),
        a: Math.max(0, Math.min(1, a)),
      };
    }
    if (trimmed.startsWith('#')) {
      const hex = trimmed.replace('#', '');
      const expand = (v: string) => Number.parseInt(v, 16);
      if (hex.length === 3 || hex.length === 4) {
        const r = expand(hex[0] + hex[0]);
        const g = expand(hex[1] + hex[1]);
        const b = expand(hex[2] + hex[2]);
        const a = hex.length === 4 ? expand(hex[3] + hex[3]) / 255 : 1;
        return { r, g, b, a };
      }
      if (hex.length === 6 || hex.length === 8) {
        const r = expand(hex.slice(0, 2));
        const g = expand(hex.slice(2, 4));
        const b = expand(hex.slice(4, 6));
        const a = hex.length === 8 ? expand(hex.slice(6, 8)) / 255 : 1;
        return { r, g, b, a };
      }
    }
    return null;
  };

  const solidifyBackground = (value: string) => {
    const fg = parseColor(value);
    if (!fg) return value;
    if (fg.a >= 0.999) return value;
    const base = parseColor(isDark ? '#111827' : '#ffffff');
    if (!base) return value;
    const blend = (c: number, b: number) => Math.round(fg.a * c + (1 - fg.a) * b);
    const r = blend(fg.r, base.r);
    const g = blend(fg.g, base.g);
    const b = blend(fg.b, base.b);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getStickyStyle = (
    columnId: string,
    isHeader: boolean,
    bodyBackground?: string,
  ): CSSProperties => {
    const left = stickyOffsets.left[columnId];
    const right = stickyOffsets.right[columnId];
    if (left === undefined && right === undefined) return {};
    const style: CSSProperties = {
      position: 'sticky',
      top: isHeader ? 0 : undefined,
      left: left !== undefined ? left : undefined,
      right: right !== undefined ? right : undefined,
      zIndex: isHeader ? 4 : 2,
    };
    if (isHeader) {
      style.backgroundColor = isDark ? '#1f2937' : '#f9fafb';
    } else if (bodyBackground) {
      style.backgroundColor = solidifyBackground(bodyBackground);
    }
    return style;
  };

  // Virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: props.rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length
    ? totalSize - virtualItems[virtualItems.length - 1].end
    : 0;

  // Handle scroll to load more
  const handleScroll = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    if (props.loadingRows || !props.hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      props.onLoadMore();
    }
  }, [props.loadingRows, props.hasMore, props.onLoadMore]);

  useEffect(() => {
    if (!resizingColumnId) return;
    const handleResizeEnd = () => {
      if (!resizingColumnId) return;
      const column = table.getColumn(resizingColumnId);
      if (column) {
        props.onPersistColumnWidth(resizingColumnId, column.getSize());
      }
      setResizingColumnId(null);
    };

    window.addEventListener('mouseup', handleResizeEnd);
    window.addEventListener('touchend', handleResizeEnd);
    return () => {
      window.removeEventListener('mouseup', handleResizeEnd);
      window.removeEventListener('touchend', handleResizeEnd);
    };
  }, [resizingColumnId, props.onPersistColumnWidth, table]);

  return (
    <div className={`custom-table-container ${isDark ? 'dark' : ''}`}>
      <div
        ref={tableContainerRef}
        onScroll={handleScroll}
        className="relative overflow-y-auto overflow-x-auto border-x border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-1"
        style={{
          height: props.isFullscreen ? 'calc(100vh - 150px)' : '600px',
        }}
      >
        <Popover
          open={Boolean(colorPickerRowId && colorPickerAnchorPosition)}
          anchorReference="anchorPosition"
          anchorPosition={colorPickerAnchorPosition || { top: 0, left: 0 }}
          keepMounted
          disableAutoFocus
          disableEnforceFocus
          disableRestoreFocus
          disableScrollLock
          onClose={() => {
            setColorPickerRowId(null);
            setColorPickerAnchorPosition(null);
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          slotProps={
            {
              paper: {
                sx: {
                  p: 1.5,
                  mt: 1,
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  overflow: 'visible',
                  '&::before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                    borderLeft: '1px solid',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  },
                },
              },
            } as any
          }
        >
          <HexColorPicker
            color={colorPickerValue}
            onChange={next => {
              setColorPickerValue(next);
              if (!colorPickerRowId) return;
              props.onUpdateRowStyle(colorPickerRowId, {
                manualFill: hexToRgba(next, 0.05),
              });
            }}
          />
        </Popover>
        <table className="w-full border-collapse" style={{ minWidth: table.getTotalSize() }}>
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
            {table.getHeaderGroups().map(headerGroup => (
              <tr
                key={headerGroup.id}
                className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              >
                {headerGroup.headers.map(header => {
                  const isResizing = header.column.getIsResizing();
                  return (
                    <th
                      key={header.id}
                      className="relative px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800"
                      style={{
                        width: header.getSize(),
                        minWidth: header.column.columnDef.minSize,
                        maxWidth: header.column.columnDef.maxSize,
                        ...getStickyStyle(header.column.id, true),
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}

                      {/* Resize handle */}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={event => {
                            setResizingColumnId(header.column.id);
                            header.getResizeHandler()(event);
                          }}
                          onTouchStart={event => {
                            setResizingColumnId(header.column.id);
                            header.getResizeHandler()(event);
                          }}
                          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none ${
                            isResizing
                              ? 'bg-blue-500'
                              : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
                          }`}
                          style={{
                            transform: isResizing ? 'scaleX(2)' : undefined,
                          }}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td
                  colSpan={table.getVisibleLeafColumns().length}
                  style={{ height: `${paddingTop}px`, padding: 0, border: 0 }}
                />
              </tr>
            )}
            {virtualItems.map(virtualRow => {
              const row = table.getRowModel().rows[virtualRow.index];
              if (!row) return null;

              const rowStyle = getRowStyle(row.original);
              const rowBackground = (rowStyle as any).backgroundColor as string | undefined;
              const hasRowFill = Boolean(rowBackground);

              return (
                <tr
                  key={row.id}
                  className={`group border-b border-gray-200 dark:border-gray-800 ${
                    hasRowFill ? 'row-fill' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                  style={{
                    height: `${virtualRow.size}px`,
                    ...rowStyle,
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className={`px-4 py-3 text-sm text-gray-900 dark:text-gray-100 ${
                        hasRowFill
                          ? ''
                          : 'bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50'
                      }`}
                      style={{
                        width: cell.column.getSize(),
                        ...(rowBackground ? { backgroundColor: rowBackground } : {}),
                        ...getStickyStyle(cell.column.id, false, rowBackground),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td
                  colSpan={table.getVisibleLeafColumns().length}
                  style={{
                    height: `${paddingBottom}px`,
                    padding: 0,
                    border: 0,
                  }}
                />
              </tr>
            )}
          </tbody>
        </table>

        {props.showAddRow !== false && (
          <div
            ref={addRowFooterRef}
            data-testid="custom-table-add-row"
            className="sticky left-0 z-10 w-full border-t border-gray-200 bg-gray-50 py-3"
          >
            <div className="flex w-full justify-center">
              <button
                type="button"
                onClick={() => props.onCreateRow?.()}
                className="flex items-center gap-2 rounded-full border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary shadow-sm"
              >
                <Plus className="h-4 w-4" />
                {(t as any).grid.addRowLabel.value}
              </button>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {props.loadingRows && (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>{t.grid.loadingMore.value}</span>
          </div>
        )}

        {/* Empty state */}
        {!props.loadingRows && props.rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <GripVertical className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">{(t as any).grid.emptyTitle.value}</p>
            <p className="text-sm">{(t as any).grid.emptySubtitle.value}</p>
          </div>
        )}
      </div>
    </div>
  );
}
