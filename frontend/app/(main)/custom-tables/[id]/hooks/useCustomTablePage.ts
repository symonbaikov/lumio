'use client';

import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import type { SortingState } from '@tanstack/react-table';
import type { Locale } from 'date-fns';
import { enUS, kk, ru } from 'date-fns/locale';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConditionalRule } from '../utils/conditionalRules';
import { findPaidColumnKey } from '../utils/quickTabs';
import type { ColumnType, CustomTableColumn, CustomTableGridRow } from '../utils/stylingUtils';
import { tx } from '../utils/tableHelpers';
import type { CustomTable, CustomTablePageColumn } from '../utils/tableTypes';
import { useBulkRowActions } from './useBulkRowActions';
import type { ColumnFilterState } from './useColumnConfig';
import { useColumnConfig } from './useColumnConfig';
import { useColumnLayout } from './useColumnLayout';
import { useColumnManagement } from './useColumnManagement';
import { useConvertToStatement } from './useConvertToStatement';
import { useDeleteModals } from './useDeleteModals';
import { useFullscreenMode } from './useFullscreenMode';
import { useInsertSuccessToast } from './useInsertSuccessToast';
import { usePasteImport } from './usePasteImport';
import { useQuickTabState } from './useQuickTabState';
import { useRowActions } from './useRowActions';
import { useRowDrawer } from './useRowDrawer';
import { useTabStats } from './useTabStats';
import {
  type AggregateFn,
  type AggregateSelection,
  useTableAggregates,
} from './useTableAggregates';
import { useTableData } from './useTableData';
import { useTableFilters } from './useTableFilters';
import { type TableSortState, useTableGrid } from './useTableGrid';

function buildColumnTypes(t: unknown): { value: ColumnType; label: string }[] {
  return [
    { value: 'text' as const, label: tx(t, ['columnTypes', 'text'], 'Text') },
    { value: 'number' as const, label: tx(t, ['columnTypes', 'number'], 'Number') },
    { value: 'currency' as const, label: tx(t, ['columnTypes', 'currency'], 'Money') },
    { value: 'formula' as const, label: tx(t, ['columnTypes', 'formula'], 'Formula') },
    { value: 'ai' as const, label: tx(t, ['columnTypes', 'ai'], 'AI') },
    { value: 'date' as const, label: tx(t, ['columnTypes', 'date'], 'Date') },
    { value: 'boolean' as const, label: tx(t, ['columnTypes', 'boolean'], 'Yes/No') },
    { value: 'select' as const, label: tx(t, ['columnTypes', 'select'], 'Select') },
    {
      value: 'multi_select' as const,
      label: tx(t, ['columnTypes', 'multiSelect'], 'Multi-select'),
    },
  ];
}
function buildPasteDefaults(tOps: unknown): {
  date: string;
  type: string;
  amount: string;
  currency: string;
  comment: string;
  paid: string;
  columnPrefix: string;
} {
  return {
    date: tx(tOps, ['paste', 'defaults', 'date'], 'Date'),
    type: tx(tOps, ['paste', 'defaults', 'type'], 'Type'),
    amount: tx(tOps, ['paste', 'defaults', 'amount'], 'Amount'),
    currency: tx(tOps, ['paste', 'defaults', 'currency'], 'Currency'),
    comment: tx(tOps, ['paste', 'defaults', 'comment'], 'Comment'),
    paid: tx(tOps, ['paste', 'defaults', 'paid'], 'Paid'),
    columnPrefix: tx(tOps, ['paste', 'defaults', 'columnPrefix'], 'Column'),
  };
}
function buildPasteMessages(tOps: unknown): {
  noRows: string;
  missingColumnTitle: string;
  insertFailed: string;
  undoFailed: string;
  fileReadFailed: string;
  fileUnsupported: string;
  fileTooLarge: string;
  fileEmpty: string;
} {
  return {
    noRows: tx(tOps, ['paste', 'noRows'], ''),
    missingColumnTitle: tx(tOps, ['paste', 'missingColumnTitle'], ''),
    insertFailed: tx(tOps, ['paste', 'insertFailed'], ''),
    undoFailed: tx(tOps, ['paste', 'undoFailed'], ''),
    fileReadFailed: tx(tOps, ['paste', 'fileReadFailed'], 'Failed to read file'),
    fileUnsupported: tx(tOps, ['paste', 'fileUnsupported'], 'File format is not supported'),
    fileTooLarge: tx(tOps, ['paste', 'fileTooLarge'], 'File is too large'),
    fileEmpty: tx(tOps, ['paste', 'fileEmpty'], 'The file contains no data'),
  };
}
function buildRowActionsMessages(
  t: unknown,
  tOps: unknown,
): {
  addRowLoading: string;
  addRowSuccess: string;
  addRowFailed: string;
  saveValueFailed: string;
  noMoreRows: string;
} {
  return {
    addRowLoading: tx(tOps, ['addRow', 'loading'], ''),
    addRowSuccess: tx(tOps, ['addRow', 'success'], ''),
    addRowFailed: tx(tOps, ['addRow', 'failed'], ''),
    saveValueFailed: tx(t, ['grid', 'saveValueFailed'], ''),
    noMoreRows: tx(t, ['toasts', 'noMoreRows'], ''),
  };
}
function buildBulkActionsMessages(
  t: unknown,
  tModals: unknown,
): {
  deleteRowLoading: string;
  deleteRowSuccess: string;
  deleteRowFailed: string;
  bulkDeleteLoading: string;
  bulkDeleteSuccess: string;
  bulkDeleteFailed: string;
  creatingPaidColumn: string;
  paidColumnCreated: string;
  paidColumnCreateFailed: string;
  markingPaid: string;
  markingUnpaid: string;
  markedPaid: string;
  markedUnpaid: string;
  updateSomeRowsFailed: string;
  updateRowsFailed: string;
  paidColumnTitle: string;
} {
  return {
    deleteRowLoading: tx(tModals, ['deleteRow', 'loading'], ''),
    deleteRowSuccess: tx(tModals, ['deleteRow', 'success'], ''),
    deleteRowFailed: tx(tModals, ['deleteRow', 'failed'], ''),
    bulkDeleteLoading: tx(tModals, ['bulkDeleteRows', 'loading'], ''),
    bulkDeleteSuccess: tx(tModals, ['bulkDeleteRows', 'success'], ''),
    bulkDeleteFailed: tx(tModals, ['bulkDeleteRows', 'failed'], ''),
    creatingPaidColumn: tx(t, ['toasts', 'creatingPaidColumn'], ''),
    paidColumnCreated: tx(t, ['toasts', 'paidColumnCreated'], ''),
    paidColumnCreateFailed: tx(t, ['toasts', 'paidColumnCreateFailed'], ''),
    markingPaid: tx(t, ['actions', 'markingPaid'], ''),
    markingUnpaid: tx(t, ['actions', 'markingUnpaid'], ''),
    markedPaid: tx(t, ['toasts', 'markedPaid'], ''),
    markedUnpaid: tx(t, ['toasts', 'markedUnpaid'], ''),
    updateSomeRowsFailed: tx(t, ['toasts', 'updateSomeRowsFailed'], ''),
    updateRowsFailed: tx(t, ['toasts', 'updateRowsFailed'], ''),
    paidColumnTitle: tx(t, ['paidColumn'], 'Paid'),
  };
}
function buildColumnMgmtMessages(tModals: unknown): {
  addColumnLoading: string;
  addColumnSuccess: string;
  addColumnFailed: string;
  deleteColumnLoading: string;
  deleteColumnSuccess: string;
  deleteColumnFailed: string;
  renameColumnSuccess: string;
  renameColumnFailed: string;
} {
  return {
    addColumnLoading: tx(tModals, ['addColumn', 'loading'], ''),
    addColumnSuccess: tx(tModals, ['addColumn', 'success'], ''),
    addColumnFailed: tx(tModals, ['addColumn', 'failed'], ''),
    deleteColumnLoading: tx(tModals, ['deleteColumn', 'loading'], ''),
    deleteColumnSuccess: tx(tModals, ['deleteColumn', 'success'], ''),
    deleteColumnFailed: tx(tModals, ['deleteColumn', 'failed'], ''),
    renameColumnSuccess: tx(tModals, ['renameColumn', 'success'], ''),
    renameColumnFailed: tx(tModals, ['renameColumn', 'failed'], ''),
  };
}
function buildDateFnsLocale(locale: string): Locale {
  if (locale === 'ru') {
    return ru;
  }
  if (locale === 'kk') {
    return kk;
  }
  return enUS;
}

interface InitSetupParams {
  tableId: string | null;
  user: unknown;
  authLoading: boolean;
  t: unknown;
}
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const useInitSetup = (p: InitSetupParams) => {
  const tableData = useTableData({
    tableId: p.tableId,
    isAuthenticated: Boolean(p.user),
    authLoading: p.authLoading,
    loadTableFailedMessage: tx(p.t, ['grid', 'loadTableFailed'], ''),
  });
  const orderedColumns = useMemo(
    () =>
      [...(tableData.table?.columns ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [tableData.table?.columns],
  );
  const columnTypes = useMemo(() => buildColumnTypes(p.t), [p.t]);
  const paidColKey = useMemo(() => findPaidColumnKey(orderedColumns), [orderedColumns]);
  const tabStats = useTabStats({
    tableId: p.tableId,
    isAuthenticated: Boolean(p.user),
    paidColKey,
  });
  return { ...tableData, orderedColumns, columnTypes, paidColKey, ...tabStats };
};

interface ColSetupParams {
  tableId: string | null;
  user: unknown;
  table: CustomTable | null;
  orderedColumns: CustomTablePageColumn[];
  paidColKey: string | null;
  t: unknown;
}
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const useColSetup = (p: ColSetupParams) => {
  const cfg = useColumnConfig({
    tableId: p.tableId,
    orderedColumns: p.orderedColumns,
    viewSettings: p.table?.viewSettings,
    isAuthenticated: Boolean(p.user),
    columnWidthSaveFailedMessage: tx(p.t, ['grid', 'columnWidthSaveFailed'], ''),
  });
  const layout = useColumnLayout({
    orderedColumns: p.orderedColumns,
    columnOrder: cfg.columnOrder,
    hiddenColumnKeys: cfg.hiddenColumnKeys,
    getColumnWidth: cfg.getColumnWidth,
    paidColKey: p.paidColKey,
    t: p.t,
  });
  return { ...cfg, ...layout };
};

interface GridTabParams {
  tableId: string | null;
  user: unknown;
  paidColKey: string | null;
  tabCounts: ReturnType<typeof useTabStats>['tabCounts'];
  orderedColumns: CustomTablePageColumn[];
  columnFilters: Record<string, ColumnFilterState>;
  t: unknown;
  dateFnsLocale: Locale;
  columnsTabId: string;
}
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const useGridTab = (p: GridTabParams) => {
  const [gridFiltersParam, setGridFiltersParam] = useState<string | undefined>(undefined);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const tabState = useQuickTabState({
    paidColKey: p.paidColKey,
    t: p.t,
    tabCounts: p.tabCounts,
    columnsTabId: p.columnsTabId,
  });
  const onGridFiltersParamChange = (next: string | undefined): void => {
    if (next !== gridFiltersParam) {
      setGridFiltersParam(next);
    }
  };
  const { combinedFiltersParam } = useTableFilters({
    orderedColumns: p.orderedColumns,
    columnFilters: p.columnFilters,
    gridFiltersParam,
    activeTabFilter: tabState.activeTabFilter,
    searchQuery,
    dateFnsLocale: p.dateFnsLocale,
  });
  // Сортирует сервер, поэтому берём только первый критерий (см. useTableGrid).
  const gridSort = useMemo<TableSortState | null>(() => {
    const first = sorting[0];
    return first ? { col: first.id, dir: first.desc ? 'desc' : 'asc' } : null;
  }, [sorting]);
  const grid = useTableGrid({
    tableId: p.tableId,
    isAuthenticated: Boolean(p.user),
    combinedFiltersParam,
    sort: gridSort,
    loadRowsFailedMessage: tx(p.t, ['grid', 'loadRowsFailed'], ''),
  });
  const [aggregateSelection, setAggregateSelection] = useState<AggregateSelection>({});
  const [conditionalRules] = useState<ConditionalRule[]>([]);
  const handleAggregateChange = useCallback(
    (columnKey: string, fn: AggregateFn | null): void => {
      setAggregateSelection(prev => {
        if (fn) {
          return { ...prev, [columnKey]: fn };
        }
        return Object.fromEntries(
          Object.entries(prev).filter(([key]) => key !== columnKey),
        ) as AggregateSelection;
      });
      if (p.tableId) {
        apiClient
          .patch(`/custom-tables/${p.tableId}/view-settings/columns`, {
            columnKey,
            aggregate: fn,
          })
          .catch(error => console.error('Failed to persist column aggregate:', error));
      }
    },
    [p.tableId],
  );
  const { values: aggregateValues } = useTableAggregates({
    tableId: p.tableId,
    isAuthenticated: Boolean(p.user),
    combinedFiltersParam,
    selection: aggregateSelection,
    refreshToken: grid.rows.length,
  });
  useEffect(() => {
    setSelectedRowIds([]);
  }, [tabState.normalizedActiveTabId]);
  useEffect(() => {
    setSelectedRowIds([]);
  }, [combinedFiltersParam]);
  useEffect(() => {
    const a = new Set(p.orderedColumns.map(c => c.key));
    setSelectedColumnKeys(prev => prev.filter(k => a.has(k)));
  }, [p.orderedColumns]);
  useEffect(() => {
    if (!selectedRowIds.length) {
      return;
    }
    const v = new Set(grid.rows.map(r => r.id));
    setSelectedRowIds(prev => prev.filter(id => v.has(id)));
  }, [grid.rows, selectedRowIds.length]);
  return {
    gridFiltersParam,
    onGridFiltersParamChange,
    selectedColumnKeys,
    setSelectedColumnKeys,
    selectedRowIds,
    setSelectedRowIds,
    searchQuery,
    setSearchQuery,
    sorting,
    setSorting,
    aggregateSelection,
    aggregateValues,
    handleAggregateChange,
    conditionalRules,
    combinedFiltersParam,
    ...tabState,
    ...grid,
  };
};

interface PasteRowParams {
  tableId: string | null;
  tOps: unknown;
  t: unknown;
  orderedColumns: CustomTablePageColumn[];
  loadTable: () => Promise<void>;
  refreshStats: () => Promise<void>;
  setRows: React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
  rows: CustomTableGridRow[];
  paidColKey: string | null;
  openRowDrawer: (rowId: string, mode: 'view' | 'edit') => void;
  closeRowDrawer: () => void;
}
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const usePasteRow = (p: PasteRowParams) => {
  const pasteDefaults = useMemo(() => buildPasteDefaults(p.tOps), [p.tOps]);
  const handleInsertSuccessObj = useInsertSuccessToast({ tOps: p.tOps });
  const onInsertSuccess = useCallback(
    (createdCount: number, onUndo: () => void): void =>
      handleInsertSuccessObj({ createdCount, onUndo }),
    [handleInsertSuccessObj],
  );
  const pasteState = usePasteImport({
    tableId: p.tableId,
    orderedColumns: p.orderedColumns,
    pasteDefaults,
    loadTable: p.loadTable,
    refreshStats: p.refreshStats,
    setRows: p.setRows,
    onInsertSuccess,
    messages: buildPasteMessages(p.tOps),
  });
  const rowState = useRowActions({
    tableId: p.tableId,
    paidColKey: p.paidColKey,
    rows: p.rows,
    displayRows: p.rows,
    setRows: p.setRows,
    refreshStats: p.refreshStats,
    openRowDrawer: p.openRowDrawer,
    closeRowDrawer: p.closeRowDrawer,
    messages: buildRowActionsMessages(p.t, p.tOps),
  });
  return { ...pasteState, ...rowState };
};

interface BulkColParams {
  tableId: string | null;
  paidColKey: string | null;
  selectedRowIds: string[];
  setSelectedRowIds: React.Dispatch<React.SetStateAction<string[]>>;
  deleteRowTarget: CustomTableGridRow | null;
  bulkDeleteRowIds: string[];
  closeDeleteRowModal: () => void;
  closeBulkDeleteModal: () => void;
  rows: CustomTableGridRow[];
  setRows: React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
  setTable: React.Dispatch<React.SetStateAction<CustomTable | null>>;
  refreshStats: () => Promise<void>;
  deleteColumnTarget: CustomTableColumn | null;
  closeDeleteColumnModal: () => void;
  orderedColumns: CustomTablePageColumn[];
  loadTable: () => Promise<void>;
  t: unknown;
  tModals: unknown;
}
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const useBulkCol = (p: BulkColParams) => {
  const bulkState = useBulkRowActions({
    tableId: p.tableId,
    paidColKey: p.paidColKey,
    selectedRowIds: p.selectedRowIds,
    setSelectedRowIds: p.setSelectedRowIds,
    deleteRowTarget: p.deleteRowTarget,
    bulkDeleteRowIds: p.bulkDeleteRowIds,
    closeDeleteRowModal: p.closeDeleteRowModal,
    closeBulkDeleteModal: p.closeBulkDeleteModal,
    rows: p.rows,
    setRows: p.setRows,
    setTable: p.setTable,
    refreshStats: p.refreshStats,
    messages: buildBulkActionsMessages(p.t, p.tModals),
  });
  const colMgmt = useColumnManagement({
    tableId: p.tableId,
    orderedColumns: p.orderedColumns,
    loadTable: p.loadTable,
    deleteColumnTarget: p.deleteColumnTarget,
    closeDeleteColumnModal: p.closeDeleteColumnModal,
    messages: buildColumnMgmtMessages(p.tModals),
  });
  return { ...bulkState, ...colMgmt };
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function useCustomTablePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useIntlayer('customTableDetailPage');
  const tOps = useIntlayer('customTableDetailPageOperations');
  const tModals = useIntlayer('customTableDetailPageModals');
  const { locale } = useLocale();
  const tableId = params?.id ?? null;
  const [mounted, setMounted] = useState(false);
  const [isFullscreen] = useState(true);
  const handleBackNavigation = useCallback((): void => {
    router.push('/custom-tables');
  }, [router]);
  const { convertingToStatement, convertToStatement } = useConvertToStatement({
    tableId,
    router,
    t,
  });
  const dateFnsLocale = useMemo(() => buildDateFnsLocale(locale), [locale]);
  const columnsTabId = '__columns__';
  useEffect(() => {
    setMounted(true);
  }, []);
  const init = useInitSetup({ tableId, user, authLoading, t });
  const col = useColSetup({
    tableId,
    user,
    table: init.table,
    orderedColumns: init.orderedColumns,
    paidColKey: init.paidColKey,
    t,
  });
  const grid = useGridTab({
    tableId,
    user,
    paidColKey: init.paidColKey,
    tabCounts: init.tabCounts,
    orderedColumns: init.orderedColumns,
    columnFilters: col.columnFilters,
    t,
    dateFnsLocale,
    columnsTabId,
  });
  const modal = { ...useDeleteModals(), ...useRowDrawer(grid.rows) };
  const pasteRow = usePasteRow({
    tableId,
    tOps,
    t,
    orderedColumns: init.orderedColumns,
    loadTable: init.loadTable,
    refreshStats: init.refreshStats,
    setRows: grid.setRows,
    rows: grid.rows,
    paidColKey: init.paidColKey,
    openRowDrawer: modal.openRowDrawer,
    closeRowDrawer: modal.closeRowDrawer,
  });
  const bulkCol = useBulkCol({
    tableId,
    paidColKey: init.paidColKey,
    selectedRowIds: grid.selectedRowIds,
    setSelectedRowIds: grid.setSelectedRowIds,
    deleteRowTarget: modal.deleteRowTarget,
    bulkDeleteRowIds: modal.bulkDeleteRowIds,
    closeDeleteRowModal: modal.closeDeleteRowModal,
    closeBulkDeleteModal: modal.closeBulkDeleteModal,
    rows: grid.rows,
    setRows: grid.setRows,
    setTable: init.setTable,
    refreshStats: init.refreshStats,
    deleteColumnTarget: modal.deleteColumnTarget,
    closeDeleteColumnModal: modal.closeDeleteColumnModal,
    orderedColumns: init.orderedColumns,
    loadTable: init.loadTable,
    t,
    tModals,
  });
  const { isPrintMode, handlePrintTable } = useFullscreenMode({
    isFullscreen,
    user,
    normalizedActiveTabId: grid.normalizedActiveTabId,
    columnsTabId,
    handleBackNavigation,
  });
  const tFull = useMemo(
    () => ({ ...(t as object), ...(tOps as object), ...(tModals as object) }),
    [t, tOps, tModals],
  );
  return {
    ...init,
    ...col,
    ...grid,
    ...modal,
    ...pasteRow,
    ...bulkCol,
    t,
    tFull,
    tableId,
    user,
    authLoading,
    loading: init.loading,
    table: init.table,
    mounted,
    isFullscreen,
    isPrintMode,
    convertingToStatement,
    convertToStatement,
    handlePrintTable,
    handleBackNavigation,
    columnsTabId,
    rows: grid.rows,
    combinedFiltersParam: grid.combinedFiltersParam,
    loadRows: grid.loadRows,
    loadingRows: grid.loadingRows,
    hasMore: grid.hasMore,
  };
}

export type CustomTablePageState = ReturnType<typeof useCustomTablePage>;
