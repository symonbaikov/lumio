'use client';

import { BankLogoAvatar } from '@/app/components/BankLogoAvatar';
import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
import { Checkbox } from '@/app/components/ui/checkbox';
import { RotateCcw, Trash2 } from 'lucide-react';
import type React from 'react';

export type TrashListItemModel = {
  id: string;
  fileName: string;
  bankName: string;
  fileType: string;
  deletedAt?: string | null;
  createdAt: string;
};

type Props = {
  item: TrashListItemModel;
  selected: boolean;
  onToggleSelect: () => void;
  onRestore: () => void;
  onDelete: () => void;
  bankDisplayName: string;
  deletedDateLabel: string;
  expiryBadge: React.ReactNode;
  restoreLabel: string;
  deleteLabel: string;
};

export function TrashListItem({
  item,
  selected,
  onToggleSelect,
  onRestore,
  onDelete,
  bankDisplayName,
  deletedDateLabel,
  expiryBadge,
  restoreLabel,
  deleteLabel,
}: Props) {
  return (
    <div className="relative rounded-lg border border-gray-200 bg-white p-4 transition hover:border-primary/30">
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-4">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>

        <div className="w-11 flex items-center justify-center">
          <DocumentTypeIcon
            fileType={item.fileType}
            fileName={item.fileName}
            fileId={item.id}
            source="statement"
            size={36}
            className="text-red-500"
          />
        </div>

        <div className="w-3" />

        <div className="w-20 flex items-center gap-2 text-sm font-medium text-gray-500">
          <span className="uppercase">{item.fileType}</span>
        </div>

        <div className="w-24 text-sm font-medium text-gray-500 tabular-nums">
          {deletedDateLabel}
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-2 text-sm text-gray-900">
          <BankLogoAvatar bankName={item.bankName} size={20} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{item.fileName}</p>
            <p className="truncate text-xs text-gray-500">{bankDisplayName}</p>
          </div>
          {expiryBadge}
        </div>

        <div className="w-36 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onRestore();
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50"
            title={restoreLabel}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {restoreLabel}
          </button>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onDelete();
            }}
            className="inline-flex items-center justify-center rounded-md border border-red-200 p-1.5 text-red-400 transition hover:border-red-400 hover:bg-red-50 hover:text-red-600"
            title={deleteLabel}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
