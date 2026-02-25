'use client';

import { FilterActions } from '@/app/(main)/statements/components/filters/FilterActions';
import { FilterDropdown } from '@/app/(main)/statements/components/filters/FilterDropdown';
import { FilterOptionRow } from '@/app/(main)/statements/components/filters/FilterOptionRow';
import ConfirmModal from '@/app/components/ConfirmModal';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { Checkbox } from '@/app/components/ui/checkbox';
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
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Table as TableIcon,
  Trash2,
} from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import CustomTablesCircularMenu from './components/CustomTablesCircularMenu';
import { CustomTablesFiltersDrawer } from './components/CustomTablesFiltersDrawer';

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
  const [selectedStatementIds, setSelectedStatementIds] = useState<string[]>([]);
  const [creatingFromStatements, setCreatingFromStatements] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomTableItem | null>(null);

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

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    return filteredItems.slice(start, end);
  }, [filteredItems, page]);

  const totalPages = Math.ceil(filteredItems.length / ROWS_PER_PAGE);
  const rangeStart = filteredItems.length === 0 ? 0 : (page - 1) * ROWS_PER_PAGE + 1;
  const rangeEnd = Math.min(page * ROWS_PER_PAGE, filteredItems.length);

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

  const openCreateFromStatements = useCallback(async () => {
    setCreateFromStatementsOpen(true);
    setSelectedStatementIds([]);
    setCreateFromStatementsForm({ name: '', description: '' });
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
    if (!selectedStatementIds.length) {
      toast.error(t.toasts.selectAtLeastOneStatement.value);
      return;
    }
    setCreatingFromStatements(true);
    try {
      const response = await apiClient.post('/custom-tables/from-statements', {
        statementIds: selectedStatementIds,
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
      setCreateFromStatementsOpen(false);
      setSelectedStatementIds([]);
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

  const resolveLabel = (value: any, fallback: string) => value?.value ?? value ?? fallback;
  const searchPlaceholder = resolveLabel((t as any).searchPlaceholder, 'Search tables...');
  const sourcesAny = (t.sources as any) ?? {};
  const filtersAny = (t as any).filters ?? {};
  const sidePanelAny = (t as any).sidePanel ?? {};
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
  const openMenuLabel = resolveLabel(sidePanelAny.openMenu, 'Open table actions');

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
      <CustomTablesCircularMenu
        placement="floating"
        onCreateEmpty={() => handleTableAction('create-empty')}
        onImportFromStatement={() => handleTableAction('import-statement')}
        onImportGoogleSheets={() => handleTableAction('import-google-sheets')}
        labels={{
          createTable: createLabel,
          fromStatement: filterLabels.statement,
          importGoogleSheets: filterLabels.sheets,
          openMenu: openMenuLabel,
        }}
      />
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 space-y-3">
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
            <div className="text-center py-20 px-4">
              <div className="mx-auto h-16 w-16 text-gray-300 mb-4 bg-gray-50 rounded-full flex items-center justify-center">
                <TableIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">{t.empty}</h3>
              <p className="mt-3 text-sm text-gray-500">{openMenuLabel}</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="hidden md:flex items-center gap-3 px-4 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <div className="w-4" />
                  <div className="w-11" />
                  <div className="w-3" />
                  <div className="flex-1">{t.columns.name.value}</div>
                  <div className="w-28">{t.columns.source.value}</div>
                  <div className="w-28 text-right">{t.columns.updatedAt.value}</div>
                  <div className="w-36 text-right">{t.columns.actions.value}</div>
                </div>
                {paginatedItems.map(table => (
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
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {table.name}
                      </div>
                      {table.description && (
                        <div className="text-xs text-gray-500 truncate">{table.description}</div>
                      )}
                    </div>
                    <span className="hidden w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:inline-block">
                      {table.source === 'google_sheets_import'
                        ? filterLabels.sheets
                        : table.source === 'statement'
                          ? filterLabels.statement
                          : filterLabels.manual}
                    </span>
                    <span className="hidden w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900 sm:inline-block">
                      {formatUpdatedDate(table.updatedAt)}
                    </span>
                    <div className="flex items-center justify-end gap-2 sm:w-36 sm:shrink-0">
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          confirmDelete(table);
                        }}
                        className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm text-gray-500 transition-colors hover:border-red-200 hover:text-red-600"
                        aria-label={t.actions.delete.value}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          router.push(`/custom-tables/${table.id}`);
                        }}
                        className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary hover:text-primary"
                      >
                        {openLabel}
                      </button>
                      <ChevronRight className="hidden h-5 w-5 text-gray-400 sm:block" />
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
                    ? t.empty
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
      {createFromStatementsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">{t.createFromStatements.title}</Typography>
              <IconButton
                onClick={() => setCreateFromStatementsOpen(false)}
                size="small"
                type="button"
              >
                <Icon icon="mdi:close" />
              </IconButton>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label={t.createFromStatements.nameOptional}
                  placeholder={t.createFromStatements.namePlaceholder.value}
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
                  label={t.createFromStatements.descriptionOptional}
                  placeholder={t.createFromStatements.descriptionPlaceholder.value}
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
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t.createFromStatements.statements}
                </Typography>
                <Box
                  sx={{
                    maxHeight: 200,
                    overflow: 'auto',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  {statementsLoading ? (
                    <Typography variant="caption">
                      {t.createFromStatements.statementsLoading}
                    </Typography>
                  ) : statements.length === 0 ? (
                    <Typography variant="caption">
                      {t.createFromStatements.statementsEmpty}
                    </Typography>
                  ) : (
                    statements.map(s => {
                      const disabled =
                        !s.totalTransactions ||
                        s.status === 'error' ||
                        s.status === 'uploaded' ||
                        s.status === 'processing';
                      const checked = selectedStatementIds.includes(s.id);
                      return (
                        <Box
                          key={s.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            opacity: disabled ? 0.5 : 1,
                          }}
                        >
                          <IconButton
                            size="small"
                            disabled={disabled}
                            onClick={() => {
                              setSelectedStatementIds(prev =>
                                checked ? prev.filter(id => id !== s.id) : [...prev, s.id],
                              );
                            }}
                            type="button"
                          >
                            {checked ? (
                              <Icon icon="mdi:check-box-outline" />
                            ) : (
                              <Icon icon="mdi:checkbox-blank-outline" />
                            )}
                          </IconButton>
                          <Typography variant="body2" noWrap title={s.fileName}>
                            {s.fileName || s.id}
                          </Typography>
                          <Box sx={{ ml: 'auto' }}>
                            <Typography variant="caption">{s.totalTransactions ?? 0}</Typography>
                          </Box>
                        </Box>
                      );
                    })
                  )}
                </Box>
              </Grid>
            </Grid>
            <Box
              sx={{
                mt: 3,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1,
              }}
            >
              <Button onClick={() => setCreateFromStatementsOpen(false)} type="button">
                {t.actions.cancel.value}
              </Button>
              <Button
                variant="contained"
                disabled={!selectedStatementIds.length || creatingFromStatements}
                onClick={handleCreateFromStatements}
                type="button"
              >
                {creatingFromStatements
                  ? t.createFromStatements.creating.value
                  : t.actions.create.value}
              </Button>
            </Box>
          </div>
        </div>
      )}
      {createOpen && (
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
          <DialogTitle>{t.create.title}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label={t.create.name}
                  placeholder={t.create.namePlaceholder.value}
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
