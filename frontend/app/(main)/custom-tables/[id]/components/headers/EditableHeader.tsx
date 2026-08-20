'use client';

import { Tag, X } from '@/app/components/icons';
import type { Column, Table } from '@tanstack/react-table';
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
        style={{
          width: '100%',
          padding: '4px 8px',
          fontSize: 14,
          border: '1px solid #3b82f6',
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
        title={!isSystemColumn ? 'Double-click to rename' : undefined}
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

      {!isSystemColumn && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          style={{
            flexShrink: 0,
            padding: 4,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--muted-foreground)',
            lineHeight: 0,
          }}
          title="Delete column"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
