'use client';

import { Box } from '@mui/material';
import type React from 'react';
import { CustomTableTanStack } from '../CustomTableTanStack';
import type { CustomTablePageState } from '../hooks/useCustomTablePage';
import { TableConfirmModals } from './TableConfirmModals';
import { TableToolbar } from './TableToolbar';

const PRINT_CSS = `
  @media print {
    .custom-table-print-controls { display: none !important; }
    .custom-table-print-target { width: 100% !important; height: auto !important; padding-top: 0 !important; margin: 0 !important; }
    .custom-table-container { width: 100% !important; }
    .custom-table-container > div { height: auto !important; overflow: visible !important; border: 0 !important; padding-top: 0 !important; }
    .custom-table-container table { width: 100% !important; min-width: 0 !important; table-layout: auto !important; }
    .custom-table-container thead { position: static !important; }
    .custom-table-container th, .custom-table-container td { width: auto !important; min-width: 0 !important; max-width: none !important; white-space: normal !important; word-break: break-word !important; }
    .custom-table-container [class*='sticky'] { position: static !important; }
    @page { size: landscape; margin: 10mm; }
  }
`;

type P = CustomTablePageState;

function GridArea(p: P): React.JSX.Element {
  const boxSx = p.isFullscreen
    ? { height: '100%', width: '100%', bgcolor: 'background.paper', maxWidth: 1920, mx: 'auto' }
    : { border: '1px solid var(--border-color)', bgcolor: 'background.paper' };
  return (
    <Box
      sx={p.isFullscreen ? { height: '100%', width: '100%', pt: 0 } : { mt: 0 }}
      className={p.isFullscreen ? 'custom-table-print-target' : undefined}
    >
      <Box sx={boxSx}>
        {p.normalizedActiveTabId !== p.columnsTabId && (
          <CustomTableTanStack
            tableId={p.tableId as string}
            columns={p.displayColumns}
            rows={p.rows}
            selectedRowIds={p.selectedRowIds}
            columnWidths={p.gridColumnWidths}
            isFullscreen={p.isFullscreen}
            loadingRows={p.loadingRows}
            hasMore={p.hasMore}
            stickyLeftColumnIds={p.stickyLeftColumnIds}
            stickyRightColumnIds={p.stickyRightColumnIds}
            showAddRow={p.normalizedActiveTabId === 'all'}
            sorting={p.sorting}
            onSortingChange={p.setSorting}
            conditionalRules={p.conditionalRules}
            aggregateSelection={p.aggregateSelection}
            aggregateValues={p.aggregateValues}
            onAggregateChange={p.handleAggregateChange}
            onLoadMore={p.loadRows}
            onFiltersParamChange={filtersParam => p.onGridFiltersParamChange(filtersParam)}
            onUpdateCell={(rowId, columnKey, value) =>
              p.updateCellFromGrid(rowId, columnKey, value)
            }
            onUpdateRowStyle={(rowId, styles) => p.updateRowStyle(rowId, styles)}
            onCreateRow={p.createRow}
            onViewRow={rowId => p.openRowDrawer(rowId, 'view')}
            onEditRow={rowId => p.openRowDrawer(rowId, 'edit')}
            onDeleteRow={rowId => p.requestDeleteRow(p.rows, rowId)}
            onPersistColumnWidth={(columnKey, width) => p.persistColumnWidth(columnKey, width)}
            selectedColumnKeys={p.selectedColumnKeys}
            onSelectedColumnKeysChange={keys => p.setSelectedColumnKeys(keys)}
            onRenameColumnTitle={(columnKey, nextTitle) =>
              p.renameColumnTitleFromGrid(columnKey, nextTitle)
            }
            onDeleteColumn={columnKey => {
              const col = p.orderedColumns.find(c => c.key === columnKey);
              if (col) {
                p.openDeleteColumnModal(col);
              }
            }}
            onSelectedRowIdsChange={rowIds => p.setSelectedRowIds(rowIds)}
            onAddColumnClick={() => p.setNewColumnOpen(true)}
            isPrintMode={p.isPrintMode}
          />
        )}
      </Box>
    </Box>
  );
}

function LoadMoreArea(p: P): React.JSX.Element | null {
  if (p.normalizedActiveTabId === p.columnsTabId) {
    return null;
  }
  return (
    <Box
      sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className={p.isPrintMode ? 'custom-table-print-controls' : undefined}
    >
      <Box
        component="button"
        onClick={() => p.loadRows({ filtersParam: p.combinedFiltersParam })}
        disabled={!p.hasMore || p.loadingRows}
        sx={{
          border: '1px solid var(--border-color)',
          bgcolor: 'background.paper',
          px: 2,
          py: 1,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--foreground)',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
          '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
        }}
      >
        {p.loadingRows ? p.t.grid.loadingMore : p.hasMore ? p.t.grid.loadMore : p.t.grid.noMore}
      </Box>
    </Box>
  );
}

export function CustomTableDetailView(p: P): React.JSX.Element {
  const outerSx = p.isFullscreen
    ? {
        height: '100vh',
        width: '100vw',
        bgcolor: 'background.paper',
        overflow: p.isPrintMode ? 'visible' : 'hidden',
      }
    : {};
  return (
    <Box
      sx={outerSx}
      className={p.isFullscreen ? undefined : 'container-shared'}
      style={
        p.isFullscreen ? { paddingTop: p.isPrintMode ? '0' : '150px' } : { padding: '32px 16px' }
      }
    >
      <TableToolbar
        t={p.tFull}
        isFullscreen={p.isFullscreen}
        isPrintMode={p.isPrintMode}
        quickTabs={p.quickTabs}
        normalizedActiveTabId={p.normalizedActiveTabId}
        columnsTabId={p.columnsTabId}
        setActiveTabId={p.setActiveTabId}
        handleBackNavigation={p.handleBackNavigation}
        selectedRowIds={p.selectedRowIds}
        bulkMarking={p.bulkMarking}
        markSelectedRowsPaid={p.markSelectedRowsPaid}
        convertingToStatement={p.convertingToStatement}
        onConvertToStatement={p.convertToStatement}
        handlePrintTable={p.handlePrintTable}
        openBulkDeleteModal={p.openBulkDeleteModal}
        searchQuery={p.searchQuery}
        setSearchQuery={p.setSearchQuery}
        columnOrder={p.columnOrder}
        orderedColumns={p.orderedColumns}
        hiddenColumnKeys={p.hiddenColumnKeys}
        isColumnsDefault={p.isColumnsDefault}
        toggleColumnHidden={p.toggleColumnHidden}
        resetColumns={p.resetColumns}
        newColumnOpen={p.newColumnOpen}
        setNewColumnOpen={p.setNewColumnOpen}
        newColumn={p.newColumn}
        setNewColumn={p.setNewColumn}
        createColumn={p.createColumn}
        columnTypes={p.columnTypes}
      />
      <GridArea {...p} />
      <LoadMoreArea {...p} />
      <style jsx global>
        {PRINT_CSS}
      </style>
      <TableConfirmModals
        t={p.tFull}
        pastePreviewOpen={p.pastePreviewOpen}
        pasteApplying={p.pasteApplying}
        pasteParsing={p.pasteParsing}
        pastePreview={p.pastePreview}
        pasteUseHeaders={p.pasteUseHeaders}
        hasMissingPasteColumnTitles={p.hasMissingPasteColumnTitles}
        resetPastePreview={p.resetPastePreview}
        handlePasteHeadersToggle={p.handlePasteHeadersToggle}
        handlePasteCellChange={p.handlePasteCellChange}
        handlePasteAdd={p.handlePasteAdd}
        rowDrawerOpen={p.rowDrawerOpen}
        rowDrawerMode={p.rowDrawerMode}
        drawerRow={p.drawerRow}
        orderedColumns={p.orderedColumns}
        closeRowDrawer={p.closeRowDrawer}
        setRowDrawerMode={p.setRowDrawerMode}
        saveRowFromDrawer={p.saveRowFromDrawer}
        saveRowAndCloseDrawer={p.saveRowAndCloseDrawer}
        saveRowAndNext={p.saveRowAndNext}
        deleteColumnModalOpen={p.deleteColumnModalOpen}
        deleteColumnTarget={p.deleteColumnTarget}
        closeDeleteColumnModal={p.closeDeleteColumnModal}
        deleteColumn={p.deleteColumn}
        bulkDeleteModalOpen={p.bulkDeleteModalOpen}
        bulkDeleteRowIds={p.bulkDeleteRowIds}
        selectedRowIds={p.selectedRowIds}
        closeBulkDeleteModal={p.closeBulkDeleteModal}
        deleteSelectedRows={p.deleteSelectedRows}
        deleteRowModalOpen={p.deleteRowModalOpen}
        deleteRowTarget={p.deleteRowTarget}
        closeDeleteRowModal={p.closeDeleteRowModal}
        deleteRow={p.deleteRow}
      />
    </Box>
  );
}
