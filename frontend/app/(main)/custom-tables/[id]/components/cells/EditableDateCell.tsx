'use client';

import type { Column, Table } from '@tanstack/react-table';
import { format } from 'date-fns';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import type { CustomTableGridRow } from '../../utils/stylingUtils';

interface EditableDateCellProps {
  row: any;
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: any) => Promise<void>;
  style?: CSSProperties;
}

export function EditableDateCell({ row, column, onUpdateCell, style }: EditableDateCellProps) {
  const initialValue = row.original.data[column.id];
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialValue ? new Date(initialValue) : undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isEditing) {
          handleSave();
        }
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, selectedDate]);

  const handleSave = async () => {
    const newValue = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

    if (newValue === initialValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateCell(row.original.id, column.id, newValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update cell:', error);
      setSelectedDate(initialValue ? new Date(initialValue) : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedDate(initialValue ? new Date(initialValue) : undefined);
    setIsEditing(false);
  };

  const displayValue = initialValue ? format(new Date(initialValue), 'dd.MM.yyyy') : '—';

  if (isEditing) {
    return (
      <div ref={containerRef} className="relative z-20">
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={date => {
              setSelectedDate(date);
              if (date) {
                // Auto-save on select
                setTimeout(() => handleSave(), 100);
              }
            }}
            className="text-sm"
          />
          <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="w-full h-full px-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded text-left truncate"
      style={style}
      title="Click to select date"
      aria-label="Select date"
    >
      {displayValue}
    </button>
  );
}
