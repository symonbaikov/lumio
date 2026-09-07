'use client';

import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import type { CustomTableSortOrder, CustomTableSourceFilter } from '@/app/lib/custom-table-actions';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { formatUpdatedBadge } from '../customTablesHelpers';
import {
  type TableRegistryItem,
  formatRowsCount,
  resolveCreatedFromBadge,
  resolveHumanTableName,
  resolveSourceSummary,
  resolveTablePurpose,
} from '../table-registry-utils';

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

interface UseCustomTablesDataMessages {
  loadTablesFailed: string;
}

export interface UseCustomTablesDataReturn {
  items: CustomTableItem[];
  setItems: React.Dispatch<React.SetStateAction<CustomTableItem[]>>;
  categories: Category[];
  loading: boolean;
  rowsCountByTableId: Record<string, number>;
  setRowsCountByTableId: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  filterSource: CustomTableSourceFilter;
  setFilterSource: React.Dispatch<React.SetStateAction<CustomTableSourceFilter>>;
  sortOrder: CustomTableSortOrder;
  setSortOrder: React.Dispatch<React.SetStateAction<CustomTableSortOrder>>;
  draftFilterSource: CustomTableSourceFilter;
  setDraftFilterSource: React.Dispatch<React.SetStateAction<CustomTableSourceFilter>>;
  draftSortOrder: CustomTableSortOrder;
  setDraftSortOrder: React.Dispatch<React.SetStateAction<CustomTableSortOrder>>;
  sourceDropdownOpen: boolean;
  setSourceDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sortDropdownOpen: boolean;
  setSortDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filtersDrawerOpen: boolean;
  setFiltersDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filtersDrawerScreen: string;
  setFiltersDrawerScreen: React.Dispatch<React.SetStateAction<string>>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  filteredCount: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  registryItems: ReturnType<typeof buildRegistryItems>;
  loadTables: () => Promise<void>;
}

const ROWS_PER_PAGE = 20;

function buildRegistryItems(
  paginatedItems: CustomTableItem[],
  rowsCountByTableId: Record<string, number>,
) {
  return paginatedItems.map(item => {
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
  });
}

export function useCustomTablesData(
  isAuthenticated: boolean,
  authLoading: boolean,
  messages: UseCustomTablesDataMessages,
): UseCustomTablesDataReturn {
  const [items, setItems] = useState<CustomTableItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowsCountByTableId, setRowsCountByTableId] = useState<Record<string, number>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<CustomTableSourceFilter>('all');
  const [sortOrder, setSortOrder] = useState<CustomTableSortOrder>('updated_desc');
  const [draftFilterSource, setDraftFilterSource] = useState<CustomTableSourceFilter>('all');
  const [draftSortOrder, setDraftSortOrder] = useState<CustomTableSortOrder>('updated_desc');
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [filtersDrawerScreen, setFiltersDrawerScreen] = useState('root');
  const [page, setPage] = useState(1);

  const loadCategories = useCallback(async () => {
    await (async () => {
      const response = await apiClient.get('/categories');
      const payload = response.data?.data || response.data || [];
      setCategories(Array.isArray(payload) ? payload : []);
    })().catch(async error => {
      console.error('Failed to load categories:', error);
    });
  }, []);

  const loadTables = useCallback(async () => {
    setLoading(true);

    await (async () => {
      const response = await apiClient.get('/custom-tables');
      const payload =
        response.data?.items || response.data?.data?.items || response.data?.data || [];
      setItems(Array.isArray(payload) ? payload : []);
    })()
      .catch(async error => {
        console.error('Failed to load custom tables:', error);
        toast.error(getApiErrorMessage(error, messages.loadTablesFailed));
      })
      .finally(async () => {
        setLoading(false);
      });
  }, [messages.loadTablesFailed]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      void loadTables();
      void loadCategories();
    }
  }, [authLoading, isAuthenticated, loadCategories, loadTables]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(q));
    }

    if (filterSource !== 'all') {
      result = result.filter(item => item.source === filterSource);
    }

    if (sortOrder === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return result;
  }, [items, searchQuery, filterSource, sortOrder]);

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

  const registryItems = useMemo(
    () => buildRegistryItems(paginatedItems, rowsCountByTableId),
    [paginatedItems, rowsCountByTableId],
  );

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
          return await (async () => {
            const response = await apiClient.get(`/custom-tables/${table.id}/rows`, {
              params: { limit: 1 },
            });
            const total = Number(response.data?.meta?.total);
            return [table.id, Number.isFinite(total) ? total : 0] as const;
          })().catch(async () => {
            return [table.id, 0] as const;
          });
        }),
      );

      if (cancelled) {
        return;
      }

      setRowsCountByTableId(prev => {
        const next = { ...prev };
        for (const [id, count] of entries) {
          next[id] = count;
        }
        return next;
      });
    };

    void loadRowsCount();

    return () => {
      cancelled = true;
    };
  }, [paginatedItems, rowsCountByTableId]);

  return {
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
    filteredCount: filteredItems.length,
    totalPages,
    rangeStart,
    rangeEnd,
    registryItems,
    loadTables,
  };
}
