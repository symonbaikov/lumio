'use client';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Column, Row, Table } from '@tanstack/react-table';
import { format, isValid } from 'date-fns';
import { type CSSProperties, useState } from 'react';
import { formatStoredDate } from '@/app/lib/user-format-store';
import type { CustomTableCellValue, CustomTableGridRow } from '../../utils/stylingUtils';

interface EditableDateCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
  style?: CSSProperties;
}

const DATE_VALUE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDateValue = (value: unknown) => {
  if (typeof value !== 'string' || !value) {
    return null;
  }

  if (DATE_VALUE_REGEX.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return format(parsed, 'yyyy-MM-dd');
};

const toDate = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const d = new Date(value);
  return isValid(d) ? d : null;
};

export function EditableDateCell({ row, column, onUpdateCell, style }: EditableDateCellProps) {
  const initialValue = normalizeDateValue(row.original.data[column.id]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | null>(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (newValue: string | null) => {
    if (newValue === initialValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    await (async () => {
      await onUpdateCell(row.original.id, column.id, newValue);
      setIsEditing(false);
    })()
      .catch(async error => {
        console.error('Failed to update cell:', error);
        setSelectedValue(initialValue);
      })
      .finally(async () => {
        setIsSaving(false);
      });
  };

  const handleCancel = () => {
    setSelectedValue(initialValue);
    setIsEditing(false);
  };

  const handleOpenEditor = () => {
    setSelectedValue(initialValue);
    setIsEditing(true);
  };

  const displayValue = initialValue ? formatStoredDate(new Date(initialValue)) : '—';

  // Календарь MUI живёт в портале и сам подстраивается под вьюпорт, поэтому
  // никакой обёртки внутри ячейки не нужно: она только вылезала из узких колонок.
  if (isEditing) {
    return (
      <div style={{ width: '100%', ...style }}>
        <DatePicker
          value={toDate(selectedValue)}
          onChange={date => {
            const nextValue = date && isValid(date) ? format(date, 'yyyy-MM-dd') : null;
            setSelectedValue(nextValue);
            void handleSave(nextValue);
          }}
          open={isEditing}
          onOpen={() => setIsEditing(true)}
          onClose={() => {
            if (!isSaving) {
              handleCancel();
            }
          }}
          disabled={isSaving}
          slotProps={{
            textField: {
              size: 'small',
              variant: 'standard',
              fullWidth: true,
              'aria-label': 'Select date',
            },
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleOpenEditor}
      style={{
        width: '100%',
        height: '100%',
        padding: '4px 8px',
        cursor: 'pointer',
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...style,
      }}
      title="Click to select date"
      aria-label="Select date"
    >
      {displayValue}
    </button>
  );
}
