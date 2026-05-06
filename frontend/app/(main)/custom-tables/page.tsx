'use client';

import { FilterActions } from '@/app/(main)/statements/components/filters/FilterActions';
import { FilterDropdown } from '@/app/(main)/statements/components/filters/FilterDropdown';
import { FilterOptionRow } from '@/app/(main)/statements/components/filters/FilterOptionRow';
import ConfirmModal from '@/app/components/ConfirmModal';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import { AppPagination } from '@/app/components/ui/pagination';
import { Spinner } from '@/app/components/ui/spinner';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import {
  CUSTOM_TABLES_OPEN_ACTION_EVENT,
  CUSTOM_TABLES_VIEW_EVENT,
  type CustomTableAction,
  type CustomTableActionEventDetail,
  type CustomTableSortOrder,
  type CustomTableSourceFilter,
  type CustomTableViewEventDetail,
} from '@/app/lib/custom-table-actions';
import { Tag as CategoryIcon } from '@/app/components/icons';
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
} from '@/app/components/icons';
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
import { useCustomTablesData } from './hooks/useCustomTablesData';

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

import { getNestedValue, getRecord, resolveLabel } from '@/app/lib/side-panel-utils';
import {
  type ExportColumn,
  formatUpdatedBadge,
  formatUpdatedDate,
  getExportColumn,
  sanitizeFileName,
  toCsv,
} from './customTablesHelpers';
import { tokens } from '@/lib/theme-tokens';
import { useTheme } from 'next-themes';

type TranslationValue = string | { value?: string };

const tx = (root: unknown, path: string[], fallback: string) =>
  resolveLabel(getNestedValue(root, path), fallback);

export default function CustomTablesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const t = useIntlayer('customTablesPage');
  const {
    items,
    setItems,
    categories,
    loading,
    rowsCountByTableId,
    setRowsCountByTableId,
    searchQuery,
    setSearchQuery,
    filterSource,
    setFilterSource,
    sortOrder,
    setSortOrder,
    draftFilterSource,
    setDraftFilterSource,
    draftSortOrder,
    setDraftSortOrder,
    sourceDropdownOpen,
    setSourceDropdownOpen,
    sortDropdownOpen,
    setSortDropdownOpen,
    filtersDrawerOpen,
    setFiltersDrawerOpen,
    filtersDrawerScreen,
    setFiltersDrawerScreen,
    page,
    setPage,
    filteredCount,
    totalPages,
    rangeStart,
    rangeEnd,
    registryItems,
    loadTables,
  } = useCustomTablesData(Boolean(user), authLoading, {
    loadTablesFailed: t.toasts.loadTablesFailed.value,
  });

  const [statements, setStatements] = useState<StatementItem[]>([]);
  const [statementsLoading, setStatementsLoading] = useState(false);
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
  const [exportingTableId, setExportingTableId] = useState<string | null>(null);
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);
  const hasHandledImportParam = useRef(false);

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

  useEffect(() => {
    const available = new Set(statementSelectionOptions.map(option => option.representativeId));
    setSelectedStatementIds(prev => prev.filter(id => available.has(id)));
  }, [statementSelectionOptions]);

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
      toast.error(getApiErrorMessage(error, t.toasts.loadStatementsFailed.value));
    } finally {
      setStatementsLoading(false);
    }
  }, [t.toasts.loadStatementsFailed.value]);

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
      toast.error(getApiErrorMessage(error, t.toasts.createFailed.value));
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
      toast.error(getApiErrorMessage(error, t.toasts.createFromStatementFailed.value));
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

  const handleExportTable = useCallback(async (table: CustomTableItem, format: 'csv' | 'xlsx') => {
    setExportingTableId(table.id);
    const toastId = toast.loading(`Export ${table.name}...`);

    try {
      const [tableResponse] = await Promise.all([apiClient.get(`/custom-tables/${table.id}`)]);

      const detail = tableResponse.data?.data || tableResponse.data;
      const columns = Array.isArray(detail?.columns)
        ? detail.columns
            .map((column: unknown) => getExportColumn(column))
            .filter((column: ExportColumn | null): column is ExportColumn => column !== null)
            .sort((a: ExportColumn, b: ExportColumn) => (a.position || 0) - (b.position || 0))
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

      const headers = columns.map((column: ExportColumn) => column.title || column.key);
      const normalizedRows = rows.map(row => {
        const mapped: Record<string, unknown> = {};
        columns.forEach((column: ExportColumn, index: number) => {
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
      toast.error(getApiErrorMessage(error, 'Failed to export table'), {
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
        toast.error(getApiErrorMessage(error, 'Failed to update table data'));
      } finally {
        setUpdatingTableId(prev => (prev === table.id ? null : prev));
      }
    },
    [loadTables, router],
  );

  const headerTitle = tx(t, ['header', 'title'], 'Tables');
  const headerSubtitle = tx(
    t,
    ['header', 'subtitle'],
    'Export and manage structured tables created from statements and receipts for accounting and reporting.',
  );
  const searchPlaceholder = tx(t, ['searchPlaceholder'], 'Search tables...');
  const sourcesT = getRecord(getNestedValue(t, ['sources'])) ?? {};
  const filtersT = getRecord(getNestedValue(t, ['filters'])) ?? {};
  const actionsT = getRecord(getNestedValue(t, ['actions'])) ?? {};
  const confirmDeleteT = getRecord(getNestedValue(t, ['confirmDelete'])) ?? {};
  const createFromStatementsT = getRecord(getNestedValue(t, ['createFromStatements'])) ?? {};
  const sourceLabel = resolveLabel(sourcesT.label, 'Source');
  const filterLabels = {
    all: resolveLabel(filtersT.all, 'All'),
    manual: resolveLabel(sourcesT.manual, 'Manual'),
    sheets: resolveLabel(sourcesT.googleSheets, 'Google Sheets'),
    statement: resolveLabel(filtersT.fromStatement, 'From statement'),
    sortUpdated: resolveLabel(filtersT.sortUpdated, 'Recent updates'),
    sortName: resolveLabel(filtersT.sortName, 'By name'),
    filters: resolveLabel(filtersT.filters, 'Filters'),
    sort: resolveLabel(filtersT.sort, 'Sort'),
  };
  const filterOptionLabels = {
    apply: resolveLabel(filtersT.apply, 'Apply'),
    reset: resolveLabel(filtersT.reset, 'Reset'),
    resetFilters: resolveLabel(filtersT.resetFilters, 'Reset filters'),
    viewResults: resolveLabel(filtersT.viewResults, 'View results'),
    saveSearch: resolveLabel(filtersT.saveSearch, 'Save search'),
    any: resolveLabel(filtersT.any, 'Any'),
    drawerTitle: resolveLabel(filtersT.drawerTitle, 'Filters'),
    drawerGeneral: resolveLabel(filtersT.drawerGeneral, 'General'),
  };
  const tableFilterChipStyle = {
    height: 38,
    borderColor: c.ink200,
    borderRadius: tokens.radius.full,
    backgroundColor: c.surface,
    color: c.ink900,
    fontSize: 14,
    fontWeight: 600,
  };
  const paginationLabels = {
    shown: tx(t, ['pagination', 'shown'], 'Showing {from}–{to} of {count}'),
    previous: tx(t, ['pagination', 'previous'], 'Previous'),
    next: tx(t, ['pagination', 'next'], 'Next'),
    pageOf: tx(t, ['pagination', 'pageOf'], 'Page {page} of {count}'),
  };
  const openLabel = resolveLabel(actionsT.open, 'Open');
  const createLabel = resolveLabel(actionsT.create, 'Create');
  const createExportTableLabel = resolveLabel(actionsT.createExportTable, 'Create export table');
  const createFirstExportTableLabel = resolveLabel(
    actionsT.createFirstExportTable,
    'Create your first export table',
  );
  const importGoogleSheetsLabel = resolveLabel(
    actionsT.importGoogleSheets,
    'Import from Google Sheets',
  );
  const createBlankTableLabel = resolveLabel(actionsT.createBlankTable, 'Create blank table');
  const exportLabel = resolveLabel(actionsT.export, 'Export');
  const exportCsvLabel = resolveLabel(actionsT.exportCsv, 'CSV');
  const exportXlsxLabel = resolveLabel(actionsT.exportXlsx, 'XLSX');
  const updateDataLabel = resolveLabel(actionsT.updateData, 'Update data');
  const deleteLabel = resolveLabel(actionsT.delete, 'Delete');
  const fromLabel = tx(t, ['fromLabel'], 'From');
  const growthHintLabel = resolveLabel(
    getNestedValue(t, ['growthHint']),
    'You can create multiple export tables for different reports or periods.',
  );
  const namingHintLabel = resolveLabel(
    getNestedValue(t, ['namingHint']),
    'Try clear names: Expenses export - Feb 2026, VAT reconciliation - Q1, Bank statements export.',
  );
  const ctaDescriptionLabel = resolveLabel(
    getNestedValue(t, ['ctaDescription']),
    'Create a table by mapping fields from statements or receipts for export to Excel or accounting systems.',
  );
  const createFromStatementsLabels = {
    title: resolveLabel(createFromStatementsT.title, 'Create table from statements'),
    step1: resolveLabel(createFromStatementsT.step1, 'Step 1 - Select statements'),
    step2: resolveLabel(createFromStatementsT.step2, 'Step 2 - Table details'),
    stepCounter: resolveLabel(createFromStatementsT.stepCounter, 'Step {current} of {total}'),
    step1Description: resolveLabel(
      createFromStatementsT.step1Description,
      'Choose the statements to include. You can search, filter, and group the list.',
    ),
    step2Description: resolveLabel(
      createFromStatementsT.step2Description,
      'Set table details and review what will be exported before creating the table.',
    ),
    nameOptional: resolveLabel(createFromStatementsT.nameOptional, 'Name (optional)'),
    namePlaceholder: resolveLabel(
      createFromStatementsT.namePlaceholder,
      'e.g. Payments from statement',
    ),
    descriptionOptional: resolveLabel(
      createFromStatementsT.descriptionOptional,
      'Description (optional)',
    ),
    descriptionPlaceholder: resolveLabel(createFromStatementsT.descriptionPlaceholder, 'Optional'),
    statementsLoading: resolveLabel(createFromStatementsT.statementsLoading, 'Loading...'),
    statementsEmpty: resolveLabel(createFromStatementsT.statementsEmpty, 'No statements'),
    hint: resolveLabel(
      createFromStatementsT.hint,
      'Only processed statements with transactions are available',
    ),
    searchPlaceholder: resolveLabel(
      createFromStatementsT.searchPlaceholder,
      'Search by file, source, or period',
    ),
    sourceFilter: resolveLabel(createFromStatementsT.sourceFilter, 'Source'),
    sourceAll: resolveLabel(createFromStatementsT.sourceAll, 'All sources'),
    groupBy: resolveLabel(createFromStatementsT.groupBy, 'Group by'),
    groupBySource: resolveLabel(createFromStatementsT.groupBySource, 'Source'),
    groupByPeriod: resolveLabel(createFromStatementsT.groupByPeriod, 'Period'),
    sourceLabel: resolveLabel(createFromStatementsT.sourceLabel, 'Source'),
    periodLabel: resolveLabel(createFromStatementsT.periodLabel, 'Period'),
    fileLabel: resolveLabel(createFromStatementsT.fileLabel, 'File'),
    rowsLabel: resolveLabel(createFromStatementsT.rowsLabel, 'Rows'),
    selectedLabel: resolveLabel(createFromStatementsT.selectedLabel, 'Selected: {count}'),
    duplicateUploads: resolveLabel(
      createFromStatementsT.duplicateUploads,
      'Duplicate uploads: {count} (latest is used)',
    ),
    noSearchResults: resolveLabel(
      createFromStatementsT.noSearchResults,
      'No statements match the current filters',
    ),
    previewTitle: resolveLabel(createFromStatementsT.previewTitle, 'Preview'),
    previewSummary: resolveLabel(
      createFromStatementsT.previewSummary,
      'You are creating a table from {statements} statements',
    ),
    previewRows: resolveLabel(createFromStatementsT.previewRows, 'Total rows: {rows}'),
    previewEditable: resolveLabel(
      createFromStatementsT.previewEditable,
      'You can still change statement selection on Step 1.',
    ),
    next: resolveLabel(createFromStatementsT.next, 'Next'),
    back: resolveLabel(createFromStatementsT.back, 'Back'),
    createWithRows: resolveLabel(createFromStatementsT.createWithRows, 'Create ({rows} rows)'),
    creating: resolveLabel(createFromStatementsT.creating, 'Creating...'),
  };
  const columnLabels = {
    name: tx(t, ['columns', 'name'], 'Name'),
    purpose: tx(t, ['columns', 'purpose'], 'Purpose / Type'),
    source: tx(t, ['columns', 'source'], 'Source'),
    rows: tx(t, ['columns', 'rows'], 'Rows'),
    updatedAt: tx(t, ['columns', 'updatedAt'], 'Last updated'),
    actions: tx(t, ['columns', 'actions'], 'Actions'),
  };
  const emptyLabels = {
    title: tx(t, ['empty', 'title'], 'No export tables yet'),
    description: resolveLabel(
      getNestedValue(t, ['empty', 'description']),
      'Create a table for accounting exports from statements and receipts.',
    ),
    step1: tx(t, ['empty', 'step1'], '1. Select statements or receipts to include'),
    step2: resolveLabel(
      getNestedValue(t, ['empty', 'step2']),
      '2. Pick fields: date, amount, merchant, category, VAT',
    ),
    step3: tx(t, ['empty', 'step3'], '3. Create the table structure'),
    step4: tx(t, ['empty', 'step4'], '4. Export to Excel or refresh anytime'),
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
  const shouldShowGrowthHint = filteredCount > 0 && filteredCount <= 2;

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
      <Box sx={{ display: 'flex', minHeight: '50vh', alignItems: 'center', justifyContent: 'center', color: c.ink500 }}>
        {t.auth.loading}
      </Box>
    );
  }

  if (!user) {
    return (
      <Box className="container-shared" sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 5 }}>
        <Box sx={{ border: `1px solid ${c.ink150}`, bgcolor: 'background.paper', p: 3, fontSize: 14, color: c.ink700 }}>
          {t.auth.loginRequired}
        </Box>
      </Box>
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
      <Box className="container-shared" sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 6 }}>
        <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ border: `1px solid ${c.ink150}`, borderRadius: tokens.radius.lg, bgcolor: 'background.paper', px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' }, justifyContent: { md: 'space-between' } }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h1" style={{ fontSize: 24, fontWeight: 600, color: c.ink900 }}>{headerTitle}</Typography>
                <Typography style={{ marginTop: 8, maxWidth: 672, fontSize: 14, color: c.ink500 }}>{headerSubtitle}</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => void openCreateFromStatements()}
                  data-tour-id="custom-tables-create-export"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: '#fff', px: 2.5, py: 1.25, fontSize: 14, fontWeight: 600, border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', '&:hover': { bgcolor: 'primary.dark' } }}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {createExportTableLabel}
                </Box>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Box
                      component="button"
                      type="button"
                      data-tour-id="custom-tables-create-dropdown"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, border: `1px solid ${c.ink150}`, borderRadius: tokens.radius.md, bgcolor: 'background.paper', px: 2, py: 1.25, fontSize: 14, fontWeight: 500, color: c.ink900, cursor: 'pointer', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}
                    >
                      <TableIcon className="h-4 w-4" />
                      {createLabel}
                      <ChevronDown className="h-4 w-4" />
                    </Box>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleTableAction('import-google-sheets')}>
                      {importGoogleSheetsLabel}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTableAction('create-empty')}>
                      {createBlankTableLabel}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Box>
            </Box>
            <Typography style={{ marginTop: 12, fontSize: 12, color: c.ink500 }}>{ctaDescriptionLabel}</Typography>
          </Box>

          <Box sx={{ position: 'relative' }} data-tour-id="search-bar">
            <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: c.ink400 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              style={{ width: '100%', border: `1px solid ${c.ink150}`, borderRadius: tokens.radius.md, background: 'var(--card-bg)', padding: '12px 16px 12px 44px', fontSize: 14, color: c.ink900, boxSizing: 'border-box' }}
            />
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <FilterDropdown
              open={sourceDropdownOpen}
              onOpenChange={setSourceDropdownOpen}
              trigger={
                <FilterChipButton
                  active={filterSource !== 'all'}
                  data-tour-id="custom-tables-source-filter"
                  style={tableFilterChipStyle}
                >
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                    {filterSource !== 'all'
                      ? sourceOptions.find(option => option.value === filterSource)?.label ||
                        filterLabels.all
                      : filterLabels.all}
                    <ChevronDown size={16} />
                  </Box>
                </FilterChipButton>
              }
            >
              <Box sx={{ maxHeight: 320, display: 'flex', flexDirection: 'column', gap: 0.5, overflowY: 'auto', pr: 0.5 }}>
                {sourceOptions.map(option => (
                  <FilterOptionRow
                    key={option.value}
                    label={option.label}
                    selected={draftFilterSource === option.value}
                    onClick={() => setDraftFilterSource(option.value)}
                    variant="radio"
                  />
                ))}
              </Box>
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
                <FilterChipButton active={sortOrder !== 'updated_desc'} style={tableFilterChipStyle}>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                    {sortOrder === 'updated_desc' ? filterLabels.sortUpdated : filterLabels.sortName}
                    <ChevronDown size={16} />
                  </Box>
                </FilterChipButton>
              }
            >
              <Box sx={{ maxHeight: 320, display: 'flex', flexDirection: 'column', gap: 0.5, overflowY: 'auto', pr: 0.5 }}>
                {sortOptions.map(option => (
                  <FilterOptionRow
                    key={option.value}
                    label={option.label}
                    selected={draftSortOrder === option.value}
                    onClick={() => setDraftSortOrder(option.value)}
                    variant="radio"
                  />
                ))}
              </Box>
              <FilterActions
                onReset={resetSortFilters}
                onApply={applySortFilters}
                applyLabel={filterOptionLabels.apply}
                resetLabel={filterOptionLabels.reset}
              />
            </FilterDropdown>

            <Box
              component="button"
              type="button"
              onClick={handleOpenFiltersDrawer}
              sx={{ height: 38, display: 'inline-flex', alignItems: 'center', gap: 1, border: `1px solid ${c.ink200}`, borderRadius: tokens.radius.full, bgcolor: 'background.paper', px: 2, py: 0, fontSize: 14, fontWeight: 600, color: c.ink900, cursor: 'pointer', '&:hover': { borderColor: c.ink300, bgcolor: c.ink50 } }}
            >
              <SlidersHorizontal size={18} />
              {filterLabels.filters}
              {activeFilterCount > 0 ? (
                <Box component="span" sx={{ ml: 0.5, display: 'inline-flex', width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.full, bgcolor: 'rgba(22,129,24,0.1)', fontSize: 12, fontWeight: 600, color: 'primary.main' }}>
                  {activeFilterCount}
                </Box>
              ) : null}
            </Box>
          </Box>
        </Box>

        <Box data-tour-id="tables-list">
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
              <Spinner className="h-20 w-20 text-primary" />
            </Box>
          ) : filteredCount === 0 ? (
            <Box sx={{ border: `1px solid ${c.ink150}`, borderRadius: tokens.radius.lg, bgcolor: 'background.paper', px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 6 } }}>
              <Box sx={{ mx: 'auto', mb: 2, display: 'flex', width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.full, bgcolor: 'action.hover', color: c.ink400 }}>
                <TableIcon className="h-8 w-8" />
              </Box>
              <Typography style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, color: c.ink900 }}>
                {emptyLabels.title}
              </Typography>
              <Typography style={{ marginTop: 8, textAlign: 'center', fontSize: 14, color: c.ink500 }}>
                {emptyLabels.description}
              </Typography>
              <Box sx={{ mt: 2.5, mx: 'auto', maxWidth: 672, border: `1px solid ${c.ink150}`, borderRadius: tokens.radius.lg, bgcolor: c.ink50, p: 2 }}>
                <Box component="ol" sx={{ m: 0, pl: 2, display: 'flex', flexDirection: 'column', gap: 1, fontSize: 14, color: c.ink900 }}>
                  <li>{emptyLabels.step1}</li>
                  <li>{emptyLabels.step2}</li>
                  <li>{emptyLabels.step3}</li>
                  <li>{emptyLabels.step4}</li>
                </Box>
              </Box>
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => void openCreateFromStatements()}
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: '#fff', px: 2.5, py: 1.25, fontSize: 14, fontWeight: 600, border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', '&:hover': { bgcolor: 'primary.dark' } }}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {createFirstExportTableLabel}
                </Box>
              </Box>
            </Box>
          ) : (
            <>
              {shouldShowGrowthHint ? (
                <Box sx={{ mb: 1.5, border: '1px solid rgba(22,129,24,0.2)', borderRadius: tokens.radius.lg, bgcolor: 'rgba(22,129,24,0.05)', px: 2, py: 1.5, fontSize: 14, color: c.primary }}>
                  {growthHintLabel}
                </Box>
              ) : null}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'hidden' }}>
                <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5, px: 2, fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.ink500 }}>
                  <Box sx={{ width: 16 }} />
                  <Box sx={{ width: 44 }} />
                  <Box sx={{ width: 12 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>{columnLabels.name}</Box>
                  <Box sx={{ width: 120, flexShrink: 1 }}>{columnLabels.purpose}</Box>
                  <Box sx={{ width: 120, flexShrink: 1 }}>{columnLabels.source}</Box>
                  <Box sx={{ width: 72, flexShrink: 0, textAlign: 'right' }}>{columnLabels.rows}</Box>
                  <Box sx={{ width: 96, flexShrink: 0, textAlign: 'right' }}>{columnLabels.updatedAt}</Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>{columnLabels.actions}</Box>
                </Box>
                {registryItems.map(table => (
                  <Box
                    key={table.id}
                    sx={{ display: 'flex', cursor: 'pointer', alignItems: 'center', gap: 1.5, border: `1px solid ${c.ink150}`, borderRadius: tokens.radius.lg, bgcolor: 'background.paper', px: 2, py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}
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
                      className="h-4 w-4"
                      style={{ flexShrink: 0 }}
                    />
                    <Box
                      component="button"
                      type="button"
                      sx={{ width: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', bgcolor: 'transparent', border: 'none', '&:hover': { opacity: 0.8 } }}
                      onClick={event => {
                        event.stopPropagation();
                        router.push(`/custom-tables/${table.id}`);
                      }}
                      title={openLabel}
                    >
                      {table.category?.icon ? (
                        <CategoryIcon size={20} style={{ color: c.ink800 }} />
                      ) : (
                        <TableIcon className="h-5 w-5" style={{ color: c.ink700 }} />
                      )}
                    </Box>
                    <Box sx={{ width: 12, flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {table.displayName}
                      </Typography>
                      <Typography style={{ marginTop: 4, fontSize: 12, color: c.ink500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fromLabel}: {table.sourceDescriptor} · {columnLabels.rows}:{' '}
                        {table.rowsCountLabel} · {columnLabels.updatedAt}:{' '}
                        {formatUpdatedDate(table.updatedAt)}
                      </Typography>
                      {table.createdFromBadge ? (
                        <Box sx={{ mt: 0.5, display: 'inline-flex', alignItems: 'center', border: '1px solid rgba(22,129,24,0.2)', borderRadius: tokens.radius.sm, bgcolor: 'rgba(22,129,24,0.1)', px: 1, py: 0.25, fontSize: 11, fontWeight: 500, color: 'primary.main' }}>
                          {table.createdFromBadge}
                        </Box>
                      ) : table.description ? (
                        <Typography style={{ fontSize: 12, color: c.ink500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{table.description}</Typography>
                      ) : null}
                    </Box>
                    <Box sx={{ display: { xs: 'none', md: 'inline-block' }, width: 120, flexShrink: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: c.ink800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {table.purpose}
                    </Box>
                    <Box sx={{ display: { xs: 'none', md: 'inline-block' }, width: 120, flexShrink: 1, minWidth: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.ink500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {table.sourceSummary}
                    </Box>
                    <Box sx={{ display: { xs: 'none', md: 'inline-block' }, width: 72, flexShrink: 0, textAlign: 'right', fontSize: 14, fontWeight: 600, color: c.ink900 }}>
                      {table.rowsCountLabel}
                    </Box>
                    <Box sx={{ display: { xs: 'none', md: 'inline-block' }, width: 96, flexShrink: 0, textAlign: 'right', fontSize: 14, fontWeight: 600, color: c.ink900 }}>
                      {table.updatedLabel}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, flexShrink: 0 }}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Box
                            component="button"
                            type="button"
                            disabled={exportingTableId === table.id}
                            onClick={event => event.stopPropagation()}
                            sx={{ display: 'inline-flex', alignItems: 'center', bgcolor: 'primary.main', color: '#fff', px: 1.5, py: 0.75, fontSize: 14, fontWeight: 500, border: 'none', borderRadius: tokens.radius.md, cursor: 'pointer', '&:hover': { bgcolor: 'primary.dark' }, '&:disabled': { opacity: 0.5 } }}
                          >
                            {exportLabel}
                          </Box>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={event => {
                              event.stopPropagation();
                              void handleExportTable(table, 'csv');
                            }}
                          >
                            {exportCsvLabel}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={event => {
                              event.stopPropagation();
                              void handleExportTable(table, 'xlsx');
                            }}
                          >
                            {exportXlsxLabel}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Box
                        component="button"
                        type="button"
                        sx={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${c.ink150}`, borderRadius: tokens.radius.md, px: 1.5, py: 0.75, fontSize: 14, fontWeight: 500, color: c.ink800, bgcolor: 'transparent', cursor: 'pointer', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}
                        onClick={event => {
                          event.stopPropagation();
                          router.push(`/custom-tables/${table.id}`);
                        }}
                      >
                        {openLabel}
                      </Box>

                      <Box
                        component="button"
                        type="button"
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, fontSize: 14, fontWeight: 500, color: c.ink500, bgcolor: 'transparent', border: 'none', cursor: 'pointer', '&:hover': { color: c.ink900 }, '&:disabled': { opacity: 0.5 } }}
                        disabled={updatingTableId === table.id}
                        onClick={event => {
                          event.stopPropagation();
                          void handleUpdateData(table);
                        }}
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        {updateDataLabel}
                      </Box>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Box
                            component="button"
                            type="button"
                            sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${c.ink150}`, borderRadius: tokens.radius.sm, p: 0.75, color: c.ink700, bgcolor: 'transparent', cursor: 'pointer', '&:hover': { borderColor: c.ink300, color: c.ink900 } }}
                            onClick={event => event.stopPropagation()}
                            aria-label="More actions"
                          >
                            <Ellipsis className="h-4 w-4" />
                          </Box>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={event => {
                              event.stopPropagation();
                              confirmDelete(table);
                            }}
                            style={{ color: c.danger }}
                          >
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                              <Trash2 className="h-4 w-4" />
                              {deleteLabel}
                            </Box>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <ChevronRight className="h-5 w-5" style={{ color: c.ink400 }} />
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>

              <Box
                sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 1.5, pt: 2 }}
                data-tour-id="pagination"
              >
                <Typography style={{ fontSize: 14, color: c.ink700 }}>
                  {filteredCount === 0
                    ? emptyLabels.title
                    : formatPaginationLabel(paginationLabels.shown, {
                        from: rangeStart,
                        to: rangeEnd,
                        count: filteredCount,
                      })}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography style={{ fontSize: 14, color: c.ink700, minWidth: 120, textAlign: 'center' }}>
                    {formatPaginationLabel(paginationLabels.pageOf, {
                      page,
                      count: totalPages || 1,
                    })}
                  </Typography>
                  <AppPagination page={page} total={totalPages || 1} onChange={setPage} />
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
      <Dialog
        open={createFromStatementsOpen}
        onClose={closeCreateFromStatements}
        maxWidth="lg"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { border: '1px solid', borderColor: 'divider' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 3, py: 2.5 }}>
          <Typography style={{ fontSize: 20, fontWeight: 600, color: c.ink900 }}>
            {createFromStatementsLabels.title}
          </Typography>
          <Typography style={{ marginTop: 4, fontSize: 14, color: c.ink500 }}>
            {formatPaginationLabel(createFromStatementsLabels.stepCounter, {
              current: createFromStatementsStep,
              total: 2,
            })}
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: createFromStatementsStep === 1 ? 'primary.main' : c.ink150,
                    borderRadius: tokens.radius.sm,
                    bgcolor: createFromStatementsStep === 1 ? 'primary.50' : 'transparent',
                    px: 1.5,
                    py: 1,
                    fontSize: 12,
                    fontWeight: 500,
                    color: createFromStatementsStep === 1 ? 'primary.main' : c.ink500,
                  }}
                >
                  {createFromStatementsLabels.step1}
                </Box>
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: createFromStatementsStep === 2 ? 'primary.main' : c.ink150,
                    borderRadius: tokens.radius.sm,
                    bgcolor: createFromStatementsStep === 2 ? 'primary.50' : 'transparent',
                    px: 1.5,
                    py: 1,
                    fontSize: 12,
                    fontWeight: 500,
                    color: createFromStatementsStep === 2 ? 'primary.main' : c.ink500,
                  }}
                >
                  {createFromStatementsLabels.step2}
                </Box>
              </Box>

              {createFromStatementsStep === 1 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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

                  <Box sx={{ maxHeight: 360, overflowY: 'auto', border: `1px solid ${c.ink150}`, borderRadius: tokens.radius.lg, display: 'flex', flexDirection: 'column', gap: 1.5, p: 1 }}>
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
                        <Box key={group.key} sx={{ border: `1px solid ${c.ink150}`, borderRadius: tokens.radius.md }}>
                          <Box sx={{ borderBottom: `1px solid ${c.ink150}`, bgcolor: c.ink50, px: 1.5, py: 0.75, fontSize: 12, fontWeight: 600, color: c.ink700 }}>
                            {group.label} ({group.options.length})
                          </Box>
                          <Box>
                            {group.options.map((option, idx) => {
                              const checked = selectedStatementIds.includes(
                                option.representativeId,
                              );

                              return (
                                <Box
                                  key={option.representativeId}
                                  component="button"
                                  type="button"
                                  disabled={option.disabled}
                                  onClick={() => {
                                    setSelectedStatementIds(prev =>
                                      checked
                                        ? prev.filter(id => id !== option.representativeId)
                                        : [...prev, option.representativeId],
                                    );
                                  }}
                                  sx={{
                                    display: 'flex',
                                    width: '100%',
                                    alignItems: 'flex-start',
                                    gap: 1.5,
                                    px: 1.5,
                                    py: 1,
                                    textAlign: 'left',
                                    border: 'none',
                                    borderTop: idx > 0 ? `1px solid ${c.ink50}` : 'none',
                                    bgcolor: 'transparent',
                                    cursor: option.disabled ? 'not-allowed' : 'pointer',
                                    opacity: option.disabled ? 0.5 : 1,
                                    '&:hover': { bgcolor: option.disabled ? 'transparent' : c.ink50 },
                                  }}
                                >
                                  <Checkbox checked={checked} className="h-4 w-4" style={{ marginTop: 2, flexShrink: 0 }} />
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Box style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: c.ink900 }}>
                                      {option.title}
                                    </Box>
                                    <Box style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: c.ink500 }}>
                                      {createFromStatementsLabels.sourceLabel}: {option.sourceLabel}{' '}
                                      - {createFromStatementsLabels.periodLabel}:{' '}
                                      {option.periodLabel}
                                    </Box>
                                    <Box style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: c.ink500 }}>
                                      {createFromStatementsLabels.fileLabel}: {option.fileLabel}
                                    </Box>
                                    {option.duplicateCount > 1 ? (
                                      <Box style={{ fontSize: 12, color: c.warning }}>
                                        {formatPaginationLabel(
                                          createFromStatementsLabels.duplicateUploads,
                                          {
                                            count: option.duplicateCount,
                                          },
                                        )}
                                      </Box>
                                    ) : null}
                                  </Box>
                                  <Box style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: c.ink800 }}>
                                    {option.rowsLabel}
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      ))
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: c.ink500 }}>
                    <span>{createFromStatementsLabels.hint}</span>
                    <span>
                      {formatPaginationLabel(createFromStatementsLabels.selectedLabel, {
                        count: selectedStatementSummary.selectedCount,
                      })}
                    </span>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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

                  <Box sx={{ border: `1px solid ${c.ink150}`, borderRadius: tokens.radius.lg, bgcolor: c.ink50, p: 1.5 }}>
                    <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink900 }}>
                      {createFromStatementsLabels.previewTitle}
                    </Typography>
                    <Typography style={{ marginTop: 4, fontSize: 14, color: c.ink800 }}>
                      {formatPaginationLabel(createFromStatementsLabels.previewSummary, {
                        statements: selectedStatementSummary.selectedCount,
                      })}
                    </Typography>
                    <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink900 }}>
                      {formatPaginationLabel(createFromStatementsLabels.previewRows, {
                        rows: selectedStatementSummary.totalRows,
                      })}
                    </Typography>
                    <Typography style={{ marginTop: 4, fontSize: 12, color: c.ink500 }}>
                      {createFromStatementsLabels.previewEditable}
                    </Typography>

                    <Box sx={{ mt: 1.5, maxHeight: 128, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {selectedStatementPreviewItems.map(option => (
                        <Box
                          key={option.representativeId}
                          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${c.ink150}`, borderRadius: tokens.radius.sm, bgcolor: 'background.paper', px: 1, py: 0.5 }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: c.ink800 }}>{option.title}</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: c.ink900, flexShrink: 0, marginLeft: 8 }}>
                            {option.rowsLabel}
                          </span>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}
        </DialogContent>

        <DialogActions sx={{ gap: 1, borderTop: '1px solid', borderColor: 'divider', px: 3, py: 2 }}>
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
        </DialogActions>
      </Dialog>
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
                              borderRadius: tokens.radius.xs,
                              bgcolor: c.color,
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
        title={resolveLabel(confirmDeleteT.title, 'Delete table')}
        message={
          deleteTarget
            ? `${resolveLabel(confirmDeleteT.messageWithNamePrefix, 'Delete ')}${deleteTarget.name}${resolveLabel(confirmDeleteT.messageWithNameSuffix, '?')}`
            : resolveLabel(confirmDeleteT.messageNoName, 'Delete this table?')
        }
        confirmText={resolveLabel(confirmDeleteT.confirm, 'Delete')}
        cancelText={resolveLabel(confirmDeleteT.cancel, 'Cancel')}
        isDestructive
      />
    </>
  );
}
