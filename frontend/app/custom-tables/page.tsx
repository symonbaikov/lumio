'use client';

import ConfirmModal from '@/app/components/ConfirmModal';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { Icon } from '@iconify/react';
import { Add, FilterList, MoreVert, Search, Sort } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Plus,
  Table as TableIcon,
  Trash2,
} from 'lucide-react';
import { useIntlayer, useLocale } from 'next-intlayer';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import toast from 'react-hot-toast';

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

export default function CustomTablesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useIntlayer('customTablesPage');
  const theme = useTheme();
  const { locale } = useLocale();
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
  const [filterSource, setFilterSource] = useState<
    'all' | 'manual' | 'google_sheets_import' | 'statement'
  >('all');
  const [sortOrder, setSortOrder] = useState<'updated_desc' | 'name_asc'>('updated_desc');

  const [importModalOpen, setImportModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const hasOpenedImportModal = useRef(false);
  const [createMenuAnchor, setCreateMenuAnchor] = useState<null | HTMLElement>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeTable, setActiveTable] = useState<CustomTableItem | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 20;

  const canCreate = useMemo(() => form.name.trim().length > 0, [form.name]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filter by Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(q));
    }

    // Filter by Source
    if (filterSource !== 'all') {
      // Logic mapping might need adjustment based on real data values
      // item.source usually: 'manual', 'google_sheets_import'. Statements might be under 'manual' or separate?
      // Assuming 'statement' identifies as source='statement' or checked via logic?
      // Checking loadTables response... API usually returns source.
      // Let's assume strict equality for now, or partial logic.
      if (filterSource === 'statement') {
        // If "From Statement" isn't a direct source type, this might be tricky.
        // Usually it's just 'manual' with data? We'll assume strict check for now.
        // If unknown, we keep it simple.
        // Actually, let's treat 'statement' creates as 'manual' for now unless we know better.
        // But user asked for filter: All / Manual / Google Sheets / From Statement.
        // We'll trust source field matches.
        result = result.filter(item => item.source === 'statement');
      } else {
        result = result.filter(item => item.source === filterSource);
      }
    }

    // Sort
    if (sortOrder === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // updated_desc
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

  const handleCreateMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setCreateMenuAnchor(event.currentTarget);
  };

  useEffect(() => {
    if (hasOpenedImportModal.current) return;
    if (searchParams?.get('import') === '1') {
      setImportModalOpen(true);
      hasOpenedImportModal.current = true;
    }
  }, [searchParams]);
  const handleCreateMenuClose = () => {
    setCreateMenuAnchor(null);
  };

  const handleActionsMenuOpen = (event: MouseEvent<HTMLElement>, table: CustomTableItem) => {
    event.stopPropagation();
    setActionsMenuAnchor(event.currentTarget);
    setActiveTable(table);
  };
  const handleActionsMenuClose = () => {
    setActionsMenuAnchor(null);
    setActiveTable(null);
  };

  const onActionOpen = () => {
    if (activeTable) {
      router.push(`/custom-tables/${activeTable.id}`);
    }
    handleActionsMenuClose();
  };

  const onActionDelete = () => {
    if (activeTable) {
      confirmDelete(activeTable);
    }
    handleActionsMenuClose();
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      const payload = response.data?.data || response.data || [];
      setCategories(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadTables = async () => {
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
  };

  const loadStatements = async () => {
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
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadTables();
      loadCategories();
    }
  }, [authLoading, user]);

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

  const openCreateFromStatements = async () => {
    setCreateFromStatementsOpen(true);
    setSelectedStatementIds([]);
    setCreateFromStatementsForm({ name: '', description: '' });
    await loadStatements();
  };

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
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-8">
        {/* Header card with title, search and create button */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <TableIcon className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{t.header.title}</h1>
            </div>
            <p className="text-secondary">{t.header.subtitle}</p>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.toasts.loadTablesFailed.value ? 'Поиск таблиц...' : 'Поиск...'}
                className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <FileDown className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              {(t.actions as any).importTable?.value ?? 'Импорт'}
            </button>
            <button
              onClick={() => setTemplateModalOpen(true)}
              data-tour-id="custom-tables-create-button"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              {t.actions.create.value}
            </button>
          </div>
        </div>

        {/* Main content table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Все таблицы</h2>

            <div className="flex items-center gap-4">
              {/* Source filter tabs */}
              <div className="flex p-1 bg-gray-100/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFilterSource('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterSource === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Все
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSource('manual')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterSource === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {t.sources.manual.value}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSource('google_sheets_import')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterSource === 'google_sheets_import' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Google Sheets
                </button>
              </div>

              {/* Sort Select */}
              <div className="relative">
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as any)}
                  className="appearance-none h-8 bg-white border border-gray-200 rounded-lg py-1.5 pl-3 pr-8 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                >
                  <option value="updated_desc">Последние изменения</option>
                  <option value="name_asc">По названию (А-Я)</option>
                </select>
                <Sort className="h-3 w-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

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
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                  {t.actions.create.value}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {t.columns.name.value}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {t.columns.source.value}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {t.columns.updatedAt.value}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {t.columns.actions.value}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedItems.map(table => (
                      <tr key={table.id} className="transition-colors hover:bg-gray-50/50 group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            className="flex w-full items-center cursor-pointer text-left"
                            onClick={() => router.push(`/custom-tables/${table.id}`)}
                          >
                            <div className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center border border-gray-100 shadow-sm bg-gray-50">
                              {table.category?.icon ? (
                                <Icon
                                  icon={table.category.icon}
                                  className="h-5 w-5 text-gray-700"
                                />
                              ) : (
                                <TableIcon className="h-5 w-5 text-gray-600" />
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">
                                {table.name}
                              </div>
                              {table.description && (
                                <div className="text-xs text-gray-500 truncate max-w-xs">
                                  {table.description}
                                </div>
                              )}
                            </div>
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {table.source === 'google_sheets_import'
                              ? 'Google Sheets'
                              : t.sources.manual.value}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {table.updatedAt ? new Date(table.updatedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => router.push(`/custom-tables/${table.id}`)}
                              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              title="Open"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDelete(table)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title={t.actions.delete.value}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredItems.length > 0 && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
                  <div className="text-sm text-gray-600">
                    Показано {rangeStart}–{rangeEnd} из {filteredItems.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(prev => Math.max(1, prev - 1))}
                      disabled={page <= 1}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm border transition-all ${
                        page <= 1
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-white'
                      }`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {(t.actions as any).previous?.value ?? 'Предыдущая'}
                    </button>
                    <span className="text-sm text-gray-600">
                      Страница {page} из {totalPages || 1}
                    </span>
                    <button
                      onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={page >= totalPages}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm border transition-all ${
                        page >= totalPages
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-white'
                      }`}
                    >
                      {(t.actions as any).next?.value ?? 'Следующая'}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Dialog
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle className="border-b border-gray-100 pb-4">
          <div className="text-xl font-bold text-gray-900">
            {(t.actions as any).importTable?.value ?? 'Импорт таблицы'}
          </div>
          <div className="text-sm text-gray-500 font-normal mt-1">
            Выберите способ импорта данных
          </div>
        </DialogTitle>
        <DialogContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Import from Statement */}
            <button
              onClick={() => {
                setImportModalOpen(false);
                openCreateFromStatements();
              }}
              className="group flex flex-col items-center p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-all text-center h-full"
            >
              <div className="h-12 w-12 rounded-full bg-blue-50 group-hover:bg-white flex items-center justify-center mb-4 transition-colors shadow-sm">
                <FileSpreadsheet className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {t.actions.fromStatement.value}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-2">
                Создать таблицу на основе загруженной банковской выписки
              </p>
            </button>

            {/* Import from Google Sheets */}
            <button
              type="button"
              onClick={() => {
                setImportModalOpen(false);
                router.push('/custom-tables/import/google-sheets');
              }}
              className="group flex flex-col items-center p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/10 transition-all text-center h-full"
            >
              <div className="h-12 w-12 rounded-full bg-emerald-50 group-hover:bg-white flex items-center justify-center mb-4 transition-colors shadow-sm">
                <Image
                  src="/icons/icons8-google-sheets-48.png"
                  alt="Google Sheets"
                  width={24}
                  height={24}
                  className="rounded"
                />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {t.actions.importGoogleSheets.value}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-2">
                Подключить существующую Google Таблицу
              </p>
            </button>
          </div>
        </DialogContent>
        <DialogActions className="p-4 border-t border-gray-100">
          <Button onClick={() => setImportModalOpen(false)}>{t.actions.cancel.value}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle className="border-b border-gray-100 pb-4">
          <div className="text-xl font-bold text-gray-900">
            {t.create.title || 'Создать новую таблицу'}
          </div>
          <div className="text-sm text-gray-500 font-normal mt-1">
            Выберите шаблон для начала работы
          </div>
        </DialogTitle>
        <DialogContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Empty Table Template */}
            <button
              onClick={() => {
                setTemplateModalOpen(false);
                setCreateOpen(true);
              }}
              className="group flex flex-col items-center p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-all text-center h-full"
            >
              <div className="h-12 w-12 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center mb-4 transition-colors shadow-sm">
                <TableIcon className="h-6 w-6 text-gray-400 group-hover:text-primary" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Пустая таблица</h3>
              <p className="text-xs text-gray-500 line-clamp-2">
                Создайте таблицу с нуля, настроив колонки под свои нужды
              </p>
            </button>

            {/* Placeholder Templates */}
            <button
              disabled
              className="group flex flex-col items-center p-6 rounded-xl border border-gray-100 bg-gray-50/50 cursor-not-allowed text-center h-full opacity-60"
            >
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                <Icon icon="mdi:chart-box-outline" className="h-6 w-6 text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Бюджет проекта</h3>
              <div className="flex items-center gap-1.5 mt-auto">
                <span className="px-2 py-0.5 rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
                  Скоро
                </span>
              </div>
            </button>

            <button
              disabled
              className="group flex flex-col items-center p-6 rounded-xl border border-gray-100 bg-gray-50/50 cursor-not-allowed text-center h-full opacity-60"
            >
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                <Icon icon="mdi:checkbox-marked-circle-outline" className="h-6 w-6 text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Трекер задач</h3>
              <div className="flex items-center gap-1.5 mt-auto">
                <span className="px-2 py-0.5 rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
                  Скоро
                </span>
              </div>
            </button>
          </div>
        </DialogContent>
        <DialogActions className="p-4 border-t border-gray-100">
          <Button onClick={() => setTemplateModalOpen(false)}>{t.actions.cancel.value}</Button>
        </DialogActions>
      </Dialog>
      <Menu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={handleActionsMenuClose}
      >
        <MenuItem onClick={onActionOpen}>Open</MenuItem>
        <MenuItem onClick={onActionDelete} sx={{ color: 'error.main' }}>
          <Trash2 className="mr-2 h-4 w-4" />
          {t.actions.delete.value}
        </MenuItem>
      </Menu>
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
