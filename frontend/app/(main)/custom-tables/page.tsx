'use client';

import { FilterActions } from '@/app/(main)/statements/components/filters/FilterActions';
import { FilterDropdown } from '@/app/(main)/statements/components/filters/FilterDropdown';
import { FilterOptionRow } from '@/app/(main)/statements/components/filters/FilterOptionRow';
import ConfirmModal from '@/app/components/ConfirmModal';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import { AppPagination } from '@/app/components/ui/pagination';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import {
  CUSTOM_TABLES_OPEN_ACTION_EVENT,
  CUSTOM_TABLES_VIEW_EVENT,
  type CustomTableAction,
  type CustomTableActionEventDetail,
  type CustomTableSortOrder,
  type CustomTableSourceFilter,
  type CustomTableViewEventDetail,
} from '@/app/lib/custom-table-actions';
import { Button as HeroButton } from '@heroui/button';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/modal';
import { Icon } from '@iconify/react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Ellipsis,
  FileSpreadsheet,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Table as TableIcon,
  Trash2,
} from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CustomTablesFiltersDrawer } from './components/CustomTablesFiltersDrawer';
import {
  type StatementGroupBy,
  buildStatementSelectionOptions,
  filterStatementSelectionOptions,
  getSelectedStatementsSummary,
  groupStatementSelectionOptions,
} from './create-from-statements-utils';
import {
  type TableRegistryItem,
  formatRowsCount,
  resolveCreatedFromBadge,
  resolveHumanTableName,
  resolveSourceSummary,
  resolveTablePurpose,
} from './table-registry-utils';

interface Category {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

interface CustomTableItem {
  id: string;
  name: string;
  description: string | null;
  source: string;
  sourceDetails?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  createdAt: string;
  updatedAt: string;
}

interface StatementItem {
  id: string;
  fileName: string;
  status: string;
  totalTransactions: number;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  createdAt: string;
  bankName?: string | null;
}

const extractErrorMessage = (error: any): string | null => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    (typeof error?.response?.data === 'string' ? error.response.data : null) ||
    null
  );
};

const formatUpdatedDate = (value?: string | null): string => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  return `${day}.${month}.${year}`;
};

const formatUpdatedBadge = (value?: string | null): string => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  const isSameDay =
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate();

  if (isSameDay) {
    return 'Today';
  }

  return formatUpdatedDate(value);
};

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'table_export';

const toCsv = (headers: string[], rows: Array<Record<string, unknown>>) => {
  const escapeCell = (input: unknown) => {
    const raw = input === null || input === undefined ? '' : String(input);
    if (raw.includes('"')) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    if (raw.includes(',') || raw.includes('\n')) {
      return `"${raw}"`;
    }
    return raw;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const dataLines = rows.map(row => headers.map(header => escapeCell(row[header])).join(','));
  return [headerLine, ...dataLines].join('\n');
};

export default function CustomTablesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useIntlayer('customTablesPage');
  const [items, setItems] = useState<CustomTableItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statements, setStatements] = useState<StatementItem[]>([]);
  const [statementsLoading, setStatementsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
  });
  const [createFromStatementsOpen, setCreateFromStatementsOpen] = useState(false);
  const [createFromStatementsForm, setCreateFromStatementsForm] = useState<{
    name: string;
    description: string;
  }>({
    name: '',
    description: '',
  });
  const [createFromStatementsStep, setCreateFromStatementsStep] = useState<1 | 2>(1);
  const [selectedStatementIds, setSelectedStatementIds] = useState<string[]>([]);
  const [statementsSearchQuery, setStatementsSearchQuery] = useState('');
  const [statementsSourceFilter, setStatementsSourceFilter] = useState('all');
  const [statementsGroupBy, setStatementsGroupBy] = useState<StatementGroupBy>('source');
  const [creatingFromStatements, setCreatingFromStatements] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomTableItem | null>(null);
  const [rowsCountByTableId, setRowsCountByTableId] = useState<Record<string, number>>({});
  const [exportingTableId, setExportingTableId] = useState<string | null>(null);
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);

  // New State for Redesign
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<CustomTableSourceFilter>('all');
  const [sortOrder, setSortOrder] = useState<CustomTableSortOrder>('updated_desc');
  const [draftFilterSource, setDraftFilterSource] = useState<CustomTableSourceFilter>('all');
  const [draftSortOrder, setDraftSortOrder] = useState<CustomTableSortOrder>('updated_desc');
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [filtersDrawerScreen, setFiltersDrawerScreen] = useState('root');
  const hasHandledImportParam = useRef(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 20;

  const canCreate = useMemo(() => form.name.trim().length > 0, [form.name]);

  const statementSelectionOptions = useMemo(
    () => buildStatementSelectionOptions(statements),
    [statements],
  );

  const statementSourceOptions = useMemo(() => {
    const values = Array.from(
      new Set(statementSelectionOptions.map(option => option.sourceLabel).filter(Boolean)),
    );
    return ['all', ...values.sort((a, b) => a.localeCompare(b))];
  }, [statementSelectionOptions]);

  const filteredStatementSelectionOptions = useMemo(
    () =>
      filterStatementSelectionOptions(statementSelectionOptions, {
        query: statementsSearchQuery,
        source: statementsSourceFilter,
      }),
    [statementSelectionOptions, statementsSearchQuery, statementsSourceFilter],
  );

  const groupedStatementSelectionOptions = useMemo(
    () => groupStatementSelectionOptions(filteredStatementSelectionOptions, statementsGroupBy),
    [filteredStatementSelectionOptions, statementsGroupBy],
  );

  const selectedStatementSummary = useMemo(
    () => getSelectedStatementsSummary(statementSelectionOptions, selectedStatementIds),
    [statementSelectionOptions, selectedStatementIds],
  );

  const selectedStatementPayloadIds = useMemo(() => {
    const available = new Set(statementSelectionOptions.map(option => option.representativeId));
    return selectedStatementIds.filter(id => available.has(id));
  }, [selectedStatementIds, statementSelectionOptions]);

  const selectedStatementPreviewItems = useMemo(() => {
    const selectedSet = new Set(selectedStatementIds);
    return statementSelectionOptions.filter(option => selectedSet.has(option.representativeId));
  }, [selectedStatementIds, statementSelectionOptions]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(q));
    }

    if (filterSource !== 'all') {
      if (filterSource === 'statement') {
        result = result.filter(item => item.source === 'statement');
      } else {
        result = result.filter(item => item.source === filterSource);
      }
    }

    if (sortOrder === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return result;
  }, [items, searchQuery, filterSource, sortOrder]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterSource, sortOrder]);

  useEffect(() => {
    const available = new Set(statementSelectionOptions.map(option => option.representativeId));
    setSelectedStatementIds(prev => prev.filter(id => available.has(id)));
  }, [statementSelectionOptions]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    return filteredItems.slice(start, end);
  }, [filteredItems, page]);

  const totalPages = Math.ceil(filteredItems.length / ROWS_PER_PAGE);
  const rangeStart = filteredItems.length === 0 ? 0 : (page - 1) * ROWS_PER_PAGE + 1;
  const rangeEnd = Math.min(page * ROWS_PER_PAGE, filteredItems.length);

  const registryItems = useMemo(
    () =>
      paginatedItems.map(item => {
        const tableItem: TableRegistryItem = {
          id: item.id,
          name: item.name,
          description: item.description,
          source: item.source,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };

        return {
          ...item,
          displayName: resolveHumanTableName(tableItem),
          purpose: resolveTablePurpose(tableItem),
          sourceSummary: resolveSourceSummary(tableItem),
          sourceDescriptor: item.sourceDetails?.trim() || resolveSourceSummary(tableItem),
          createdFromBadge: resolveCreatedFromBadge(tableItem),
          rowsCountLabel: formatRowsCount(rowsCountByTableId[item.id]),
          updatedLabel: formatUpdatedBadge(item.updatedAt),
        };
      }),
    [paginatedItems, rowsCountByTableId],
  );

  const loadCategories = useCallback(async () => {
    try {
      const response = await apiClient.get('/categories');
      const payload = response.data?.data || response.data || [];
      setCategories(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/custom-tables');
      const payload =
        response.data?.items || response.data?.data?.items || response.data?.data || [];
      setItems(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to load custom tables:', error);
      toast.error(extractErrorMessage(error) || t.toasts.loadTablesFailed.value);
    } finally {
      setLoading(false);
    }
  }, [t.toasts.loadTablesFailed.value]);

  const loadStatements = useCallback(async () => {
    setStatementsLoading(true);
    try {
      const response = await apiClient.get('/statements', {
        params: { page: 1, limit: 50 },
      });
      const payload = response.data?.data || response.data?.items || [];
      setStatements(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to load statements:', error);
      toast.error(extractErrorMessage(error) || t.toasts.loadStatementsFailed.value);
    } finally {
      setStatementsLoading(false);
    }
  }, [t.toasts.loadStatementsFailed.value]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadTables();
      void loadCategories();
    }
  }, [authLoading, loadCategories, loadTables, user]);

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const response = await apiClient.post('/custom-tables', {
        name: form.name.trim(),
        description: form.description.trim() ? form.description.trim() : undefined,
        categoryId: form.categoryId ? form.categoryId : undefined,
      });
      const created = response.data?.data || response.data;
      toast.success(t.toasts.created.value);
      setCreateOpen(false);
      setForm({ name: '', description: '', categoryId: '' });
      if (created?.id) {
        router.push(`/custom-tables/${created.id}`);
        return;
      }
      await loadTables();
    } catch (error) {
      console.error('Failed to create custom table:', error);
      toast.error(extractErrorMessage(error) || t.toasts.createFailed.value);
    } finally {
      setCreating(false);
    }
  };

  const closeCreateFromStatements = useCallback(() => {
    setCreateFromStatementsOpen(false);
    setCreateFromStatementsStep(1);
    setSelectedStatementIds([]);
    setCreateFromStatementsForm({ name: '', description: '' });
    setStatementsSearchQuery('');
    setStatementsSourceFilter('all');
    setStatementsGroupBy('source');
  }, []);

  const openCreateFromStatements = useCallback(async () => {
    setCreateFromStatementsOpen(true);
    setCreateFromStatementsStep(1);
    setSelectedStatementIds([]);
    setCreateFromStatementsForm({ name: '', description: '' });
    setStatementsSearchQuery('');
    setStatementsSourceFilter('all');
    setStatementsGroupBy('source');
    await loadStatements();
  }, [loadStatements]);

  const handleTableAction = useCallback(
    (action: CustomTableAction) => {
      if (action === 'create-empty') {
        setCreateOpen(true);
        return;
      }

      if (action === 'import-statement') {
        void openCreateFromStatements();
        return;
      }

      router.push('/custom-tables/import/google-sheets');
    },
    [openCreateFromStatements, router],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleActionEvent = (event: Event) => {
      const detail = (event as CustomEvent<CustomTableActionEventDetail>).detail;
      if (!detail?.action) return;
      handleTableAction(detail.action);
    };

    window.addEventListener(CUSTOM_TABLES_OPEN_ACTION_EVENT, handleActionEvent);
    return () => {
      window.removeEventListener(CUSTOM_TABLES_OPEN_ACTION_EVENT, handleActionEvent);
    };
  }, [handleTableAction]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewEvent = (event: Event) => {
      const detail = (event as CustomEvent<CustomTableViewEventDetail>).detail;
      if (!detail) return;

      if (detail.type === 'filter-source') {
        setFilterSource(detail.value);
        setDraftFilterSource(detail.value);
        return;
      }

      if (detail.type === 'sort-order') {
        setSortOrder(detail.value);
        setDraftSortOrder(detail.value);
      }
    };

    window.addEventListener(CUSTOM_TABLES_VIEW_EVENT, handleViewEvent);
    return () => {
      window.removeEventListener(CUSTOM_TABLES_VIEW_EVENT, handleViewEvent);
    };
  }, []);

  useEffect(() => {
    setDraftFilterSource(filterSource);
  }, [filterSource]);

  useEffect(() => {
    setDraftSortOrder(sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasHandledImportParam.current) return;

    const params = new URLSearchParams(window.location.search);
    hasHandledImportParam.current = true;

    if (params.get('import') === '1') {
      handleTableAction('import-statement');
    }
  }, [handleTableAction]);

  const handleCreateFromStatements = async () => {
    if (!selectedStatementPayloadIds.length) {
      toast.error(t.toasts.selectAtLeastOneStatement.value);
      return;
    }
    setCreatingFromStatements(true);
    try {
      const response = await apiClient.post('/custom-tables/from-statements', {
        statementIds: selectedStatementPayloadIds,
        name: createFromStatementsForm.name.trim()
          ? createFromStatementsForm.name.trim()
          : undefined,
        description: createFromStatementsForm.description.trim()
          ? createFromStatementsForm.description.trim()
          : undefined,
      });
      const data = response.data?.data || response.data;
      const tableId = data?.tableId || data?.id;
      toast.success(t.toasts.createdFromStatement.value);
      closeCreateFromStatements();
      if (tableId) {
        router.push(`/custom-tables/${tableId}`);
        return;
      }
      await loadTables();
    } catch (error) {
      console.error('Failed to create from statements:', error);
      toast.error(extractErrorMessage(error) || t.toasts.createFromStatementFailed.value);
    } finally {
      setCreatingFromStatements(false);
    }
  };

  const confirmDelete = (table: CustomTableItem) => {
    setDeleteTarget(table);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const toastId = toast.loading(t.toasts.deleting.value);
    try {
      await apiClient.delete(`/custom-tables/${deleteTarget.id}`);
      toast.success(t.toasts.deleted.value, { id: toastId });
      await loadTables();
    } catch (error) {
      console.error('Failed to delete custom table:', error);
      toast.error(t.toasts.deleteFailed.value, { id: toastId });
    } finally {
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const missing = paginatedItems.filter(
      table => typeof rowsCountByTableId[table.id] !== 'number',
    );
    if (missing.length === 0) {
      return;
    }

    const loadRowsCount = async () => {
      const entries = await Promise.all(
        missing.map(async table => {
          try {
            const response = await apiClient.get(`/custom-tables/${table.id}/rows`, {
              params: { limit: 1 },
            });
            const total = Number(response.data?.meta?.total);
            return [table.id, Number.isFinite(total) ? total : 0] as const;
          } catch {
            return [table.id, 0] as const;
          }
        }),
      );

      if (cancelled) return;

      setRowsCountByTableId(prev => {
        const next = { ...prev };
        entries.forEach(([id, count]) => {
          next[id] = count;
        });
        return next;
      });
    };

    void loadRowsCount();

    return () => {
      cancelled = true;
    };
  }, [paginatedItems, rowsCountByTableId]);

  const handleExportTable = useCallback(async (table: CustomTableItem, format: 'csv' | 'xlsx') => {
    setExportingTableId(table.id);
    const toastId = toast.loading(`Export ${table.name}...`);

    try {
      const [tableResponse] = await Promise.all([apiClient.get(`/custom-tables/${table.id}`)]);

      const detail = tableResponse.data?.data || tableResponse.data;
      const columns = Array.isArray(detail?.columns)
        ? [...detail.columns].sort((a, b) => (a.position || 0) - (b.position || 0))
        : [];

      if (columns.length === 0) {
        throw new Error('No exportable columns found');
      }

      const rows: Array<{
        rowNumber?: number;
        data: Record<string, unknown>;
      }> = [];
      let cursor: number | undefined;

      while (true) {
        const response = await apiClient.get(`/custom-tables/${table.id}/rows`, {
          params: { cursor, limit: 500 },
        });

        const items = response.data?.items || response.data?.data?.items || [];
        const chunk = Array.isArray(items) ? items : [];

        rows.push(...chunk);

        if (chunk.length < 500) {
          break;
        }

        const nextCursor = chunk[chunk.length - 1]?.rowNumber;
        if (typeof nextCursor !== 'number' || Number.isNaN(nextCursor)) {
          break;
        }

        cursor = nextCursor;
      }

      const headers = columns.map((column: any) => column.title || column.key);
      const normalizedRows = rows.map(row => {
        const mapped: Record<string, unknown> = {};
        columns.forEach((column: any, index: number) => {
          const header = headers[index];
          mapped[header] = row?.data?.[column.key] ?? '';
        });
        return mapped;
      });

      const fileBase = sanitizeFileName(table.name);

      if (format === 'csv') {
        const csv = toCsv(headers, normalizedRows);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${fileBase}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } else {
        const xlsx = await import('xlsx');
        const sheet = xlsx.utils.json_to_sheet(normalizedRows);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, sheet, 'Export');
        const output = xlsx.write(workbook, {
          bookType: 'xlsx',
          type: 'array',
        });
        const blob = new Blob([output], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${fileBase}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }

      toast.success(`Export complete: ${table.name}`, { id: toastId });
    } catch (error) {
      console.error('Failed to export table:', error);
      toast.error(extractErrorMessage(error) || 'Failed to export table', {
        id: toastId,
      });
    } finally {
      setExportingTableId(prev => (prev === table.id ? null : prev));
    }
  }, []);

  const handleUpdateData = useCallback(
    async (table: CustomTableItem) => {
      setUpdatingTableId(table.id);
      const source = (table.source || '').toLowerCase();

      try {
        if (source.includes('data_entry')) {
          await apiClient.post(`/custom-tables/${table.id}/sync-from-data-entry`);
          await loadTables();
          toast.success('Table synced from latest source data');
          return;
        }

        if (source.includes('statement')) {
          toast('Open Statements and re-run Export to table for fresh data.', {
            icon: 'ℹ️',
          });
          router.push('/statements');
          return;
        }

        if (source === 'google_sheets_import') {
          router.push('/custom-tables/import/google-sheets');
          return;
        }

        toast('This table source has no automatic refresh.', { icon: 'ℹ️' });
      } catch (error) {
        console.error('Failed to update table data:', error);
        toast.error(extractErrorMessage(error) || 'Failed to update table data');
      } finally {
        setUpdatingTableId(prev => (prev === table.id ? null : prev));
      }
    },
    [loadTables, router],
  );

  const resolveLabel = (value: any, fallback: string) => value?.value ?? value ?? fallback;
  const headerTitle = resolveLabel((t as any)?.header?.title, 'Tables');
  const headerSubtitle = resolveLabel(
    (t as any)?.header?.subtitle,
    'Export and manage structured tables created from statements and receipts for accounting and reporting.',
  );
  const searchPlaceholder = resolveLabel((t as any).searchPlaceholder, 'Search tables...');
  const sourcesAny = (t.sources as any) ?? {};
  const filtersAny = (t as any).filters ?? {};
  const actionsAny = (t.actions as any) ?? {};
  const sourceLabel = resolveLabel(sourcesAny.label, 'Source');
  const filterLabels = {
    all: resolveLabel(filtersAny.all, 'All'),
    manual: resolveLabel(sourcesAny.manual, 'Manual'),
    sheets: resolveLabel(sourcesAny.googleSheets, 'Google Sheets'),
    statement: resolveLabel(filtersAny.fromStatement, 'From statement'),
    sortUpdated: resolveLabel(filtersAny.sortUpdated, 'Recent updates'),
    sortName: resolveLabel(filtersAny.sortName, 'By name'),
    filters: resolveLabel(filtersAny.filters, 'Filters'),
    sort: resolveLabel(filtersAny.sort, 'Sort'),
  };
  const filterOptionLabels = {
    apply: resolveLabel(filtersAny.apply, 'Apply'),
    reset: resolveLabel(filtersAny.reset, 'Reset'),
    resetFilters: resolveLabel(filtersAny.resetFilters, 'Reset filters'),
    viewResults: resolveLabel(filtersAny.viewResults, 'View results'),
    saveSearch: resolveLabel(filtersAny.saveSearch, 'Save search'),
    any: resolveLabel(filtersAny.any, 'Any'),
    drawerTitle: resolveLabel(filtersAny.drawerTitle, 'Filters'),
    drawerGeneral: resolveLabel(filtersAny.drawerGeneral, 'General'),
  };
  const paginationLabels = {
    shown: resolveLabel((t as any)?.pagination?.shown, 'Showing {from}–{to} of {count}'),
    previous: resolveLabel((t as any)?.pagination?.previous, 'Previous'),
    next: resolveLabel((t as any)?.pagination?.next, 'Next'),
    pageOf: resolveLabel((t as any)?.pagination?.pageOf, 'Page {page} of {count}'),
  };
  const openLabel = resolveLabel(actionsAny.open, 'Open');
  const createLabel = resolveLabel(actionsAny.create, 'Create');
  const createExportTableLabel = resolveLabel(actionsAny.createExportTable, 'Create export table');
  const createFirstExportTableLabel = resolveLabel(
    actionsAny.createFirstExportTable,
    'Create your first export table',
  );
  const exportLabel = resolveLabel(actionsAny.export, 'Export');
  const exportCsvLabel = resolveLabel(actionsAny.exportCsv, 'CSV');
  const exportXlsxLabel = resolveLabel(actionsAny.exportXlsx, 'XLSX');
  const updateDataLabel = resolveLabel(actionsAny.updateData, 'Update data');
  const deleteLabel = resolveLabel(actionsAny.delete, 'Delete');
  const fromLabel = resolveLabel((t as any)?.fromLabel, 'From');
  const growthHintLabel = resolveLabel(
    (t as any)?.growthHint,
    'You can create multiple export tables for different reports or periods.',
  );
  const namingHintLabel = resolveLabel(
    (t as any)?.namingHint,
    'Try clear names: Expenses export - Feb 2026, VAT reconciliation - Q1, Bank statements export.',
  );
  const ctaDescriptionLabel = resolveLabel(
    (t as any).ctaDescription,
    'Create a table by mapping fields from statements or receipts for export to Excel or accounting systems.',
  );
  const createFromStatementsAny = (t as any)?.createFromStatements ?? {};
  const createFromStatementsLabels = {
    title: resolveLabel(createFromStatementsAny.title, 'Create table from statements'),
    step1: resolveLabel(createFromStatementsAny.step1, 'Step 1 - Select statements'),
    step2: resolveLabel(createFromStatementsAny.step2, 'Step 2 - Table details'),
    stepCounter: resolveLabel(createFromStatementsAny.stepCounter, 'Step {current} of {total}'),
    step1Description: resolveLabel(
      createFromStatementsAny.step1Description,
      'Choose the statements to include. You can search, filter, and group the list.',
    ),
    step2Description: resolveLabel(
      createFromStatementsAny.step2Description,
      'Set table details and review what will be exported before creating the table.',
    ),
    nameOptional: resolveLabel(createFromStatementsAny.nameOptional, 'Name (optional)'),
    namePlaceholder: resolveLabel(
      createFromStatementsAny.namePlaceholder,
      'e.g. Payments from statement',
    ),
    descriptionOptional: resolveLabel(
      createFromStatementsAny.descriptionOptional,
      'Description (optional)',
    ),
    descriptionPlaceholder: resolveLabel(
      createFromStatementsAny.descriptionPlaceholder,
      'Optional',
    ),
    statementsLoading: resolveLabel(createFromStatementsAny.statementsLoading, 'Loading...'),
    statementsEmpty: resolveLabel(createFromStatementsAny.statementsEmpty, 'No statements'),
    hint: resolveLabel(
      createFromStatementsAny.hint,
      'Only processed statements with transactions are available',
    ),
    searchPlaceholder: resolveLabel(
      createFromStatementsAny.searchPlaceholder,
      'Search by file, source, or period',
    ),
    sourceFilter: resolveLabel(createFromStatementsAny.sourceFilter, 'Source'),
    sourceAll: resolveLabel(createFromStatementsAny.sourceAll, 'All sources'),
    groupBy: resolveLabel(createFromStatementsAny.groupBy, 'Group by'),
    groupBySource: resolveLabel(createFromStatementsAny.groupBySource, 'Source'),
    groupByPeriod: resolveLabel(createFromStatementsAny.groupByPeriod, 'Period'),
    sourceLabel: resolveLabel(createFromStatementsAny.sourceLabel, 'Source'),
    periodLabel: resolveLabel(createFromStatementsAny.periodLabel, 'Period'),
    fileLabel: resolveLabel(createFromStatementsAny.fileLabel, 'File'),
    rowsLabel: resolveLabel(createFromStatementsAny.rowsLabel, 'Rows'),
    selectedLabel: resolveLabel(createFromStatementsAny.selectedLabel, 'Selected: {count}'),
    duplicateUploads: resolveLabel(
      createFromStatementsAny.duplicateUploads,
      'Duplicate uploads: {count} (latest is used)',
    ),
    noSearchResults: resolveLabel(
      createFromStatementsAny.noSearchResults,
      'No statements match the current filters',
    ),
    previewTitle: resolveLabel(createFromStatementsAny.previewTitle, 'Preview'),
    previewSummary: resolveLabel(
      createFromStatementsAny.previewSummary,
      'You are creating a table from {statements} statements',
    ),
    previewRows: resolveLabel(createFromStatementsAny.previewRows, 'Total rows: {rows}'),
    previewEditable: resolveLabel(
      createFromStatementsAny.previewEditable,
      'You can still change statement selection on Step 1.',
    ),
    next: resolveLabel(createFromStatementsAny.next, 'Next'),
    back: resolveLabel(createFromStatementsAny.back, 'Back'),
    createWithRows: resolveLabel(createFromStatementsAny.createWithRows, 'Create ({rows} rows)'),
    creating: resolveLabel(createFromStatementsAny.creating, 'Creating...'),
  };
  const columnLabels = {
    name: resolveLabel((t as any)?.columns?.name, 'Name'),
    purpose: resolveLabel((t as any)?.columns?.purpose, 'Purpose / Type'),
    source: resolveLabel((t as any)?.columns?.source, 'Source'),
    rows: resolveLabel((t as any)?.columns?.rows, 'Rows'),
    updatedAt: resolveLabel((t as any)?.columns?.updatedAt, 'Last updated'),
    actions: resolveLabel((t as any)?.columns?.actions, 'Actions'),
  };
  const emptyLabels = {
    title: resolveLabel((t as any)?.empty?.title, 'No export tables yet'),
    description: resolveLabel(
      (t as any)?.empty?.description,
      'Create a table for accounting exports from statements and receipts.',
    ),
    step1: resolveLabel((t as any)?.empty?.step1, '1. Select statements or receipts to include'),
    step2: resolveLabel(
      (t as any)?.empty?.step2,
      '2. Pick fields: date, amount, merchant, category, VAT',
    ),
    step3: resolveLabel((t as any)?.empty?.step3, '3. Create the table structure'),
    step4: resolveLabel((t as any)?.empty?.step4, '4. Export to Excel or refresh anytime'),
  };

  const filterLinkClassName =
    'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-primary';
  const formatPaginationLabel = (template: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce(
      (result, [key, value]) => result.replace(`{${key}}`, String(value)),
      template,
    );

  const sourceOptions = [
    { value: 'all' as const, label: filterLabels.all },
    { value: 'manual' as const, label: filterLabels.manual },
    { value: 'google_sheets_import' as const, label: filterLabels.sheets },
    { value: 'statement' as const, label: filterLabels.statement },
  ];
  const sortOptions = [
    { value: 'updated_desc' as const, label: filterLabels.sortUpdated },
    { value: 'name_asc' as const, label: filterLabels.sortName },
  ];
  const shouldShowGrowthHint = filteredItems.length > 0 && filteredItems.length <= 2;

  const applySourceFilters = () => {
    setFilterSource(draftFilterSource);
    setSourceDropdownOpen(false);
  };

  const resetSourceFilters = () => {
    setDraftFilterSource('all');
    setFilterSource('all');
    setSourceDropdownOpen(false);
  };

  const applySortFilters = () => {
    setSortOrder(draftSortOrder);
    setSortDropdownOpen(false);
  };

  const resetSortFilters = () => {
    setDraftSortOrder('updated_desc');
    setSortOrder('updated_desc');
    setSortDropdownOpen(false);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterSource !== 'all') count += 1;
    if (sortOrder !== 'updated_desc') count += 1;
    return count;
  }, [filterSource, sortOrder]);

  const handleOpenFiltersDrawer = () => {
    setDraftFilterSource(filterSource);
    setDraftSortOrder(sortOrder);
    setFiltersDrawerScreen('root');
    setFiltersDrawerOpen(true);
  };

  const resetAllFilters = () => {
    setDraftFilterSource('all');
    setDraftSortOrder('updated_desc');
    setFilterSource('all');
    setSortOrder('updated_desc');
    setFiltersDrawerScreen('root');
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-500">
        {t.auth.loading}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {t.auth.loginRequired}
        </div>
      </div>
    );
  }

  return (
    <>
      <CustomTablesFiltersDrawer
        open={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        filters={{ source: draftFilterSource, sortOrder: draftSortOrder }}
        screen={filtersDrawerScreen}
        onBack={() => setFiltersDrawerScreen('root')}
        onSelect={field => setFiltersDrawerScreen(field)}
        onUpdateFilters={next => {
          if (typeof next.source !== 'undefined') {
            setDraftFilterSource(next.source);
          }
          if (typeof next.sortOrder !== 'undefined') {
            setDraftSortOrder(next.sortOrder);
          }
        }}
        onResetAll={resetAllFilters}
        onViewResults={() => {
          setFilterSource(draftFilterSource);
          setSortOrder(draftSortOrder);
          setFiltersDrawerOpen(false);
        }}
        sourceOptions={sourceOptions}
        sortOptions={sortOptions}
        labels={{
          title: filterOptionLabels.drawerTitle,
          resetFilters: filterOptionLabels.resetFilters,
          viewResults: filterOptionLabels.viewResults,
          saveSearch: filterOptionLabels.saveSearch,
          general: filterOptionLabels.drawerGeneral,
          source: sourceLabel,
          sort: filterLabels.sort,
          any: filterOptionLabels.any,
        }}
        activeCount={activeFilterCount}
      />
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-gray-900">{headerTitle}</h1>
                <p className="mt-2 max-w-3xl text-sm text-gray-600">{headerSubtitle}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void openCreateFromStatements()}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {createExportTableLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-primary hover:text-primary"
                >
                  <TableIcon className="h-4 w-4" />
                  {createLabel}
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">{ctaDescriptionLabel}</p>
          </div>

          <div className="relative" data-tour-id="search-bar">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full rounded-md border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              open={sourceDropdownOpen}
              onOpenChange={setSourceDropdownOpen}
              trigger={
                <FilterChipButton active={filterSource !== 'all'}>
                  {filterSource !== 'all'
                    ? sourceOptions.find(option => option.value === filterSource)?.label ||
                      filterLabels.all
                    : filterLabels.all}
                  <ChevronDown className="h-3.5 w-3.5" />
                </FilterChipButton>
              }
            >
              <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
                {sourceOptions.map(option => (
                  <FilterOptionRow
                    key={option.value}
                    label={option.label}
                    selected={draftFilterSource === option.value}
                    onClick={() => setDraftFilterSource(option.value)}
                    variant="radio"
                  />
                ))}
              </div>
              <FilterActions
                onReset={resetSourceFilters}
                onApply={applySourceFilters}
                applyLabel={filterOptionLabels.apply}
                resetLabel={filterOptionLabels.reset}
              />
            </FilterDropdown>

            <FilterDropdown
              open={sortDropdownOpen}
              onOpenChange={setSortDropdownOpen}
              trigger={
                <FilterChipButton active={sortOrder !== 'updated_desc'}>
                  {sortOrder === 'updated_desc' ? filterLabels.sortUpdated : filterLabels.sortName}
                  <ChevronDown className="h-3.5 w-3.5" />
                </FilterChipButton>
              }
            >
              <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
                {sortOptions.map(option => (
                  <FilterOptionRow
                    key={option.value}
                    label={option.label}
                    selected={draftSortOrder === option.value}
                    onClick={() => setDraftSortOrder(option.value)}
                    variant="radio"
                  />
                ))}
              </div>
              <FilterActions
                onReset={resetSortFilters}
                onApply={applySortFilters}
                applyLabel={filterOptionLabels.apply}
                resetLabel={filterOptionLabels.reset}
              />
            </FilterDropdown>

            <button type="button" className={filterLinkClassName} onClick={handleOpenFiltersDrawer}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {filterLabels.filters}
              {activeFilterCount > 0 ? (
                <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        <div data-tour-id="tables-list">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingAnimation size="lg" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 sm:px-10 sm:py-12">
              <div className="mx-auto h-16 w-16 text-gray-300 mb-4 bg-gray-50 rounded-full flex items-center justify-center">
                <TableIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center">
                {emptyLabels.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 text-center">{emptyLabels.description}</p>
              <div className="mt-5 mx-auto max-w-2xl rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-left">
                <ol className="space-y-2 text-sm text-gray-700">
                  <li>{emptyLabels.step1}</li>
                  <li>{emptyLabels.step2}</li>
                  <li>{emptyLabels.step3}</li>
                  <li>{emptyLabels.step4}</li>
                </ol>
              </div>
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => void openCreateFromStatements()}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {createFirstExportTableLabel}
                </button>
              </div>
            </div>
          ) : (
            <>
              {shouldShowGrowthHint ? (
                <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary-700">
                  {growthHintLabel}
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="hidden md:flex items-center gap-3 px-4 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <div className="w-4" />
                  <div className="w-11" />
                  <div className="w-3" />
                  <div className="min-w-[260px] flex-1">{columnLabels.name}</div>
                  <div className="w-44">{columnLabels.purpose}</div>
                  <div className="w-40">{columnLabels.source}</div>
                  <div className="w-24 text-right">{columnLabels.rows}</div>
                  <div className="w-28 text-right">{columnLabels.updatedAt}</div>
                  <div className="w-[360px] text-right">{columnLabels.actions}</div>
                </div>
                {registryItems.map(table => (
                  <div
                    key={table.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
                    onClick={() => router.push(`/custom-tables/${table.id}`)}
                    onKeyDown={event => {
                      if (event.target !== event.currentTarget) {
                        return;
                      }

                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(`/custom-tables/${table.id}`);
                      }
                    }}
                  >
                    <Checkbox
                      aria-label={table.name}
                      onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary shrink-0"
                    />
                    <button
                      type="button"
                      className="w-11 shrink-0 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={event => {
                        event.stopPropagation();
                        router.push(`/custom-tables/${table.id}`);
                      }}
                      title={openLabel}
                    >
                      {table.category?.icon ? (
                        <Icon icon={table.category.icon} className="h-5 w-5 text-gray-700" />
                      ) : (
                        <TableIcon className="h-5 w-5 text-gray-600" />
                      )}
                    </button>
                    <div className="w-3 shrink-0" />
                    <div className="min-w-[260px] flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {table.displayName}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 truncate">
                        {fromLabel}: {table.sourceDescriptor} · {columnLabels.rows}:{' '}
                        {table.rowsCountLabel} · {columnLabels.updatedAt}:{' '}
                        {formatUpdatedDate(table.updatedAt)}
                      </div>
                      {table.createdFromBadge ? (
                        <div className="mt-1 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {table.createdFromBadge}
                        </div>
                      ) : table.description ? (
                        <div className="text-xs text-gray-500 truncate">{table.description}</div>
                      ) : null}
                    </div>
                    <span className="hidden w-44 shrink-0 text-xs font-semibold text-gray-700 md:inline-block">
                      {table.purpose}
                    </span>
                    <span className="hidden w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500 md:inline-block">
                      {table.sourceSummary}
                    </span>
                    <span className="hidden w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900 md:inline-block">
                      {table.rowsCountLabel}
                    </span>
                    <span className="hidden w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900 md:inline-block">
                      {table.updatedLabel}
                    </span>
                    <div className="flex items-center justify-end gap-2 md:w-[360px] md:shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <HeroButton
                            size="sm"
                            color="primary"
                            isDisabled={exportingTableId === table.id}
                            onClick={event => event.stopPropagation()}
                            className="font-medium"
                          >
                            {exportLabel}
                          </HeroButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="min-w-[180px]" align="end">
                          <DropdownMenuItem
                            onClick={event => {
                              event.stopPropagation();
                              void handleExportTable(table, 'csv');
                            }}
                            className="cursor-pointer"
                          >
                            {exportCsvLabel}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={event => {
                              event.stopPropagation();
                              void handleExportTable(table, 'xlsx');
                            }}
                            className="cursor-pointer"
                          >
                            {exportXlsxLabel}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <HeroButton
                        size="sm"
                        variant="bordered"
                        className="font-medium border-gray-200 text-gray-700 hover:border-primary hover:text-primary"
                        onClick={event => {
                          event.stopPropagation();
                          router.push(`/custom-tables/${table.id}`);
                        }}
                      >
                        {openLabel}
                      </HeroButton>

                      <HeroButton
                        size="sm"
                        variant="light"
                        className="text-gray-500 font-medium hover:text-gray-800"
                        isDisabled={updatingTableId === table.id}
                        onClick={event => {
                          event.stopPropagation();
                          void handleUpdateData(table);
                        }}
                        startContent={<RefreshCcw className="h-3.5 w-3.5" />}
                      >
                        {updateDataLabel}
                      </HeroButton>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <HeroButton
                            isIconOnly
                            size="sm"
                            variant="bordered"
                            className="border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                            onClick={event => event.stopPropagation()}
                            aria-label="More actions"
                          >
                            <Ellipsis className="h-4 w-4" />
                          </HeroButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="min-w-[180px]" align="end">
                          <DropdownMenuItem
                            onClick={event => {
                              event.stopPropagation();
                              confirmDelete(table);
                            }}
                            className="cursor-pointer text-red-600 focus:text-red-700"
                          >
                            <span className="inline-flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              {deleteLabel}
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <ChevronRight className="hidden h-5 w-5 text-gray-400 md:block" />
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4"
                data-tour-id="pagination"
              >
                <div className="text-sm text-gray-600">
                  {filteredItems.length === 0
                    ? emptyLabels.title
                    : formatPaginationLabel(paginationLabels.shown, {
                        from: rangeStart,
                        to: rangeEnd,
                        count: filteredItems.length,
                      })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 min-w-[120px] text-center">
                    {formatPaginationLabel(paginationLabels.pageOf, {
                      page,
                      count: totalPages || 1,
                    })}
                  </span>
                  <AppPagination page={page} total={totalPages || 1} onChange={setPage} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Modal
        isOpen={createFromStatementsOpen}
        onOpenChange={next => {
          if (!next) {
            closeCreateFromStatements();
          }
        }}
        size="5xl"
        placement="center"
        backdrop="opaque"
        scrollBehavior="inside"
        classNames={{
          base: 'rounded-xl border border-gray-200 shadow-xl',
          backdrop: 'bg-gray-900/40 backdrop-blur-[1px]',
          closeButton:
            'text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors',
        }}
      >
        <ModalContent>
          <>
            <ModalHeader className="flex-col items-start gap-0 border-b border-gray-200 px-6 py-5">
              <div className="text-3xl font-semibold text-gray-900">
                {createFromStatementsLabels.title}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {formatPaginationLabel(createFromStatementsLabels.stepCounter, {
                  current: createFromStatementsStep,
                  total: 2,
                })}
              </div>
            </ModalHeader>

            <ModalBody className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                    createFromStatementsStep === 1
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {createFromStatementsLabels.step1}
                </div>
                <div
                  className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                    createFromStatementsStep === 2
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {createFromStatementsLabels.step2}
                </div>
              </div>

              {createFromStatementsStep === 1 ? (
                <div className="space-y-3">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {createFromStatementsLabels.step1Description}
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder={createFromStatementsLabels.searchPlaceholder}
                        value={statementsSearchQuery}
                        onChange={e => setStatementsSearchQuery(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>{createFromStatementsLabels.sourceFilter}</InputLabel>
                        <Select
                          value={statementsSourceFilter}
                          label={createFromStatementsLabels.sourceFilter}
                          onChange={e => setStatementsSourceFilter(e.target.value)}
                        >
                          {statementSourceOptions.map(option => (
                            <MenuItem key={option} value={option}>
                              {option === 'all' ? createFromStatementsLabels.sourceAll : option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>{createFromStatementsLabels.groupBy}</InputLabel>
                        <Select
                          value={statementsGroupBy}
                          label={createFromStatementsLabels.groupBy}
                          onChange={e => setStatementsGroupBy(e.target.value as StatementGroupBy)}
                        >
                          <MenuItem value="source">
                            {createFromStatementsLabels.groupBySource}
                          </MenuItem>
                          <MenuItem value="period">
                            {createFromStatementsLabels.groupByPeriod}
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <div className="max-h-[360px] space-y-3 overflow-y-auto rounded-lg border border-gray-200 p-2">
                    {statementsLoading ? (
                      <Typography variant="caption">
                        {createFromStatementsLabels.statementsLoading}
                      </Typography>
                    ) : statementSelectionOptions.length === 0 ? (
                      <Typography variant="caption">
                        {createFromStatementsLabels.statementsEmpty}
                      </Typography>
                    ) : groupedStatementSelectionOptions.length === 0 ? (
                      <Typography variant="caption">
                        {createFromStatementsLabels.noSearchResults}
                      </Typography>
                    ) : (
                      groupedStatementSelectionOptions.map(group => (
                        <div key={group.key} className="rounded-md border border-gray-200">
                          <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">
                            {group.label} ({group.options.length})
                          </div>
                          <div className="divide-y divide-gray-100">
                            {group.options.map(option => {
                              const checked = selectedStatementIds.includes(
                                option.representativeId,
                              );

                              return (
                                <button
                                  key={option.representativeId}
                                  type="button"
                                  disabled={option.disabled}
                                  onClick={() => {
                                    setSelectedStatementIds(prev =>
                                      checked
                                        ? prev.filter(id => id !== option.representativeId)
                                        : [...prev, option.representativeId],
                                    );
                                  }}
                                  className={`flex w-full items-start gap-3 px-3 py-2 text-left transition ${
                                    option.disabled
                                      ? 'cursor-not-allowed opacity-50'
                                      : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <Checkbox checked={checked} className="mt-1 h-4 w-4" />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-gray-900">
                                      {option.title}
                                    </div>
                                    <div className="truncate text-xs text-gray-500">
                                      {createFromStatementsLabels.sourceLabel}: {option.sourceLabel}{' '}
                                      - {createFromStatementsLabels.periodLabel}:{' '}
                                      {option.periodLabel}
                                    </div>
                                    <div className="truncate text-xs text-gray-500">
                                      {createFromStatementsLabels.fileLabel}: {option.fileLabel}
                                    </div>
                                    {option.duplicateCount > 1 ? (
                                      <div className="text-xs text-amber-700">
                                        {formatPaginationLabel(
                                          createFromStatementsLabels.duplicateUploads,
                                          {
                                            count: option.duplicateCount,
                                          },
                                        )}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="shrink-0 text-xs font-semibold text-gray-700">
                                    {option.rowsLabel}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{createFromStatementsLabels.hint}</span>
                    <span>
                      {formatPaginationLabel(createFromStatementsLabels.selectedLabel, {
                        count: selectedStatementSummary.selectedCount,
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {createFromStatementsLabels.step2Description}
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        label={createFromStatementsLabels.nameOptional}
                        placeholder={createFromStatementsLabels.namePlaceholder}
                        helperText={namingHintLabel}
                        fullWidth
                        size="small"
                        value={createFromStatementsForm.name}
                        onChange={e =>
                          setCreateFromStatementsForm(prev => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <TextField
                        label={createFromStatementsLabels.descriptionOptional}
                        placeholder={createFromStatementsLabels.descriptionPlaceholder}
                        fullWidth
                        size="small"
                        value={createFromStatementsForm.description}
                        onChange={e =>
                          setCreateFromStatementsForm(prev => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                    </Grid>
                  </Grid>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {createFromStatementsLabels.previewTitle}
                    </div>
                    <div className="mt-1 text-sm text-gray-700">
                      {formatPaginationLabel(createFromStatementsLabels.previewSummary, {
                        statements: selectedStatementSummary.selectedCount,
                      })}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatPaginationLabel(createFromStatementsLabels.previewRows, {
                        rows: selectedStatementSummary.totalRows,
                      })}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {createFromStatementsLabels.previewEditable}
                    </div>

                    <div className="mt-3 max-h-32 space-y-1 overflow-y-auto">
                      {selectedStatementPreviewItems.map(option => (
                        <div
                          key={option.representativeId}
                          className="flex items-center justify-between rounded border border-gray-200 bg-white px-2 py-1"
                        >
                          <span className="truncate text-xs text-gray-700">{option.title}</span>
                          <span className="text-xs font-medium text-gray-900">
                            {option.rowsLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </ModalBody>

            <ModalFooter className="gap-2 border-t border-gray-200 px-6 py-4">
              <Button onClick={closeCreateFromStatements} type="button">
                {t.actions.cancel.value}
              </Button>

              {createFromStatementsStep === 1 ? (
                <Button
                  variant="contained"
                  disabled={!selectedStatementSummary.selectedCount}
                  onClick={() => setCreateFromStatementsStep(2)}
                  type="button"
                >
                  {createFromStatementsLabels.next}
                </Button>
              ) : (
                <>
                  <Button onClick={() => setCreateFromStatementsStep(1)} type="button">
                    {createFromStatementsLabels.back}
                  </Button>
                  <Button
                    variant="contained"
                    disabled={!selectedStatementPayloadIds.length || creatingFromStatements}
                    onClick={handleCreateFromStatements}
                    type="button"
                  >
                    {creatingFromStatements
                      ? createFromStatementsLabels.creating
                      : selectedStatementSummary.totalRows > 0
                        ? formatPaginationLabel(createFromStatementsLabels.createWithRows, {
                            rows: selectedStatementSummary.totalRows,
                          })
                        : t.actions.create.value}
                  </Button>
                </>
              )}
            </ModalFooter>
          </>
        </ModalContent>
      </Modal>
      {createOpen && (
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
          <DialogTitle>{t.create.title}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label={t.create.name}
                  placeholder={t.create.namePlaceholder.value}
                  helperText={namingHintLabel}
                  fullWidth
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  label={t.create.description}
                  placeholder={t.create.descriptionPlaceholder.value}
                  fullWidth
                  value={form.description}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>{t.create.category}</InputLabel>
                  <Select
                    value={form.categoryId}
                    label={t.create.category}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        categoryId: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="">
                      <em>{t.create.noCategory}</em>
                    </MenuItem>
                    {categories.map(c => (
                      <MenuItem key={c.id} value={c.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              bgcolor: c.color,
                              borderRadius: 0.5,
                            }}
                          />
                          {c.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)} type="button">
              {t.actions.cancel.value}
            </Button>
            <Button
              variant="contained"
              disabled={!canCreate || creating}
              onClick={handleCreate}
              type="button"
            >
              {creating ? t.create.creating.value : t.actions.create.value}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title={(t.confirmDelete as any).title.value}
        message={
          deleteTarget
            ? `${(t.confirmDelete as any).messageWithNamePrefix.value}${deleteTarget.name}${(t.confirmDelete as any).messageWithNameSuffix.value}`
            : (t.confirmDelete as any).messageNoName.value
        }
        confirmText={(t.confirmDelete as any).confirm.value}
        cancelText={(t.confirmDelete as any).cancel.value}
        isDestructive
      />
    </>
  );
}
