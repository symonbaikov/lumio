'use client';

import type { Column, Row, Table } from '@tanstack/react-table';
import { type CSSProperties, useState } from 'react';
import { ChevronDown } from '@/app/components/icons';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Select } from '@/app/components/ui/select';
import { findOption } from '../../utils/selectOptions';
import type {
  CustomTableCellValue,
  CustomTableGridRow,
  SelectOptionDef,
} from '../../utils/stylingUtils';
import { OptionChip } from './OptionChip';

interface EditableSelectCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  cellType: string;
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
  options?: SelectOptionDef[];
  multiple?: boolean;
  style?: CSSProperties;
}

const EMPTY_LABEL = '—';

type VariantProps = Omit<EditableSelectCellProps, 'multiple' | 'cellType' | 'table'> & {
  options: SelectOptionDef[];
};

// Списки обоих вариантов рендерятся порталом в body: грид живёт в скролл-контейнере
// с overflow:auto, и абсолютный список внутри ячейки резался по его краю и по
// закреплённым колонкам. MUI сам разворачивает меню, если снизу не хватает места.

function SingleSelectCell({ row, column, onUpdateCell, options, style }: VariantProps) {
  const initialValue = row.original.data[column.id];
  const initialSingleValue =
    initialValue === null || initialValue === undefined || Array.isArray(initialValue)
      ? ''
      : String(initialValue);
  const [selectedValue, setSelectedValue] = useState<string>(initialSingleValue);

  const handleChange = async (next: string) => {
    setSelectedValue(next);
    try {
      await onUpdateCell(row.original.id, column.id, next || null);
    } catch (error) {
      console.error('Failed to update cell:', error);
      setSelectedValue(initialSingleValue);
    }
  };

  // Сохранённое значение, которого уже нет в списке опций, всё равно должно
  // показываться — иначе MUI молча рисует пустой селект.
  const known =
    !selectedValue || findOption(options, selectedValue)
      ? options
      : [{ value: selectedValue }, ...options];
  const selectOptions = [
    { value: '', label: EMPTY_LABEL },
    ...known.map(option => ({ value: option.value, label: <OptionChip option={option} /> })),
  ];
  const current = findOption(known, selectedValue);

  return (
    <Select
      variant="standard"
      disableUnderline
      fullWidth
      size="small"
      value={selectedValue}
      onChange={value => void handleChange(value)}
      options={selectOptions}
      renderValue={value =>
        value && current ? <OptionChip option={current} /> : <span>{EMPTY_LABEL}</span>
      }
      inputProps={{ 'aria-label': 'Open select options' }}
      sx={{
        fontSize: 'inherit',
        color: 'inherit',
        '& .MuiSelect-select': { padding: '4px 24px 4px 8px', ...style },
      }}
    />
  );
}

function MultiSelectCell({ row, column, onUpdateCell, options, style }: VariantProps) {
  const initialValue = row.original.data[column.id];
  const initialValues = Array.isArray(initialValue)
    ? initialValue.map(value => String(value))
    : initialValue === null || initialValue === undefined
      ? []
      : [String(initialValue)];
  const [selectedValues, setSelectedValues] = useState<string[]>(initialValues);

  const handleToggle = async (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    setSelectedValues(newValues);
    try {
      await onUpdateCell(row.original.id, column.id, newValues);
    } catch (error) {
      console.error('Failed to update cell:', error);
      setSelectedValues(selectedValues);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open select options"
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
            color: 'inherit',
            font: 'inherit',
            ...style,
          }}
        >
          <span style={{ display: 'flex', gap: 4, overflow: 'hidden', minWidth: 0 }}>
            {selectedValues.length === 0
              ? EMPTY_LABEL
              : selectedValues.map(value => (
                  <OptionChip
                    key={value}
                    option={findOption(options, value) ?? { value }}
                    size="sm"
                  />
                ))}
          </span>
          <ChevronDown
            className="h-4 w-4"
            style={{ color: 'var(--muted-foreground)', flexShrink: 0, marginLeft: 8 }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.length === 0 ? (
          <div style={{ padding: '8px 12px', fontSize: 14, color: 'var(--muted-foreground)' }}>
            No options available
          </div>
        ) : (
          options.map(option => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={() => void handleToggle(option.value)}
            >
              <OptionChip option={option} />
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EditableSelectCell({
  row,
  column,
  onUpdateCell,
  options = [],
  multiple = false,
  style,
}: EditableSelectCellProps) {
  const variantProps = { row, column, onUpdateCell, options, style };
  return multiple ? <MultiSelectCell {...variantProps} /> : <SingleSelectCell {...variantProps} />;
}
