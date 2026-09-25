'use client';
// TanStack Table держит состояние в мутабельном объекте таблицы, а React
// Compiler мемоизирует эти компоненты по ссылкам row/cell/table. Из-за этого
// смена rowSelection не перерисовывала чекбоксы. Директива отключает
// авто-мемоизацию для рендера грида — рекомендация самого TanStack.
'use no memo';

import { Popover } from '@mui/material';
import { type Cell, flexRender, type Header, type Row, type Table } from '@tanstack/react-table';
import { type VirtualItem, type Virtualizer } from '@tanstack/react-virtual';
import { type CSSProperties, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { ArrowDown, ArrowUp, Plus } from '@/app/components/icons';
import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import { Select } from '@/app/components/ui/select';
import { Spinner } from '@/app/components/ui/spinner';
import { tokens } from '@/lib/theme-tokens';
import type { AggregateFn } from '../hooks/useTableAggregates';
import { solidifyBackground } from '../utils/colorUtils';
import { readGridColumnMeta } from '../utils/columnDefinitions.types';
import type { ConditionalRule } from '../utils/conditionalRules';
import { formatCellNumber, NEGATIVE_NUMBER_COLOR } from '../utils/numberFormat';
import type { CustomTableColumnConfig, CustomTableGridRow } from '../utils/stylingUtils';
import { resolveCellBackground, resolveRowStyle, sheetStyleToCss } from '../utils/stylingUtils';
import type { ResizeMouseDownFn } from './DesktopTableView.types';

interface StickyOffsets {
  left: Record<string, number>;
  right: Record<string, number>;
}

interface DesktopTableViewProps {
  isDark: boolean;
  isPrintMode: boolean;
  isFullscreen: boolean;
  table: Table<CustomTableGridRow>;
  virtualItems: VirtualItem[];
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  stickyOffsets: StickyOffsets;
  conditionalRules: ConditionalRule[];
  colorPickerRowId: string | null;
  colorPickerValue: string;
  colorPickerAnchorPosition: { top: number; left: number } | null;
  loadingRows: boolean;
  onScroll: () => void;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
  onColorPickerClose: () => void;
  onColorPickerChange: (next: string) => void;
  onResizeMouseDown: ResizeMouseDownFn;
  onCreateRow?: () => Promise<CustomTableGridRow | null>;
  columnTypeByKey: Record<string, string>;
  columnTitleByKey: Record<string, string>;
  columnConfigByKey: Record<string, CustomTableColumnConfig | null>;
  defaultCurrency?: string;
  aggregateSelection: Record<string, AggregateFn>;
  aggregateValues: Record<string, number | string | null>;
  onAggregateChange: (columnKey: string, fn: AggregateFn | null) => void;
  labels: {
    addRowLabel: string;
    emptyTitle: string;
    emptySubtitle: string;
    loadingMore: string;
    aggregateNone: string;
    aggregateLabels: Record<AggregateFn, string>;
  };
}

type P = DesktopTableViewProps;

const POPOVER_PAPER_SX = {
  p: 1.5,
  mt: 1,
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
};
const POPOVER_SLOT_PROPS = { paper: { sx: POPOVER_PAPER_SX } };

function getBackgroundColor(style: CSSProperties): string | undefined {
  const bg = style.backgroundColor;
  return typeof bg === 'string' ? bg : undefined;
}

function resolveStickyBg({
  isHeader,
  isDark,
  bodyBackground,
  headerBackground,
}: {
  isHeader: boolean;
  isDark: boolean;
  bodyBackground?: string;
  headerBackground?: string;
}): string | undefined {
  if (isHeader) {
    return headerBackground
      ? solidifyBackground({ value: headerBackground, isDark })
      : 'var(--muted)';
  }
  if (bodyBackground) {
    return solidifyBackground({ value: bodyBackground, isDark });
  }
  return undefined;
}

function buildStickyStyle({
  columnId,
  isHeader,
  bodyBackground,
  headerBackground,
  stickyOffsets,
  isDark,
}: {
  columnId: string;
  isHeader: boolean;
  bodyBackground?: string;
  headerBackground?: string;
  stickyOffsets: StickyOffsets;
  isDark: boolean;
}): CSSProperties {
  const left = stickyOffsets.left[columnId];
  const right = stickyOffsets.right[columnId];
  if (left === undefined && right === undefined) {
    return {};
  }
  return {
    position: 'sticky',
    top: isHeader ? 0 : undefined,
    left,
    right,
    zIndex: isHeader ? 4 : 2,
    backgroundColor: resolveStickyBg({ isHeader, isDark, bodyBackground, headerBackground }),
  };
}

interface VirtualPadding {
  top: number;
  bottom: number;
}
function getVirtualPadding({
  virtualItems,
  totalSize,
}: {
  virtualItems: VirtualItem[];
  totalSize: number;
}): VirtualPadding {
  if (virtualItems.length === 0) {
    return { top: 0, bottom: 0 };
  }
  return {
    top: virtualItems[0].start,
    bottom: totalSize - virtualItems[virtualItems.length - 1].end,
  };
}

function DesktopColorPicker({
  colorPickerRowId,
  colorPickerValue,
  colorPickerAnchorPosition,
  onColorPickerClose,
  onColorPickerChange,
}: {
  colorPickerRowId: string | null;
  colorPickerValue: string;
  colorPickerAnchorPosition: { top: number; left: number } | null;
  onColorPickerClose: () => void;
  onColorPickerChange: (next: string) => void;
}): React.JSX.Element {
  return (
    <Popover
      open={Boolean(colorPickerRowId && colorPickerAnchorPosition)}
      anchorReference="anchorPosition"
      anchorPosition={colorPickerAnchorPosition || { top: 0, left: 0 }}
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      disableScrollLock
      onClose={onColorPickerClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={POPOVER_SLOT_PROPS}
    >
      <HexColorPicker color={colorPickerValue} onChange={onColorPickerChange} />
    </Popover>
  );
}

interface ColumnResizerProps {
  columnId: string;
  isResizing: boolean;
  isDark: boolean;
  onResizeMouseDown: ResizeMouseDownFn;
}
function ColumnResizer({
  columnId,
  isResizing,
  isDark,
  onResizeMouseDown,
}: ColumnResizerProps): React.JSX.Element {
  const bg = isResizing ? 'var(--primary-fill)' : 'var(--border-color)';
  const transform = isResizing ? 'scaleX(2)' : undefined;
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={e => onResizeMouseDown(columnId, e)}
      onTouchStart={e => onResizeMouseDown(columnId, e)}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        height: '100%',
        width: 4,
        cursor: 'col-resize',
        userSelect: 'none',
        touchAction: 'none',
        backgroundColor: bg,
        transform,
      }}
    />
  );
}

function SortIndicator({
  header,
}: {
  header: Header<CustomTableGridRow, unknown>;
}): React.JSX.Element | null {
  const sorted = header.column.getIsSorted();
  if (!sorted) {
    return null;
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, opacity: 0.8 }}>
      {sorted === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
    </span>
  );
}

interface DesktopHeaderCellProps {
  header: Header<CustomTableGridRow, unknown>;
  isDark: boolean;
  stickyOffsets: StickyOffsets;
  onResizeMouseDown: ResizeMouseDownFn;
}
function DesktopHeaderCell({
  header,
  isDark,
  stickyOffsets,
  onResizeMouseDown,
}: DesktopHeaderCellProps): React.JSX.Element {
  // Цвет заголовка приходит с сервера в column.style.header (импорт из Sheets
  // или меню колонки); без него — штатный фон шапки.
  const headerStyle = readGridColumnMeta(header.column.columnDef)?.gridColumn.style?.header;
  const headerCss = headerStyle ? sheetStyleToCss(headerStyle) : undefined;
  const color = headerCss?.color ?? 'var(--foreground)';
  const bg = headerCss?.backgroundColor ?? 'var(--muted)';
  return (
    <th
      style={{
        position: 'relative',
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color,
        backgroundColor: bg,
        width: header.getSize(),
        minWidth: header.column.columnDef.minSize,
        maxWidth: header.column.columnDef.maxSize,
        ...buildStickyStyle({
          columnId: header.column.id,
          isHeader: true,
          headerBackground: headerCss?.backgroundColor,
          stickyOffsets,
          isDark,
        }),
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
        {flexRender(header.column.columnDef.header, header.getContext())}
        {header.column.getCanSort() && <SortIndicator header={header} />}
      </span>
      {header.column.getCanResize() && (
        <ColumnResizer
          columnId={header.column.id}
          isResizing={header.column.getIsResizing()}
          isDark={isDark}
          onResizeMouseDown={onResizeMouseDown}
        />
      )}
    </th>
  );
}

const AGGREGATE_FN_OPTIONS: AggregateFn[] = ['sum', 'avg', 'min', 'max', 'count'];

/** Что вообще осмысленно считать по типу колонки. */
function allowedAggregateFns(columnType: string | undefined): AggregateFn[] {
  if (columnType === 'number' || columnType === 'currency') {
    return AGGREGATE_FN_OPTIONS;
  }
  if (columnType === 'date') {
    return ['min', 'max', 'count'];
  }
  return ['count'];
}

interface AggregateFormat {
  fn: AggregateFn;
  columnType?: string;
  config: CustomTableColumnConfig | null | undefined;
  defaultCurrency?: string;
}

/** Итог показывается как сама колонка: сумма денег — с валютой, процентов — с «%». */
function formatAggregateValue(
  value: number | string | null | undefined,
  { fn, columnType, config, defaultCurrency }: AggregateFormat,
): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value !== 'number') {
    return value;
  }
  if (fn === 'count') {
    return formatCellNumber(value, { precision: 0 });
  }
  const ownCurrency = typeof config?.currency === 'string' ? config.currency : undefined;
  return formatCellNumber(value, {
    currency: ownCurrency ?? (columnType === 'currency' ? defaultCurrency : undefined),
    precision: typeof config?.precision === 'number' ? config.precision : undefined,
    format: config?.format === 'percent' ? 'percent' : undefined,
  });
}

interface DesktopFooterCellProps {
  columnId: string;
  columnType: string | undefined;
  columnConfig: CustomTableColumnConfig | null | undefined;
  defaultCurrency?: string;
  columnTitle: string;
  isDark: boolean;
  stickyOffsets: StickyOffsets;
  width: number;
  selectedFn: AggregateFn | undefined;
  value: number | string | null | undefined;
  aggregateLabels: Record<AggregateFn, string>;
  noneLabel: string;
  onAggregateChange: (columnKey: string, fn: AggregateFn | null) => void;
}
function DesktopFooterCell({
  columnId,
  columnType,
  columnConfig,
  defaultCurrency,
  columnTitle,
  isDark,
  stickyOffsets,
  width,
  selectedFn,
  value,
  aggregateLabels,
  noneLabel,
  onAggregateChange,
}: DesktopFooterCellProps): React.JSX.Element {
  const options = allowedAggregateFns(columnType);
  const bg = 'var(--muted)';
  const isNegative = typeof value === 'number' && value < 0;
  return (
    <td
      style={{
        padding: '8px 16px',
        width,
        fontSize: '0.8125rem',
        color: 'var(--foreground)',
        backgroundColor: bg,
        ...buildStickyStyle({ columnId, isHeader: false, stickyOffsets, isDark }),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <Select
          variant="standard"
          disableUnderline
          inputProps={{ 'aria-label': `${noneLabel}: ${columnTitle}` }}
          value={selectedFn ?? ''}
          onChange={value => onAggregateChange(columnId, (value || null) as AggregateFn | null)}
          options={[
            { value: '', label: noneLabel },
            ...options.map(fn => ({ value: fn, label: aggregateLabels[fn] })),
          ]}
          sx={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}
        />
        {selectedFn && (
          <span
            style={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              ...(isNegative ? { color: NEGATIVE_NUMBER_COLOR } : {}),
            }}
          >
            {formatAggregateValue(value, {
              fn: selectedFn,
              columnType,
              config: columnConfig,
              defaultCurrency,
            })}
          </span>
        )}
      </div>
    </td>
  );
}

interface DesktopTableFooterProps {
  isDark: boolean;
  table: Table<CustomTableGridRow>;
  stickyOffsets: StickyOffsets;
  columnTypeByKey: Record<string, string>;
  columnTitleByKey: Record<string, string>;
  columnConfigByKey: Record<string, CustomTableColumnConfig | null>;
  defaultCurrency?: string;
  aggregateSelection: Record<string, AggregateFn>;
  aggregateValues: Record<string, number | string | null>;
  aggregateLabels: Record<AggregateFn, string>;
  noneLabel: string;
  onAggregateChange: (columnKey: string, fn: AggregateFn | null) => void;
}
function DesktopTableFooter({
  isDark,
  table,
  stickyOffsets,
  columnTypeByKey,
  columnTitleByKey,
  columnConfigByKey,
  defaultCurrency,
  aggregateSelection,
  aggregateValues,
  aggregateLabels,
  noneLabel,
  onAggregateChange,
}: DesktopTableFooterProps): React.JSX.Element {
  const bg = 'var(--muted)';
  return (
    <tfoot style={{ backgroundColor: bg }}>
      <tr style={{ borderTop: '1px solid var(--border-color)' }}>
        {table.getVisibleLeafColumns().map(column => {
          const columnType = columnTypeByKey[column.id];
          // Служебные колонки (выбор, номер, действия) итогов не имеют.
          if (!columnType) {
            return (
              <td
                key={column.id}
                style={{
                  backgroundColor: bg,
                  ...buildStickyStyle({
                    columnId: column.id,
                    isHeader: false,
                    stickyOffsets,
                    isDark,
                  }),
                }}
              />
            );
          }
          return (
            <DesktopFooterCell
              key={column.id}
              columnId={column.id}
              columnType={columnType}
              columnConfig={columnConfigByKey[column.id]}
              defaultCurrency={defaultCurrency}
              columnTitle={columnTitleByKey[column.id] ?? column.id}
              isDark={isDark}
              stickyOffsets={stickyOffsets}
              width={column.getSize()}
              selectedFn={aggregateSelection[column.id]}
              value={aggregateValues[column.id]}
              aggregateLabels={aggregateLabels}
              noneLabel={noneLabel}
              onAggregateChange={onAggregateChange}
            />
          );
        })}
      </tr>
    </tfoot>
  );
}

interface DesktopTableHeaderProps {
  isDark: boolean;
  isPrintMode: boolean;
  isFullscreen: boolean;
  table: Table<CustomTableGridRow>;
  stickyOffsets: StickyOffsets;
  onResizeMouseDown: ResizeMouseDownFn;
}
function DesktopTableHeader({
  isDark,
  isPrintMode,
  isFullscreen,
  table,
  stickyOffsets,
  onResizeMouseDown,
}: DesktopTableHeaderProps): React.JSX.Element {
  const position = isPrintMode ? 'static' : 'sticky';
  const top = isPrintMode ? 0 : isFullscreen ? 0 : 'var(--global-nav-height, 0px)';
  const zIndex = isPrintMode ? 'auto' : 10;
  const bg = 'var(--muted)';
  return (
    <thead style={{ position, top, zIndex, backgroundColor: bg }}>
      {table.getHeaderGroups().map(headerGroup => (
        <tr
          key={headerGroup.id}
          style={{
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: bg,
          }}
        >
          {headerGroup.headers.map(header => (
            <DesktopHeaderCell
              key={header.id}
              header={header}
              isDark={isDark}
              stickyOffsets={stickyOffsets}
              onResizeMouseDown={onResizeMouseDown}
            />
          ))}
        </tr>
      ))}
    </thead>
  );
}

interface DesktopTableCellProps {
  cell: Cell<CustomTableGridRow, unknown>;
  isDark: boolean;
  stickyOffsets: StickyOffsets;
  conditionalRules: ConditionalRule[];
  rowBackground?: string;
}
function DesktopTableCell({
  cell,
  isDark,
  stickyOffsets,
  conditionalRules,
  rowBackground,
}: DesktopTableCellProps): React.JSX.Element {
  const color = 'var(--foreground)';
  const meta = readGridColumnMeta(cell.column.columnDef);
  const background = meta
    ? resolveCellBackground({
        row: cell.row.original,
        col: meta.gridColumn,
        rules: conditionalRules,
        rowBackground,
      })
    : rowBackground;
  return (
    <td
      style={{
        padding: '12px 16px',
        fontSize: '0.875rem',
        color,
        backgroundColor: background ?? 'var(--card-bg)',
        ...buildStickyStyle({
          columnId: cell.column.id,
          isHeader: false,
          bodyBackground: background,
          stickyOffsets,
          isDark,
        }),
      }}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </td>
  );
}

interface DesktopPrintRowProps {
  row: Row<CustomTableGridRow>;
  rowStyle: CSSProperties;
  rowBackground?: string;
  isDark: boolean;
  stickyOffsets: StickyOffsets;
  conditionalRules: ConditionalRule[];
}
function DesktopPrintRow({
  row,
  rowStyle,
  rowBackground,
  isDark,
  stickyOffsets,
  conditionalRules,
}: DesktopPrintRowProps): React.JSX.Element {
  const border = '1px solid var(--border-color)';
  return (
    <tr style={{ borderBottom: border, ...rowStyle }}>
      {row.getVisibleCells().map(cell => (
        <DesktopTableCell
          key={cell.id}
          cell={cell}
          isDark={isDark}
          stickyOffsets={stickyOffsets}
          conditionalRules={conditionalRules}
          rowBackground={rowBackground}
        />
      ))}
    </tr>
  );
}

interface DesktopVirtualRowProps {
  row: Row<CustomTableGridRow>;
  virtualRow: VirtualItem;
  rowStyle: CSSProperties;
  rowBackground?: string;
  isDark: boolean;
  stickyOffsets: StickyOffsets;
  conditionalRules: ConditionalRule[];
}
function DesktopVirtualRow({
  row,
  virtualRow,
  rowStyle,
  rowBackground,
  isDark,
  stickyOffsets,
  conditionalRules,
}: DesktopVirtualRowProps): React.JSX.Element {
  const border = '1px solid var(--border-color)';
  return (
    <tr style={{ borderBottom: border, height: `${virtualRow.size}px`, ...rowStyle }}>
      {row.getVisibleCells().map(cell => (
        <DesktopTableCell
          key={cell.id}
          cell={cell}
          isDark={isDark}
          stickyOffsets={stickyOffsets}
          conditionalRules={conditionalRules}
          rowBackground={rowBackground}
        />
      ))}
    </tr>
  );
}

function PaddingRow({ height, colCount }: { height: number; colCount: number }): React.JSX.Element {
  return (
    <tr>
      <td colSpan={colCount} style={{ height: `${height}px`, padding: 0, border: 0 }} />
    </tr>
  );
}

function PrintRows({
  isDark,
  table,
  stickyOffsets,
  conditionalRules,
}: {
  isDark: boolean;
  table: Table<CustomTableGridRow>;
  stickyOffsets: StickyOffsets;
  conditionalRules: ConditionalRule[];
}): React.JSX.Element {
  return (
    <>
      {table.getRowModel().rows.map(row => {
        const rowStyle = resolveRowStyle(row.original, conditionalRules);
        const rowBackground = getBackgroundColor(rowStyle);
        return (
          <DesktopPrintRow
            key={row.id}
            row={row}
            rowStyle={rowStyle}
            rowBackground={rowBackground}
            isDark={isDark}
            stickyOffsets={stickyOffsets}
            conditionalRules={conditionalRules}
          />
        );
      })}
    </>
  );
}

function VirtualRows({
  isDark,
  table,
  virtualItems,
  stickyOffsets,
  conditionalRules,
}: {
  isDark: boolean;
  table: Table<CustomTableGridRow>;
  virtualItems: VirtualItem[];
  stickyOffsets: StickyOffsets;
  conditionalRules: ConditionalRule[];
}): React.JSX.Element {
  return (
    <>
      {virtualItems.map(virtualRow => {
        const row = table.getRowModel().rows[virtualRow.index];
        if (!row) {
          return null;
        }
        const rowStyle = resolveRowStyle(row.original, conditionalRules);
        const rowBackground = getBackgroundColor(rowStyle);
        return (
          <DesktopVirtualRow
            key={row.id}
            row={row}
            virtualRow={virtualRow}
            rowStyle={rowStyle}
            rowBackground={rowBackground}
            isDark={isDark}
            stickyOffsets={stickyOffsets}
            conditionalRules={conditionalRules}
          />
        );
      })}
    </>
  );
}

interface DesktopTableBodyProps {
  isDark: boolean;
  isPrintMode: boolean;
  table: Table<CustomTableGridRow>;
  virtualItems: VirtualItem[];
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  stickyOffsets: StickyOffsets;
  conditionalRules: ConditionalRule[];
}
function DesktopTableBody({
  isDark,
  isPrintMode,
  table,
  virtualItems,
  rowVirtualizer,
  stickyOffsets,
  conditionalRules,
}: DesktopTableBodyProps): React.JSX.Element {
  const { top: paddingTop, bottom: paddingBottom } = getVirtualPadding({
    virtualItems,
    totalSize: rowVirtualizer.getTotalSize(),
  });
  const showTop = !isPrintMode && paddingTop > 0;
  const showBottom = !isPrintMode && paddingBottom > 0;
  const colCount = table.getVisibleLeafColumns().length;
  return (
    <tbody>
      {showTop && <PaddingRow height={paddingTop} colCount={colCount} />}
      {isPrintMode ? (
        <PrintRows
          isDark={isDark}
          table={table}
          stickyOffsets={stickyOffsets}
          conditionalRules={conditionalRules}
        />
      ) : (
        <VirtualRows
          isDark={isDark}
          table={table}
          virtualItems={virtualItems}
          stickyOffsets={stickyOffsets}
          conditionalRules={conditionalRules}
        />
      )}
      {showBottom && <PaddingRow height={paddingBottom} colCount={colCount} />}
    </tbody>
  );
}

function DesktopEmptyState({
  labels,
}: {
  labels: { emptyTitle: string; emptySubtitle: string };
}): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 0',
        color: 'var(--muted-foreground)',
      }}
    >
      <EmptyStateIllustration name="tables" size="lg" />
      <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>{labels.emptyTitle}</p>
      <p style={{ fontSize: '0.875rem' }}>{labels.emptySubtitle}</p>
    </div>
  );
}

function DesktopLoadingRow({ label }: { label: string }): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 0',
        color: 'var(--muted-foreground)',
      }}
    >
      <Spinner size={20} style={{ marginRight: 8 }} />
      <span>{label}</span>
    </div>
  );
}

interface DesktopAddRowFooterProps {
  footerRef: React.RefObject<HTMLDivElement | null>;
  isDark: boolean;
  onCreateRow?: () => Promise<CustomTableGridRow | null>;
  label: string;
}
function DesktopAddRowFooter({
  footerRef,
  isDark,
  onCreateRow,
  label,
}: DesktopAddRowFooterProps): React.JSX.Element {
  const bg = 'var(--muted)';
  return (
    <div
      ref={footerRef}
      data-testid="custom-table-add-row"
      style={{
        position: 'sticky',
        left: 0,
        zIndex: 10,
        width: '100%',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: bg,
        padding: '12px 0',
      }}
    >
      <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => {
            void onCreateRow?.();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderRadius: tokens.radius.md,
            border: '1px dashed var(--border-color)',
            backgroundColor: 'var(--card-bg)',
            padding: '8px 16px',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'border-color 0.2s, color 0.2s',
          }}
        >
          <Plus size={16} />
          {label}
        </button>
      </div>
    </div>
  );
}

function DesktopStatusSection(p: P): React.JSX.Element {
  const addRowFooterRef = useRef<HTMLDivElement>(null);
  const showLoading = p.loadingRows && !p.isPrintMode;
  const isEmpty = !p.loadingRows && p.table.getRowModel().rows.length === 0;
  return (
    <>
      {!p.isPrintMode && (
        <DesktopAddRowFooter
          footerRef={addRowFooterRef}
          isDark={p.isDark}
          onCreateRow={p.onCreateRow}
          label={p.labels.addRowLabel}
        />
      )}
      {showLoading && <DesktopLoadingRow label={p.labels.loadingMore} />}
      {isEmpty && <DesktopEmptyState labels={p.labels} />}
    </>
  );
}

function DesktopTableContent(p: P): React.JSX.Element {
  const minWidth = p.isPrintMode ? undefined : p.table.getTotalSize();
  return (
    <>
      <DesktopColorPicker
        colorPickerRowId={p.colorPickerRowId}
        colorPickerValue={p.colorPickerValue}
        colorPickerAnchorPosition={p.colorPickerAnchorPosition}
        onColorPickerClose={p.onColorPickerClose}
        onColorPickerChange={p.onColorPickerChange}
      />
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth }}>
        <DesktopTableHeader
          isDark={p.isDark}
          isPrintMode={p.isPrintMode}
          isFullscreen={p.isFullscreen}
          table={p.table}
          stickyOffsets={p.stickyOffsets}
          onResizeMouseDown={p.onResizeMouseDown}
        />
        <DesktopTableBody
          isDark={p.isDark}
          isPrintMode={p.isPrintMode}
          table={p.table}
          virtualItems={p.virtualItems}
          rowVirtualizer={p.rowVirtualizer}
          stickyOffsets={p.stickyOffsets}
          conditionalRules={p.conditionalRules}
        />
        <DesktopTableFooter
          isDark={p.isDark}
          table={p.table}
          stickyOffsets={p.stickyOffsets}
          columnTypeByKey={p.columnTypeByKey}
          columnTitleByKey={p.columnTitleByKey}
          columnConfigByKey={p.columnConfigByKey}
          defaultCurrency={p.defaultCurrency}
          aggregateSelection={p.aggregateSelection}
          aggregateValues={p.aggregateValues}
          aggregateLabels={p.labels.aggregateLabels}
          noneLabel={p.labels.aggregateNone}
          onAggregateChange={p.onAggregateChange}
        />
      </table>
      <DesktopStatusSection {...p} />
    </>
  );
}

// The container ref is destructured out of the props object: React Compiler
// treats an object holding a ref as a ref and refuses to compile reads of it.
function DesktopScrollBody({ tableContainerRef, ...p }: P): React.JSX.Element {
  const overflow = p.isPrintMode ? 'visible' : 'auto';
  const border = '1px solid var(--border-color)';
  // В полноэкранном режиме высоту задаёт flex-колонка страницы, а не магическое
  // число: тулбар выше или ниже — грид всё равно заканчивается у края окна.
  const sizing = p.isPrintMode
    ? { height: 'auto' }
    : p.isFullscreen
      ? { flex: '1 1 auto', minHeight: 0 }
      : { height: '600px' };
  return (
    <div
      ref={tableContainerRef}
      onScroll={p.onScroll}
      style={{
        position: 'relative',
        overflowY: overflow,
        overflowX: overflow,
        border,
        borderTop: 'none',
        backgroundColor: 'var(--card-bg)',
        ...sizing,
      }}
    >
      <DesktopTableContent {...p} tableContainerRef={tableContainerRef} />
    </div>
  );
}

export function DesktopTableView(p: DesktopTableViewProps): React.JSX.Element {
  const containerClass = p.isDark ? 'custom-table-container dark' : 'custom-table-container';
  const layout =
    p.isFullscreen && !p.isPrintMode
      ? { display: 'flex', flexDirection: 'column' as const, flex: '1 1 auto', minHeight: 0 }
      : undefined;
  return (
    <div className={containerClass} style={layout}>
      <DesktopScrollBody {...p} />
    </div>
  );
}
