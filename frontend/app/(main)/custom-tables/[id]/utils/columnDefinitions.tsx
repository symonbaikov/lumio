'use client';

import { type ColumnDef, type HeaderContext } from '@tanstack/react-table';
import { PencilLine, Plus } from '@/app/components/icons';
import { Checkbox } from '@/app/components/ui/checkbox';
import { EditableBooleanCell } from '../components/cells/EditableBooleanCell';
import { EditableDateCell } from '../components/cells/EditableDateCell';
import { EditableNumberCell } from '../components/cells/EditableNumberCell';
import { EditableSelectCell } from '../components/cells/EditableSelectCell';
import { EditableTextCell } from '../components/cells/EditableTextCell';
import { FormulaCell } from '../components/cells/FormulaCell';
import { RelationCell } from '../components/cells/RelationCell';
import { ActionsCell } from '../components/columns/ActionsCell';
import type { ColumnMenuLabels, ColumnStylePatch } from '../components/headers/ColumnHeaderMenu';
import { EditableHeader } from '../components/headers/EditableHeader';
import { isDraftRowId, isMissingRequiredCell } from '../helpers/draftRowHelpers';
import {
  type DeleteColumnFn,
  type DeleteRowFn,
  type GridColumnMeta,
  type OpenColorPickerFn,
  type RenameColumnFn,
  readGridColumnMeta,
  type UpdateCellFn,
} from './columnDefinitions.types';
import { type ConditionalRule, conditionalStyleFor } from './conditionalRules';
import { normalizeSelectOptions } from './selectOptions';
import {
  type CustomTableColumn,
  type CustomTableGridRow,
  getCellStyle,
  mergeSheetStyle,
  type SelectOptionDef,
} from './stylingUtils';

export type SetColumnStyleFn = (opts: {
  columnKey: string;
  style: ColumnStylePatch;
}) => Promise<void>;

export interface ColumnMenuActions {
  onEditColumn?: (columnKey: string) => void;
  onSetColumnStyle?: SetColumnStyleFn;
  onTogglePinColumn?: (columnKey: string) => void;
  onHideColumn?: (columnKey: string) => void;
}

export interface BuildColumnsParams extends ColumnMenuActions {
  orderedColumns: CustomTableColumn[];
  conditionalRules?: ConditionalRule[];
  tableId?: string;
  /** Валюта воркспейса — для денежных колонок без своей валюты в конфиге. */
  defaultCurrency?: string;
  columnWidths: Record<string, number>;
  pinnedColumnKeys: string[];
  columnMenuLabels: ColumnMenuLabels;
  onUpdateCell: UpdateCellFn;
  onRenameColumnTitle: RenameColumnFn;
  onDeleteColumn?: DeleteColumnFn;
  onAddColumnClick?: () => void;
  onOpenColorPicker: OpenColorPickerFn;
  onDeleteRow: DeleteRowFn;
  actionsHeaderLabel: string;
  colorTooltipLabel: string;
  deleteLabel: string;
  addRowLabel: string;
  draftRowHint: string;
}

type TRow = import('@tanstack/react-table').Row<CustomTableGridRow>;
type TColumn = import('@tanstack/react-table').Column<CustomTableGridRow>;
type TTable = import('@tanstack/react-table').Table<CustomTableGridRow>;

interface RenderDataCellParams {
  row: TRow;
  column: TColumn;
  table: TTable;
  col: CustomTableColumn;
  onUpdateCell: UpdateCellFn;
  conditionalRules: ConditionalRule[];
  tableId?: string;
  defaultCurrency?: string;
}

interface CellCommonProps {
  row: TRow;
  column: TColumn;
  table: TTable;
  cellType: CustomTableColumn['type'];
  onUpdateCell: UpdateCellFn;
  style: React.CSSProperties;
  options?: SelectOptionDef[];
  currency?: string;
  precision?: number;
  format?: 'plain' | 'percent';
  expression?: string;
  tableId?: string;
}

type CellRenderer = (p: CellCommonProps) => React.JSX.Element;

const CELL_RENDERERS: Partial<Record<CustomTableColumn['type'], CellRenderer>> = {
  boolean: p => <EditableBooleanCell {...p} />,
  date: p => <EditableDateCell {...p} />,
  number: p => <EditableNumberCell {...p} />,
  currency: p => <EditableNumberCell {...p} />,
  formula: p => <FormulaCell {...p} />,
  relation: p => <RelationCell {...p} />,
  select: p => <EditableSelectCell {...p} />,
  multi_select: p => <EditableSelectCell {...p} multiple />,
};

/** Денежная колонка без валюты в конфиге считает в валюте воркспейса. */
export function resolveColumnCurrency(
  col: Pick<CustomTableColumn, 'type' | 'config'>,
  defaultCurrency?: string,
): string | undefined {
  const own = typeof col.config?.currency === 'string' ? col.config.currency : undefined;
  if (own) {
    return own;
  }
  return col.type === 'currency' ? defaultCurrency : undefined;
}

function renderDataCell({
  row,
  column,
  table,
  col,
  onUpdateCell,
  conditionalRules,
  tableId,
  defaultCurrency,
}: RenderDataCellParams): React.JSX.Element {
  // Правило подмешивается в базовый стиль колонки, а ручная заливка ячейки
  // накладывается поверх в getCellStyle — приоритет у явного выбора человека.
  const ruleStyle = conditionalStyleFor(conditionalRules, row.original, col.key);
  const baseStyle = mergeSheetStyle(col.style?.cell ?? {}, ruleStyle);
  // Фон красит сам <td> (см. resolveCellBackground), ячейке остаётся только текст.
  const { backgroundColor: _background, ...cellStyle } = getCellStyle(
    row.original,
    col.key,
    baseStyle,
  );
  // Без этой подсветки черновик с незаполненной обязательной колонкой молча
  // никогда не сохранится, и человеку негде узнать, чего не хватает.
  if (isMissingRequiredCell(row.original, col)) {
    cellStyle.boxShadow = 'inset 0 0 0 1px var(--warning, #b45309)';
  }
  const commonProps: CellCommonProps = {
    row,
    column,
    table,
    cellType: col.type,
    onUpdateCell,
    style: cellStyle,
    options: normalizeSelectOptions(col.config),
    currency: resolveColumnCurrency(col, defaultCurrency),
    precision: typeof col.config?.precision === 'number' ? col.config.precision : undefined,
    format: col.config?.format === 'percent' ? 'percent' : undefined,
    expression: typeof col.config?.expression === 'string' ? col.config.expression : undefined,
    tableId,
  };
  const renderer = CELL_RENDERERS[col.type];
  return renderer ? renderer(commonProps) : <EditableTextCell {...commonProps} />;
}

function buildSelectColumn(): ColumnDef<CustomTableGridRow> {
  return {
    id: '__select',
    header: ({ table }) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Checkbox
          aria-label="Select all rows"
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Checkbox
          aria-label={`Select row ${row.original.rowNumber}`}
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      </div>
    ),
  };
}

function buildRowNumberColumn(draftRowHint: string): ColumnDef<CustomTableGridRow> {
  return {
    id: '__rowNumber',
    header: '#',
    size: 80,
    minSize: 60,
    maxSize: 120,
    enableResizing: false,
    enableSorting: false,
    cell: ({ row }) => {
      // У черновика нет серверного номера, и показывать порядковый нельзя:
      // строка ещё не сохранена, и её легко спутать с обычной.
      const isDraft = isDraftRowId(row.original.id);
      return (
        <div
          title={isDraft ? draftRowHint : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            color: isDraft ? 'var(--warning, #b45309)' : 'var(--muted-foreground)',
          }}
        >
          {isDraft ? <PencilLine size={14} aria-label={draftRowHint} /> : row.original.rowNumber}
        </div>
      );
    },
  };
}

/**
 * Шапка колонки данных. Объявлена один раз на модуль: flexRender рендерит
 * функцию как компонент, и новая стрелка на каждую перестройку колонок
 * означала бы remount шапки вместе с открытым меню.
 */
function DataColumnHeader({
  column,
  table,
}: HeaderContext<CustomTableGridRow, unknown>): React.JSX.Element | null {
  const meta = readGridColumnMeta(column.columnDef);
  if (!meta?.header) {
    return null;
  }
  const { gridColumn, header } = meta;
  return (
    <EditableHeader
      column={column}
      table={table}
      title={gridColumn.title}
      icon={header.icon}
      labels={header.labels}
      isPinned={header.isPinned}
      headerColor={gridColumn.style?.header?.backgroundColor}
      columnColor={gridColumn.style?.cell?.backgroundColor}
      onRename={header.onRename}
      onDelete={header.onDelete}
      onEdit={header.onEdit}
      onSetStyle={header.onSetStyle}
      onTogglePin={header.onTogglePin}
      onHide={header.onHide}
    />
  );
}

interface DataColumnParams extends ColumnMenuActions {
  col: CustomTableColumn;
  columnWidths: Record<string, number>;
  isPinned: boolean;
  columnMenuLabels: ColumnMenuLabels;
  onUpdateCell: UpdateCellFn;
  onRenameColumnTitle: RenameColumnFn;
  onDeleteColumn?: DeleteColumnFn;
  conditionalRules: ConditionalRule[];
  tableId?: string;
  defaultCurrency?: string;
}
function buildDataColumn({
  col,
  columnWidths,
  isPinned,
  columnMenuLabels,
  onUpdateCell,
  onRenameColumnTitle,
  onDeleteColumn,
  onEditColumn,
  onSetColumnStyle,
  onTogglePinColumn,
  onHideColumn,
  conditionalRules,
  tableId,
  defaultCurrency,
}: DataColumnParams): ColumnDef<CustomTableGridRow> {
  const icon = typeof col.config?.icon === 'string' ? col.config.icon : null;
  const gridMeta: GridColumnMeta = {
    gridColumn: col,
    conditionalRules,
    header: {
      icon,
      labels: columnMenuLabels,
      isPinned,
      onRename: onRenameColumnTitle,
      onDelete: onDeleteColumn,
      onEdit: onEditColumn,
      onSetStyle: onSetColumnStyle,
      onTogglePin: onTogglePinColumn,
      onHide: onHideColumn,
    },
  };
  return {
    id: col.key,
    meta: gridMeta as ColumnDef<CustomTableGridRow>['meta'],
    // TanStack включает сортировку только у колонок с аксессором. Ячейки читают
    // row.original напрямую, поэтому здесь аксессор нужен ровно для этого.
    accessorFn: row => row.data?.[col.key],
    header: DataColumnHeader,
    size: columnWidths[col.key] || 180,
    minSize: 80,
    maxSize: 1200,
    enableResizing: true,
    cell: ({ row, column, table }) =>
      renderDataCell({
        row,
        column,
        table,
        col,
        onUpdateCell,
        conditionalRules,
        tableId,
        defaultCurrency,
      }),
  };
}

interface ActionsColumnParams {
  actionsHeaderLabel: string;
  colorTooltipLabel: string;
  deleteLabel: string;
  onOpenColorPicker: OpenColorPickerFn;
  onDeleteRow: DeleteRowFn;
}
function buildActionsColumn({
  actionsHeaderLabel,
  colorTooltipLabel,
  deleteLabel,
  onOpenColorPicker,
  onDeleteRow,
}: ActionsColumnParams): ColumnDef<CustomTableGridRow> {
  return {
    id: '__actions',
    header: () => (
      <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
        {actionsHeaderLabel}
      </div>
    ),
    size: 120,
    minSize: 100,
    maxSize: 150,
    enableResizing: false,
    cell: ({ row }) => (
      <ActionsCell
        rowId={row.original.id}
        colorTooltipLabel={colorTooltipLabel}
        deleteLabel={deleteLabel}
        onOpenColorPicker={onOpenColorPicker}
        onDeleteRow={onDeleteRow}
      />
    ),
  };
}

function buildAddColumnButton(onAddColumnClick?: () => void): ColumnDef<CustomTableGridRow> {
  return {
    id: '__add_column',
    header: () => (
      <button
        onClick={onAddColumnClick}
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted-foreground)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s, color 0.2s',
        }}
        title="Add Column"
      >
        <Plus size={16} />
      </button>
    ),
    size: 50,
    minSize: 50,
    maxSize: 50,
    enableResizing: false,
    cell: () => null,
  };
}

export function buildColumns({
  orderedColumns,
  columnWidths,
  pinnedColumnKeys,
  columnMenuLabels,
  onUpdateCell,
  onRenameColumnTitle,
  onDeleteColumn,
  onEditColumn,
  onSetColumnStyle,
  onTogglePinColumn,
  onHideColumn,
  onAddColumnClick,
  onOpenColorPicker,
  onDeleteRow,
  actionsHeaderLabel,
  colorTooltipLabel,
  deleteLabel,
  conditionalRules = [],
  tableId,
  defaultCurrency,
  draftRowHint,
}: BuildColumnsParams): ColumnDef<CustomTableGridRow>[] {
  return [
    buildSelectColumn(),
    buildRowNumberColumn(draftRowHint),
    ...orderedColumns.map(col =>
      buildDataColumn({
        col,
        columnWidths,
        isPinned: pinnedColumnKeys.includes(col.key),
        columnMenuLabels,
        onUpdateCell,
        onRenameColumnTitle,
        onDeleteColumn,
        onEditColumn,
        onSetColumnStyle,
        onTogglePinColumn,
        onHideColumn,
        conditionalRules,
        tableId,
        defaultCurrency,
      }),
    ),
    buildActionsColumn({
      actionsHeaderLabel,
      colorTooltipLabel,
      deleteLabel,
      onOpenColorPicker,
      onDeleteRow,
    }),
    buildAddColumnButton(onAddColumnClick),
  ];
}
