'use client';

import { BankLogoAvatar } from '@/app/components/BankLogoAvatar';
import { Checkbox } from '@/app/components/ui/checkbox';
import { BriefcaseBusiness, FileText, RotateCcw, Table2, Trash2 } from 'lucide-react';
import type React from 'react';
import type { TrashEntityType } from './trash-utils';

export type TrashListItemModel = {
  id: string;
  fileName: string;
  bankName: string;
  fileType: string;
  entityType?: TrashEntityType;
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
  typeLabel: string;
  deletedAtLabel: string;
  autoDeleteAtLabel: string;
  deletedAtCaption: string;
  autoDeleteAtCaption: string;
  restoreLabel: string;
  deleteLabel: string;
};

const ENTITY_ICON_BY_TYPE: Record<TrashEntityType, React.ComponentType<{ className?: string }>> = {
  statement: FileText,
  table: Table2,
  workspace: BriefcaseBusiness,
};

export function TrashListItem({
  item,
  selected,
  onToggleSelect,
  onRestore,
  onDelete,
  bankDisplayName,
  typeLabel,
  deletedAtLabel,
  autoDeleteAtLabel,
  deletedAtCaption,
  autoDeleteAtCaption,
  restoreLabel,
  deleteLabel,
}: Props) {
  const TypeIcon = ENTITY_ICON_BY_TYPE[item.entityType ?? 'statement'] ?? FileText;

  return (
    <div className="relative rounded-lg border border-gray-200 bg-white p-4 transition hover:border-primary/30">
      <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
        <div className="flex items-start gap-3 md:w-44 md:shrink-0 md:items-center">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <TypeIcon className="h-4 w-4 text-gray-500" />
            <span>{typeLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2 md:w-[440px] md:shrink-0">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {deletedAtCaption}
            </span>
            <span className="tabular-nums">{deletedAtLabel}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {autoDeleteAtCaption}
            </span>
            <span className="tabular-nums">{autoDeleteAtLabel}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-900">
          <BankLogoAvatar bankName={item.bankName} size={20} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{item.fileName}</p>
            {bankDisplayName ? (
              <p className="truncate text-xs text-gray-500">{bankDisplayName}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 md:w-36">
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
