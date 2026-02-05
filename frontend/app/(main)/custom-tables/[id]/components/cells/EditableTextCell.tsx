'use client';

import type { CustomTableGridRow } from '../../utils/stylingUtils';
import type { Cell, Column, Table } from '@tanstack/react-table';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

interface EditableTextCellProps {
  row: any;
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: any) => Promise<void>;
  style?: CSSProperties;
}

export function EditableTextCell({
  row,
  column,
  table,
  onUpdateCell,
  style,
}: EditableTextCellProps) {
  const initialValue = row.original.data[column.id] || '';
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (value === initialValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateCell(row.original.id, column.id, value);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update cell:', error);
      setValue(initialValue);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className="w-full h-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none bg-blue-50 dark:bg-blue-900/20"
        style={style}
      />
    );
  }

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      className="w-full h-full px-2 py-1 cursor-text hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded truncate"
      style={style}
      title="Double-click to edit"
    >
      {value || <span className="text-gray-400 dark:text-gray-600">—</span>}
    </div>
  );
}
