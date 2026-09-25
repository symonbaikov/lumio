'use client';

import type { Column, Table } from '@tanstack/react-table';
import { useEffect, useRef, useState } from 'react';
import { Tag } from '@/app/components/icons';
import type { CustomTableGridRow } from '../../utils/stylingUtils';
import { ColumnHeaderMenu, type ColumnMenuLabels, type ColumnStylePatch } from './ColumnHeaderMenu';

interface EditableHeaderProps {
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  title: string;
  icon?: string | null;
  labels: ColumnMenuLabels;
  isPinned: boolean;
  headerColor?: string;
  columnColor?: string;
  onRename: (columnKey: string, nextTitle: string) => Promise<void>;
  onDelete?: (columnKey: string) => void;
  onEdit?: (columnKey: string) => void;
  onSetStyle?: (opts: { columnKey: string; style: ColumnStylePatch }) => Promise<void>;
  onTogglePin?: (columnKey: string) => void;
  onHide?: (columnKey: string) => void;
}

export function EditableHeader({
  column,
  title,
  icon,
  labels,
  isPinned,
  headerColor,
  columnColor,
  onRename,
  onDelete,
  onEdit,
  onSetStyle,
  onTogglePin,
  onHide,
}: EditableHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSystemColumn = column.id.startsWith('__');

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const newTitle = editValue.trim();

    if (!newTitle || newTitle === title) {
      setEditValue(title);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    await (async () => {
      await onRename(column.id, newTitle);
      setIsEditing(false);
    })()
      .catch(async error => {
        console.error('Failed to rename column:', error);
        setEditValue(title);
      })
      .finally(async () => {
        setIsSaving(false);
      });
  };

  const handleCancel = () => {
    setEditValue(title);
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

  // Сортировку переключаем методами колонки: TanStack читает текущее состояние
  // сам, поэтому в меню не нужно знать, как отсортировано сейчас.
  const handleSort = (direction: 'asc' | 'desc' | null): void => {
    if (direction === null) {
      column.clearSorting();
      return;
    }
    column.toggleSorting(direction === 'desc');
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        style={{
          width: '100%',
          padding: '4px 8px',
          fontSize: 14,
          border: '1px solid var(--primary-fill)',
          background: 'var(--card-bg)',
          boxSizing: 'border-box',
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        width: '100%',
      }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: double-click-to-edit grid cell. Making this keyboard-reachable needs roving-tabindex navigation across the whole table (role=grid/gridcell); a per-cell tabIndex would add a tab stop to every cell instead. */}
      <div
        onDoubleClick={() => !isSystemColumn && setIsEditing(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 0,
          cursor: !isSystemColumn ? 'pointer' : 'default',
        }}
        title={!isSystemColumn ? labels.rename : undefined}
      >
        {icon && (
          <span style={{ flexShrink: 0 }}>
            {icon.startsWith('http://') ||
            icon.startsWith('https://') ||
            icon.startsWith('/uploads/') ? (
              <img src={icon} alt="" className="h-4 w-4" style={{ objectFit: 'contain' }} />
            ) : (
              <Tag size={16} />
            )}
          </span>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
      </div>

      {!isSystemColumn && (
        <ColumnHeaderMenu
          labels={labels}
          isPinned={isPinned}
          headerColor={headerColor}
          columnColor={columnColor}
          onRename={() => setIsEditing(true)}
          onEdit={onEdit ? () => onEdit(column.id) : undefined}
          onSetStyle={
            onSetStyle
              ? patch => void onSetStyle({ columnKey: column.id, style: patch })
              : undefined
          }
          onTogglePin={onTogglePin ? () => onTogglePin(column.id) : undefined}
          onHide={onHide ? () => onHide(column.id) : undefined}
          onSort={handleSort}
          onDelete={onDelete ? () => onDelete(column.id) : undefined}
        />
      )}
    </div>
  );
}
