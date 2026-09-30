'use client';

import { MoreHorizontal, Pencil, Trash2 } from '@/app/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import type { CustomTableColumn } from '../utils/types';

export interface ColumnHeaderLabels {
  columnMenu: string;
  editColumn: string;
  deleteColumn: string;
}

interface ColumnHeaderProps {
  column: CustomTableColumn;
  labels: ColumnHeaderLabels;
  onEdit: (column: CustomTableColumn) => void;
  onDelete: (column: CustomTableColumn) => void;
}

/** Small per-column menu; sits next to the sort button in the th. */
export function ColumnMenu({ column, labels, onEdit, onDelete }: ColumnHeaderProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="lumio-ct__col-menu"
          aria-label={`${labels.columnMenu}: ${column.title}`}
          onClick={event => event.stopPropagation()}
        >
          <MoreHorizontal size={14} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(column)}>
          <Pencil size={14} aria-hidden />
          {labels.editColumn}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(column)}>
          <Trash2 size={14} aria-hidden />
          {labels.deleteColumn}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
