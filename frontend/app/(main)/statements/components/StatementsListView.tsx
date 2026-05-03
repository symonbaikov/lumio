'use client';

import CreateExpenseDrawer from '@/app/(main)/statements/components/CreateExpenseDrawer';
import { PDFPreviewModal } from '@/app/components/PDFPreviewModal';
import { useKeyboardShortcuts } from '@/app/hooks/use-keyboard-shortcuts';
import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import apiClient from '@/app/lib/api';
import { getApiErrorStatus } from '@/app/lib/api-error';
import { resolveLabel } from '@/app/lib/side-panel-utils';
import type { ManualExpenseDraft } from '@/app/lib/statement-expense-drawer';
import {
  SHORTCUT_DELETE_SELECTED,
  SHORTCUT_SELECT_ALL,
} from '@/app/lib/keyboard-shortcuts';
import type { StatementStage } from '@/app/lib/statement-workflow';
import { RefreshCcw } from '@/app/components/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import type { JSX } from 'react';
import toast from 'react-hot-toast';
import { StatementsListHeader } from './StatementsListHeader';
import { StatementsListTable } from './StatementsListTable';
import { isGmailStatement, resolveStatementViewAction } from './StatementsListView.utils';
import { uploadScanDrawerFiles as runUploadScanDrawerFiles } from './statement-upload';
import { useStatementsView } from './hooks/useStatementsView';

type Props = { stage: StatementStage };

// ---- Manual expense form builder ----

interface ManualExpensePayload {
  draft: ManualExpenseDraft;
  date: string;
  files: File[];
  allowDuplicates: boolean;
}

function buildManualExpenseFormData(
  payload: ManualExpensePayload,
  resolvedTaxRateId: string,
): FormData {
  const formData = new FormData();
  formData.append('amount', payload.draft.amount.trim());
  formData.append('currency', payload.draft.currency.trim());
  formData.append('merchant', payload.draft.merchant.trim());
  formData.append('description', payload.draft.description.trim());
  formData.append('categoryId', payload.draft.categoryId);
  if (resolvedTaxRateId) formData.append('taxRateId', resolvedTaxRateId);
  formData.append('date', payload.date);
  formData.append('allowDuplicates', payload.allowDuplicates ? 'true' : 'false');
  payload.files.forEach(file => { formData.append('files', file); });
  return formData;
}

async function trySingleEndpoint(
  endpoint: string,
  formData: FormData,
): Promise<'ok' | 'skip' | 'fail'> {
  try {
    await apiClient.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return 'ok';
  } catch (error: unknown) {
    const status = getApiErrorStatus(error);
    if (status === 404 || status === 405) return 'skip';
    console.error('Failed to create manual expense:', error);
    return 'fail';
  }
}

async function submitManualExpense(
  payload: ManualExpensePayload,
  taxRateId: string,
  onSuccess: () => Promise<void>,
): Promise<void> {
  const formData = buildManualExpenseFormData(payload, taxRateId);
  const endpoints = ['/statements/manual-expense', '/expenses/manual', '/expenses'];
  const results = await Promise.allSettled(
    endpoints.map(ep => trySingleEndpoint(ep, formData)),
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value === 'ok') {
      toast.success('Manual expense created');
      await onSuccess();
      return;
    }
    if (result.status === 'fulfilled' && result.value === 'fail') {
      throw new Error('Failed to create manual expense');
    }
  }
  throw new Error('Manual expense creation is not available yet');
}

// ---- Pull indicator sub-component ----

interface PullIndicatorProps {
  isMobile: boolean;
  pullDistance: number;
  pullRefreshing: boolean;
  isReadyToRefresh: boolean;
}

function PullToRefreshIndicator({
  isMobile,
  pullDistance,
  pullRefreshing,
  isReadyToRefresh,
}: PullIndicatorProps): React.JSX.Element | null {
  if (!isMobile || (pullDistance <= 0 && !pullRefreshing)) return null;
  const badgeClass = `lumio-stmt-list-view__pull-badge${isReadyToRefresh || pullRefreshing ? ' lumio-stmt-list-view__pull-badge--ready' : ''}`;
  const label = pullRefreshing
    ? 'Refreshing...'
    : isReadyToRefresh
      ? 'Release to refresh'
      : 'Pull to refresh';
  return (
    <div className="lumio-stmt-list-view__pull-indicator">
      <div className={badgeClass}>
        <RefreshCcw size={14} style={pullRefreshing ? { animation: 'spin 1s linear infinite' } : {}} />
        <span>{label}</span>
      </div>
    </div>
  );
}

// ---- Main component ----

export default function StatementsListView({ stage }: Props): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const v = useStatementsView({ stage, router, searchParams });

  useLockBodyScroll(v.expenseDrawerOpen);

  useKeyboardShortcuts({
    'Shift+x': () => v.handleToggleSelectAll(true),
    'Shift+Delete': () => { void v.handleDeleteSelected(); },
  });

  const { t, filterState, listHeaderLabels, paginationLabels, uploadLabels } = v;

  const refreshAfterCreate = async (): Promise<void> => {
    v.setPage(1);
    try {
      const ok = await v.loadStatements({ search: v.search, notifyOnCompletion: false, showErrorToast: false });
      if (!ok) throw new Error('refresh-failed');
    } catch (err) {
      console.error('Failed to refresh statements:', err);
      toast.error(resolveLabel(t.refreshFailed, 'Failed to refresh statements'));
    }
  };

  const refreshAfterAttach = (): void => {
    void v.loadStatements({ silent: true, search: v.search, showErrorToast: false });
  };

  const onUploadSuccess = (msg: string): void => { toast.success(msg); };

  const uploadScanDrawerFiles = async (payload: {
    files: File[];
    allowDuplicates: boolean;
    requireManualCategorySelection: boolean;
  }): Promise<void> =>
    runUploadScanDrawerFiles({
      payload,
      labels: uploadLabels,
      onUploadSuccess: onUploadSuccess,
      refreshAfterCreate: refreshAfterCreate,
    });

  const handleCreateManualExpense = async (payload: ManualExpensePayload): Promise<void> => {
    const fallbackId = v.manualExpenseTaxRates.find(tr => tr.isEnabled && tr.isDefault)?.id ?? '';
    await submitManualExpense(payload, payload.draft.taxRateId ?? fallbackId, refreshAfterCreate);
  };

  const handleView = (statement: Parameters<typeof resolveStatementViewAction>[0]): void => {
    router.push(resolveStatementViewAction(statement).href);
  };

  const handleIconClick = (statement: {
    id: string;
    source?: string;
    fileName: string;
    parsingDetails?: { importPreview?: { attachments?: number } };
  }): void => {
    const isReceipt = statement.source === 'gmail' || statement.source === 'scan';
    if (isReceipt) {
      v.openPreview({
        fileId: statement.id,
        fileName: statement.fileName || 'receipt.pdf',
        source: isGmailStatement(statement) ? 'gmail' : 'receipt',
        allowAttachFile: false,
      });
      return;
    }
    const isManual = statement.fileName.toLowerCase().startsWith('manual-expense-');
    const attachCount = Number(statement.parsingDetails?.importPreview?.attachments ?? 0);
    v.openPreview({
      fileId: statement.id,
      fileName: statement.fileName,
      source: 'statement',
      allowAttachFile: isManual && attachCount === 0,
    });
  };

  const reviewDuplicateLabel = resolveLabel(v.t.actions?.reviewDuplicate, 'Review');
  const markDuplicateLabel = resolveLabel(v.t.actions?.markDuplicate, 'Mark as duplicate');
  const markNotDuplicateLabel = resolveLabel(v.t.actions?.markNotDuplicate, 'Mark as not duplicate');
  const dismissDuplicateLabel = resolveLabel(v.t.actions?.dismissDuplicate, markNotDuplicateLabel || 'Dismiss');
  const mergeDuplicatesLabel = resolveLabel(v.t.actions?.mergeDuplicates, 'Merge duplicates');
  const selectDuplicatesLabel = resolveLabel(v.t.actions?.selectDuplicates, 'Select duplicates');
  const viewLabel = resolveLabel(v.t.actions?.view, 'View');

  return (
    <div className="container-shared lumio-stmt-list-view" {...v.pullToRefreshHandlers}>
      <PullToRefreshIndicator
        isMobile={v.isMobile}
        pullDistance={v.pullDistance}
        pullRefreshing={v.pullRefreshing}
        isReadyToRefresh={v.isReadyToRefresh}
      />
      <StatementsListHeader
        searchInput={v.searchInput}
        searchPlaceholder={resolveLabel(t.searchPlaceholder, 'Search statements')}
        selectedCount={v.selectedCount}
        selectedActionsOpen={v.selectedActionsOpen}
        hasSelectedDuplicates={v.hasSelectedDuplicates}
        loading={v.loading}
        draftFilters={filterState.draftFilters}
        activeFilterCount={v.activeFilterCount}
        typeDropdownOpen={filterState.typeDropdownOpen}
        statusDropdownOpen={filterState.statusDropdownOpen}
        dateDropdownOpen={filterState.dateDropdownOpen}
        fromDropdownOpen={filterState.fromDropdownOpen}
        filtersDrawerOpen={filterState.filtersDrawerOpen}
        filtersDrawerScreen={filterState.filtersDrawerScreen}
        columnsDrawerOpen={filterState.columnsDrawerOpen}
        columnsWithLabels={v.columnsWithLabels}
        visibleFilterScreens={v.visibleFilterScreens}
        duplicateStatementIds={v.duplicateStatementIds}
        typeOptions={v.typeOptions}
        statusOptions={v.statusOptions}
        datePresets={v.datePresets}
        dateModes={v.dateModes}
        fromOptions={v.fromOptions}
        toOptions={v.fromOptions}
        groupByOptions={v.groupByOptions}
        hasOptions={v.hasOptions}
        currencyOptions={v.currencyOptions}
        filterLabels={v.filterLabels}
        filterOptionLabels={v.filterOptionLabels}
        mergeDuplicatesLabel={mergeDuplicatesLabel}
        dismissDuplicateLabel={dismissDuplicateLabel}
        markDuplicateLabel={markDuplicateLabel}
        selectDuplicatesLabel={selectDuplicatesLabel}
        onSearchChange={v.setSearchInput}
        onToggleActionsOpen={() => v.setSelectedActionsOpen(prev => !prev)}
        onMerge={v.handleMergeSelectedDuplicates}
        onDismiss={v.handleDismissSelectedDuplicates}
        onMarkDuplicate={v.handleMarkSelectedAsDuplicate}
        onExport={v.handleExportSelected}
        onDelete={v.handleDeleteSelected}
        onSelectDetectedDuplicates={v.handleSelectDetectedDuplicates}
        onTypeDropdownChange={filterState.setTypeDropdownOpen}
        onStatusDropdownChange={filterState.setStatusDropdownOpen}
        onDateDropdownChange={filterState.setDateDropdownOpen}
        onFromDropdownChange={filterState.setFromDropdownOpen}
        onFiltersDrawerClose={() => filterState.setFiltersDrawerOpen(false)}
        onFiltersDrawerOpen={() => { filterState.setDraftFilters(filterState.appliedFilters); filterState.setFiltersDrawerScreen('root'); filterState.setFiltersDrawerOpen(true); }}
        onFiltersBack={() => filterState.setFiltersDrawerScreen('root')}
        onFiltersSelect={field => filterState.setFiltersDrawerScreen(field)}
        onUpdateFilters={filterState.updateFilter}
        onResetAllFilters={filterState.resetAllFilters}
        onViewResults={() => { filterState.applyFilterChanges(); filterState.setFiltersDrawerOpen(false); }}
        onApplyType={() => filterState.applyAndClose(() => filterState.setTypeDropdownOpen(false))}
        onResetType={() => filterState.resetAndClose('type', () => filterState.setTypeDropdownOpen(false))}
        onApplyStatus={() => filterState.applyAndClose(() => filterState.setStatusDropdownOpen(false))}
        onResetStatus={() => filterState.resetAndClose('statuses', () => filterState.setStatusDropdownOpen(false))}
        onApplyDate={() => filterState.applyAndClose(() => filterState.setDateDropdownOpen(false))}
        onResetDate={() => filterState.resetAndClose('date', () => filterState.setDateDropdownOpen(false))}
        onApplyFrom={() => filterState.applyAndClose(() => filterState.setFromDropdownOpen(false))}
        onResetFrom={() => filterState.resetAndClose('from', () => filterState.setFromDropdownOpen(false))}
        onColumnsClose={() => filterState.setColumnsDrawerOpen(false)}
        onColumnsOpen={filterState.handleColumnsOpen}
        onColumnsToggle={filterState.updateColumnsToggle}
        onColumnsReorder={filterState.handleReorderColumns}
        onColumnsSave={filterState.handleSaveColumns}
      />
      <div
        ref={v.listScrollRef}
        data-tour-id="statements-table"
        className="lumio-stmt-list-view__body"
        style={{ paddingBottom: v.selectedCount > 0 ? 96 : 0 }}
      >
        <StatementsListTable
          loading={v.loading}
          displayStatements={v.displayStatements}
          paginatedStatements={v.paginatedDisplayStatements}
          gmailSyncSkeletonKeys={v.gmailSyncSkeletonKeys}
          allVisibleSelected={v.allVisibleSelected}
          selectedCount={v.selectedCount}
          selectedStatementIds={v.selectedStatementIds}
          dateSortDirection={v.dateSortDirection}
          page={v.page}
          totalPagesCount={v.totalPagesCount}
          rangeStart={v.rangeStart}
          rangeEnd={v.rangeEnd}
          total={v.total}
          duplicateMetaById={v.duplicateMetaById}
          columns={v.appliedColumnsWithLabels}
          currentExchangeRateLabels={v.currentExchangeRateLabels}
          workspaceCurrency={v.currentWorkspace?.currency}
          viewLabel={viewLabel}
          reviewDuplicateLabel={reviewDuplicateLabel}
          labels={{
            merchant: listHeaderLabels.merchant,
            date: listHeaderLabels.date,
            amount: listHeaderLabels.amount,
            action: listHeaderLabels.action,
            receipt: listHeaderLabels.receipt,
            scanning: listHeaderLabels.scanning,
            emptyTitle: resolveLabel(t.empty?.title, 'No statements yet'),
            emptyDescription: resolveLabel(t.empty?.description, 'Upload your first statement to get started'),
            paginationShown: paginationLabels.shown,
            paginationPageOf: paginationLabels.pageOf,
          }}
          onToggleSelectAll={v.handleToggleSelectAll}
          onToggleSortDirection={() => v.setDateSortDirection(cur => (cur === 'desc' ? 'asc' : 'desc'))}
          onToggleStatement={v.handleToggleStatement}
          onView={handleView}
          onIconClick={handleIconClick}
          onPageChange={v.setPage}
        />
      </div>
      {v.preview.fileId && (
        <PDFPreviewModal
          isOpen={v.preview.isOpen}
          onClose={v.closePreview}
          fileId={v.preview.fileId}
          fileName={v.preview.fileName}
          source={v.preview.source}
          allowAttachFile={v.preview.allowAttachFile}
          onFileAttached={refreshAfterAttach}
          onParsingStarted={refreshAfterAttach}
        />
      )}
      <CreateExpenseDrawer
        open={v.expenseDrawerOpen}
        initialMode={v.expenseDrawerMode}
        defaultCurrency={v.currentWorkspace?.currency ?? null}
        categories={v.manualExpenseCategories}
        taxRates={v.manualExpenseTaxRates}
        onClose={() => v.setExpenseDrawerOpen(false)}
        onSubmitScan={uploadScanDrawerFiles}
        onSubmitManual={handleCreateManualExpense}
      />
    </div>
  );
}
