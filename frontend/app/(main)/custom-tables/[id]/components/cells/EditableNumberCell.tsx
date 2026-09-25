'use client';

import type { Column, Row } from '@tanstack/react-table';
import { type CSSProperties } from 'react';
import {
  formatCellNumber,
  NEGATIVE_NUMBER_COLOR,
  type NumberDisplayFormat,
  parseLocalizedNumber,
} from '../../utils/numberFormat';
import type { CustomTableCellValue, CustomTableGridRow } from '../../utils/stylingUtils';
import { useEditableCell } from './useEditableCell';

interface EditableNumberCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
  style?: CSSProperties;
  /** Код валюты (ISO 4217) — задан только у денежных колонок. */
  currency?: string;
  /** Знаков после запятой; для денег по умолчанию 2. */
  precision?: number;
  format?: NumberDisplayFormat;
}

export function EditableNumberCell({
  row,
  column,
  onUpdateCell,
  style,
  currency,
  precision,
  format,
}: EditableNumberCellProps) {
  const rawValue = row.original.data[column.id];
  const initialValue = rawValue === null || rawValue === undefined ? null : Number(rawValue);

  const {
    isEditing,
    setIsEditing,
    inputValue,
    setInputValue,
    isSaving,
    inputRef,
    handleSave,
    handleKeyDown,
  } = useEditableCell<number | null>({
    initialValue,
    rowId: row.original.id,
    columnKey: column.id,
    onUpdateCell,
    toInputString: v => (v === null || v === undefined ? '' : String(v)),
    // Текстовое поле вместо type=number: так принимаются «1 234,56» и «12,5 %».
    parseValue: raw => (raw.trim() === '' ? null : parseLocalizedNumber(raw)),
  });

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        style={{
          width: '100%',
          height: '100%',
          padding: '4px 8px',
          border: '2px solid var(--primary-fill)',
          background: 'var(--muted)',
          textAlign: 'right',
          ...style,
        }}
      />
    );
  }

  const displayValue =
    initialValue != null ? formatCellNumber(initialValue, { currency, precision, format }) : '—';
  // Минус — красным, если правило или стиль колонки не задали свой цвет текста.
  const negativeColor =
    initialValue != null && initialValue < 0 && !style?.color
      ? { color: NEGATIVE_NUMBER_COLOR }
      : {};

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: double-click-to-edit grid cell. Making this keyboard-reachable needs roving-tabindex navigation across the whole table (role=grid/gridcell); a per-cell tabIndex would add a tab stop to every cell instead.
    <div
      onDoubleClick={() => setIsEditing(true)}
      style={{
        width: '100%',
        height: '100%',
        padding: '4px 8px',
        cursor: 'text',
        textAlign: 'right',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...style,
        ...negativeColor,
      }}
      title="Double-click to edit"
    >
      {displayValue}
    </div>
  );
}
