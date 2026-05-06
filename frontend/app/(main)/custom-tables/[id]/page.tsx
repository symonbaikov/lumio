'use client';

import ConfirmModal from '@/app/components/ConfirmModal';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import { Box, Typography } from '@mui/material';
import { enUS, kk, ru } from 'date-fns/locale';
import { ArrowLeft as ArrowBackIcon, CheckCircle, Printer, Search, Trash2, X, XCircle } from '@/app/components/icons';
import { useParams, useRouter } from 'next/navigation';
import type { Locale } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CustomTableTanStack } from './CustomTableTanStack';
import { AddColumnModal } from './components/AddColumnModal';
import { ColumnsVisibilityPanel } from './components/ColumnsVisibilityPanel';
import { PastePreviewModal } from './components/PastePreviewModal';
import { RowDrawer } from './components/RowDrawer';
import { useBulkRowActions } from './hooks/useBulkRowActions';
import { useColumnConfig } from './hooks/useColumnConfig';
import { useColumnManagement } from './hooks/useColumnManagement';
import { useDeleteModals } from './hooks/useDeleteModals';
import { usePasteImport } from './hooks/usePasteImport';
import { useRowActions } from './hooks/useRowActions';
import { useRowDrawer } from './hooks/useRowDrawer';
import { useTabStats } from './hooks/useTabStats';
import { useTableData } from './hooks/useTableData';
import { useTableFilters } from './hooks/useTableFilters';
import { useTableGrid } from './hooks/useTableGrid';
import { handleFullscreenEscapeNavigation } from './utils/fullscreenEscapeNavigation';
import {
  type QuickTab,
  buildQuickTabs,
  findPaidColumnKey,
  getActiveTabFilter,
  normalizeActiveTabId,
} from './utils/quickTabs';
import { isContentEditableTarget, tx } from './utils/tableHelpers';
import type { CustomTablePageColumn } from './utils/tableTypes';

const LOCALE_MAP: Record<string, Locale> = { ru, kk };

const EDITABLE_TAGS = new Set(['input', 'textarea', 'select']);

function shouldIgnoreKeyEvent(target: HTMLElement | null): boolean {
  const tag = target?.tagName?.toLowerCase();
  if (tag && EDITABLE_TAGS.has(tag)) { return true; }
  if (target && isContentEditableTarget(target) && target.isContentEditable) { return true; }
  return false;
}

function checkColumnsDefault(
  orderedColumns: CustomTablePageColumn[],
  columnOrder: string[],
  hiddenColumnKeys: string[],
): boolean {
  const defaultKeys = orderedColumns.map(c => c.key);
  const currentOrder = columnOrder.length ? columnOrder : defaultKeys;
  if (currentOrder.length !== defaultKeys.length) { return false; }
  for (let i = 0; i < defaultKeys.length; i += 1) {
    if (currentOrder[i] !== defaultKeys[i]) { return false; }
  }
  return hiddenColumnKeys.length === 0;
}

function updateBodyClasses(
  user: unknown,
  isFullscreen: boolean,
  showColumnsTab: boolean,
): () => void {
  if (!user) { return () => {}; }
  const fsClass = 'ff-table-fullscreen';
  const scrollClass = 'ff-table-columns-scroll';
  document.body.classList.toggle(fsClass, isFullscreen);
  document.body.classList.toggle(scrollClass, isFullscreen && showColumnsTab);
  return () => {
    document.body.classList.remove(fsClass);
    document.body.classList.remove(scrollClass);
  };
}

function buildFullscreenSx(isPrintMode: boolean, showColumnsTab: boolean) {
  return {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    bgcolor: 'background.paper',
    px: { xs: 2, sm: 3 },
    pt: 2.5,
    borderLeft: '1px solid var(--border-color)',
    borderRight: '1px solid var(--border-color)',
    borderTop: '1px solid var(--border-color)',
    ...(showColumnsTab ? { bottom: 0, overflowY: 'auto' as const, pb: 3 } : { pb: 0 }),
  };
}

function sortColumnsByPosition(columns: CustomTablePageColumn[]): CustomTablePageColumn[] {
  return [...columns].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function findCounterpartyKey(columns: CustomTablePageColumn[]): string | null {
  const re = /(контрагент|counterparty|counter party|client|customer|payer|payee|partner)/i;
  const col = columns.find(c => re.test(`${c.title ?? ''} ${c.key ?? ''}`));
  return col?.key || null;
}

function buildVisibleColumns(
  orderedColumns: CustomTablePageColumn[],
  columnOrder: string[],
  hiddenColumnKeys: string[],
): CustomTablePageColumn[] {
  const columnsByKey = new Map(orderedColumns.map(c => [c.key, c]));
  const orderedKeys = columnOrder.length ? columnOrder : orderedColumns.map(c => c.key);
  const hiddenSet = new Set(hiddenColumnKeys);
  return orderedKeys
    .map(key => columnsByKey.get(key))
    .filter((c): c is CustomTablePageColumn => Boolean(c) && !hiddenSet.has(c.key));
}

function getDeleteColumnMessage(
  target: CustomTablePageColumn | null,
  prefix: string,
  suffix: string,
  noName: string,
): string {
  return target ? `${prefix}${target.title}${suffix}` : noName;
}

function getLoadButtonLabel(loadingRows: boolean, hasMore: boolean, t: ReturnType<typeof useIntlayer>) {
  if (loadingRows) { return t.grid.loadingMore; }
  return hasMore ? t.grid.loadMore : t.grid.noMore;
}

function buildDeleteRowMessage(
  target: { id: string; rowNumber?: number } | null,
  t: ReturnType<typeof useIntlayer>,
): string {
  if (!target) { return tx(t, ['deleteRow', 'confirmNoNumber'], 'Delete this row?'); }
  const num = target.rowNumber ?? '';
  return `${tx(t, ['deleteRow', 'confirmWithNumberPrefix'], '')}${num}${tx(t, ['deleteRow', 'confirmWithNumberSuffix'], '')}`;
}

function getBulkDeleteCount(bulkDeleteRowIds: string[], selectedRowIds: string[]): number {
  return bulkDeleteRowIds.length || selectedRowIds.length;
}

function UndoToast({
  visible,
  addedPrefix,
  addedSuffix,
  undoLabel,
  createdCount,
  onUndo,
}: {
  visible: boolean;
  addedPrefix: string;
  addedSuffix: string;
  undoLabel: string;
  createdCount: number;
  onUndo: () => void;
}) {
  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid var(--border-color)', bgcolor: 'background.paper', px: 2, py: 1.5, boxShadow: 3, opacity: visible ? 1 : 0 }}
    >
      <Typography style={{ fontSize: 14, color: 'var(--foreground)' }}>
        {addedPrefix}
        {createdCount}
        {addedSuffix}
      </Typography>
      <Box
        component="button"
        type="button"
        onClick={onUndo}
        sx={{ fontSize: 14, fontWeight: 600, color: 'primary.main', bgcolor: 'transparent', border: 'none', cursor: 'pointer', '&:hover': { color: 'primary.dark' } }}
      >
        {undoLabel}
      </Box>
    </Box>
  );
}

function TableQuickTabs({
  quickTabs,
  normalizedActiveTabId,
  columnsTabId,
  onTabChange,
  columnsLabel,
}: {
  quickTabs: QuickTab[];
  normalizedActiveTabId: string;
  columnsTabId: string;
  onTabChange: (id: string) => void;
  columnsLabel: string;
}) {
  const isColumnsTabActive = normalizedActiveTabId === columnsTabId;

  return (
    <Box sx={{ display: 'flex', minWidth: 0, flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2.5, overflowX: 'auto' }}>
      {quickTabs.map(tab => {
        const isActive = normalizedActiveTabId === tab.id;
        return (
          <Box
            key={tab.id}
            component="button"
            onClick={() => { if (normalizedActiveTabId !== tab.id) { onTabChange(tab.id); } }}
            sx={{ position: 'relative', flexShrink: 0, whiteSpace: 'nowrap', pb: 1.5, fontSize: 14, fontWeight: 500, bgcolor: 'transparent', border: 'none', cursor: 'pointer', color: isActive ? 'primary.main' : 'var(--muted-foreground)', '&:hover': { color: isActive ? 'primary.main' : 'var(--foreground)' } }}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <Box
                component="span"
                sx={{ ml: 0.75, fontSize: 12, py: 0.25, px: 1, bgcolor: isActive ? 'rgba(22,129,24,0.1)' : 'var(--muted)', color: isActive ? 'primary.main' : 'var(--muted-foreground)' }}
              >
                {tab.count}
              </Box>
            )}
            {isActive && (
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, bgcolor: 'primary.main' }} />
            )}
          </Box>
        );
      })}
      <Box
        component="button"
        type="button"
        onClick={() => { if (normalizedActiveTabId !== columnsTabId) { onTabChange(columnsTabId); } }}
        sx={{ position: 'relative', flexShrink: 0, whiteSpace: 'nowrap', pb: 1.5, fontSize: 14, fontWeight: 500, bgcolor: 'transparent', border: 'none', cursor: 'pointer', color: isColumnsTabActive ? 'primary.main' : 'var(--muted-foreground)', '&:hover': { color: isColumnsTabActive ? 'primary.main' : 'var(--foreground)' } }}
      >
        {columnsLabel}
        {isColumnsTabActive && (
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, bgcolor: 'primary.main' }} />
        )}
      </Box>
    </Box>
  );
}

function TableActionToolbar({
  selectedRowIds,
  bulkMarking,
  searchQuery,
  onMarkPaid,
  onMarkUnpaid,
  onPrint,
  onBulkDelete,
  onSearchChange,
  labels,
}: {
  selectedRowIds: string[];
  bulkMarking: 'paid' | 'unpaid' | null;
  searchQuery: string;
  onMarkPaid: () => void;
  onMarkUnpaid: () => void;
  onPrint: () => void;
  onBulkDelete: () => void;
  onSearchChange: (value: string) => void;
  labels: { markPaid: string; markingPaid: string; markUnpaid: string; markingUnpaid: string; print: string; delete: string; searchPlaceholder: string };
}) {
  const hasSelection = selectedRowIds.length > 0;
  const canAct = hasSelection && bulkMarking === null;
  const paidLabel = bulkMarking === 'paid' ? labels.markingPaid : labels.markPaid;
  const unpaidLabel = bulkMarking === 'unpaid' ? labels.markingUnpaid : labels.markUnpaid;
  const actionColor = canAct ? 'var(--text-secondary)' : 'var(--muted-foreground)';
  const baseBtnSx = { display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: { xs: 0.75, sm: 1 }, whiteSpace: 'nowrap', border: '1px solid var(--border-color)', px: { xs: 1.25, sm: 2 }, py: { xs: 0.5, sm: 0.75 }, fontSize: { xs: 11, sm: 12 }, fontWeight: 500, color: actionColor, bgcolor: 'transparent', cursor: 'pointer', '&:hover': { bgcolor: 'var(--muted)' }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } };

  return (
    <Box sx={{ mt: 1.5, width: '100%', px: 1, pb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, overflowX: 'auto' }}>
        <Box sx={{ display: 'flex', minWidth: 0, flexWrap: 'nowrap', alignItems: 'center', gap: { xs: 0.75, sm: 1 } }}>
          <Box component="button" type="button" onClick={onMarkPaid} disabled={!canAct} sx={baseBtnSx}>
            <CheckCircle style={{ width: 14, height: 14, color: canAct ? '#22c55e' : 'rgba(34,197,94,0.5)' }} />
            <span>{paidLabel}</span>
          </Box>
          <Box component="button" type="button" onClick={onMarkUnpaid} disabled={!canAct} sx={baseBtnSx}>
            <XCircle style={{ width: 14, height: 14, color: canAct ? '#ef4444' : 'rgba(239,68,68,0.5)' }} />
            <span>{unpaidLabel}</span>
          </Box>
          <Box
            component="button"
            onClick={onPrint}
            sx={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: { xs: 0.75, sm: 1 }, whiteSpace: 'nowrap', border: '1px solid var(--border-color)', px: { xs: 1.25, sm: 2 }, py: { xs: 0.5, sm: 0.75 }, fontSize: { xs: 11, sm: 12 }, fontWeight: 500, color: 'var(--text-secondary)', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { bgcolor: 'var(--muted)', color: 'var(--foreground)' } }}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{labels.print}</span>
          </Box>
          <Box
            component="button"
            onClick={onBulkDelete}
            disabled={!hasSelection}
            sx={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: { xs: 0.75, sm: 1 }, whiteSpace: 'nowrap', border: '1px solid var(--border-color)', px: { xs: 1.25, sm: 2 }, py: { xs: 0.5, sm: 0.75 }, fontSize: { xs: 11, sm: 12 }, fontWeight: 500, color: 'var(--text-secondary)', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { borderColor: '#fecaca', bgcolor: 'var(--color-error-soft-bg)', color: 'var(--destructive)' }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{labels.delete}</span>
          </Box>
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          <Box sx={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--muted-foreground)' }} />
            <input
              placeholder={labels.searchPlaceholder}
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              style={{ paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8, fontSize: 14, width: 192, border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// eslint-disable-next-line max-lines-per-function
export default function CustomTableDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useIntlayer('customTableDetailPage');
  const { locale } = useLocale();
  const tableId = params?.id;

  const dateFnsLocale = useMemo(() => LOCALE_MAP[locale] ?? enUS, [locale]);

  const [isFullscreen] = useState(true);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const handleBackNavigation = useCallback(() => {
    router.push('/custom-tables');
  }, [router]);
  const handlePrintTable = useCallback(() => {
    setIsPrintMode(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }, []);
  const { table, setTable, loading, loadTable } = useTableData({
    tableId,
    isAuthenticated: Boolean(user),
    authLoading,
    loadTableFailedMessage: t.grid.loadTableFailed.value,
  });
  const [gridFiltersParam, setGridFiltersParam] = useState<string | undefined>(undefined);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const columnsTabId = '__columns__';

  const columnTypes = useMemo(
    () => [
      { value: 'text' as const, label: t.columnTypes.text.value },
      { value: 'number' as const, label: t.columnTypes.number.value },
      { value: 'date' as const, label: t.columnTypes.date.value },
      { value: 'boolean' as const, label: t.columnTypes.boolean.value },
      { value: 'select' as const, label: t.columnTypes.select.value },
      {
        value: 'multi_select' as const,
        label: t.columnTypes.multiSelect.value,
      },
    ],
    [t.columnTypes],
  );

  const pasteDefaults = useMemo(
    () => ({
      date: tx(t, ['paste', 'defaults', 'date'], 'Date'),
      type: tx(t, ['paste', 'defaults', 'type'], 'Type'),
      amount: tx(t, ['paste', 'defaults', 'amount'], 'Amount'),
      currency: tx(t, ['paste', 'defaults', 'currency'], 'Currency'),
      comment: tx(t, ['paste', 'defaults', 'comment'], 'Comment'),
      paid: tx(t, ['paste', 'defaults', 'paid'], 'Paid'),
      columnPrefix: tx(t, ['paste', 'defaults', 'columnPrefix'], 'Column'),
    }),
    [t],
  );

  const {
    deleteRowModalOpen,
    deleteRowTarget,
    requestDeleteRow,
    closeDeleteRowModal,
    bulkDeleteModalOpen,
    bulkDeleteRowIds,
    openBulkDeleteModal,
    closeBulkDeleteModal,
    deleteColumnModalOpen,
    deleteColumnTarget,
    openDeleteColumnModal,
    closeDeleteColumnModal,
  } = useDeleteModals();
  const [mounted, setMounted] = useState(false);

  const orderedColumns = useMemo(
    () => sortColumnsByPosition(table?.columns || []),
    [table?.columns],
  );

  const {
    columnOrder,
    hiddenColumnKeys,
    columnFilters,
    columnWidths,
    getColumnWidth,
    persistColumnWidth,
    toggleColumnHidden,
    resetColumns,
  } = useColumnConfig({
    tableId,
    orderedColumns,
    viewSettings: table?.viewSettings,
    isAuthenticated: Boolean(user),
    columnWidthSaveFailedMessage: t.grid.columnWidthSaveFailed.value,
  });

  const paidColKey = useMemo(() => findPaidColumnKey(orderedColumns), [orderedColumns]);

  const { tabCounts, refreshStats } = useTabStats({
    tableId,
    isAuthenticated: Boolean(user),
    paidColKey,
  });

  const orderedVisibleColumns = useMemo(
    () => buildVisibleColumns(orderedColumns, columnOrder, hiddenColumnKeys),
    [orderedColumns, columnOrder, hiddenColumnKeys],
  );

  const isColumnsDefault = useMemo(
    () => checkColumnsDefault(orderedColumns, columnOrder, hiddenColumnKeys),
    [orderedColumns, columnOrder, hiddenColumnKeys],
  );

  const paidColumnLabel = tx(t, ['paidColumn'], '');
  const displayColumns = useMemo(() => {
    if (!paidColKey) { return orderedVisibleColumns; }
    return orderedVisibleColumns.map(c =>
      c.key === paidColKey ? { ...c, title: paidColumnLabel || c.title } : c,
    );
  }, [orderedVisibleColumns, paidColKey, paidColumnLabel]);

  const dateColKey = useMemo(() => {
    const col = orderedColumns.find(c => c.type === 'date');
    return col?.key || null;
  }, [orderedColumns]);

  const counterpartyColKey = useMemo(
    () => findCounterpartyKey(orderedColumns),
    [orderedColumns],
  );

  const stickyLeftColumnIds = useMemo(() => [], []);

  const stickyRightColumnIds = useMemo(() => [], []);

  const quickTabs = useMemo<QuickTab[]>(() => {
    return buildQuickTabs({
      labels: {
        all: tx(t, ['tabs', 'all'], 'All'),
        paid: tx(t, ['tabs', 'paid'], 'Paid'),
        unpaid: tx(t, ['tabs', 'unpaid'], 'Unpaid'),
      },
      paidColKey,
      tabCounts: {
        paid: tabCounts.paid,
        unpaid: tabCounts.unpaid,
      },
    });
  }, [paidColKey, t, tabCounts.paid, tabCounts.unpaid]);

  const normalizedActiveTabId = useMemo(
    () => normalizeActiveTabId(activeTabId, quickTabs, columnsTabId),
    [activeTabId, quickTabs, columnsTabId],
  );

  useEffect(() => {
    if (normalizedActiveTabId !== activeTabId) {
      setActiveTabId(normalizedActiveTabId);
    }
  }, [activeTabId, normalizedActiveTabId]);

  const activeTabFilter = useMemo(
    () => getActiveTabFilter(normalizedActiveTabId, quickTabs, columnsTabId),
    [normalizedActiveTabId, quickTabs, columnsTabId],
  );

  useEffect(() => {
    setSelectedRowIds([]);
  }, [normalizedActiveTabId]);

  useEffect(() => {
    const allowed = new Set(orderedColumns.map(c => c.key));
    setSelectedColumnKeys(prev => prev.filter(k => allowed.has(k)));
  }, [orderedColumns]);

  const gridColumnWidths = useMemo(() => {
    const next: Record<string, number> = {};
    for (const col of orderedColumns) {
      next[col.key] = getColumnWidth(col.key);
    }
    return next;
  }, [orderedColumns, columnWidths]);

  const onGridFiltersParamChange = (next: string | undefined) => {
    if (next === gridFiltersParam) return;
    setGridFiltersParam(next);
  };

  const { combinedFiltersParam } = useTableFilters({
    orderedColumns,
    columnFilters,
    gridFiltersParam,
    activeTabFilter,
    searchQuery,
    dateFnsLocale,
  });

  const { rows, setRows, loadingRows, hasMore, loadRows } = useTableGrid({
    tableId,
    isAuthenticated: Boolean(user),
    combinedFiltersParam,
    loadRowsFailedMessage: t.grid.loadRowsFailed.value,
  });

  const {
    rowDrawerOpen,
    rowDrawerMode,
    rowDrawerRowId,
    drawerRow,
    setRowDrawerMode,
    openRowDrawer,
    closeRowDrawer,
  } = useRowDrawer(rows);

  const addedPrefix = tx(t, ['paste', 'addedPrefix'], 'Added ');
  const addedSuffix = tx(t, ['paste', 'addedSuffix'], ' rows');
  const undoLabel = tx(t, ['paste', 'undo'], 'Undo');

  const handleInsertSuccess = useCallback(
    (createdCount: number, onUndo: () => void) => {
      const undoWindowMs = 8000;
      let undoExpired = false;
      const timeoutId = window.setTimeout(() => { undoExpired = true; }, undoWindowMs);
      const toastId = toast.custom(
        toastProps => (
          <UndoToast
            visible={toastProps.visible}
            addedPrefix={addedPrefix}
            addedSuffix={addedSuffix}
            undoLabel={undoLabel}
            createdCount={createdCount}
            onUndo={() => {
              if (undoExpired) { return; }
              undoExpired = true;
              window.clearTimeout(timeoutId);
              toast.dismiss(toastId);
              onUndo();
            }}
          />
        ),
        { duration: undoWindowMs },
      );
    },
    [addedPrefix, addedSuffix, undoLabel],
  );

  const {
    pastePreviewOpen,
    pasteParsing,
    pasteApplying,
    pasteUseHeaders,
    pastePreview,
    hasMissingPasteColumnTitles,
    resetPastePreview,
    handlePasteHeadersToggle,
    handlePasteCellChange,
    handlePasteAdd,
  } = usePasteImport({
    tableId,
    orderedColumns,
    pasteDefaults,
    loadTable,
    refreshStats,
    setRows,
    onInsertSuccess: handleInsertSuccess,
    messages: {
      noRows: tx(t, ['paste', 'noRows'], 'No rows found'),
      missingColumnTitle: tx(t, ['paste', 'missingColumnTitle'], 'Missing column title'),
      insertFailed: tx(t, ['paste', 'insertFailed'], 'Failed to insert rows'),
      undoFailed: tx(t, ['paste', 'undoFailed'], 'Failed to undo insert'),
    },
  });

  const displayRows = useMemo(() => rows, [rows]);

  // Reset row selection when filters change
  useEffect(() => {
    setSelectedRowIds([]);
  }, [combinedFiltersParam]);

  useEffect(() => {
    if (!selectedRowIds.length) return;
    const visibleIds = new Set(displayRows.map(r => r.id));
    setSelectedRowIds(prev => prev.filter(id => visibleIds.has(id)));
  }, [displayRows, selectedRowIds.length]);

  useEffect(
    () => updateBodyClasses(user, isFullscreen, normalizedActiveTabId === columnsTabId),
    [isFullscreen, user, normalizedActiveTabId, columnsTabId],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isFullscreen) { return; }

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyEvent(event.target as HTMLElement | null)) { return; }
      handleFullscreenEscapeNavigation(event.key, handleBackNavigation);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBackNavigation, isFullscreen]);

  useEffect(() => {
    const handleBeforePrint = () => {
      setIsPrintMode(true);
    };
    const handleAfterPrint = () => {
      setIsPrintMode(false);
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const {
    createRow,
    updateCellFromGrid,
    updateRowFromDrawer,
    updateRowStyle,
    saveRowFromDrawer,
    saveRowAndCloseDrawer,
    saveRowAndNext,
  } = useRowActions({
    tableId,
    paidColKey,
    rows,
    displayRows,
    setRows,
    refreshStats,
    openRowDrawer,
    closeRowDrawer,
    messages: {
      addRowLoading: t.addRow.loading.value,
      addRowSuccess: t.addRow.success.value,
      addRowFailed: t.addRow.failed.value,
      saveValueFailed: t.grid.saveValueFailed.value,
      noMoreRows: tx(t, ['toasts', 'noMoreRows'], 'No more rows'),
    },
  });

  const { bulkMarking, deleteRow, deleteSelectedRows, markSelectedRowsPaid } = useBulkRowActions({
    tableId,
    paidColKey,
    selectedRowIds,
    setSelectedRowIds,
    deleteRowTarget,
    bulkDeleteRowIds,
    closeDeleteRowModal,
    closeBulkDeleteModal,
    rows,
    setRows,
    setTable,
    refreshStats,
    messages: {
      deleteRowLoading: t.deleteRow.loading.value,
      deleteRowSuccess: t.deleteRow.success.value,
      deleteRowFailed: t.deleteRow.failed.value,
      bulkDeleteLoading: t.bulkDeleteRows.loading.value,
      bulkDeleteSuccess: t.bulkDeleteRows.success.value,
      bulkDeleteFailed: t.bulkDeleteRows.failed.value,
      creatingPaidColumn: tx(t, ['toasts', 'creatingPaidColumn'], 'Creating Paid column'),
      paidColumnCreated: tx(t, ['toasts', 'paidColumnCreated'], 'Paid column created'),
      paidColumnCreateFailed: tx(
        t,
        ['toasts', 'paidColumnCreateFailed'],
        'Failed to create Paid column',
      ),
      markingPaid: tx(t, ['actions', 'markingPaid'], 'Marking paid'),
      markingUnpaid: tx(t, ['actions', 'markingUnpaid'], 'Marking unpaid'),
      markedPaid: tx(t, ['toasts', 'markedPaid'], 'Marked paid'),
      markedUnpaid: tx(t, ['toasts', 'markedUnpaid'], 'Marked unpaid'),
      updateSomeRowsFailed: tx(t, ['toasts', 'updateSomeRowsFailed'], 'Failed to update some rows'),
      updateRowsFailed: tx(t, ['toasts', 'updateRowsFailed'], 'Failed to update rows'),
      paidColumnTitle: tx(t, ['paidColumn'], 'Paid'),
    },
  });

  const {
    newColumnOpen,
    setNewColumnOpen,
    newColumn,
    setNewColumn,
    createColumn,
    deleteColumn,
    renameColumnTitleFromGrid,
  } = useColumnManagement({
    tableId,
    orderedColumns,
    loadTable,
    deleteColumnTarget,
    closeDeleteColumnModal,
    messages: {
      addColumnLoading: t.addColumn.loading.value,
      addColumnSuccess: t.addColumn.success.value,
      addColumnFailed: t.addColumn.failed.value,
      deleteColumnLoading: t.deleteColumn.loading.value,
      deleteColumnSuccess: t.deleteColumn.success.value,
      deleteColumnFailed: t.deleteColumn.failed.value,
      renameColumnSuccess: t.renameColumn.success.value,
      renameColumnFailed: t.renameColumn.failed.value,
    },
  });

  const notReady = authLoading || loading || !mounted;
  if (notReady) {
    return (
      <Box sx={{ display: 'flex', minHeight: '50vh', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
        {t.auth.loading}
      </Box>
    );
  }
  const notAuthorized = !user || !table;
  if (notAuthorized) {
    const message = user ? t.errors.notFound : t.auth.loginRequired;
    return (
      <Box className="container-shared" sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 5 }}>
        <Box sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', p: 3, fontSize: 14, color: 'var(--text-secondary)' }}>
          {message}
        </Box>
      </Box>
    );
  }

  const showColumnsTab = normalizedActiveTabId === columnsTabId;
  const printControlsClass = isPrintMode ? 'custom-table-print-controls' : undefined;
  const overflow = isPrintMode ? 'visible' : 'hidden';
  const outerSx = { height: '100vh', width: '100vw', bgcolor: 'background.paper', overflow };
  const outerStyle = { paddingTop: isPrintMode ? '0' : '150px' };
  const headerSx = buildFullscreenSx(isPrintMode, showColumnsTab);
  const loadButtonLabel = getLoadButtonLabel(loadingRows, hasMore, t);
  const deleteRowMessage = buildDeleteRowMessage(deleteRowTarget, t);
  const bulkDeleteCount = getBulkDeleteCount(bulkDeleteRowIds, selectedRowIds);

  return (
    <Box sx={outerSx} style={outerStyle}>
      <Box
        sx={headerSx}
        className={printControlsClass}
      >
        {/* Row 1: Tabs */}
        <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5, borderBottom: '1px solid var(--muted)', px: 1 }}>
          <Box
            component="button"
            type="button"
            onClick={handleBackNavigation}
            sx={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: 0.75, pb: 1.5, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', bgcolor: 'transparent', border: 'none', cursor: 'pointer', '&:hover': { color: 'var(--foreground)' } }}
          >
            <ArrowBackIcon size={16} />
            <span>{t.nav.back.value}</span>
          </Box>

          <TableQuickTabs
            quickTabs={quickTabs}
            normalizedActiveTabId={normalizedActiveTabId}
            columnsTabId={columnsTabId}
            onTabChange={setActiveTabId}
            columnsLabel={tx(t, ['actions', 'columns'], 'Columns')}
          />
        </Box>

        {!showColumnsTab && (
          <TableActionToolbar
            selectedRowIds={selectedRowIds}
            bulkMarking={bulkMarking}
            searchQuery={searchQuery}
            onMarkPaid={() => markSelectedRowsPaid(true)}
            onMarkUnpaid={() => markSelectedRowsPaid(false)}
            onPrint={handlePrintTable}
            onBulkDelete={() => openBulkDeleteModal(selectedRowIds)}
            onSearchChange={setSearchQuery}
            labels={{
              markPaid: tx(t, ['actions', 'markPaid'], 'Mark paid'),
              markingPaid: tx(t, ['actions', 'markingPaid'], 'Marking paid'),
              markUnpaid: tx(t, ['actions', 'markUnpaid'], 'Mark unpaid'),
              markingUnpaid: tx(t, ['actions', 'markingUnpaid'], 'Marking unpaid'),
              print: tx(t, ['actions', 'print'], 'Print'),
              delete: tx(t, ['actions', 'delete'], 'Delete'),
              searchPlaceholder: tx(t, ['actions', 'searchPlaceholder'], 'Search'),
            }}
          />
        )}

        {showColumnsTab && (
          <ColumnsVisibilityPanel
            t={t}
            columnOrder={columnOrder}
            orderedColumns={orderedColumns}
            hiddenColumnKeys={hiddenColumnKeys}
            isColumnsDefault={isColumnsDefault}
            toggleColumnHidden={toggleColumnHidden}
            resetColumns={resetColumns}
          />
        )}

        <AddColumnModal
          t={t}
          isOpen={newColumnOpen}
          onClose={() => setNewColumnOpen(false)}
          newColumn={newColumn}
          setNewColumn={setNewColumn}
          createColumn={createColumn}
          columnTypes={columnTypes}
        />
      </Box>

      <Box
        sx={{ height: '100%', width: '100%', pt: 0 }}
        className="custom-table-print-target"
      >
        <Box
          sx={{ height: '100%', width: '100%', bgcolor: 'background.paper', maxWidth: 1920, mx: 'auto' }}
        >
          {!showColumnsTab && (
            <CustomTableTanStack
              tableId={tableId as string}
              columns={displayColumns}
              rows={displayRows}
              selectedRowIds={selectedRowIds}
              columnWidths={gridColumnWidths}
              isFullscreen={isFullscreen}
              loadingRows={loadingRows}
              hasMore={hasMore}
              stickyLeftColumnIds={stickyLeftColumnIds}
              stickyRightColumnIds={stickyRightColumnIds}
              showAddRow={normalizedActiveTabId === 'all'}
              onLoadMore={loadRows}
              onFiltersParamChange={onGridFiltersParamChange}
              onUpdateCell={updateCellFromGrid}
              onUpdateRowStyle={updateRowStyle}
              onCreateRow={createRow}
              onViewRow={rowId => openRowDrawer(rowId, 'view')}
              onEditRow={rowId => openRowDrawer(rowId, 'edit')}
              onDeleteRow={rowId => requestDeleteRow(rows, rowId)}
              onPersistColumnWidth={persistColumnWidth}
              selectedColumnKeys={selectedColumnKeys}
              onSelectedColumnKeysChange={setSelectedColumnKeys}
              onRenameColumnTitle={renameColumnTitleFromGrid}
              onDeleteColumn={colKey => {
                const targetColumn = orderedColumns.find(c => c.key === colKey);
                if (targetColumn) openDeleteColumnModal(targetColumn);
              }}
              onSelectedRowIdsChange={setSelectedRowIds}
              onAddColumnClick={() => setNewColumnOpen(true)}
              isPrintMode={isPrintMode}
            />
          )}
        </Box>
      </Box>

      {!showColumnsTab && (
        <Box
          sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className={printControlsClass}
        >
          <Box
            component="button"
            onClick={() => loadRows({ filtersParam: combinedFiltersParam })}
            disabled={!hasMore || loadingRows}
            sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', px: 2, py: 1, fontSize: 14, fontWeight: 500, color: 'var(--foreground)', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } }}
          >
            {loadButtonLabel}
          </Box>
        </Box>
      )}

      <style jsx global>{`
        @media print {
          .custom-table-print-controls {
            display: none !important;
          }

          .custom-table-print-target {
            width: 100% !important;
            height: auto !important;
            padding-top: 0 !important;
            margin: 0 !important;
          }

          .custom-table-container {
            width: 100% !important;
          }

          .custom-table-container > div {
            height: auto !important;
            overflow: visible !important;
            border: 0 !important;
            padding-top: 0 !important;
          }

          .custom-table-container table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: auto !important;
          }

          .custom-table-container thead {
            position: static !important;
          }

          .custom-table-container th,
          .custom-table-container td {
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
            white-space: normal !important;
            word-break: break-word !important;
          }

          .custom-table-container [class*='sticky'] {
            position: static !important;
          }

          @page {
            size: landscape;
            margin: 10mm;
          }
        }
      `}</style>

      <PastePreviewModal
        t={t}
        isOpen={pastePreviewOpen}
        onClose={resetPastePreview}
        pasteApplying={pasteApplying}
        pasteParsing={pasteParsing}
        pastePreview={pastePreview}
        pasteUseHeaders={pasteUseHeaders}
        hasMissingPasteColumnTitles={hasMissingPasteColumnTitles}
        onHeadersToggle={handlePasteHeadersToggle}
        onCellChange={handlePasteCellChange}
        onConfirm={handlePasteAdd}
      />

      <RowDrawer
        open={rowDrawerOpen}
        mode={rowDrawerMode}
        row={drawerRow}
        columns={orderedColumns}
        onClose={closeRowDrawer}
        onModeChange={setRowDrawerMode}
        onSave={saveRowFromDrawer}
        onSaveAndClose={saveRowAndCloseDrawer}
        onSaveAndNext={saveRowAndNext}
      />

      <ConfirmModal
        isOpen={deleteColumnModalOpen}
        onClose={closeDeleteColumnModal}
        onConfirm={deleteColumn}
        title={t.deleteColumn.confirmTitle.value}
        message={getDeleteColumnMessage(
          deleteColumnTarget,
          t.deleteColumn.confirmWithNamePrefix.value,
          t.deleteColumn.confirmWithNameSuffix.value,
          t.deleteColumn.confirmNoName.value,
        )}
        confirmText={t.deleteColumn.confirm.value}
        cancelText={tx(t, ['deleteColumn', 'cancel'], 'Cancel')}
        isDestructive
      />

      <ConfirmModal
        isOpen={bulkDeleteModalOpen}
        onClose={closeBulkDeleteModal}
        onConfirm={deleteSelectedRows}
        title={tx(t, ['bulkDeleteRows', 'confirmTitle'], 'Delete selected rows')}
        message={`${tx(t, ['bulkDeleteRows', 'confirmMessagePrefix'], '')}${bulkDeleteCount}${tx(t, ['bulkDeleteRows', 'confirmMessageSuffix'], '')}`}
        confirmText={tx(t, ['bulkDeleteRows', 'confirm'], 'Delete')}
        cancelText={tx(t, ['bulkDeleteRows', 'cancel'], 'Cancel')}
        isDestructive
      />

      <ConfirmModal
        isOpen={deleteRowModalOpen}
        onClose={closeDeleteRowModal}
        onConfirm={deleteRow}
        title={tx(t, ['deleteRow', 'confirmTitle'], 'Delete row')}
        message={deleteRowMessage}
        confirmText={tx(t, ['deleteRow', 'confirm'], 'Delete')}
        cancelText={tx(t, ['deleteRow', 'cancel'], 'Cancel')}
        isLoading={false}
        isDestructive
      />
    </Box>
  );
}
