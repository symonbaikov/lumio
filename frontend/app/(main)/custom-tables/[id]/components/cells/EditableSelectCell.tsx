'use client';

import { ChevronDown } from '@/app/components/icons';
import { Checkbox } from '@/app/components/ui/checkbox';
import type { Column, Row, Table } from '@tanstack/react-table';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { CustomTableCellValue, CustomTableGridRow } from '../../utils/stylingUtils';

interface EditableSelectCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
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
  const initialValues = Array.isArray(initialValue)
    ? initialValue.map(value => String(value))
    : initialValue === null || initialValue === undefined
      ? []
      : [String(initialValue)];
  const initialSingleValue =
    initialValue === null || initialValue === undefined || Array.isArray(initialValue)
      ? ''
      : String(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>(multiple ? initialValues : []);
  const [selectedValue, setSelectedValue] = useState<string>(multiple ? '' : initialSingleValue);
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
        setSelectedValue(initialSingleValue);
      }
    }
  };

  const displayValue = multiple
    ? selectedValues.length > 0
      ? selectedValues.join(', ')
      : '—'
    : selectedValue || '—';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '100%',
          padding: '4px 8px',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          ...style,
        }}
        aria-label="Open select options"
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayValue}
        </span>
        <ChevronDown
          className="h-4 w-4"
          style={{ color: 'var(--muted-foreground)', flexShrink: 0, marginLeft: 8 }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            width: '100%',
            minWidth: 200,
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 16px -4px rgba(12,12,20,0.08)',
            zIndex: 20,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 14, color: 'var(--muted-foreground)' }}>
              No options available
            </div>
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
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontSize: 14,
                    cursor: 'pointer',
                    background: isSelected ? 'var(--color-info-soft-bg)' : 'transparent',
                    color: isSelected ? 'var(--color-info-soft-text)' : 'var(--foreground)',
                    border: 'none',
                    display: 'block',
                  }}
                  aria-pressed={isSelected}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {multiple && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        className="h-5 w-5"
                        style={{ pointerEvents: 'none' }}
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
