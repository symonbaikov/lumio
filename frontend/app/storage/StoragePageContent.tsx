'use client';

import { useIntlayer, useLocale } from '@/app/i18n';
import { resolveBankLogo } from '@bank-logos';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Popover } from '@mui/material';
import {
  Bookmark,
  Check,
  Download,
  Eye,
  FileText,
  FileX,
  Filter,
  Folder,
  GripVertical,
  Loader2,
  MoreVertical,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Search,
  Share2,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import toast from 'react-hot-toast';
import { BankLogoAvatar } from '../components/BankLogoAvatar';
import ConfirmModal from '../components/ConfirmModal';
import { DocumentTypeIcon } from '../components/DocumentTypeIcon';
import { DropboxStorageWidget } from '../components/DropboxStorageWidget';
import { GoogleDriveStorageWidget } from '../components/GoogleDriveStorageWidget';
import { PDFPreviewModal } from '../components/PDFPreviewModal';
import { Checkbox } from '../components/ui/checkbox';
import { AppPagination } from '../components/ui/pagination';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import api from '../lib/api';

type FileAvailabilityStatus = 'both' | 'disk' | 'db' | 'missing';

type FileAvailability = {
  onDisk: boolean;
  inDb: boolean;
  status: FileAvailabilityStatus;
};

interface TagOption {
  id: string;
  name: string;
  color?: string | null;
  userId?: string | null;
}

interface FolderOption {
  id: string;
  name: string;
  userId?: string | null;
  tagId?: string | null;
  tag?: TagOption | null;
}

interface StorageView {
  id: string;
  name: string;
  filters?: Record<string, any>;
  createdAt: string;
}

interface StorageFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  bankName: string;
  status: string;
  createdAt: string;
  deletedAt?: string | null;
  isOwner: boolean;
  permissionType?: string;
  canReshare: boolean;
  sharedLinksCount: number;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
    isEnabled?: boolean;
  } | null;
  folderId?: string | null;
  folder?: FolderOption | null;
  tags?: TagOption[];
  metadata?: {
    accountNumber?: string;
    periodStart?: string;
    periodEnd?: string;
  };
  fileAvailability?: FileAvailability;
}

interface CategoryOption {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  isEnabled?: boolean;
}

type SortField = 'createdAt' | 'fileName' | 'bankName';
type SortDirection = 'asc' | 'desc';

const NO_FOLDER = '__none__';
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_TRASH_TTL_DAYS = 30;
const FOLDER_NAME_MAX = 40;
const DEFAULT_FILTERS = {
  status: '',
  bank: '',
  categoryId: '',
  ownership: '',
  folderId: '',
};
const DEFAULT_SORT: { field: SortField; direction: SortDirection } = {
  field: 'createdAt',
  direction: 'desc',
};

const getBankDisplayName = (bankName: string) => {
  const resolved = resolveBankLogo(bankName);
  if (!resolved) return bankName;
  return resolved.key !== 'other' ? resolved.displayName : bankName;
};

const getAvailabilityColor = (status: FileAvailabilityStatus) => {
  switch (status) {
    case 'both':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-100 dark:border-green-500/30';
    case 'missing':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-100 dark:border-red-500/30';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60';
  }
};

const getAvailabilityDot = (status: FileAvailabilityStatus) => {
  switch (status) {
    case 'both':
      return 'bg-green-500';
    case 'missing':
      return 'bg-red-500';
    default:
      return 'bg-slate-400';
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

const getTagChipStyle = (tag: TagOption) => {
  if (!tag.color) return undefined;
  return {
    borderColor: tag.color,
    color: tag.color,
  };
};

const truncateFileNameForDisplay = (name: string, maxLength = 15) => {
  if (!name) return '';
  if (name.length <= maxLength) return name;
  const truncated = name.slice(0, Math.max(0, maxLength - 1));
  return `${truncated}…`;
};

const tagChipClass = (isActive: boolean) =>
  `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
    isActive
      ? 'bg-primary/10 text-primary border-primary/30'
      : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-800/60 dark:text-gray-200 dark:border-slate-700/60'
  }`;

interface DraggableModalFileItemProps {
  file: StorageFile;
  canEditFile: (file: StorageFile) => boolean;
  t: any;
}

const DraggableModalFileItem = React.memo(
  ({ file, canEditFile, t }: DraggableModalFileItemProps) => {
    const router = useRouter();
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `modal-file-${file.id}`,
      data: { file },
      disabled: !canEditFile(file),
    });

    return (
      <div className="px-3 py-2">
        <div
          className={`flex items-center gap-1 ${canEditFile(file) ? 'cursor-grab active:cursor-grabbing' : ''}`}
          {...(canEditFile(file) ? { ...attributes, ...listeners } : {})}
        >
          {canEditFile(file) && (
            <div className="text-gray-300 dark:text-slate-600 pointer-events-none">
              <GripVertical size={16} />
            </div>
          )}
          <button
            ref={setNodeRef}
            type="button"
            onClick={() => router.push(`/statements/${file.id}/view`)}
            title={canEditFile(file) ? t.dragDrop.rowHint.value : undefined}
            className={`flex min-w-0 flex-1 items-center gap-3 text-left hover:text-primary ${
              isDragging ? 'opacity-50' : ''
            } ${canEditFile(file) ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            <div className="flex items-center justify-center">
              <DocumentTypeIcon
                fileType={file.fileType}
                fileName={file.fileName}
                fileId={file.id}
                size={32}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {file.fileName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.table.from} {file.bankName}
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  },
);

interface DraggableFileRowProps {
  file: StorageFile;
  isTrashView: boolean;
  selectedTrashIds: string[];
  toggleTrashSelection: (id: string) => void;
  setPreviewFileId: (id: string) => void;
  setPreviewFileName: (name: string) => void;
  setPreviewModalOpen: (open: boolean) => void;
  canEditFile: (file: StorageFile) => boolean;
  truncateFileNameForDisplay: (name: string, max?: number) => string;
  renderTrashExpiryBadge: (date?: string | null) => React.ReactNode;
  renderAvailabilityChip: (availability?: FileAvailability) => React.ReactNode;
  tagChipClass: (isActive: boolean) => string;
  getTagChipStyle: (tag: TagOption) => React.CSSProperties | undefined;
  getBankDisplayName: (name: string) => string;
  formatFileSize: (bytes: number) => string;
  renderStatusBadge: (status: string) => React.ReactNode;
  handleCategoryChange: (fileId: string, categoryId: string) => void;
  categories: CategoryOption[];
  categoriesLoading: boolean;
  t: any;
  getPermissionLabel: (perm?: string | null) => string;
  formatDate: (date: string) => string;
  handleRestoreFromTrash: (file: StorageFile) => void;
  confirmPermanentDelete: (file: StorageFile) => void;
  handleView: (id: string) => void;
  handleDownload: (id: string, name: string) => void;
  confirmDelete: (file: StorageFile) => void;
}

const DraggableFileRow = React.memo(
  ({
    file,
    isTrashView,
    selectedTrashIds,
    toggleTrashSelection,
    setPreviewFileId,
    setPreviewFileName,
    setPreviewModalOpen,
    canEditFile,
    truncateFileNameForDisplay,
    renderTrashExpiryBadge,
    renderAvailabilityChip,
    tagChipClass,
    getTagChipStyle,
    getBankDisplayName,
    formatFileSize,
    renderStatusBadge,
    handleCategoryChange,
    categories,
    categoriesLoading,
    t,
    getPermissionLabel,
    formatDate,
    handleRestoreFromTrash,
    confirmPermanentDelete,
    handleView,
    handleDownload,
    confirmDelete,
  }: DraggableFileRowProps) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `file-${file.id}`,
      data: { file },
      disabled: !canEditFile(file),
    });

    const style = {
      opacity: isDragging ? 0.3 : 1,
    };

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className={`transition-all duration-150 hover:bg-gray-50 dark:hover:bg-slate-700/40 ${isDragging ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      >
        {isTrashView && (
          <td className="px-6 py-5">
            <Checkbox
              checked={selectedTrashIds.includes(file.id)}
              onCheckedChange={() => toggleTrashSelection(file.id)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              aria-label={t.trash.selectRow.value}
            />
          </td>
        )}
        <td className="px-6 py-5">
          <div
            className={`flex items-center gap-1 ${canEditFile(file) ? 'cursor-grab active:cursor-grabbing' : ''}`}
            {...(canEditFile(file) ? { ...attributes, ...listeners } : {})}
            title={canEditFile(file) ? t.dragDrop.rowHint.value : undefined}
          >
            {canEditFile(file) && (
              <div className="p-1 text-gray-300 dark:text-slate-600 pointer-events-none">
                <GripVertical size={20} />
              </div>
            )}
            <button
              className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity duration-200 bg-transparent border-0 p-0"
              onClick={() => {
                setPreviewFileId(file.id);
                setPreviewFileName(file.fileName);
                setPreviewModalOpen(true);
              }}
              title={t.preview.value}
            >
              <DocumentTypeIcon
                fileType={file.fileType}
                fileName={file.fileName}
                fileId={file.id}
                size={40}
                className="text-red-500 dark:text-red-400"
              />
            </button>
            <div className={`min-w-0 flex-1`}>
              <button
                className="text-base font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-transparent border-0 p-0 text-left w-full"
                title={file.fileName}
                onClick={() => {
                  setPreviewFileId(file.id);
                  setPreviewFileName(file.fileName);
                  setPreviewModalOpen(true);
                }}
              >
                {truncateFileNameForDisplay(file.fileName)}
              </button>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-300">
                {file.folder?.name && (
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-300">
                    <Folder className="h-3.5 w-3.5" />
                    {file.folder.name}
                  </span>
                )}
                {isTrashView && renderTrashExpiryBadge(file.deletedAt)}
                {file.sharedLinksCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-300">
                    <Share2 size={12} />
                    {file.sharedLinksCount} {t.sharedLinksShort}
                  </span>
                )}
                {renderAvailabilityChip(file.fileAvailability)}
              </div>
              {file.tags && file.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {file.tags.map(tag => (
                    <span key={tag.id} className={tagChipClass(false)} style={getTagChipStyle(tag)}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </td>

        <td className="px-6 py-5 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <BankLogoAvatar bankName={file.bankName} size={28} />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {getBankDisplayName(file.bankName)}
            </span>
          </div>
        </td>

        <td className="px-6 py-5 whitespace-nowrap">
          <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
            {file.metadata?.accountNumber ? `••••${file.metadata.accountNumber.slice(-4)}` : '—'}
          </span>
        </td>

        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
          {formatFileSize(file.fileSize)}
        </td>

        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
          {renderStatusBadge(file.status)}
        </td>

        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
          <div className="space-y-1">
            <select
              value={file.categoryId || ''}
              onChange={e => handleCategoryChange(file.id, e.target.value)}
              disabled={
                isTrashView ||
                categoriesLoading ||
                (!file.isOwner && file.permissionType !== 'editor')
              }
              className="min-w-40 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-slate-800/60 disabled:text-gray-400 dark:disabled:text-gray-500"
            >
              <option value="">{t.categoryCell.none}</option>
              {categories
                .filter(cat => cat.isEnabled !== false)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
            {file.category?.isEnabled === false ? (
              <p className="text-xs font-medium text-red-600">
                {file.category.name} - choose category
              </p>
            ) : null}
          </div>
        </td>

        <td className="px-6 py-5 whitespace-nowrap text-sm">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              file.isOwner
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-slate-600'
                : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-100 border border-indigo-100 dark:border-indigo-500/30'
            }`}
          >
            {file.isOwner ? t.permission.owner.value : getPermissionLabel(file.permissionType)}
          </span>
        </td>

        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
          <div className="flex flex-col leading-tight">
            <span>
              {formatDate(isTrashView && file.deletedAt ? file.deletedAt : file.createdAt)}
            </span>
          </div>
        </td>

        <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
          <div className="relative inline-flex items-center justify-end gap-1">
            {isTrashView ? (
              <>
                <button
                  onClick={() => handleRestoreFromTrash(file)}
                  className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-200 transition-colors"
                  title={t.trash.restoreAction.value}
                >
                  <RotateCcw size={18} />
                </button>
                <button
                  onClick={() => confirmPermanentDelete(file)}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title={t.trash.deleteAction.value}
                >
                  <Trash2 size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleView(file.id)}
                  className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-emerald-500/20 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
                  title={t.actions.tooltipView.value}
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => handleDownload(file.id, file.fileName)}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors"
                  title={t.actions.tooltipDownload.value}
                >
                  <Download size={18} />
                </button>
                {canEditFile(file) && (
                  <button
                    onClick={() => confirmDelete(file)}
                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title={t.actions.delete.value}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </>
            )}
          </div>
        </td>
      </tr>
    );
  },
);

const DroppableFolderButton = React.memo(
  ({
    folderId,
    isNoFolder,
    active,
    children,
    className,
    onClick,
    onContextMenu,
  }: {
    folderId?: string;
    isNoFolder?: boolean;
    active?: boolean;
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
  }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: isNoFolder ? 'folder-none' : `folder-${folderId}`,
      data: { folderId, isNoFolder },
    });

    // Additional highlight style if dragged over
    const highlightClass = isOver ? 'ring-2 ring-inset ring-primary bg-primary/10' : '';

    return (
      <div ref={setNodeRef} className={`relative rounded-lg ${highlightClass}`} role="presentation">
        <div
          onClick={onClick}
          onContextMenu={onContextMenu}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              onClick?.(e as any);
            }
          }}
          tabIndex={onClick ? 0 : -1}
          role={onClick ? 'button' : 'presentation'}
          className={className}
        >
          {children}
        </div>
      </div>
    );
  },
);

const DroppableHeaderTrigger = ({
  children,
  onDragOver,
}: {
  children: React.ReactNode;
  onDragOver: () => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'header-folders-trigger',
  });

  useEffect(() => {
    if (isOver) {
      const timer = setTimeout(() => {
        onDragOver();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOver, onDragOver]);

  return (
    <div
      ref={setNodeRef}
      className={`relative z-10 transition-all ${
        isOver ? 'ring-2 ring-primary bg-primary/20 scale-105 rounded-full' : ''
      }`}
    >
      {children}
    </div>
  );
};

const getStatusTone = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'completed' || normalized === 'parsed') return 'success';
  if (normalized === 'processing' || normalized === 'uploaded') return 'warning';
  if (normalized === 'error') return 'error';
  return 'default';
};

/**
 * Storage page - displays all files with sharing and permissions
 */
export function StoragePageContent({
  initialList = 'active',
}: {
  initialList?: 'active' | 'trash';
}) {
  const resolveLabel = (value: unknown, fallback: string): string =>
    (value as { value?: string })?.value ?? (value as string) ?? fallback;
  const router = useRouter();
  const t = useIntlayer('storagePage');
  const { locale } = useLocale();
  const PAGE_SIZE = 20;
  const trashTtlDays = useMemo(() => {
    const parsed = Number.parseInt(process.env.NEXT_PUBLIC_STORAGE_TRASH_TTL_DAYS || '', 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return DEFAULT_TRASH_TTL_DAYS;
  }, []);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState<'active' | 'trash'>(
    initialList as 'active' | 'trash',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#4f46e5');
  const [newFolderName, setNewFolderName] = useState('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingTagColor, setEditingTagColor] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [newTagPickerOpen, setNewTagPickerOpen] = useState(false);
  const [newTagAnchorEl, setNewTagAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [editingTagPickerId, setEditingTagPickerId] = useState<string | null>(null);
  const [editingTagAnchorEl, setEditingTagAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [views, setViews] = useState<StorageView[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [viewName, setViewName] = useState('');
  const [viewSaving, setViewSaving] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [stagedFilters, setStagedFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;
  const [activeModal, setActiveModal] = useState<'folders' | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folderFileQuery, setFolderFileQuery] = useState('');
  const [draggingFile, setDraggingFile] = useState<StorageFile | null>(null);
  const [folderDropTargetId, setFolderDropTargetId] = useState<string | null>(null);
  const [folderModalFromDrag, setFolderModalFromDrag] = useState(false);
  const [folderMoveFeedback, setFolderMoveFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const [folderTagPickerId, setFolderTagPickerId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<StorageFile | null>(null);
  const [permanentDeleteModalOpen, setPermanentDeleteModalOpen] = useState(false);
  const [fileToDeletePermanently, setFileToDeletePermanently] = useState<StorageFile | null>(null);
  const [selectedTrashIds, setSelectedTrashIds] = useState<string[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [emptyTrashModalOpen, setEmptyTrashModalOpen] = useState(false);
  const [deleteFolderModalOpen, setDeleteFolderModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderOption | null>(null);
  const [deleteFolderWithContents, setDeleteFolderWithContents] = useState(false);
  const [deleteTagModalOpen, setDeleteTagModalOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagOption | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{
    x: number;
    y: number;
    folder: FolderOption;
  } | null>(null);
  const [pickedFolderId, setPickedFolderId] = useState<string | null>(null);
  const lastWheelTime = useRef<number>(0);

  // PDF Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [gmailStatus, setGmailStatus] = useState<{
    connected?: boolean;
  } | null>(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setGmailLoading(true);
        const resp = await api.get('/integrations/gmail/status');
        if (!mounted) return;
        setGmailStatus(resp.data || null);
      } catch (err) {
        // ignore
      } finally {
        if (mounted) setGmailLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);
  const [selectedStorageProvider, setSelectedStorageProvider] = useState<'google' | 'dropbox'>(
    'google',
  );

  const folderMoveFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTrashView = activeList === 'trash';
  const isFolderActive = activeModal === 'folders';

  useEffect(() => {
    if (!pickedFolderId || activeModal !== 'folders') return;

    const handleWheel = (e: WheelEvent) => {
      // Find the folder list container or check if the event target is inside the modal
      const now = Date.now();
      if (now - lastWheelTime.current < 80) return; // Throttle faster for smoothness

      const idx = folders.findIndex(f => f.id === pickedFolderId);
      if (idx === -1) return;

      if (Math.abs(e.deltaY) < 10) return; // Ignore small movements

      if (e.deltaY > 0) {
        // Move down
        if (idx < folders.length - 1) {
          handleMoveFolderIdx(pickedFolderId, idx + 1, false);
          lastWheelTime.current = now;
        }
      } else if (e.deltaY < 0) {
        // Move up
        if (idx > 0) {
          handleMoveFolderIdx(pickedFolderId, idx - 1, false);
          lastWheelTime.current = now;
        }
      }
    };

    // We use capture to override normal scroll if folder is picked
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [pickedFolderId, folders, activeModal, t]);

  const handleFolderContextMenu = (event: React.MouseEvent, folder: FolderOption) => {
    event.preventDefault();
    setFolderContextMenu({
      x: event.clientX,
      y: event.clientY,
      folder,
    });
  };

  useEffect(() => {
    const handleClickOutside = () => setFolderContextMenu(null);
    if (folderContextMenu) {
      window.addEventListener('click', handleClickOutside);
      window.addEventListener('scroll', handleClickOutside, true);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleClickOutside, true);
    };
  }, [folderContextMenu]);

  useEffect(() => {
    loadCategories();
    loadTags();
    loadFolders();
    loadViews();
  }, []);

  useEffect(() => {
    loadFiles(activeList);
  }, [activeList]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters, sort, activeList]);

  useEffect(() => {
    setSelectedTrashIds([]);
  }, [activeList, searchQuery, filters, sort]);

  useEffect(() => {
    if (!isTrashView) return;
    setSelectedTrashIds(prev => prev.filter(id => files.some(file => file.id === id)));
  }, [files, isTrashView]);

  useLockBodyScroll(activeModal !== null || filterOpen);

  const openModal = (modal: 'folders') => {
    setFilterOpen(false);
    setActiveModal(modal);
    clearFolderMoveFeedback();
    if (modal === 'folders') {
      setActiveFolderId(null);
      setFolderFileQuery('');
      setFolderDropTargetId(null);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setFolderModalFromDrag(false);
    setFolderFileQuery('');
    setActiveFolderId(null);
    setFolderDropTargetId(null);
    setEditingFolderId(null);
    setEditingFolderName('');
    setEditingTagId(null);
    setEditingTagName('');
    setEditingTagColor(null);
    setNewTagPickerOpen(false);
    setEditingTagPickerId(null);
    setFolderTagPickerId(null);
    setFolderModalFromDrag(false);
    clearFolderMoveFeedback();
  };

  const loadFiles = async (listMode: 'active' | 'trash' = activeList) => {
    try {
      setLoading(true);
      const response = await api.get('/storage/files', {
        params: listMode === 'trash' ? { deleted: 'only' } : undefined,
      });
      setFiles(response.data);
    } catch (error) {
      console.error('Failed to load files:', error);
      toast.error(t.toasts.loadFilesFailed.value);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await api.get('/categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error(t.toasts.loadCategoriesFailed.value);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await api.get('/storage/tags');
      setTags(response.data || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
      toast.error(t.toasts.loadTagsFailed.value);
    }
  };

  const loadFolders = async () => {
    try {
      const response = await api.get('/storage/folders');
      setFolders(response.data || []);
    } catch (error) {
      console.error('Failed to load folders:', error);
      toast.error(t.toasts.loadFoldersFailed.value);
    }
  };

  const loadViews = async () => {
    try {
      setViewsLoading(true);
      const response = await api.get('/storage/views');
      setViews(response.data || []);
    } catch (error) {
      console.error('Failed to load views:', error);
      toast.error(t.toasts.loadViewsFailed.value);
    } finally {
      setViewsLoading(false);
    }
  };

  const handleView = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (
      file &&
      (file.status === 'completed' || file.status === 'parsed' || file.status === 'validated')
    ) {
      router.push(`/statements/${fileId}/edit`);
    } else {
      router.push(`/storage/${fileId}`);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await api.get(`/storage/files/${fileId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t.toasts.downloaded.value);
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error(t.toasts.downloadFailed.value);
    }
  };

  const handleCategoryChange = async (fileId: string, categoryId: string) => {
    try {
      const response = await api.patch(`/storage/files/${fileId}/category`, {
        categoryId: categoryId || null,
      });

      setFiles(prev =>
        prev.map(file =>
          file.id === fileId
            ? {
                ...file,
                categoryId: response.data?.categoryId ?? null,
                category: response.data?.category ?? null,
              }
            : file,
        ),
      );
      toast.success(t.toasts.categoryUpdated.value);
    } catch (error) {
      console.error('Failed to update file category:', error);
      toast.error(t.toasts.categoryUpdateFailed.value);
    }
  };

  const canEditFile = useCallback(
    (file: StorageFile) => !file.deletedAt && (file.isOwner || file.permissionType === 'editor'),
    [],
  );
  const canEditFolder = (folder: FolderOption) => folder.userId !== null;
  const canEditTag = (tag: TagOption) => tag.userId !== null;
  const clampFolderName = (value: string, previous: string) => {
    if (value.length <= FOLDER_NAME_MAX) return value;
    if (previous.length <= FOLDER_NAME_MAX) {
      toast.error(t.folders.nameTooLong.value);
    }
    return value.slice(0, FOLDER_NAME_MAX);
  };

  const clearFolderMoveFeedback = () => {
    if (folderMoveFeedbackTimeout.current) {
      clearTimeout(folderMoveFeedbackTimeout.current);
      folderMoveFeedbackTimeout.current = null;
    }
    setFolderMoveFeedback(null);
  };

  const setFolderMoveMessage = (tone: 'success' | 'error', message: string) => {
    clearFolderMoveFeedback();
    setFolderMoveFeedback({ tone, message });
    folderMoveFeedbackTimeout.current = setTimeout(() => {
      setFolderMoveFeedback(null);
      folderMoveFeedbackTimeout.current = null;
    }, 3500);
  };

  const sensors = useSensors(
    useSensor(
      PointerSensor,
      useMemo(
        () => ({
          activationConstraint: {
            distance: 8,
          },
        }),
        [],
      ),
    ),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const file = active.data.current?.file as StorageFile;
    if (file) {
      setDraggingFile(file);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setDraggingFile(null);
      return;
    }

    const file = active.data.current?.file as StorageFile;
    const folderId = over.data.current?.folderId;
    const isNoFolder = over.data.current?.isNoFolder;

    if (file && (folderId || isNoFolder)) {
      const targetFolderId = isNoFolder ? NO_FOLDER : folderId;
      if (file.folderId !== targetFolderId) {
        if (isNoFolder) {
          handleMoveToFolder(file.id, null); // Move to "No folder" aka root
        } else {
          handleMoveToFolder(file.id, folderId);
        }
      }
    }

    setDraggingFile(null);
    if (folderModalFromDrag) {
      closeModal();
    }
  };

  const handleMoveToFolder = async (fileId: string, folderId: string | null) => {
    try {
      await api.patch(`/storage/files/${fileId}/folder`, {
        folderId,
      });
      setFiles(prev =>
        prev.map(file =>
          file.id === fileId
            ? {
                ...file,
                folderId,
                folder: folderId ? (folders.find(folder => folder.id === folderId) ?? null) : null,
              }
            : file,
        ),
      );
      const folderName = folderId ? folders.find(f => f.id === folderId)?.name : null;
      const message = folderName
        ? `${(t.toasts as any).fileMovedTo.value} "${folderName}"`
        : t.toasts.folderUpdated.value;

      toast.success(message);
      setFolderMoveMessage('success', message);
    } catch (error) {
      console.error('Failed to move file to folder:', error);
      toast.error(t.toasts.folderUpdateFailed.value);
      setFolderMoveMessage('error', t.toasts.folderUpdateFailed.value);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      toast.error(t.toasts.folderNameRequired.value);
      return;
    }
    if (name.length > FOLDER_NAME_MAX) {
      toast.error(t.folders.nameTooLong.value);
      return;
    }
    try {
      const response = await api.post('/storage/folders', { name });
      setFolders(prev => [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFolderName('');
      toast.success(t.toasts.folderCreated.value);
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error(t.toasts.folderCreateFailed.value);
    }
  };

  const handleStartEditFolder = (folder: FolderOption) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
    setFolderTagPickerId(null);
  };

  const handleRenameFolder = async (folderId: string) => {
    const name = editingFolderName.trim();
    if (!name) {
      toast.error(t.toasts.folderNameRequired.value);
      return;
    }
    if (name.length > FOLDER_NAME_MAX) {
      toast.error(t.folders.nameTooLong.value);
      return;
    }
    try {
      const response = await api.patch(`/storage/folders/${folderId}`, {
        name,
      });
      setFolders(prev =>
        prev.map(folder => (folder.id === folderId ? { ...folder, ...response.data } : folder)),
      );
      setFiles(prev =>
        prev.map(file =>
          file.folderId === folderId
            ? {
                ...file,
                folder: file.folder
                  ? { ...file.folder, name: response.data?.name || name }
                  : { id: folderId, name: response.data?.name || name },
              }
            : file,
        ),
      );
      setEditingFolderId(null);
      setEditingFolderName('');
      toast.success(t.toasts.folderRenamed.value);
    } catch (error) {
      console.error('Failed to rename folder:', error);
      toast.error(t.toasts.folderRenameFailed.value);
    }
  };

  const handleCancelEditFolder = () => {
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const handleUpdateFolderTag = async (folderId: string, tagId: string | null) => {
    try {
      const response = await api.patch(`/storage/folders/${folderId}`, {
        tagId,
      });
      setFolders(prev =>
        prev.map(folder => (folder.id === folderId ? { ...folder, ...response.data } : folder)),
      );
      setFolderTagPickerId(null);
    } catch (error) {
      console.error('Failed to update folder tag:', error);
      toast.error(t.toasts.folderTagUpdateFailed.value);
    }
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) {
      toast.error(t.toasts.tagNameRequired.value);
      return;
    }
    try {
      const payload = { name, color: newTagColor || undefined };
      const response = await api.post('/storage/tags', payload);
      setTags(prev => [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTagName('');
      toast.success(t.toasts.tagCreated.value);
    } catch (error) {
      console.error('Failed to create tag:', error);
      toast.error(t.toasts.tagCreateFailed.value);
    }
  };

  const handleStartEditTag = (tag: TagOption) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setEditingTagColor(tag.color ?? '#4f46e5');
    setEditingTagPickerId(null);
  };

  const handleRenameTag = async (tagId: string) => {
    const name = editingTagName.trim();
    if (!name) {
      toast.error(t.toasts.tagNameRequired.value);
      return;
    }
    try {
      const response = await api.patch(`/storage/tags/${tagId}`, {
        name,
        color: editingTagColor,
      });
      setTags(prev => prev.map(tag => (tag.id === tagId ? { ...tag, ...response.data } : tag)));
      setFolders(prev =>
        prev.map(folder =>
          folder.tagId === tagId || folder.tag?.id === tagId
            ? {
                ...folder,
                tag: response.data?.id
                  ? { ...folder.tag, ...response.data }
                  : { ...folder.tag, name, color: editingTagColor },
              }
            : folder,
        ),
      );
      setFiles(prev =>
        prev.map(file => ({
          ...file,
          tags: (file.tags || []).map(tag =>
            tag.id === tagId
              ? {
                  ...tag,
                  name: response.data?.name || name,
                  color: response.data?.color ?? editingTagColor ?? null,
                }
              : tag,
          ),
        })),
      );
      setEditingTagId(null);
      setEditingTagName('');
      setEditingTagColor(null);
      toast.success(t.toasts.tagRenamed.value);
    } catch (error) {
      console.error('Failed to rename tag:', error);
      toast.error(t.toasts.tagRenameFailed.value);
    }
  };

  const handleCancelEditTag = () => {
    setEditingTagId(null);
    setEditingTagName('');
    setEditingTagColor(null);
    setEditingTagPickerId(null);
  };

  const confirmDeleteTag = (tag: TagOption) => {
    setTagToDelete(tag);
    setDeleteTagModalOpen(true);
  };

  const handleDeleteTag = async () => {
    if (!tagToDelete) return;
    const toastId = toast.loading(t.toasts.tagDeleteLoading.value);
    try {
      await api.delete(`/storage/tags/${tagToDelete.id}`);
      setTags(prev => prev.filter(tag => tag.id !== tagToDelete.id));
      // Remove tag from folders
      setFolders(prev =>
        prev.map(folder =>
          folder.tagId === tagToDelete.id ? { ...folder, tagId: null, tag: null } : folder,
        ),
      );
      // Remove tag from files
      setFiles(prev =>
        prev.map(file => ({
          ...file,
          tags: (file.tags || []).filter(tag => tag.id !== tagToDelete.id),
        })),
      );
      toast.success(t.toasts.tagDeleted.value, { id: toastId });
    } catch (error) {
      console.error('Failed to delete tag:', error);
      toast.error(t.toasts.tagDeleteFailed.value, { id: toastId });
    } finally {
      setTagToDelete(null);
      setDeleteTagModalOpen(false);
    }
  };

  const confirmDelete = (file: StorageFile) => {
    setFileToDelete(file);
    setDeleteModalOpen(true);
  };

  const confirmPermanentDelete = (file: StorageFile) => {
    setFileToDeletePermanently(file);
    setPermanentDeleteModalOpen(true);
  };

  const closeDeleteFolderModal = () => {
    setDeleteFolderModalOpen(false);
    setFolderToDelete(null);
    setDeleteFolderWithContents(false);
  };

  const confirmDeleteFolder = (folder: FolderOption) => {
    setFolderToDelete(folder);
    setDeleteFolderWithContents(false);
    setDeleteFolderModalOpen(true);
    setFolderTagPickerId(null);
  };

  const handleDeleteFolder = async () => {
    const targetFolder = folderToDelete;
    const removeContents = deleteFolderWithContents;
    if (!targetFolder) return;
    const toastId = toast.loading(t.toasts.folderDeleteLoading.value);
    try {
      await api.delete(`/storage/folders/${targetFolder.id}`, {
        params: { deleteFiles: removeContents },
      });
      setFolders(prev => prev.filter(folder => folder.id !== targetFolder.id));
      if (removeContents) {
        setFiles(prev => prev.filter(file => file.folderId !== targetFolder.id));
      } else {
        setFiles(prev =>
          prev.map(file =>
            file.folderId === targetFolder.id ? { ...file, folderId: null, folder: null } : file,
          ),
        );
      }
      if (activeFolderId === targetFolder.id) {
        setActiveFolderId('');
      }
      if (editingFolderId === targetFolder.id) {
        setEditingFolderId(null);
        setEditingFolderName('');
      }
      if (folderTagPickerId === targetFolder.id) {
        setFolderTagPickerId(null);
      }
      toast.success(t.toasts.folderDeleted.value, { id: toastId });
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error(t.toasts.folderDeleteFailed.value, { id: toastId });
    }
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    const toastId = toast.loading(t.delete.loading.value);
    try {
      await api.post(`/storage/files/${fileToDelete.id}/trash`);
      setFiles(prev => prev.filter(file => file.id !== fileToDelete.id));
      toast.success(t.delete.success.value, { id: toastId });
    } catch (error) {
      console.error('Failed to move file to trash:', error);
      toast.error(t.delete.error.value, { id: toastId });
    }
    setFileToDelete(null);
  };

  const handleRestoreFromTrash = async (file: StorageFile) => {
    const toastId = toast.loading(t.trash.restoreLoading.value);
    try {
      await api.post(`/storage/files/${file.id}/trash/restore`);
      setFiles(prev => prev.filter(item => item.id !== file.id));
      toast.success(t.trash.restoreSuccess.value, { id: toastId });
    } catch (error) {
      console.error('Failed to restore file from trash:', error);
      toast.error(t.trash.restoreFailed.value, { id: toastId });
    }
  };

  const handleMoveFolderIdx = (fromId: string, toIdx: number, finalize = true) => {
    const fromIdx = folders.findIndex(f => f.id === fromId);
    if (fromIdx === -1) return;
    const newFolders = [...folders];
    const [movedFolder] = newFolders.splice(fromIdx, 1);
    newFolders.splice(toIdx, 0, movedFolder);
    setFolders(newFolders);
    if (finalize) {
      setPickedFolderId(null);
      toast.success(t.toasts.folderUpdated.value);
    }
  };

  const handlePermanentDelete = async () => {
    if (!fileToDeletePermanently) return;
    const toastId = toast.loading(t.trash.deleteLoading.value);
    try {
      await api.delete(`/storage/files/${fileToDeletePermanently.id}/trash`);
      setFiles(prev => prev.filter(file => file.id !== fileToDeletePermanently.id));
      toast.success(t.trash.deleteSuccess.value, { id: toastId });
    } catch (error) {
      console.error('Failed to permanently delete file:', error);
      toast.error(t.trash.deleteFailed.value, { id: toastId });
    }
    setFileToDeletePermanently(null);
  };

  const handleBulkRestore = async (ids = selectedTrashIds) => {
    if (!ids.length) return;
    const toastId = toast.loading(t.trash.restoreLoading.value);
    try {
      await api.post('/storage/files/trash/bulk/restore', {
        statementIds: ids,
      });
      setFiles(prev => prev.filter(file => !ids.includes(file.id)));
      setSelectedTrashIds([]);
      toast.success(t.trash.restoreSuccess.value, { id: toastId });
    } catch (error) {
      console.error('Failed to restore files from trash:', error);
      toast.error(t.trash.restoreFailed.value, { id: toastId });
    }
  };

  const handleBulkDeleteFromTrash = async (ids = selectedTrashIds) => {
    if (!ids.length) return;
    const toastId = toast.loading(t.trash.deleteLoading.value);
    try {
      await api.post('/storage/files/bulk/trash/delete', {
        statementIds: ids,
      });
      setFiles(prev => prev.filter(file => !ids.includes(file.id)));
      setSelectedTrashIds([]);
      toast.success(t.trash.deleteSuccess.value, { id: toastId });
    } catch (error) {
      console.error('Failed to delete files from trash:', error);
      toast.error(t.trash.deleteFailed.value, { id: toastId });
    }
  };

  const handleEmptyTrash = async () => {
    const ids = files.map(file => file.id);
    await handleBulkDeleteFromTrash(ids);
  };

  const handleSortChange = (value: string) => {
    const [field, direction] = value.split(':') as [SortField, SortDirection];
    if (!field || !direction) return;
    setSort({ field, direction });
    setActiveViewId(null);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setActiveViewId(null);
  };

  const handleListChange = (next: 'active' | 'trash') => {
    setActiveList(next);
    setFilterOpen(false);
  };

  const applyView = (view: StorageView) => {
    const storedFilters = view.filters ?? {};
    const rawFilters = (storedFilters.filters ?? {}) as Record<string, any>;
    const { tagIds: _tagIds, ...restFilters } = rawFilters;
    const nextFilters = {
      ...DEFAULT_FILTERS,
      ...restFilters,
    };
    setFilters(nextFilters);
    setStagedFilters(nextFilters);
    setSearchQuery(storedFilters.searchQuery ?? storedFilters.search ?? '');
    setSort({
      field: storedFilters.sort?.field ?? DEFAULT_SORT.field,
      direction: storedFilters.sort?.direction ?? DEFAULT_SORT.direction,
    });
    setActiveViewId(view.id);
  };

  const handleSaveView = async () => {
    const name = viewName.trim();
    if (!name) {
      toast.error(t.toasts.viewNameRequired.value);
      return;
    }
    try {
      setViewSaving(true);
      const response = await api.post('/storage/views', {
        name,
        filters: {
          searchQuery,
          filters: filterOpen ? stagedFilters : filters,
          sort,
        },
      });
      setViews(prev => [response.data, ...prev]);
      setViewName('');
      setActiveViewId(response.data?.id ?? null);
      toast.success(t.toasts.viewSaved.value);
    } catch (error) {
      console.error('Failed to save view:', error);
      toast.error(t.toasts.viewSaveFailed.value);
    } finally {
      setViewSaving(false);
    }
  };

  const handleDeleteView = async (viewId: string) => {
    try {
      await api.delete(`/storage/views/${viewId}`);
      setViews(prev => prev.filter(view => view.id !== viewId));
      if (activeViewId === viewId) {
        setActiveViewId(null);
      }
      toast.success(t.toasts.viewDeleted.value);
    } catch (error) {
      console.error('Failed to delete view:', error);
      toast.error(t.toasts.viewDeleteFailed.value);
    }
  };
  const formatDate = useCallback(
    (dateString: string): string => {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString(
        locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      );
    },
    [locale],
  );

  const getTrashExpiryInfo = useCallback(
    (deletedAt?: string | null) => {
      if (!deletedAt) return null;
      const deletedDate = new Date(deletedAt);
      if (Number.isNaN(deletedDate.getTime())) return null;
      const expiresAt = new Date(deletedDate.getTime() + trashTtlDays * MS_PER_DAY);
      const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / MS_PER_DAY);
      return { expiresAt, daysLeft };
    },
    [trashTtlDays],
  );

  const renderTrashExpiryBadge = useCallback(
    (deletedAt?: string | null) => {
      const info = getTrashExpiryInfo(deletedAt);
      if (!info) return null;
      const daysLeft = info.daysLeft;
      const isExpired = daysLeft <= 0;
      const isSoon = daysLeft <= 3;
      const label = isExpired
        ? t.trash.expiresToday.value
        : t.trash.expiresIn.value.replace('{days}', String(daysLeft));
      const toneClass = isExpired
        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-100 dark:border-red-500/30'
        : isSoon
          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:border-amber-500/30'
          : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60';
      return (
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}
          title={info.expiresAt.toLocaleDateString(
            locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
          )}
        >
          {label}
        </span>
      );
    },
    [getTrashExpiryInfo, locale, t],
  );

  const getStatusLabel = useCallback(
    (status: string) => {
      switch (status.toLowerCase()) {
        case 'completed':
          return t.statusLabels.completed.value;
        case 'processing':
          return t.statusLabels.processing.value;
        case 'error':
          return t.statusLabels.error.value;
        case 'uploaded':
          return t.statusLabels.uploaded.value;
        case 'parsed':
          return t.statusLabels.parsed.value;
        default:
          return status;
      }
    },
    [t],
  );

  const getPermissionLabel = useCallback(
    (permission?: string | null) => {
      switch ((permission || '').toLowerCase()) {
        case 'owner':
          return t.permission.owner.value;
        case 'editor':
          return t.permission.editor.value;
        case 'viewer':
          return t.permission.viewer.value;
        case 'downloader':
          return t.permission.downloader.value;
        default:
          return t.permission.access.value;
      }
    },
    [t],
  );

  const bankOptions = useMemo(
    () => Array.from(new Set(files.map(f => f.bankName).filter(Boolean))),
    [files],
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(files.map(f => f.status).filter(Boolean))),
    [files],
  );
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let noFolder = 0;
    for (const file of files) {
      if (file.folderId) {
        counts[file.folderId] = (counts[file.folderId] || 0) + 1;
      } else {
        noFolder += 1;
      }
    }
    return { counts, noFolder };
  }, [files]);
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const file of files) {
      for (const tag of file.tags || []) {
        counts[tag.id] = (counts[tag.id] || 0) + 1;
      }
    }
    return counts;
  }, [files]);

  const getAvailabilityLabel = useCallback(
    (status: FileAvailabilityStatus) => {
      switch (status) {
        case 'both':
          return t.availability.labels.both;
        case 'disk':
          return t.availability.labels.disk;
        case 'db':
          return t.availability.labels.db;
        case 'missing':
          return t.availability.labels.missing;
        default:
          return status;
      }
    },
    [t],
  );

  const getAvailabilityTooltip = useCallback(
    (status: FileAvailabilityStatus) => {
      switch (status) {
        case 'both':
          return t.availability.tooltips.both.value;
        case 'disk':
          return t.availability.tooltips.disk.value;
        case 'db':
          return t.availability.tooltips.db.value;
        case 'missing':
          return t.availability.tooltips.missing.value;
        default:
          return status;
      }
    },
    [t],
  );

  const renderAvailabilityChip = useCallback(
    (availability?: FileAvailability) => {
      if (!availability) return null;
      const status = availability.status;
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getAvailabilityColor(status)}`}
          title={getAvailabilityTooltip(status)}
        >
          <span className={`h-2 w-2 rounded-full ${getAvailabilityDot(status)}`} />
          {getAvailabilityLabel(status)}
        </span>
      );
    },
    [getAvailabilityTooltip, getAvailabilityLabel],
  );

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const isDeleted = !!file.deletedAt;
      if (isTrashView ? !isDeleted : isDeleted) {
        return false;
      }
      const normalizedBank = (file.bankName || '').toLowerCase();
      const normalizedCategoryName = (file.category?.name || '').toLowerCase();
      const normalizedAccount = (file.metadata?.accountNumber || '').toLowerCase();
      const normalizedTags = (file.tags || []).map(tag => tag.name.toLowerCase()).join(' ');

      const matchesSearch =
        file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        normalizedBank.includes(searchQuery.toLowerCase()) ||
        normalizedAccount.includes(searchQuery.toLowerCase()) ||
        normalizedCategoryName.includes(searchQuery.toLowerCase()) ||
        normalizedTags.includes(searchQuery.toLowerCase());

      const matchesStatus = !filters.status || file.status === filters.status;
      const matchesBank = !filters.bank || file.bankName === filters.bank;
      const matchesCategory = !filters.categoryId || file.categoryId === filters.categoryId;
      const matchesOwnership =
        !filters.ownership || (filters.ownership === 'owned' ? file.isOwner : !file.isOwner);
      const matchesFolder = filters.folderId
        ? filters.folderId === NO_FOLDER
          ? !file.folderId
          : file.folderId === filters.folderId
        : true;
      return (
        matchesSearch &&
        matchesStatus &&
        matchesBank &&
        matchesCategory &&
        matchesOwnership &&
        matchesFolder
      );
    });
  }, [files, isTrashView, searchQuery, filters]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      const multiplier = sort.direction === 'asc' ? 1 : -1;
      switch (sort.field) {
        case 'fileName':
          return a.fileName.localeCompare(b.fileName, locale) * multiplier;
        case 'bankName':
          return a.bankName.localeCompare(b.bankName, locale) * multiplier;
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * multiplier;
      }
    });
  }, [filteredFiles, sort, locale]);

  const totalItems = sortedFiles.length;
  const totalPagesCount = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize) || 1),
    [totalItems, pageSize],
  );
  const currentPage = Math.min(page, totalPagesCount);
  const rangeStart = useMemo(
    () => (totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1),
    [totalItems, currentPage, pageSize],
  );
  const rangeEnd = useMemo(
    () => (totalItems === 0 ? 0 : Math.min(totalItems, currentPage * pageSize)),
    [totalItems, currentPage, pageSize],
  );

  const paginatedFiles = useMemo(
    () => sortedFiles.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedFiles, currentPage, pageSize],
  );
  const selectableTrashIds = useMemo(
    () => (isTrashView ? filteredFiles.map(file => file.id) : []),
    [filteredFiles, isTrashView],
  );
  const selectedTrashIdsInView = useMemo(
    () => selectedTrashIds.filter(id => selectableTrashIds.includes(id)),
    [selectedTrashIds, selectableTrashIds],
  );
  const allTrashSelected =
    selectableTrashIds.length > 0 && selectedTrashIdsInView.length === selectableTrashIds.length;
  const selectedTrashCount = selectedTrashIds.length;
  const folderModalFiles = useMemo(() => {
    const query = folderFileQuery.trim().toLowerCase();
    return files.filter(file => {
      const matchesFolder =
        activeFolderId === ''
          ? true
          : activeFolderId === NO_FOLDER
            ? !file.folderId
            : file.folderId === activeFolderId;
      if (!matchesFolder) return false;

      if (!query) return true;

      const fileName = file.fileName.toLowerCase();
      const bankName = file.bankName.toLowerCase();
      const folderName = (file.folder?.name || '').toLowerCase();
      const tagNames = (file.tags || []).map(tag => tag.name.toLowerCase()).join(' ');

      return (
        fileName.includes(query) ||
        bankName.includes(query) ||
        folderName.includes(query) ||
        tagNames.includes(query)
      );
    });
  }, [files, folderFileQuery, activeFolderId]);
  const activeFolderLabel = useMemo(() => {
    if (activeFolderId === '') return t.folders.all;
    if (activeFolderId === NO_FOLDER) return t.folders.none;
    return folders.find(folder => folder.id === activeFolderId)?.name ?? t.folders.all;
  }, [activeFolderId, folders, t]);

  const toggleTrashSelection = (fileId: string) => {
    setSelectedTrashIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId],
    );
  };

  const toggleSelectAllTrash = () => {
    if (allTrashSelected) {
      setSelectedTrashIds([]);
      return;
    }
    setSelectedTrashIds(selectableTrashIds);
  };

  useEffect(() => {
    if (page > totalPagesCount) {
      setPage(totalPagesCount);
    }
  }, [page, totalPagesCount]);

  useEffect(() => {
    if (filterOpen) {
      setStagedFilters(filters);
    }
  }, [filterOpen, filters]);

  const handleFilterChange = (field: keyof typeof DEFAULT_FILTERS, value: string) => {
    setStagedFilters(prev => ({ ...prev, [field]: value }));
    setActiveViewId(null);
  };

  const handleResetFilters = () => {
    setStagedFilters({ ...DEFAULT_FILTERS });
    setActiveViewId(null);
  };

  const handleApplyFilters = () => {
    setFilters(stagedFilters);
    setActiveViewId(null);
    setFilterOpen(false);
  };

  const filtersApplied =
    !!filters.status ||
    !!filters.bank ||
    !!filters.categoryId ||
    !!filters.ownership ||
    !!filters.folderId;
  const sortKey = `${sort.field}:${sort.direction}`;
  const emptyStateTitle = isTrashView ? t.trash.empty.title : t.empty.title;
  const emptyStateSubtitle = isTrashView ? t.trash.empty.subtitle : t.empty.subtitle;
  const paginationLabels = {
    shown: resolveLabel((t as any)?.pagination?.shown, 'Showing {from}–{to} of {count}'),
    previous: resolveLabel((t as any)?.pagination?.previous, 'Previous'),
    next: resolveLabel((t as any)?.pagination?.next, 'Next'),
    pageOf: resolveLabel((t as any)?.pagination?.pageOf, 'Page {page} of {count}'),
  };
  const formatPaginationLabel = (template: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce(
      (result, [key, value]) => result.replace(`{${key}}`, String(value)),
      template,
    );
  const tagChipClass = (isActive: boolean) =>
    `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
      isActive
        ? 'bg-primary/10 text-primary border-primary/30'
        : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-800/60 dark:text-gray-200 dark:border-slate-700/60'
    }`;
  const listToggleClass = (isActive: boolean) =>
    `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      isActive
        ? 'bg-primary/10 text-primary border-primary/30'
        : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-slate-700/60 hover:bg-gray-50 dark:hover:bg-slate-800'
    }`;
  const renderStatusBadge = useCallback(
    (status: string) => {
      const tone = getStatusTone(status);
      const toneClass =
        tone === 'success'
          ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-100 dark:border-green-500/30'
          : tone === 'warning'
            ? 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-amber-500/10 dark:text-amber-100 dark:border-amber-500/30'
            : tone === 'error'
              ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-100 dark:border-red-500/30'
              : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800/70 dark:text-gray-100 dark:border-slate-700/60';

      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              tone === 'success'
                ? 'bg-green-500'
                : tone === 'warning'
                  ? 'bg-yellow-500'
                  : tone === 'error'
                    ? 'bg-red-500'
                    : 'bg-gray-400'
            }`}
          />
          {getStatusLabel(status)}
        </span>
      );
    },
    [getStatusLabel],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-8">
        {!isTrashView && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700/60 p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Folder className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
              </div>
              <p className="text-gray-500 dark:text-gray-300">{t.subtitle}</p>
            </div>
            <div className="flex w-full flex-col gap-3 md:w-auto">
              <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto relative">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-700/60 bg-gray-50 dark:bg-slate-900 p-1">
                    <div className="relative">
                      <DroppableHeaderTrigger
                        onDragOver={() => {
                          if (activeModal !== 'folders') {
                            setFolderModalFromDrag(true);
                            openModal('folders');
                          }
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setFolderModalFromDrag(false);
                            openModal('folders');
                          }}
                          disabled={isTrashView}
                          className={`${listToggleClass(isFolderActive)} ${
                            draggingFile
                              ? 'ring-2 ring-primary/30 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                              : ''
                          }`}
                          title={t.folders.title.value}
                        >
                          <Folder className="h-4 w-4" />
                          {t.folders.title}
                        </button>
                      </DroppableHeaderTrigger>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleListChange('active')}
                      className={listToggleClass(!isTrashView)}
                    >
                      <FileText className="h-4 w-4" />
                      {t.tabs.all}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleListChange('trash')}
                      className={listToggleClass(isTrashView)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t.tabs.trash}
                    </button>
                  </div>
                </div>
                <div className="relative w-full md:w-80" data-tour-id="file-search">
                  <Search className="h-4 w-4 text-gray-400 dark:text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder={t.searchPlaceholder.value}
                    aria-label={t.searchFiles.value}
                    className="w-full rounded-full border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="relative w-full md:w-56">
                  <select
                    value={sortKey}
                    onChange={e => handleSortChange(e.target.value)}
                    className="w-full rounded-full border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 py-2.5 pl-4 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="createdAt:desc">{t.sort.newest}</option>
                    <option value="createdAt:asc">{t.sort.oldest}</option>
                    <option value="fileName:asc">{t.sort.nameAsc}</option>
                    <option value="fileName:desc">{t.sort.nameDesc}</option>
                    <option value="bankName:asc">{t.sort.bankAsc}</option>
                    <option value="bankName:desc">{t.sort.bankDesc}</option>
                  </select>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setFilterOpen(true)}
                    data-tour-id="filters-button"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                  >
                    <Filter className="-ml-1 mr-2 h-5 w-5" />
                    {t.filters.button}
                    {filtersApplied && <span className="ml-2 h-2 w-2 rounded-full bg-white" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex rounded-full bg-gray-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setSelectedStorageProvider('google')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedStorageProvider === 'google'
                    ? 'bg-white dark:bg-slate-700 shadow-sm'
                    : 'bg-transparent'
                }`}
              >
                <Image
                  src="/icons/google-drive-icon.png"
                  alt="Google Drive"
                  width={18}
                  height={18}
                />
                <span className="whitespace-nowrap">Google Drive</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStorageProvider('dropbox')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedStorageProvider === 'dropbox'
                    ? 'bg-white dark:bg-slate-700 shadow-sm'
                    : 'bg-transparent'
                }`}
              >
                <Image src="/icons/dropbox-icon.png" alt="Dropbox" width={18} height={18} />
                <span className="whitespace-nowrap">Dropbox</span>
              </button>
            </div>
          </div>

          {selectedStorageProvider === 'google' ? (
            <GoogleDriveStorageWidget locale={locale} />
          ) : (
            <DropboxStorageWidget locale={locale} />
          )}
        </div>
        )
        {!isTrashView && (
          <div className="rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg flex items-center justify-center">
                  <Image src="/icons/gmail.png" alt="Gmail" width={20} height={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Gmail Receipts</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Auto-imported receipts from Gmail
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {/** View button disabled when Gmail not connected */}
                <button
                  onClick={() => router.push('/statements')}
                  disabled={!(gmailStatus?.connected === true) || gmailLoading}
                  aria-disabled={!(gmailStatus?.connected === true) || gmailLoading}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    gmailStatus?.connected === true && !gmailLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-600 text-white opacity-50 cursor-not-allowed'
                  }`}
                >
                  {(t as any).gmail?.viewReceipts ?? 'View Receipts'}
                </button>

                <button
                  onClick={() => router.push('/integrations/gmail')}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {gmailStatus?.connected === true
                    ? ((t as any).gmail?.settings ?? 'Settings')
                    : ((t as any).gmail?.connect ?? 'Connect')}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700/60 overflow-visible">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700/60 bg-gray-50 dark:bg-slate-900 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isTrashView ? t.trash.title : t.subtitle}
              </h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {isTrashView && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t.trash.selectedLabel.value.replace('{count}', String(selectedTrashCount))}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBulkRestore()}
                      disabled={selectedTrashCount === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw size={14} />
                      {t.trash.restoreSelected.value}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkDeleteModalOpen(true)}
                      disabled={selectedTrashCount === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-100 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} />
                      {t.trash.deleteSelected.value}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmptyTrashModalOpen(true)}
                      disabled={files.length === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} />
                      {t.trash.emptyAction.value}
                    </button>
                  </div>
                )}
                {filtersApplied && (
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t.filters.title} · {t.filters.button}
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  {isTrashView ? <Trash2 className="h-8 w-8" /> : <Search className="h-8 w-8" />}
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {emptyStateTitle}
                </h3>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{emptyStateSubtitle}</p>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700/60">
                  <thead className="bg-gray-50 dark:bg-slate-800/40">
                    <tr>
                      {isTrashView && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                          <Checkbox
                            checked={allTrashSelected}
                            indeterminate={
                              selectedTrashIdsInView.length > 0 &&
                              selectedTrashIdsInView.length < selectableTrashIds.length
                            }
                            onCheckedChange={toggleSelectAllTrash}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            aria-label={t.trash.selectAll.value}
                          />
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.fileName}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.bank}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.account}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.size}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.status}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.category}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.access}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {isTrashView ? t.table.deletedAt : t.table.createdAt}
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                        {t.table.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700/60">
                    {paginatedFiles.map(file => (
                      <DraggableFileRow
                        key={file.id}
                        file={file}
                        isTrashView={isTrashView}
                        selectedTrashIds={selectedTrashIds}
                        toggleTrashSelection={toggleTrashSelection}
                        setPreviewFileId={setPreviewFileId}
                        setPreviewFileName={setPreviewFileName}
                        setPreviewModalOpen={setPreviewModalOpen}
                        canEditFile={canEditFile}
                        truncateFileNameForDisplay={truncateFileNameForDisplay}
                        renderTrashExpiryBadge={renderTrashExpiryBadge}
                        renderAvailabilityChip={renderAvailabilityChip}
                        tagChipClass={tagChipClass}
                        getTagChipStyle={getTagChipStyle}
                        getBankDisplayName={getBankDisplayName}
                        formatFileSize={formatFileSize}
                        renderStatusBadge={renderStatusBadge}
                        handleCategoryChange={handleCategoryChange}
                        categories={categories}
                        categoriesLoading={categoriesLoading}
                        t={t}
                        getPermissionLabel={getPermissionLabel}
                        formatDate={formatDate}
                        handleRestoreFromTrash={handleRestoreFromTrash}
                        confirmPermanentDelete={confirmPermanentDelete}
                        handleView={handleView}
                        handleDownload={handleDownload}
                        confirmDelete={confirmDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 border-t border-gray-200"
              data-tour-id="pagination"
            >
              <div className="text-sm text-gray-600">
                {totalItems === 0
                  ? emptyStateTitle
                  : formatPaginationLabel(paginationLabels.shown, {
                      from: rangeStart,
                      to: rangeEnd,
                      count: totalItems,
                    })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 min-w-[120px] text-center">
                  {formatPaginationLabel(paginationLabels.pageOf, {
                    page: currentPage,
                    count: totalPagesCount,
                  })}
                </span>
                <AppPagination page={currentPage} total={totalPagesCount} onChange={setPage} />
              </div>
            </div>
          </div>
        </div>
        <DragOverlay className="pointer-events-none">
          {draggingFile ? (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-xl border border-primary/50 opacity-90 w-[300px]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 dark:bg-slate-700 rounded-md">
                  <DocumentTypeIcon
                    fileType={draggingFile.fileType}
                    fileName={draggingFile.fileName}
                    fileId={draggingFile.id}
                    size={24}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{draggingFile.fileName}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(draggingFile.fileSize)}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
        {activeModal === 'folders' && (
          <>
            <div
              className="fixed inset-0 z-70 bg-black/30"
              role="button"
              tabIndex={0}
              onClick={closeModal}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  closeModal();
                }
              }}
            />
            <div className="fixed inset-0 z-80 flex items-center justify-center p-4">
              <div className="flex w-full max-w-[1380px] min-h-[70vh] max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 px-6 py-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {t.modals.foldersTitle}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t.modals.foldersSubtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {folderMoveFeedback && (
                    <div
                      role={folderMoveFeedback.tone === 'error' ? 'alert' : 'status'}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        folderMoveFeedback.tone === 'success'
                          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-100'
                          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100'
                      }`}
                    >
                      {folderMoveFeedback.message}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-1 items-center gap-2 min-w-[220px]">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={event =>
                          setNewFolderName(clampFolderName(event.target.value, newFolderName))
                        }
                        placeholder={t.folders.createPlaceholder.value}
                        className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim()}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-sm hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 dark:disabled:bg-gray-600"
                        title={t.folders.createTooltip.value}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    {draggingFile && (
                      <div className="text-xs text-primary">{t.dragDrop.subtitle}</div>
                    )}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[550px_1fr]">
                    <div className="space-y-4">
                      <div className="rounded-xl border border-gray-200 dark:border-slate-700/60 p-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex flex-col">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {t.modals.folderListTitle}
                            </h4>
                            {pickedFolderId && (
                              <span className="mt-0.5 text-xs font-bold text-primary animate-pulse tracking-tight">
                                {t.scrollHint.value}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {folders.length}
                          </span>
                        </div>
                        <div className="mt-3 px-1 space-y-3 max-h-[45vh] overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => setActiveFolderId('')}
                            className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${
                              activeFolderId === ''
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-gray-100 dark:border-slate-800 text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            <span>{t.folders.all}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {files.length}
                            </span>
                          </button>
                          <DroppableFolderButton
                            isNoFolder
                            active={activeFolderId === NO_FOLDER}
                            onClick={() => setActiveFolderId(NO_FOLDER)}
                            className={`flex w-full items-center justify-between px-4 py-3 text-sm font-medium ${
                              activeFolderId === NO_FOLDER
                                ? 'bg-primary/5 text-primary' // Highlight handled by wrapper
                                : 'text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <span>{t.folders.none}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {folderCounts.noFolder}
                              </span>
                            </div>
                          </DroppableFolderButton>
                          {folders.length === 0 ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t.modals.folderListEmpty}
                            </p>
                          ) : (
                            folders.map((folder, index) => (
                              <div key={folder.id} className="space-y-2">
                                {/* Droppable wrapper around the folder item */}
                                <DroppableFolderButton
                                  folderId={folder.id}
                                  active={activeFolderId === folder.id}
                                  onClick={() => setActiveFolderId(folder.id)}
                                  onContextMenu={e => handleFolderContextMenu(e, folder)}
                                  className={`group relative flex items-center gap-2 rounded-lg border px-4 py-3 ${
                                    pickedFolderId === folder.id
                                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 cursor-ns-resize shadow-md z-10'
                                      : activeFolderId === folder.id
                                        ? 'border-primary/30 bg-primary/5'
                                        : 'border-gray-100 dark:border-slate-800'
                                  }`}
                                >
                                  {editingFolderId === folder.id ? (
                                    <div className="flex flex-1 items-center gap-2">
                                      <input
                                        type="text"
                                        value={editingFolderName}
                                        onChange={event =>
                                          setEditingFolderName(
                                            clampFolderName(event.target.value, editingFolderName),
                                          )
                                        }
                                        onClick={event => event.stopPropagation()}
                                        className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                                      />
                                      <button
                                        type="button"
                                        onClick={event => {
                                          event.stopPropagation();
                                          handleRenameFolder(folder.id);
                                        }}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
                                      >
                                        <Check size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={event => {
                                          event.stopPropagation();
                                          handleCancelEditFolder();
                                        }}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700/60 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex flex-1 items-center justify-between gap-2 text-left">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Folder
                                            className="h-4 w-4 text-gray-400"
                                            style={{
                                              color: folder.tag?.color ?? undefined,
                                            }}
                                          />
                                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {folder.name}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {pickedFolderId === null ? (
                                          <button
                                            type="button"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setPickedFolderId(folder.id);
                                            }}
                                            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-400 hover:text-primary hover:bg-primary/5 transition-all opacity-0 group-hover:opacity-100"
                                          >
                                            {t.dragAndDrop.value}
                                          </button>
                                        ) : pickedFolderId === folder.id ? (
                                          <button
                                            type="button"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setPickedFolderId(null);
                                              toast.success(
                                                `${(t.toasts as any).fileMovedTo.value} "${folder.name}"`,
                                              );
                                            }}
                                            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-primary text-white px-3 py-1 text-xs font-semibold shadow-sm hover:bg-primary/90 transition-all scale-105"
                                          >
                                            {t.done.value}
                                          </button>
                                        ) : null}
                                        {canEditFolder(folder) && (
                                          <div className="flex items-center">
                                            <button
                                              type="button"
                                              onClick={e => {
                                                e.stopPropagation();
                                                handleFolderContextMenu(e, folder);
                                              }}
                                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                                            >
                                              <MoreVertical size={16} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </DroppableFolderButton>
                                {folderTagPickerId === folder.id && canEditFolder(folder) && (
                                  <div
                                    className="rounded-lg border border-gray-100 dark:border-slate-800 p-2"
                                    onClick={event => event.stopPropagation()}
                                    onKeyDown={event => event.stopPropagation()}
                                  >
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateFolderTag(folder.id, null)}
                                        className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                      >
                                        {t.tags.clear}
                                      </button>
                                      {tags.map(tag => {
                                        const isActive = folder.tag?.id === tag.id;
                                        return (
                                          <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => handleUpdateFolderTag(folder.id, tag.id)}
                                            className={tagChipClass(isActive)}
                                            style={getTagChipStyle(tag)}
                                          >
                                            {tag.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 dark:border-slate-700/60 p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {t.tags.title}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {tags.length}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={newTagName}
                            onChange={event => setNewTagName(event.target.value)}
                            placeholder={t.tags.createPlaceholder.value}
                            className="flex-1 min-w-40 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                          <div className="relative">
                            <button
                              type="button"
                              onClick={event => {
                                setNewTagAnchorEl(event.currentTarget);
                                setNewTagPickerOpen(prev => !prev);
                              }}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-1"
                              aria-label={t.tagColor.value}
                            >
                              <span
                                className="h-6 w-6 rounded-full"
                                style={{ backgroundColor: newTagColor }}
                              />
                            </button>
                            <Popover
                              open={newTagPickerOpen}
                              anchorEl={newTagAnchorEl}
                              onClose={() => {
                                setNewTagPickerOpen(false);
                                setNewTagAnchorEl(null);
                              }}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                              }}
                              transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                              }}
                              slotProps={
                                {
                                  paper: {
                                    sx: {
                                      p: 1.5,
                                      mt: 1,
                                      borderRadius: '16px',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      boxShadow:
                                        '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                                      overflow: 'visible',
                                      '&::before': {
                                        content: '""',
                                        display: 'block',
                                        position: 'absolute',
                                        top: 0,
                                        right: 14,
                                        width: 10,
                                        height: 10,
                                        bgcolor: 'background.paper',
                                        transform: 'translateY(-50%) rotate(45deg)',
                                        zIndex: 0,
                                        borderLeft: '1px solid',
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                      },
                                    },
                                  },
                                } as any
                              }
                            >
                              <HexColorPicker color={newTagColor} onChange={setNewTagColor} />
                            </Popover>
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateTag}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-sm hover:bg-primary-hover"
                            title={t.tags.createTooltip.value}
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="mt-4 space-y-2 max-h-[30vh] overflow-y-auto min-h-[200px] pb-52">
                          {tags.length === 0 ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t.tags.empty}
                            </p>
                          ) : (
                            tags.map(tag => (
                              <div
                                key={tag.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-slate-800 px-3 py-2"
                              >
                                {editingTagId === tag.id ? (
                                  <div className="flex flex-1 flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editingTagName}
                                        onChange={event => setEditingTagName(event.target.value)}
                                        className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                                      />
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={event => {
                                            setEditingTagAnchorEl(event.currentTarget);
                                            setEditingTagPickerId(prev =>
                                              prev === tag.id ? null : tag.id,
                                            );
                                          }}
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-1"
                                          aria-label={t.tagColor.value}
                                        >
                                          <span
                                            className="h-4 w-4 rounded-full"
                                            style={{
                                              backgroundColor: editingTagColor || '#4f46e5',
                                            }}
                                          />
                                        </button>
                                        <Popover
                                          open={editingTagPickerId === tag.id}
                                          anchorEl={editingTagAnchorEl}
                                          onClose={() => {
                                            setEditingTagPickerId(null);
                                            setEditingTagAnchorEl(null);
                                          }}
                                          anchorOrigin={{
                                            vertical: 'bottom',
                                            horizontal: 'right',
                                          }}
                                          transformOrigin={{
                                            vertical: 'top',
                                            horizontal: 'right',
                                          }}
                                          slotProps={
                                            {
                                              paper: {
                                                sx: {
                                                  p: 1.5,
                                                  mt: 1,
                                                  borderRadius: '16px',
                                                  border: '1px solid',
                                                  borderColor: 'divider',
                                                  boxShadow:
                                                    '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                                                  overflow: 'visible',
                                                  '&::before': {
                                                    content: '""',
                                                    display: 'block',
                                                    position: 'absolute',
                                                    top: 0,
                                                    right: 14,
                                                    width: 10,
                                                    height: 10,
                                                    bgcolor: 'background.paper',
                                                    transform: 'translateY(-50%) rotate(45deg)',
                                                    zIndex: 0,
                                                    borderLeft: '1px solid',
                                                    borderTop: '1px solid',
                                                    borderColor: 'divider',
                                                  },
                                                },
                                              },
                                            } as any
                                          }
                                        >
                                          <HexColorPicker
                                            color={editingTagColor || '#4f46e5'}
                                            onChange={setEditingTagColor}
                                          />
                                        </Popover>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRenameTag(tag.id)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
                                      >
                                        <Check size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelEditTag}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700/60 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{
                                          backgroundColor: tag.color || '#cbd5f5',
                                        }}
                                      />
                                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {tag.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {tagCounts[tag.id] ?? 0}
                                      </span>
                                      {canEditTag(tag) && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleStartEditTag(tag)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700/60 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
                                            title={t.tags.renameTooltip.value}
                                          >
                                            <PencilLine size={16} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => confirmDeleteTag(tag)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700/60 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                                            title={t.tags.deleteTooltip.value}
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-slate-700/60 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {activeFolderLabel}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t.modals.filesLabel} · {folderModalFiles.length}
                          </p>
                        </div>
                        {draggingFile && (
                          <span className="text-xs text-primary">{t.dragDrop.title}</span>
                        )}
                      </div>
                      <div className="relative mt-3">
                        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={folderFileQuery}
                          onChange={event => setFolderFileQuery(event.target.value)}
                          placeholder={t.modals.fileSearchPlaceholder.value}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="mt-3 max-h-[50vh] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 rounded-lg border border-gray-100 dark:border-slate-800">
                        {folderModalFiles.length === 0 ? (
                          <div className="px-6 py-12 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-600">
                              <FileX size={32} />
                            </div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {t.modals.filesEmpty}
                            </p>
                          </div>
                        ) : (
                          folderModalFiles.map(file => (
                            <DraggableModalFileItem
                              key={file.id}
                              file={file}
                              canEditFile={canEditFile}
                              t={t}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {filterOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-300"
              role="button"
              tabIndex={0}
              onClick={() => setFilterOpen(false)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFilterOpen(false);
                }
              }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {t.filters.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row text-left">
                  {/* Left: Filters */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col bg-white dark:bg-slate-900">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="storage-filter-status"
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          {t.filters.status}
                        </label>
                        <select
                          id="storage-filter-status"
                          value={stagedFilters.status}
                          onChange={e => handleFilterChange('status', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <option value="">{t.filters.all}</option>
                          {statusOptions.map(status => (
                            <option key={status} value={status}>
                              {getStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="storage-filter-bank"
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          {t.filters.bank}
                        </label>
                        <select
                          id="storage-filter-bank"
                          value={stagedFilters.bank}
                          onChange={e => handleFilterChange('bank', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <option value="">{t.filters.all}</option>
                          {bankOptions.map(bank => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="storage-filter-category"
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          {t.filters.category}
                        </label>
                        <select
                          id="storage-filter-category"
                          value={stagedFilters.categoryId}
                          onChange={e => handleFilterChange('categoryId', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <option value="">{t.filters.all}</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="storage-filter-ownership"
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          {t.filters.accessType}
                        </label>
                        <select
                          id="storage-filter-ownership"
                          value={stagedFilters.ownership}
                          onChange={e => handleFilterChange('ownership', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <option value="">{t.filters.all}</option>
                          <option value="owned">{t.filters.owned}</option>
                          <option value="shared">{t.filters.shared}</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label
                          htmlFor="storage-filter-folder"
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          {t.filters.folder}
                        </label>
                        <select
                          id="storage-filter-folder"
                          value={stagedFilters.folderId}
                          onChange={e => handleFilterChange('folderId', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <option value="">{t.filters.all}</option>
                          <option value={NO_FOLDER}>{t.folders.none}</option>
                          {folders.map(folder => (
                            <option key={folder.id} value={folder.id}>
                              {folder.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-auto pt-8 flex items-center justify-between">
                      <button
                        onClick={handleResetFilters}
                        className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors px-2 py-1"
                      >
                        {t.filters.reset}
                      </button>
                      <button
                        onClick={handleApplyFilters}
                        className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover hover:shadow-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all active:scale-95"
                      >
                        {t.filters.apply}
                      </button>
                    </div>
                  </div>

                  {/* Right: Views */}
                  <div className="w-full md:w-80 border-l border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex flex-col">
                    <div className="p-6 flex-1 overflow-y-auto">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Bookmark className="h-4 w-4 text-primary" />
                        {t.modals.viewCreateTitle.value.replace(':', '')}
                      </h4>

                      {/* Save View Input */}
                      <div className="mb-6 group relative">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={viewName}
                            onChange={event => setViewName(event.target.value)}
                            placeholder={t.views.namePlaceholder.value}
                            className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={handleSaveView}
                            disabled={viewSaving || !viewName.trim()}
                            className="inline-flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 text-primary hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-primary"
                            title={t.views.saveTooltip.value}
                          >
                            <Save size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-2">
                          <span>{t.views.title}</span>
                          <span>{views.length}</span>
                        </div>

                        {viewsLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          </div>
                        ) : views.length === 0 ? (
                          <p className="text-sm text-gray-400 italic text-center py-4">
                            {t.views.empty}
                          </p>
                        ) : (
                          views.map(view => (
                            <div
                              key={view.id}
                              className={`group flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 transition-all ${
                                activeViewId === view.id
                                  ? 'border-primary/30 bg-primary/5 shadow-sm'
                                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary/30 hover:shadow-sm'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  applyView(view);
                                  setFilterOpen(false);
                                }}
                                className="flex items-center gap-2.5 min-w-0 flex-1 text-sm font-medium text-gray-700 dark:text-gray-200"
                              >
                                {activeViewId === view.id && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                )}
                                <span className="truncate group-hover:text-primary transition-colors">
                                  {view.name}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteView(view.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title={t.views.delete.value}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        <ConfirmModal
          isOpen={deleteFolderModalOpen}
          onClose={closeDeleteFolderModal}
          onConfirm={handleDeleteFolder}
          title={t.folders.deleteTitle.value}
          message={
            folderToDelete ? (
              <div className="space-y-3">
                <p className="text-gray-600 leading-relaxed">
                  {t.folders.deleteMessagePrefix.value}
                  {folderToDelete.name}
                  {t.folders.deleteMessageSuffix.value}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Checkbox
                    checked={deleteFolderWithContents}
                    onCheckedChange={setDeleteFolderWithContents}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  {t.folders.deleteWithContents}
                </div>
              </div>
            ) : (
              <p className="text-gray-600 leading-relaxed">{t.folders.deleteMessageFallback}</p>
            )
          }
          confirmText={t.folders.deleteConfirm.value}
          cancelText={t.folders.deleteCancel.value}
          isDestructive
        />
        <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setFileToDelete(null);
          }}
          onConfirm={handleDelete}
          title={t.delete.title.value}
          message={
            fileToDelete
              ? `${t.delete.messagePrefix.value}${fileToDelete.fileName}${t.delete.messageSuffix.value}`
              : t.delete.messageFallback.value
          }
          confirmText={t.delete.confirm.value}
          cancelText={t.delete.cancel.value}
          isDestructive
        />
        <ConfirmModal
          isOpen={permanentDeleteModalOpen}
          onClose={() => {
            setPermanentDeleteModalOpen(false);
            setFileToDeletePermanently(null);
          }}
          onConfirm={handlePermanentDelete}
          title={t.permanentDelete.title.value}
          message={
            fileToDeletePermanently
              ? `${t.permanentDelete.messagePrefix.value}${fileToDeletePermanently.fileName}${t.permanentDelete.messageSuffix.value}`
              : t.permanentDelete.messageFallback.value
          }
          confirmText={t.permanentDelete.confirm.value}
          cancelText={t.permanentDelete.cancel.value}
          isDestructive
        />
        <ConfirmModal
          isOpen={bulkDeleteModalOpen}
          onClose={() => setBulkDeleteModalOpen(false)}
          onConfirm={() => handleBulkDeleteFromTrash()}
          title={t.trash.bulkDeleteTitle.value}
          message={t.trash.bulkDeleteMessage.value.replace('{count}', String(selectedTrashCount))}
          confirmText={t.trash.bulkDeleteConfirm.value}
          cancelText={t.trash.bulkDeleteCancel.value}
          isDestructive
        />
        <ConfirmModal
          isOpen={emptyTrashModalOpen}
          onClose={() => setEmptyTrashModalOpen(false)}
          onConfirm={handleEmptyTrash}
          title={t.trash.emptyTitle.value}
          message={t.trash.emptyMessage.value}
          confirmText={t.trash.emptyConfirm.value}
          cancelText={t.trash.emptyCancel.value}
          isDestructive
        />
        <ConfirmModal
          isOpen={deleteTagModalOpen}
          onClose={() => {
            setDeleteTagModalOpen(false);
            setTagToDelete(null);
          }}
          onConfirm={handleDeleteTag}
          title={t.tags.deleteTitle.value}
          message={
            tagToDelete
              ? `${t.tags.deleteMessagePrefix.value}${tagToDelete.name}${t.tags.deleteMessageSuffix.value}`
              : t.tags.deleteMessageFallback.value
          }
          confirmText={t.tags.deleteConfirm.value}
          cancelText={t.tags.deleteCancel.value}
          isDestructive
        />
        {/* PDF Preview Modal */}
        {previewModalOpen && previewFileId && (
          <PDFPreviewModal
            isOpen={previewModalOpen}
            onClose={() => {
              setPreviewModalOpen(false);
              setPreviewFileId(null);
              setPreviewFileName('');
            }}
            fileId={previewFileId}
            fileName={previewFileName}
          />
        )}
        {/* Folder Context Menu */}
        {folderContextMenu && (
          <div
            className="fixed z-100 min-w-[200px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700/60 dark:bg-slate-900"
            style={{
              top:
                typeof window !== 'undefined' && folderContextMenu.y + 160 > window.innerHeight
                  ? folderContextMenu.y - 160
                  : folderContextMenu.y,
              left:
                typeof window !== 'undefined' && folderContextMenu.x + 200 > window.innerWidth
                  ? folderContextMenu.x - 200
                  : folderContextMenu.x,
            }}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            role="presentation"
          >
            <div className="p-1.5 flex flex-col">
              <button
                type="button"
                onClick={() => {
                  setFolderTagPickerId(folderContextMenu.folder.id);
                  setFolderContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800 transition-colors"
              >
                <Tag size={16} className="text-gray-400" />
                <span>{t.tags.title.value}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleStartEditFolder(folderContextMenu.folder);
                  setFolderContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800 transition-colors"
              >
                <PencilLine size={16} className="text-gray-400" />
                <span>{t.folders.renameTooltip.value}</span>
              </button>
              <div className="my-1 h-px bg-gray-100 dark:bg-slate-800" />
              <button
                type="button"
                onClick={() => {
                  confirmDeleteFolder(folderContextMenu.folder);
                  setFolderContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={16} />
                <span>{t.folders.deleteTooltip.value}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}

export default StoragePageContent;
