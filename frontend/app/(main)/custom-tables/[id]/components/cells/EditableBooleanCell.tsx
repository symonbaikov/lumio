'use client';

import type { Column, Table } from '@tanstack/react-table';
import { type CSSProperties } from 'react';
import type { CustomTableGridRow } from '../../utils/stylingUtils';

interface EditableBooleanCellProps {
  row: any;
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: any) => Promise<void>;
  style?: CSSProperties;
}

export function EditableBooleanCell({
  row,
  column,
  onUpdateCell,
  style,
}: EditableBooleanCellProps) {
  const value = row.original.data[column.id];
  const checked = Boolean(value);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    try {
      await onUpdateCell(row.original.id, column.id, newValue);
    } catch (error) {
      console.error('Failed to update cell:', error);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center px-2 py-1" style={style}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
      />
    </div>
  );
}
