'use client';

import type { CustomTableGridRow } from '../../utils/stylingUtils';
import type { Column, Table } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

interface EditableSelectCellProps {
  row: any;
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: any) => Promise<void>;
  options?: string[];
  multiple?: boolean;
  style?: CSSProperties;
}

export function EditableSelectCell({
  row,
  column,
  onUpdateCell,
  options = [],
  multiple = false,
  style,
}: EditableSelectCellProps) {
  const initialValue = row.original.data[column.id];
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>(
    multiple
      ? Array.isArray(initialValue)
        ? initialValue
        : initialValue
          ? [initialValue]
          : []
      : [],
  );
  const [selectedValue, setSelectedValue] = useState<string>(multiple ? '' : initialValue || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = async (option: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(option)
        ? selectedValues.filter(v => v !== option)
        : [...selectedValues, option];

      setSelectedValues(newValues);

      try {
        await onUpdateCell(row.original.id, column.id, newValues);
      } catch (error) {
        console.error('Failed to update cell:', error);
        setSelectedValues(selectedValues);
      }
    } else {
      setSelectedValue(option);
      setIsOpen(false);

      try {
        await onUpdateCell(row.original.id, column.id, option);
      } catch (error) {
        console.error('Failed to update cell:', error);
        setSelectedValue(initialValue || '');
      }
    }
  };

  const displayValue = multiple
    ? selectedValues.length > 0
      ? selectedValues.join(', ')
      : '—'
    : selectedValue || '—';

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full px-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded flex items-center justify-between text-left"
        style={style}
        aria-label="Open select options"
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
          ) : (
            options.map(option => {
              const isSelected = multiple
                ? selectedValues.includes(option)
                : selectedValue === option;

              return (
                <button
                  type="button"
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center gap-2">
                    {multiple && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-5 w-5 rounded border-gray-300 text-primary pointer-events-none"
                      />
                    )}
                    <span>{option}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
