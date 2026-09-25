'use client';

import type { Column, Row } from '@tanstack/react-table';
import { type CSSProperties } from 'react';
import type { CustomTableCellValue, CustomTableGridRow } from '../../utils/stylingUtils';
import { useEditableCell } from './useEditableCell';

interface EditableTextCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
  style?: CSSProperties;
}

export function EditableTextCell({ row, column, onUpdateCell, style }: EditableTextCellProps) {
  const rawValue = row.original.data[column.id];
  const initialValue = rawValue === null || rawValue === undefined ? '' : String(rawValue);

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
  } = useEditableCell<string>({
    initialValue,
    rowId: row.original.id,
    columnKey: column.id,
    onUpdateCell,
  });

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
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
          ...style,
        }}
      />
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: double-click-to-edit grid cell. Making this keyboard-reachable needs roving-tabindex navigation across the whole table (role=grid/gridcell); a per-cell tabIndex would add a tab stop to every cell instead.
    <div
      onDoubleClick={() => setIsEditing(true)}
      style={{
        width: '100%',
        height: '100%',
        padding: '4px 8px',
        cursor: 'text',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...style,
      }}
      title="Double-click to edit"
    >
      {inputValue || <span style={{ color: 'var(--muted-foreground)' }}>—</span>}
    </div>
  );
}
