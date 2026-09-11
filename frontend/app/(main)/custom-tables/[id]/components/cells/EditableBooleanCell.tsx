'use client';

import type { Column, Row, Table } from '@tanstack/react-table';
import { type CSSProperties } from 'react';
import { Checkbox } from '@/app/components/ui/checkbox';
import type { CustomTableCellValue, CustomTableGridRow } from '../../utils/stylingUtils';

interface EditableBooleanCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
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

  const handleChange = async (newValue: boolean) => {
    try {
      await onUpdateCell(row.original.id, column.id, newValue);
    } catch (error) {
      console.error('Failed to update cell:', error);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        ...style,
      }}
    >
      <Checkbox checked={checked} onCheckedChange={handleChange} className="h-5 w-5" />
    </div>
  );
}
