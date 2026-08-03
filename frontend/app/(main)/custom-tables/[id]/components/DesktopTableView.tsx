'use client';

import { Plus } from '@/app/components/icons';
import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import { Spinner } from '@/app/components/ui/spinner';
import { tokens } from '@/lib/theme-tokens';
import { Popover } from '@mui/material';
import { type Cell, type Header, type Row, type Table, flexRender } from '@tanstack/react-table';
import { type VirtualItem, type Virtualizer } from '@tanstack/react-virtual';
import { type CSSProperties, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { solidifyBackground } from '../utils/colorUtils';
import type { CustomTableGridRow } from '../utils/stylingUtils';
import { getRowStyle } from '../utils/stylingUtils';
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
  labels: { addRowLabel: string; emptyTitle: string; emptySubtitle: string; loadingMore: string };
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
}: { isHeader: boolean; isDark: boolean; bodyBackground?: string }): string | undefined {
  if (isHeader) {
    return isDark ? '#1f2937' : 'var(--muted)';
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
  stickyOffsets,
  isDark,
}: {
  columnId: string;
  isHeader: boolean;
  bodyBackground?: string;
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
    backgroundColor: resolveStickyBg({ isHeader, isDark, bodyBackground }),
  };
}

interface VirtualPadding {
  top: number;
  bottom: number;
}
function getVirtualPadding({
  virtualItems,
  totalSize,
}: { virtualItems: VirtualItem[]; totalSize: number }): VirtualPadding {
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
      keepMounted
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
  const bg = isResizing ? '#3b82f6' : isDark ? '#4b5563' : 'var(--border-color)';
  const transform = isResizing ? 'scaleX(2)' : undefined;
  return (
    <div
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
  const color = isDark ? '#d1d5db' : 'var(--foreground)';
  const bg = isDark ? '#1f2937' : 'var(--muted)';
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
        ...buildStickyStyle({ columnId: header.column.id, isHeader: true, stickyOffsets, isDark }),
      }}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
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
  const bg = isDark ? '#1f2937' : 'var(--muted)';
  return (
    <thead style={{ position, top, zIndex, backgroundColor: bg }}>
      {table.getHeaderGroups().map(headerGroup => (
        <tr
          key={headerGroup.id}
          style={{
            borderBottom: isDark ? '1px solid #374151' : '1px solid var(--border-color)',
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
  rowBackground?: string;
  hasRowFill: boolean;
}
function DesktopTableCell({
  cell,
  isDark,
  stickyOffsets,
  rowBackground,
  hasRowFill,
}: DesktopTableCellProps): React.JSX.Element {
  const color = isDark ? '#f3f4f6' : 'var(--foreground)';
  return (
    <td
      style={{
        padding: '12px 16px',
        fontSize: '0.875rem',
        color,
        ...(hasRowFill ? {} : { backgroundColor: 'var(--card-bg)' }),
        ...(rowBackground ? { backgroundColor: rowBackground } : {}),
        ...buildStickyStyle({
          columnId: cell.column.id,
          isHeader: false,
          bodyBackground: rowBackground,
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
}
function DesktopPrintRow({
  row,
  rowStyle,
  rowBackground,
  isDark,
  stickyOffsets,
}: DesktopPrintRowProps): React.JSX.Element {
  const hasRowFill = Boolean(rowBackground);
  const border = isDark ? '1px solid #1f2937' : '1px solid var(--border-color)';
  return (
    <tr style={{ borderBottom: border, ...rowStyle }}>
      {row.getVisibleCells().map(cell => (
        <DesktopTableCell
          key={cell.id}
          cell={cell}
          isDark={isDark}
          stickyOffsets={stickyOffsets}
          rowBackground={rowBackground}
          hasRowFill={hasRowFill}
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
}
function DesktopVirtualRow({
  row,
  virtualRow,
  rowStyle,
  rowBackground,
  isDark,
  stickyOffsets,
}: DesktopVirtualRowProps): React.JSX.Element {
  const hasRowFill = Boolean(rowBackground);
  const border = isDark ? '1px solid #1f2937' : '1px solid var(--border-color)';
  return (
    <tr style={{ borderBottom: border, height: `${virtualRow.size}px`, ...rowStyle }}>
      {row.getVisibleCells().map(cell => (
        <DesktopTableCell
          key={cell.id}
          cell={cell}
          isDark={isDark}
          stickyOffsets={stickyOffsets}
          rowBackground={rowBackground}
          hasRowFill={hasRowFill}
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
}: {
  isDark: boolean;
  table: Table<CustomTableGridRow>;
  stickyOffsets: StickyOffsets;
}): React.JSX.Element {
  return (
    <>
      {table.getRowModel().rows.map(row => {
        const rowStyle = getRowStyle(row.original);
        const rowBackground = getBackgroundColor(rowStyle);
        return (
          <DesktopPrintRow
            key={row.id}
            row={row}
            rowStyle={rowStyle}
            rowBackground={rowBackground}
            isDark={isDark}
            stickyOffsets={stickyOffsets}
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
}: {
  isDark: boolean;
  table: Table<CustomTableGridRow>;
  virtualItems: VirtualItem[];
  stickyOffsets: StickyOffsets;
}): React.JSX.Element {
  return (
    <>
      {virtualItems.map(virtualRow => {
        const row = table.getRowModel().rows[virtualRow.index];
        if (!row) {
          return null;
        }
        const rowStyle = getRowStyle(row.original);
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
}
function DesktopTableBody({
  isDark,
  isPrintMode,
  table,
  virtualItems,
  rowVirtualizer,
  stickyOffsets,
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
        <PrintRows isDark={isDark} table={table} stickyOffsets={stickyOffsets} />
      ) : (
        <VirtualRows
          isDark={isDark}
          table={table}
          virtualItems={virtualItems}
          stickyOffsets={stickyOffsets}
        />
      )}
      {showBottom && <PaddingRow height={paddingBottom} colCount={colCount} />}
    </tbody>
  );
}

function DesktopEmptyState({
  labels,
}: { labels: { emptyTitle: string; emptySubtitle: string } }): React.JSX.Element {
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
  const bg = isDark ? '#1f2937' : 'var(--muted)';
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
        />
      </table>
      <DesktopStatusSection {...p} />
    </>
  );
}

function DesktopScrollBody(p: P): React.JSX.Element {
  const overflow = p.isPrintMode ? 'visible' : 'auto';
  const border = p.isDark ? '1px solid #374151' : '1px solid var(--border-color)';
  const height = p.isPrintMode ? 'auto' : p.isFullscreen ? 'calc(100vh - 150px)' : '600px';
  return (
    <div
      ref={p.tableContainerRef}
      onScroll={p.onScroll}
      style={{
        position: 'relative',
        overflowY: overflow,
        overflowX: overflow,
        border,
        borderTop: 'none',
        backgroundColor: 'var(--card-bg)',
        height,
      }}
    >
      <DesktopTableContent {...p} />
    </div>
  );
}

export function DesktopTableView(p: DesktopTableViewProps): React.JSX.Element {
  const containerClass = p.isDark ? 'custom-table-container dark' : 'custom-table-container';
  return (
    <div className={containerClass}>
      <DesktopScrollBody {...p} />
    </div>
  );
}
