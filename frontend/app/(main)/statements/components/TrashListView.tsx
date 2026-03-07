'use client';

import ConfirmModal from '@/app/components/ConfirmModal';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { Checkbox } from '@/app/components/ui/checkbox';
import { AppPagination } from '@/app/components/ui/pagination';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import {
  areAllVisibleSelected,
  toggleSelectAllVisible,
  toggleStatementSelection,
} from '@/app/lib/statement-selection';
import { resolveBankLogo } from '@bank-logos';
import { RotateCcw, Search, Trash2 } from 'lucide-react';
import { useIntlayer, useLocale } from "@/app/i18n";
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { TrashListItem, type TrashListItemModel } from './TrashListItem';
import {
  type TrashEntityType,
  resolvePermanentDeletionDate,
  resolveTrashEntityType,
} from './trash-utils';

const PAGE_SIZE = 30;
const DEFAULT_TRASH_TTL_DAYS = 30;

type Props = {
  onCountChange?: (count: number) => void;
};

type TrashFile = TrashListItemModel & {
  status?: string;
  itemType?: string | null;
  resourceType?: string | null;
  objectType?: string | null;
  type?: string | null;
};

const getBankDisplayName = (bankName: string) => {
  const resolved = resolveBankLogo(bankName);
  if (!resolved) return bankName;
  return resolved.key !== 'other' ? resolved.displayName : bankName;
};

const resolveDateValue = (file: TrashFile): number => {
  const value = file.deletedAt || file.createdAt;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export default function TrashListView({ onCountChange }: Props) {
  const t = useIntlayer('statementsPage');
  const { locale } = useLocale();
  const { user } = useAuth();
  const localeCode = locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US';
  const trashTtlDays = useMemo(() => {
    const parsed = Number.parseInt(process.env.NEXT_PUBLIC_STORAGE_TRASH_TTL_DAYS || '', 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return DEFAULT_TRASH_TTL_DAYS;
  }, []);

  const resolveLabel = (value: unknown, fallback: string): string =>
    (value as { value?: string })?.value ?? (value as string) ?? fallback;

  const getNested = (source: unknown, path: string[]): unknown => {
    let current: unknown = source;

    for (const key of path) {
      if (!current || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  };

  const labels = {
    title: resolveLabel(getNested(t, ['trash', 'title']), 'Trash'),
    retentionPolicy: resolveLabel(
      getNested(t, ['trash', 'retentionPolicy']),
      `Deleted items are permanently removed after ${trashTtlDays} days.`,
    ),
    searchPlaceholder: resolveLabel(
      getNested(t, ['trash', 'searchPlaceholder']),
      'Search in trash...',
    ),
    selectedCountTemplate: resolveLabel(
      getNested(t, ['trash', 'selectedCount']) ?? getNested(t, ['trash', 'selectedLabel']),
      'Selected: {count}',
    ),
    restore: resolveLabel(getNested(t, ['trash', 'restore']), 'Restore'),
    delete: resolveLabel(getNested(t, ['trash', 'delete']), 'Delete'),
    emptyTrash: resolveLabel(
      getNested(t, ['trash', 'emptyTrash']) ?? getNested(t, ['trash', 'emptyAction']),
      'Empty trash',
    ),
    emptyTitle: resolveLabel(
      getNested(t, ['trash', 'empty', 'title']) ?? getNested(t, ['trash', 'emptyTitle']),
      'Trash is empty',
    ),
    emptyDescription: resolveLabel(
      getNested(t, ['trash', 'empty', 'subtitle']) ?? getNested(t, ['trash', 'emptyDescription']),
      'Deleted files will appear here',
    ),
    typeHeader: resolveLabel(getNested(t, ['trash', 'listHeader', 'type']), 'Type'),
    deletedAtHeader: resolveLabel(
      getNested(t, ['trash', 'listHeader', 'deletedAt']) ??
        getNested(t, ['trash', 'listHeader', 'deleted']),
      'Deleted at',
    ),
    autoDeleteHeader: resolveLabel(
      getNested(t, ['trash', 'listHeader', 'willDeleteAt']),
      'Will be permanently deleted on',
    ),
    nameHeader: resolveLabel(getNested(t, ['trash', 'listHeader', 'name']), 'Name'),
    actionsHeader: resolveLabel(getNested(t, ['trash', 'listHeader', 'actions']), 'Actions'),
    entityTypeStatement: resolveLabel(
      getNested(t, ['trash', 'entityTypes', 'statement']),
      'Statement',
    ),
    entityTypeTable: resolveLabel(getNested(t, ['trash', 'entityTypes', 'table']), 'Table'),
    entityTypeWorkspace: resolveLabel(
      getNested(t, ['trash', 'entityTypes', 'workspace']),
      'Workspace',
    ),
    selectAll: resolveLabel(getNested(t, ['trash', 'selectAll']), 'Select all in trash'),
    restoreLoading: resolveLabel(getNested(t, ['trash', 'restoreLoading']), 'Restoring...'),
    restoreSuccess: resolveLabel(getNested(t, ['trash', 'restoreSuccess']), 'File restored'),
    restoreFailed: resolveLabel(getNested(t, ['trash', 'restoreFailed']), 'Failed to restore file'),
    deleteLoading: resolveLabel(getNested(t, ['trash', 'deleteLoading']), 'Deleting forever...'),
    deleteSuccess: resolveLabel(
      getNested(t, ['trash', 'deleteSuccess']),
      'File deleted permanently',
    ),
    deleteFailed: resolveLabel(
      getNested(t, ['trash', 'deleteFailed']),
      'Failed to delete file permanently',
    ),
    loadError: resolveLabel(
      getNested(t, ['trash', 'loadError']) ?? getNested(t, ['loadListError']),
      'Failed to load trash',
    ),
    confirmDeleteTitle: resolveLabel(
      getNested(t, ['trash', 'confirmDeleteTitle']) ?? getNested(t, ['trash', 'bulkDeleteTitle']),
      'Delete permanently?',
    ),
    confirmDeleteMessage: resolveLabel(
      getNested(t, ['trash', 'confirmDeleteMessage']) ??
        getNested(t, ['trash', 'bulkDeleteMessage']),
      'Selected files will be permanently deleted.',
    ),
    confirmDelete: resolveLabel(
      getNested(t, ['trash', 'confirmDelete']) ?? getNested(t, ['trash', 'bulkDeleteConfirm']),
      'Delete',
    ),
    confirmCancel: resolveLabel(
      getNested(t, ['trash', 'confirmCancel']) ?? getNested(t, ['trash', 'bulkDeleteCancel']),
      'Cancel',
    ),
    confirmEmptyTitle: resolveLabel(
      getNested(t, ['trash', 'confirmEmptyTitle']) ?? getNested(t, ['trash', 'emptyTitle']),
      'Empty trash?',
    ),
    confirmEmptyMessage: resolveLabel(
      getNested(t, ['trash', 'confirmEmptyMessage']) ?? getNested(t, ['trash', 'emptyMessage']),
      'All files in trash will be deleted permanently.',
    ),
    confirmEmpty: resolveLabel(
      getNested(t, ['trash', 'confirmEmpty']) ?? getNested(t, ['trash', 'emptyConfirm']),
      'Empty',
    ),
    irreversibleWarning: resolveLabel(
      getNested(t, ['trash', 'irreversibleWarning']),
      'This action is irreversible',
    ),
    paginationShown: resolveLabel(
      getNested(t, ['pagination', 'shown']),
      'Showing {from}–{to} of {count}',
    ),
    paginationPrevious: resolveLabel(getNested(t, ['pagination', 'previous']), 'Previous'),
    paginationNext: resolveLabel(getNested(t, ['pagination', 'next']), 'Next'),
    paginationPageOf: resolveLabel(
      getNested(t, ['pagination', 'pageOf']),
      'Page {page} of {count}',
    ),
  };

  const [files, setFiles] = useState<TrashFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim().toLowerCase());
      setPage(1);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const loadTrashFiles = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/storage/files', {
        params: { deleted: 'only' },
      });
      const payload = response.data;
      const nextFiles = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      setFiles(nextFiles);
    } catch (error) {
      console.error('Failed to load trash files:', error);
      toast.error(labels.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadTrashFiles();
  }, [user]);

  useEffect(() => {
    onCountChange?.(files.length);
  }, [files, onCountChange]);

  const filteredFiles = useMemo(() => {
    const filtered = search
      ? files.filter(file => {
          const fileName = (file.fileName || '').toLowerCase();
          const bankName = (file.bankName || '').toLowerCase();
          return fileName.includes(search) || bankName.includes(search);
        })
      : files;

    return [...filtered].sort((a, b) => resolveDateValue(b) - resolveDateValue(a));
  }, [files, search]);

  const total = filteredFiles.length;
  const totalPagesCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPagesCount);
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredFiles.slice(start, start + PAGE_SIZE);
  }, [filteredFiles, currentPage]);

  const visibleIds = useMemo(() => paginatedFiles.map(file => file.id), [paginatedFiles]);
  const allVisibleSelected = useMemo(
    () => areAllVisibleSelected(selectedIds, visibleIds),
    [selectedIds, visibleIds],
  );

  useEffect(() => {
    const visibleSet = new Set(filteredFiles.map(file => file.id));
    setSelectedIds(prev => prev.filter(id => visibleSet.has(id)));
  }, [filteredFiles]);

  const selectedCount = selectedIds.length;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, currentPage * PAGE_SIZE);

  const replaceTokens = (template: string, values: Record<string, string | number>) => {
    return Object.entries(values).reduce(
      (acc, [key, value]) => acc.replace(`{${key}}`, String(value)),
      template,
    );
  };

  const selectedLabel = replaceTokens(labels.selectedCountTemplate, { count: selectedCount });
  const shownLabel = replaceTokens(labels.paginationShown, {
    from: rangeStart,
    to: rangeEnd,
    count: total,
  });
  const pageOfLabel = replaceTokens(labels.paginationPageOf, {
    page: currentPage,
    count: totalPagesCount,
  });
  const entityTypeLabelByType: Record<TrashEntityType, string> = {
    statement: labels.entityTypeStatement,
    table: labels.entityTypeTable,
    workspace: labels.entityTypeWorkspace,
  };

  const removeFilesFromState = (ids: string[]) => {
    if (ids.length === 0) return;
    setFiles(prev => prev.filter(file => !ids.includes(file.id)));
    setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
  };

  const handleRestore = async (id: string) => {
    const toastId = toast.loading(labels.restoreLoading);

    try {
      await apiClient.post(`/storage/files/${id}/trash/restore`);
      removeFilesFromState([id]);
      toast.success(labels.restoreSuccess, { id: toastId });
    } catch (error) {
      console.error('Failed to restore trash file:', error);
      toast.error(labels.restoreFailed, { id: toastId });
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    const toastId = toast.loading(labels.restoreLoading);

    try {
      await apiClient.post('/storage/files/trash/bulk/restore', {
        statementIds: selectedIds,
      });
      removeFilesFromState(selectedIds);
      toast.success(labels.restoreSuccess, { id: toastId });
    } catch (error) {
      console.error('Failed to bulk restore trash files:', error);
      toast.error(labels.restoreFailed, { id: toastId });
    }
  };

  const openDeleteConfirm = (ids: string[]) => {
    if (ids.length === 0) return;
    setPendingDeleteIds(ids);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteIds.length === 0) return;

    const ids = [...pendingDeleteIds];
    const toastId = toast.loading(labels.deleteLoading);
    setConfirmLoading(true);

    try {
      if (ids.length === 1) {
        await apiClient.delete(`/storage/files/${ids[0]}/trash`);
      } else {
        await apiClient.post('/storage/files/bulk/trash/delete', {
          statementIds: ids,
        });
      }

      removeFilesFromState(ids);
      setDeleteConfirmOpen(false);
      setPendingDeleteIds([]);
      toast.success(labels.deleteSuccess, { id: toastId });
    } catch (error) {
      console.error('Failed to permanently delete trash files:', error);
      toast.error(labels.deleteFailed, { id: toastId });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleConfirmEmptyTrash = async () => {
    if (files.length === 0) {
      setEmptyConfirmOpen(false);
      return;
    }

    const ids = files.map(file => file.id);
    const toastId = toast.loading(labels.deleteLoading);
    setConfirmLoading(true);

    try {
      await apiClient.post('/storage/files/bulk/trash/delete', {
        statementIds: ids,
      });
      removeFilesFromState(ids);
      setEmptyConfirmOpen(false);
      toast.success(labels.deleteSuccess, { id: toastId });
    } catch (error) {
      console.error('Failed to empty trash:', error);
      toast.error(labels.deleteFailed, { id: toastId });
    } finally {
      setConfirmLoading(false);
    }
  };

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(localeCode, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPermanentDeletionDate = (deletedAt?: string | null) => {
    const expiresAt = resolvePermanentDeletionDate(deletedAt, trashTtlDays);
    return formatDateTime(expiresAt);
  };

  const confirmDeleteMessage = (
    <div className="space-y-2">
      <p className="text-gray-600 leading-relaxed">
        {labels.confirmDeleteMessage.replace('{count}', String(pendingDeleteIds.length))}
      </p>
      <p className="text-sm font-semibold text-red-600">{labels.irreversibleWarning}</p>
    </div>
  );

  const confirmEmptyMessage = (
    <div className="space-y-2">
      <p className="text-gray-600 leading-relaxed">{labels.confirmEmptyMessage}</p>
      <p className="text-sm font-semibold text-red-600">{labels.irreversibleWarning}</p>
    </div>
  );

  return (
    <div className="container-shared flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 shrink-0 space-y-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-gray-900">{labels.title}</h1>
          <p className="text-sm text-gray-500">{labels.retentionPolicy}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder={labels.searchPlaceholder}
              aria-label={labels.searchPlaceholder}
              className="w-full rounded-md border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">{selectedLabel}</span>
          <button
            type="button"
            onClick={() => void handleBulkRestore()}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-1.5 text-[13px] font-medium text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {labels.restore}
          </button>

          <button
            type="button"
            onClick={() => openDeleteConfirm(selectedIds)}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-[13px] font-medium text-red-700 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {labels.delete}
          </button>

          <button
            type="button"
            onClick={() => setEmptyConfirmOpen(true)}
            disabled={files.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {labels.emptyTrash}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingAnimation size="lg" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="px-4 py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-300">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">{labels.emptyTitle}</h3>
            <p className="mt-1 text-gray-500">{labels.emptyDescription}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-4 md:hidden">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={selectedIds.length > 0 && !allVisibleSelected}
                  onCheckedChange={checked =>
                    setSelectedIds(prev => toggleSelectAllVisible(prev, visibleIds, checked))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  aria-label={labels.selectAll}
                />
                <span className="text-sm font-medium text-gray-600">{labels.selectAll}</span>
              </div>

              <div className="hidden items-center gap-3 px-4 text-xs font-medium uppercase tracking-wide text-gray-500 md:flex">
                <div className="w-4">
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={selectedIds.length > 0 && !allVisibleSelected}
                    onCheckedChange={checked =>
                      setSelectedIds(prev => toggleSelectAllVisible(prev, visibleIds, checked))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    aria-label={labels.selectAll}
                  />
                </div>
                <div className="w-44">{labels.typeHeader}</div>
                <div className="w-[440px] grid grid-cols-2 gap-3">
                  <span>{labels.deletedAtHeader}</span>
                  <span>{labels.autoDeleteHeader}</span>
                </div>
                <div className="flex-1">{labels.nameHeader}</div>
                <div className="w-36 text-right">{labels.actionsHeader}</div>
              </div>

              {paginatedFiles.map(file => {
                const entityType = resolveTrashEntityType(
                  file as unknown as Record<string, unknown>,
                );
                const bankName = (file.bankName || '').trim();
                const safeBankName = bankName || 'other';
                const bankDisplayName = bankName ? getBankDisplayName(bankName) : '';

                return (
                  <TrashListItem
                    key={file.id}
                    item={{
                      ...file,
                      bankName: safeBankName,
                      entityType,
                    }}
                    selected={selectedIds.includes(file.id)}
                    onToggleSelect={() =>
                      setSelectedIds(prev => toggleStatementSelection(prev, file.id))
                    }
                    onRestore={() => void handleRestore(file.id)}
                    onDelete={() => openDeleteConfirm([file.id])}
                    bankDisplayName={bankDisplayName}
                    typeLabel={entityTypeLabelByType[entityType]}
                    deletedAtLabel={formatDateTime(file.deletedAt)}
                    autoDeleteAtLabel={formatPermanentDeletionDate(file.deletedAt)}
                    deletedAtCaption={labels.deletedAtHeader}
                    autoDeleteAtCaption={labels.autoDeleteHeader}
                    restoreLabel={labels.restore}
                    deleteLabel={labels.delete}
                  />
                );
              })}
            </div>

            <div className="mt-6 flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="text-sm text-gray-500">{shownLabel}</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 min-w-[120px] text-center">
                  {pageOfLabel}
                </span>
                <AppPagination page={currentPage} total={totalPagesCount} onChange={setPage} />
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          if (confirmLoading) return;
          setDeleteConfirmOpen(false);
          setPendingDeleteIds([]);
        }}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        title={labels.confirmDeleteTitle}
        message={confirmDeleteMessage}
        confirmText={labels.confirmDelete}
        cancelText={labels.confirmCancel}
        isDestructive={true}
        isLoading={confirmLoading}
      />

      <ConfirmModal
        isOpen={emptyConfirmOpen}
        onClose={() => {
          if (confirmLoading) return;
          setEmptyConfirmOpen(false);
        }}
        onConfirm={() => {
          void handleConfirmEmptyTrash();
        }}
        title={labels.confirmEmptyTitle}
        message={confirmEmptyMessage}
        confirmText={labels.confirmEmpty}
        cancelText={labels.confirmCancel}
        isDestructive={true}
        isLoading={confirmLoading}
      />
    </div>
  );
}
