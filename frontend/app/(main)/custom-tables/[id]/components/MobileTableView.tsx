'use client';

import type { CSSProperties } from 'react';
import { PencilLine, Plus, Trash2 } from '@/app/components/icons';
import { Checkbox } from '@/app/components/ui/checkbox';
import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import { Spinner } from '@/app/components/ui/spinner';
import { tokens } from '@/lib/theme-tokens';
import { isDraftRowId } from '../helpers/draftRowHelpers';
import type { ConditionalRule } from '../utils/conditionalRules';
import type { CustomTableColumn, CustomTableGridRow } from '../utils/stylingUtils';
import { resolveCellBackground, resolveRowStyle } from '../utils/stylingUtils';
import type { FormatMobileCellFn, SelectRowFn } from './MobileTableView.types';

interface MobileTableViewProps {
  isDark: boolean;
  rows: CustomTableGridRow[];
  orderedColumns: CustomTableColumn[];
  selectedRowsSet: Set<string>;
  selectedRowIds: string[];
  allRowsSelectedMobile: boolean;
  someRowsSelectedMobile: boolean;
  loadingRows: boolean;
  isFullscreen: boolean;
  onCreateRow?: () => Promise<CustomTableGridRow | null>;
  onViewRow?: (rowId: string) => void;
  onEditRow?: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: SelectRowFn;
  onScroll: () => void;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
  conditionalRules: ConditionalRule[];
  labels: {
    addRowLabel: string;
    emptyTitle: string;
    emptySubtitle: string;
    loadingMore: string;
    viewLabel: string;
    editLabel: string;
    deleteLabel: string;
    draftRowHint: string;
  };
  formatMobileCellValue: FormatMobileCellFn;
}

type P = MobileTableViewProps;

const BTN_BASE: CSSProperties = {
  borderRadius: tokens.radius.md,
  border: '1px solid var(--border-color)',
  padding: '4px 8px',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: 'var(--foreground)',
  background: 'none',
  cursor: 'pointer',
  transition: 'border-color 0.2s, color 0.2s',
};
const DELETE_BTN: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  borderRadius: tokens.radius.md,
  border: '1px solid #fecaca',
  padding: '4px 8px',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: 'var(--destructive)',
  background: 'none',
  cursor: 'pointer',
  transition: 'border-color 0.2s, color 0.2s',
};

interface MobileRowActionsProps {
  row: CustomTableGridRow;
  onViewRow?: (rowId: string) => void;
  onEditRow?: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  labels: { viewLabel: string; editLabel: string; deleteLabel: string; draftRowHint: string };
}
function MobileRowActions({
  row,
  onViewRow,
  onEditRow,
  onDeleteRow,
  labels,
}: MobileRowActionsProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {onViewRow ? (
        <button type="button" onClick={() => onViewRow(row.id)} style={BTN_BASE}>
          {labels.viewLabel}
        </button>
      ) : null}
      {onEditRow ? (
        <button type="button" onClick={() => onEditRow(row.id)} style={BTN_BASE}>
          {labels.editLabel}
        </button>
      ) : null}
      <button type="button" onClick={() => onDeleteRow(row.id)} style={DELETE_BTN}>
        <Trash2 size={14} />
        {labels.deleteLabel}
      </button>
    </div>
  );
}

interface MobileRowFieldsProps {
  row: CustomTableGridRow;
  orderedColumns: CustomTableColumn[];
  isDark: boolean;
  conditionalRules: ConditionalRule[];
  rowBackground?: string;
  formatMobileCellValue: FormatMobileCellFn;
}
function MobileRowFields({
  row,
  orderedColumns,
  isDark,
  conditionalRules,
  rowBackground,
  formatMobileCellValue,
}: MobileRowFieldsProps): React.JSX.Element {
  const dtColor = 'var(--muted-foreground)';
  const ddColor = 'var(--foreground)';
  return (
    <dl style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {orderedColumns.map(column => (
        <div
          key={`${row.id}-${column.id}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '112px 1fr',
            gap: 8,
            fontSize: '0.875rem',
          }}
        >
          <dt
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: dtColor,
            }}
          >
            {column.title}
          </dt>
          <dd
            style={{
              color: ddColor,
              backgroundColor: resolveCellBackground({
                row,
                col: column,
                rules: conditionalRules,
                rowBackground,
              }),
            }}
          >
            {formatMobileCellValue(column, row)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface MobileRowCardProps extends MobileRowActionsProps {
  orderedColumns: CustomTableColumn[];
  isDark: boolean;
  conditionalRules: ConditionalRule[];
  selectedRowsSet: Set<string>;
  onSelectRow: SelectRowFn;
  formatMobileCellValue: FormatMobileCellFn;
}
function MobileRowCard({
  row,
  orderedColumns,
  isDark,
  selectedRowsSet,
  onSelectRow,
  onViewRow,
  onEditRow,
  onDeleteRow,
  conditionalRules,
  formatMobileCellValue,
  labels,
}: MobileRowCardProps): React.JSX.Element {
  const rowStyle = resolveRowStyle(row, conditionalRules);
  const rowBackground =
    typeof rowStyle.backgroundColor === 'string' ? rowStyle.backgroundColor : undefined;
  const border = '1px solid var(--border-color)';
  const headerColor = 'var(--foreground)';
  return (
    <article
      data-testid={`custom-table-mobile-card-${row.id}`}
      style={{ border, backgroundColor: 'var(--card-bg)', padding: 12, ...rowStyle }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: headerColor,
          }}
        >
          <Checkbox
            checked={selectedRowsSet.has(row.id)}
            onCheckedChange={checked => onSelectRow(row.id, Boolean(checked))}
            aria-label={`Select row ${row.rowNumber}`}
          />
          {isDraftRowId(row.id) ? (
            <span title={labels.draftRowHint}>
              <PencilLine size={14} aria-label={labels.draftRowHint} />
            </span>
          ) : (
            <span>#{row.rowNumber}</span>
          )}
        </div>
        <MobileRowActions
          row={row}
          onViewRow={onViewRow}
          onEditRow={onEditRow}
          onDeleteRow={onDeleteRow}
          labels={labels}
        />
      </div>
      <MobileRowFields
        row={row}
        orderedColumns={orderedColumns}
        isDark={isDark}
        conditionalRules={conditionalRules}
        rowBackground={rowBackground}
        formatMobileCellValue={formatMobileCellValue}
      />
    </article>
  );
}

function MobileEmptyState({
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

function MobileLoadingRow({ label }: { label: string }): React.JSX.Element {
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

interface MobileBottomAddRowProps {
  isDark: boolean;
  onCreateRow?: () => Promise<CustomTableGridRow | null>;
  label: string;
}
function MobileBottomAddRow({
  isDark,
  onCreateRow,
  label,
}: MobileBottomAddRowProps): React.JSX.Element {
  const borderTop = '1px solid var(--border-color)';
  const bg = 'var(--muted)';
  return (
    <div style={{ borderTop, backgroundColor: bg, padding: 12 }}>
      <button
        type="button"
        onClick={() => {
          void onCreateRow?.();
        }}
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          border: '1px dashed var(--border-color)',
          backgroundColor: 'var(--card-bg)',
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'border-color 0.2s, color 0.2s',
        }}
      >
        <Plus size={16} />
        {label}
      </button>
    </div>
  );
}

interface MobileScrollHeaderProps {
  isDark: boolean;
  rows: CustomTableGridRow[];
  selectedRowIds: string[];
  allRowsSelectedMobile: boolean;
  someRowsSelectedMobile: boolean;
  onSelectAll: (checked: boolean) => void;
  onCreateRow?: () => Promise<CustomTableGridRow | null>;
  label: string;
}
function MobileScrollHeader({
  isDark,
  rows,
  selectedRowIds,
  allRowsSelectedMobile,
  someRowsSelectedMobile,
  onSelectAll,
  onCreateRow,
  label,
}: MobileScrollHeaderProps): React.JSX.Element {
  const border = '1px solid var(--border-color)';
  const color = 'var(--foreground)';
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: border,
        backgroundColor: 'var(--card-bg)',
        padding: '8px 12px',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.875rem',
          fontWeight: 500,
          color,
        }}
      >
        <Checkbox
          checked={allRowsSelectedMobile}
          indeterminate={someRowsSelectedMobile && !allRowsSelectedMobile}
          onCheckedChange={onSelectAll}
          aria-label="Select all rows"
        />
        <span>
          {selectedRowIds.length}/{rows.length}
        </span>
      </div>
      {onCreateRow && (
        <button
          type="button"
          onClick={() => {
            void onCreateRow();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: tokens.radius.md,
            border: '1px dashed var(--border-color)',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            background: 'none',
            cursor: 'pointer',
            transition: 'border-color 0.2s, color 0.2s',
          }}
        >
          <Plus size={14} />
          {label}
        </button>
      )}
    </div>
  );
}

function MobileRowsContent(p: P): React.JSX.Element {
  const hasRows = p.rows.length > 0;
  const showEmpty = !(p.loadingRows || hasRows);
  return (
    <>
      {hasRows && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
          {p.rows.map(row => (
            <MobileRowCard
              key={row.id}
              row={row}
              orderedColumns={p.orderedColumns}
              isDark={p.isDark}
              selectedRowsSet={p.selectedRowsSet}
              onSelectRow={p.onSelectRow}
              onViewRow={p.onViewRow}
              onEditRow={p.onEditRow}
              onDeleteRow={p.onDeleteRow}
              conditionalRules={p.conditionalRules}
              formatMobileCellValue={p.formatMobileCellValue}
              labels={p.labels}
            />
          ))}
        </div>
      )}
      {showEmpty && <MobileEmptyState labels={p.labels} />}
      {hasRows && (
        <MobileBottomAddRow
          isDark={p.isDark}
          onCreateRow={p.onCreateRow}
          label={p.labels.addRowLabel}
        />
      )}
      {p.loadingRows && <MobileLoadingRow label={p.labels.loadingMore} />}
    </>
  );
}

// The container ref is destructured out of the props object: React Compiler
// treats an object holding a ref as a ref and refuses to compile reads of it.
function MobileScrollBody({ tableContainerRef, ...p }: P): React.JSX.Element {
  const border = '1px solid var(--border-color)';
  const height = p.isFullscreen ? 'calc(100vh - 150px)' : '600px';
  return (
    <div
      ref={tableContainerRef}
      onScroll={p.onScroll}
      style={{
        position: 'relative',
        overflowY: 'auto',
        border,
        backgroundColor: 'var(--card-bg)',
        height,
      }}
    >
      <MobileScrollHeader
        isDark={p.isDark}
        rows={p.rows}
        selectedRowIds={p.selectedRowIds}
        allRowsSelectedMobile={p.allRowsSelectedMobile}
        someRowsSelectedMobile={p.someRowsSelectedMobile}
        onSelectAll={p.onSelectAll}
        onCreateRow={p.onCreateRow}
        label={p.labels.addRowLabel}
      />
      <MobileRowsContent {...p} tableContainerRef={tableContainerRef} />
    </div>
  );
}

export function MobileTableView(p: MobileTableViewProps): React.JSX.Element {
  const containerClass = p.isDark ? 'custom-table-container dark' : 'custom-table-container';
  return (
    <div className={containerClass}>
      <MobileScrollBody {...p} />
    </div>
  );
}
