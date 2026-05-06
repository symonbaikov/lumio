'use client';

import type { Column, Row } from '@tanstack/react-table';
import { type CSSProperties } from 'react';
import type { CustomTableCellValue, CustomTableGridRow } from '../../utils/stylingUtils';
import { useEditableCell } from './useEditableCell';

interface EditableNumberCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
  style?: CSSProperties;
}

export function EditableNumberCell({ row, column, onUpdateCell, style }: EditableNumberCellProps) {
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
    handleCancel,
    handleKeyDown,
  } = useEditableCell<number | null>({
    initialValue,
    rowId: row.original.id,
    columnKey: column.id,
    onUpdateCell,
    toInputString: v => (v === null || v === undefined ? '' : String(v)),
    parseValue: raw => {
      if (raw.trim() === '') return null;
      const num = Number(raw);
      return Number.isNaN(num) ? null : num;
    },
  });

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="any"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        style={{
          width: '100%',
          height: '100%',
          padding: '4px 8px',
          border: '2px solid #3b82f6',
          background: 'var(--color-info-soft-bg)',
          textAlign: 'right',
          ...style,
        }}
      />
    );
  }

  const displayValue = initialValue != null ? Number(initialValue).toLocaleString() : '—';

  return (
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
      }}
      title="Double-click to edit"
    >
      {displayValue}
    </div>
  );
}
