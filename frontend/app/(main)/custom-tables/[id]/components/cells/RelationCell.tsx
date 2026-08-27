'use client';

import apiClient from '@/app/lib/api';
import type { Column, Row, Table } from '@tanstack/react-table';
import { type CSSProperties, useCallback, useState } from 'react';
import type { CustomTableCellValue, CustomTableGridRow } from '../../utils/stylingUtils';

interface RelationOption {
  id: string;
  label: string;
}

interface RelationCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
  style?: CSSProperties;
  tableId?: string;
}

/**
 * Показывает подпись связанной строки (её считает сервер), а редактирование —
 * выбор из строк таблицы-цели. Хранится идентификатор, не текст.
 */
export function RelationCell({ row, column, onUpdateCell, style, tableId }: RelationCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [options, setOptions] = useState<RelationOption[]>([]);
  const [loading, setLoading] = useState(false);

  const rawValue = row.original.data[column.id];
  const label =
    (row.original as CustomTableGridRow & { relationLabels?: Record<string, string> })
      .relationLabels?.[column.id] ?? (typeof rawValue === 'string' && rawValue ? '—' : '');

  const startEditing = useCallback(async () => {
    setIsEditing(true);
    if (options.length || !tableId) {
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.get(`/custom-tables/${tableId}/relation-options`, {
        params: { column: column.id },
      });
      const root = (response.data ?? {}) as Record<string, unknown>;
      const nested = (root.data ?? {}) as Record<string, unknown>;
      const items = root.items ?? nested.items ?? [];
      setOptions(Array.isArray(items) ? (items as RelationOption[]) : []);
    } catch (error) {
      console.error('Failed to load relation options:', error);
    } finally {
      setLoading(false);
    }
  }, [options.length, tableId, column.id]);

  if (isEditing) {
    return (
      <select
        // biome-ignore lint/a11y/noAutofocus: ячейка открыта пользователем намеренно
        autoFocus
        disabled={loading}
        value={typeof rawValue === 'string' ? rawValue : ''}
        onChange={async e => {
          await onUpdateCell(row.original.id, column.id, e.target.value || null);
          setIsEditing(false);
        }}
        onBlur={() => setIsEditing(false)}
        style={{ width: '100%', height: '100%', padding: '4px 8px', ...style }}
      >
        <option value="">—</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div
      onDoubleClick={() => void startEditing()}
      style={{
        width: '100%',
        height: '100%',
        padding: '4px 8px',
        cursor: 'pointer',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: label ? undefined : 'var(--muted-foreground)',
        ...style,
      }}
      title="Double-click to edit"
    >
      {label || '—'}
    </div>
  );
}
