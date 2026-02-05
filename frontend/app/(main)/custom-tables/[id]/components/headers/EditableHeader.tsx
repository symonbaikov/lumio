'use client';

import { Icon } from '@iconify/react';
import type { Column, Table } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CustomTableGridRow } from '../../utils/stylingUtils';

interface EditableHeaderProps {
  column: Column<CustomTableGridRow>;
  table: Table<CustomTableGridRow>;
  title: string;
  icon?: string | null;
  onRename: (columnKey: string, nextTitle: string) => Promise<void>;
  onDelete?: (columnKey: string) => void;
}

export function EditableHeader({
  column,
  table,
  title,
  icon,
  onRename,
  onDelete,
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
    try {
      await onRename(column.id, newTitle);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to rename column:', error);
      setEditValue(title);
    } finally {
      setIsSaving(false);
    }
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(column.id);
    }
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
        className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none bg-white dark:bg-gray-800"
      />
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <div
        onDoubleClick={() => !isSystemColumn && setIsEditing(true)}
        className={`flex items-center gap-2 flex-1 min-w-0 ${
          !isSystemColumn ? 'cursor-pointer' : ''
        }`}
        title={!isSystemColumn ? 'Double-click to rename' : undefined}
      >
        {icon && (
          <span className="shrink-0">
            {icon.startsWith('http://') ||
            icon.startsWith('https://') ||
            icon.startsWith('/uploads/') ? (
              <img src={icon} alt="" className="h-4 w-4 object-contain" />
            ) : (
              <Icon icon={icon} className="h-4 w-4" />
            )}
          </span>
        )}
        <span className="truncate">{title}</span>
      </div>

      {!isSystemColumn && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          className="shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Delete column"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
