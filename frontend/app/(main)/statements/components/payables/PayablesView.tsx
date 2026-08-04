/* eslint-disable max-lines */
'use client';

import { Download, Plus, RefreshCcw } from '@/app/components/icons';
import { Button } from '@/app/components/ui/button';
import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import { resolveCurrencyCode } from '@/app/lib/format-money';
import {
  type CreatePayableInput,
  type Payable,
  type PayablesExportFormat,
  type PayablesSummary,
  type UpdatePayableInput,
  payablesApi,
} from '@/app/lib/payables-api';
import { getNestedValue, resolveLabel } from '@/app/lib/side-panel-utils';
import { tokens } from '@/lib/theme-tokens';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CreatePayableDrawer } from './CreatePayableDrawer';
import PayableFiltersBar from './PayableFiltersBar';
import PayableSummaryCards from './PayableSummaryCards';
import PayablesList from './PayablesList';
import {
  DEFAULT_PAYABLES_FILTERS,
  type PayablesFiltersState,
  buildPayablesListParams,
} from './payables-utils';

const DEFAULT_SUMMARY: PayablesSummary = {
  toPay: 0,
  overdue: 0,
  dueThisWeek: 0,
  paidThisMonth: 0,
  paidTotal: 0,
  toPayCount: 0,
  overdueCount: 0,
  paidTotalCount: 0,
};

const PAGE_SIZE = 20;

// eslint-disable-next-line max-lines-per-function, complexity
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const candidate = error as {
    response?: { data?: { message?: string | string[]; error?: { message?: string } | string } };
    message?: string;
  };

  const message = candidate.response?.data?.message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  if (typeof candidate.response?.data?.error === 'string' && candidate.response.data.error.trim()) {
    return candidate.response.data.error;
  }
  if (
    candidate.response?.data?.error &&
    typeof candidate.response.data.error === 'object' &&
    typeof candidate.response.data.error.message === 'string'
  ) {
    return candidate.response.data.error.message;
  }
  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }
  return fallback;
};

const triggerBlobDownload = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// eslint-disable-next-line max-lines-per-function, complexity
export function PayablesView(): React.JSX.Element {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { locale } = useLocale();
  const t = useIntlayer('statementsPage');
  const tx = useCallback(
    (path: string[], fallback: string) => resolveLabel(getNestedValue(t, path), fallback),
    [t],
  );
  const [summary, setSummary] = useState<PayablesSummary>(DEFAULT_SUMMARY);
  const [items, setItems] = useState<Payable[]>([]);
  const [filters, setFilters] = useState<PayablesFiltersState>(DEFAULT_PAYABLES_FILTERS);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null);
  const [saving, setSaving] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<PayablesExportFormat | null>(null);
  const [queryPage, setQueryPage] = useState(1);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    const status = searchParams?.get('status');
    const source = searchParams?.get('source');

    const nextFilters = {
      ...DEFAULT_PAYABLES_FILTERS,
      status:
        status === 'to_pay' ||
        status === 'scheduled' ||
        status === 'paid' ||
        status === 'overdue' ||
        status === 'archived'
          ? status
          : DEFAULT_PAYABLES_FILTERS.status,
      source:
        source === 'manual' || source === 'invoice' || source === 'statement'
          ? source
          : DEFAULT_PAYABLES_FILTERS.source,
    } satisfies PayablesFiltersState;

    setFilters(current => {
      if (
        current.search === nextFilters.search &&
        current.status === nextFilters.status &&
        current.source === nextFilters.source &&
        current.dueDateFrom === nextFilters.dueDateFrom &&
        current.dueDateTo === nextFilters.dueDateTo &&
        current.sort === nextFilters.sort
      ) {
        return current;
      }

      return nextFilters;
    });
    setPage(1);
    setQueryPage(1);
  }, [searchParams]);

  const labels = useMemo(
    () => ({
      title: tx(['payables', 'title'], 'Payables'),
      subtitle: tx(
        ['payables', 'subtitle'],
        'Track upcoming payments, overdue bills, and paid expenses in one queue.',
      ),
      add: tx(['payables', 'add'], 'Add payable'),
      refresh: tx(['payables', 'refresh'], 'Refresh'),
      export: tx(['payables', 'export'], 'Export'),
      exportCsv: tx(['payables', 'exportCsv'], 'Export CSV'),
      exportXlsx: tx(['payables', 'exportXlsx'], 'Export XLSX'),
      summary: {
        toPay: tx(['payables', 'summary', 'toPay'], 'To Pay'),
        overdue: tx(['payables', 'summary', 'overdue'], 'Overdue'),
        dueThisWeek: tx(['payables', 'summary', 'dueThisWeek'], 'Due This Week'),
        paidTotal: tx(['payables', 'summary', 'paidThisMonth'], 'Paid'),
        itemsSuffix: tx(['payables', 'summary', 'itemsSuffix'], 'items'),
      },
      filters: {
        status: tx(['payables', 'filters', 'status'], 'Status'),
        source: tx(['payables', 'filters', 'source'], 'Source'),
        dueFrom: tx(['payables', 'filters', 'dueFrom'], 'Due from'),
        dueTo: tx(['payables', 'filters', 'dueTo'], 'Due to'),
        sort: tx(['payables', 'filters', 'sort'], 'Sort'),
        reset: tx(['payables', 'filters', 'reset'], 'Reset'),
        allStatuses: tx(['payables', 'filters', 'allStatuses'], 'All statuses'),
        allSources: tx(['payables', 'filters', 'allSources'], 'All sources'),
        statusOptions: {
          to_pay: tx(['payables', 'status', 'toPay'], 'To pay'),
          scheduled: tx(['payables', 'status', 'scheduled'], 'Scheduled'),
          paid: tx(['payables', 'status', 'paid'], 'Paid'),
          overdue: tx(['payables', 'status', 'overdue'], 'Overdue'),
          archived: tx(['payables', 'status', 'archived'], 'Archived'),
        },
        sourceOptions: {
          manual: tx(['payables', 'sources', 'manual'], 'Manual'),
          invoice: tx(['payables', 'sources', 'invoice'], 'Invoice'),
          statement: tx(['payables', 'sources', 'statement'], 'Statement'),
        },
        sortOptions: {
          dueDateAsc: tx(['payables', 'sort', 'dueDateAsc'], 'Due date (earliest)'),
          dueDateDesc: tx(['payables', 'sort', 'dueDateDesc'], 'Due date (latest)'),
          amountDesc: tx(['payables', 'sort', 'amountDesc'], 'Amount (highest)'),
          vendorAsc: tx(['payables', 'sort', 'vendorAsc'], 'Vendor (A-Z)'),
        },
      },
      list: {
        vendor: tx(['payables', 'list', 'vendor'], 'Vendor'),
        dueDate: tx(['payables', 'list', 'dueDate'], 'Due date'),
        amount: tx(['payables', 'list', 'amount'], 'Amount'),
        source: tx(['payables', 'list', 'source'], 'Source'),
        status: tx(['payables', 'list', 'status'], 'Status'),
        actions: tx(['payables', 'list', 'actions'], 'Actions'),
        markPaid: tx(['payables', 'actions', 'markPaid'], 'Mark paid'),
        edit: tx(['payables', 'actions', 'edit'], 'Edit'),
        archive: tx(['payables', 'actions', 'archive'], 'Archive'),
        delete: tx(['payables', 'actions', 'delete'], 'Delete'),
        pageShown: tx(['pagination', 'shown'], 'Showing {from}–{to} of {count}'),
        previous: tx(['pagination', 'previous'], 'Previous'),
        next: tx(['pagination', 'next'], 'Next'),
        pageOf: tx(['pagination', 'pageOf'], 'Page {page} of {count}'),
        statusLabels: {
          to_pay: tx(['payables', 'status', 'toPay'], 'To pay'),
          scheduled: tx(['payables', 'status', 'scheduled'], 'Scheduled'),
          paid: tx(['payables', 'status', 'paid'], 'Paid'),
          overdue: tx(['payables', 'status', 'overdue'], 'Overdue'),
          archived: tx(['payables', 'status', 'archived'], 'Archived'),
        },
        sourceLabels: {
          manual: tx(['payables', 'sources', 'manual'], 'Manual'),
          invoice: tx(['payables', 'sources', 'invoice'], 'Invoice'),
          statement: tx(['payables', 'sources', 'statement'], 'Statement'),
        },
      },
      drawer: {
        createTitle: tx(['payables', 'drawer', 'createTitle'], 'Create payable'),
        editTitle: tx(['payables', 'drawer', 'editTitle'], 'Edit payable'),
        vendor: tx(['payables', 'drawer', 'vendor'], 'Vendor'),
        amount: tx(['payables', 'drawer', 'amount'], 'Amount'),
        currency: tx(['payables', 'drawer', 'currency'], 'Currency'),
        dueDate: tx(['payables', 'drawer', 'dueDate'], 'Due date'),
        source: tx(['payables', 'drawer', 'source'], 'Source'),
        status: tx(['payables', 'drawer', 'status'], 'Status'),
        comment: tx(['payables', 'drawer', 'comment'], 'Comment'),
        save: tx(['payables', 'drawer', 'save'], 'Save'),
        saving: tx(['payables', 'drawer', 'saving'], 'Saving...'),
        cancel: tx(['payables', 'drawer', 'cancel'], 'Cancel'),
        sourceOptions: {
          manual: tx(['payables', 'sources', 'manual'], 'Manual'),
          invoice: tx(['payables', 'sources', 'invoice'], 'Invoice'),
          statement: tx(['payables', 'sources', 'statement'], 'Statement'),
        },
        statusOptions: {
          to_pay: tx(['payables', 'status', 'toPay'], 'To pay'),
          scheduled: tx(['payables', 'status', 'scheduled'], 'Scheduled'),
          paid: tx(['payables', 'status', 'paid'], 'Paid'),
          overdue: tx(['payables', 'status', 'overdue'], 'Overdue'),
          archived: tx(['payables', 'status', 'archived'], 'Archived'),
        },
      },
      emptyTitle: tx(['payables', 'empty', 'title'], 'No payables found'),
      emptyDescription: tx(
        ['payables', 'empty', 'description'],
        'Try changing filters or create your first payable.',
      ),
      authLoading: tx(['payables', 'auth', 'loading'], 'Loading...'),
      loginRequired: tx(['payables', 'auth', 'loginRequired'], 'Please sign in to view payables.'),
      noWorkspace: tx(
        ['payables', 'auth', 'workspaceRequired'],
        'Select a workspace to view payables.',
      ),
      toasts: {
        loadFailed: tx(['payables', 'toasts', 'loadFailed'], 'Failed to load payables'),
        createSuccess: tx(['payables', 'toasts', 'createSuccess'], 'Payable created'),
        createFailed: tx(['payables', 'toasts', 'createFailed'], 'Failed to create payable'),
        updateSuccess: tx(['payables', 'toasts', 'updateSuccess'], 'Payable updated'),
        updateFailed: tx(['payables', 'toasts', 'updateFailed'], 'Failed to update payable'),
        markPaidSuccess: tx(['payables', 'toasts', 'markPaidSuccess'], 'Marked as paid'),
        markPaidFailed: tx(
          ['payables', 'toasts', 'markPaidFailed'],
          'Failed to mark payable as paid',
        ),
        archiveSuccess: tx(['payables', 'toasts', 'archiveSuccess'], 'Payable archived'),
        archiveFailed: tx(['payables', 'toasts', 'archiveFailed'], 'Failed to archive payable'),
        deleteSuccess: tx(['payables', 'toasts', 'deleteSuccess'], 'Payable deleted'),
        deleteFailed: tx(['payables', 'toasts', 'deleteFailed'], 'Failed to delete payable'),
        deleteConfirm: tx(['payables', 'toasts', 'deleteConfirm'], 'Delete {vendor}?'),
        exportSuccess: tx(['payables', 'toasts', 'exportSuccess'], 'Export started'),
        exportFailed: tx(['payables', 'toasts', 'exportFailed'], 'Failed to export payables'),
      },
    }),
    [t, tx],
  );

  const loadData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!(user && currentWorkspace)) {
        setLoading(false);
        return;
      }

      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const requestVersion = ++requestVersionRef.current;

      try {
        const [summaryResponse, listResponse] = await Promise.all([
          payablesApi.getSummary(),
          payablesApi.list(buildPayablesListParams(filters, { page: queryPage, limit: PAGE_SIZE })),
        ]);

        if (requestVersion !== requestVersionRef.current) {
          return;
        }

        const nextTotalPages = Math.max(1, listResponse.totalPages || 1);

        if (listResponse.total > 0 && queryPage > nextTotalPages) {
          setPage(nextTotalPages);
          setQueryPage(nextTotalPages);
          return;
        }

        setSummary(summaryResponse);
        setItems(listResponse.data);
        setTotal(listResponse.total);
        setTotalPages(nextTotalPages);
        setPage(Math.min(queryPage, nextTotalPages));
      } catch (error) {
        if (requestVersion !== requestVersionRef.current) {
          return;
        }
        toast.error(getErrorMessage(error, labels.toasts.loadFailed));
      } finally {
        if (requestVersion === requestVersionRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentWorkspace, filters, labels.toasts.loadFailed, queryPage, user],
  );

  useEffect(() => {
    if (authLoading || workspaceLoading) {
      return;
    }
    void loadData();
  }, [authLoading, workspaceLoading, loadData]);

  const handleFiltersChange = useCallback((next: PayablesFiltersState) => {
    setFilters(next);
    setPage(1);
    setQueryPage(1);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
    setQueryPage(nextPage);
  }, []);

  const openCreateDrawer = (): void => {
    setEditingPayable(null);
    setDrawerOpen(true);
  };

  const handleEdit = async (payable: Payable): Promise<void> => {
    try {
      const fresh = await payablesApi.getOne(payable.id);
      setEditingPayable(fresh);
      setDrawerOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error, labels.toasts.loadFailed));
    }
  };

  // eslint-disable-next-line max-lines-per-function
  const handleSave = async (payload: CreatePayableInput | UpdatePayableInput): Promise<void> => {
    setSaving(true);
    try {
      if (editingPayable) {
        await payablesApi.update(editingPayable.id, payload as UpdatePayableInput);
        toast.success(labels.toasts.updateSuccess);
      } else {
        await payablesApi.create(payload as CreatePayableInput);
        toast.success(labels.toasts.createSuccess);
      }

      setDrawerOpen(false);
      setEditingPayable(null);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editingPayable ? labels.toasts.updateFailed : labels.toasts.createFailed,
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (payable: Payable): Promise<void> => {
    setMarkingPaidId(payable.id);
    try {
      await payablesApi.markAsPaid(payable.id);
      toast.success(labels.toasts.markPaidSuccess);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, labels.toasts.markPaidFailed));
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleArchive = async (payable: Payable): Promise<void> => {
    setArchivingId(payable.id);
    try {
      await payablesApi.archive(payable.id);
      toast.success(labels.toasts.archiveSuccess);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, labels.toasts.archiveFailed));
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (payable: Payable): Promise<void> => {
    const confirmMessage = labels.toasts.deleteConfirm.replace('{vendor}', payable.vendor);
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setDeletingId(payable.id);
    try {
      await payablesApi.delete(payable.id);
      toast.success(labels.toasts.deleteSuccess);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, labels.toasts.deleteFailed));
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async (format: PayablesExportFormat): Promise<void> => {
    setExporting(format);
    try {
      const result = await payablesApi.exportList({
        ...buildPayablesListParams(filters),
        format,
      });
      triggerBlobDownload(
        result.blob,
        result.fileName || `payables.${format === 'csv' ? 'csv' : 'xlsx'}`,
      );
      toast.success(labels.toasts.exportSuccess);
    } catch (error) {
      toast.error(getErrorMessage(error, labels.toasts.exportFailed));
    } finally {
      setExporting(null);
    }
  };

  if (authLoading || workspaceLoading || loading) {
    return (
      <div
        className="container-shared lumio-stmt-list"
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        <Spinner style={{ height: 80, width: 80, color: 'var(--primary)' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-shared" style={{ padding: '40px 16px' }}>
        <div
          style={{
            borderRadius: tokens.radius.lg,
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            padding: 24,
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          {labels.loginRequired}
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="container-shared" style={{ padding: '40px 16px' }}>
        <div
          style={{
            borderRadius: tokens.radius.lg,
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            padding: 24,
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          {labels.noWorkspace}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container-shared lumio-stmt-list">
        <div
          style={{
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--foreground)' }}>
                {labels.title}
              </h1>
              <p
                style={{
                  marginTop: 8,
                  maxWidth: 768,
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                }}
              >
                {labels.subtitle}
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <Button
                variant="outline"
                onClick={() => void loadData({ silent: true })}
                disabled={refreshing}
              >
                <RefreshCcw size={16} />
                {labels.refresh}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleExport('csv')}
                disabled={exporting !== null}
              >
                <Download size={16} />
                {labels.exportCsv}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleExport('excel')}
                disabled={exporting !== null}
              >
                <Download size={16} />
                {labels.exportXlsx}
              </Button>
              <Button onClick={openCreateDrawer}>
                <Plus size={16} />
                {labels.add}
              </Button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            minHeight: 0,
            flex: 1,
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
            paddingBottom: 8,
          }}
        >
          <PayableSummaryCards
            summary={summary}
            locale={locale}
            currency={resolveCurrencyCode(currentWorkspace.currency)}
            labels={labels.summary}
          />

          <PayableFiltersBar
            value={filters}
            onChange={handleFiltersChange}
            onReset={() => handleFiltersChange(DEFAULT_PAYABLES_FILTERS)}
            labels={labels.filters}
          />

          <PayablesList
            items={items}
            locale={locale}
            emptyTitle={labels.emptyTitle}
            emptyDescription={labels.emptyDescription}
            labels={labels.list}
            pagination={{
              page,
              totalPages,
              totalItems: total,
              pageSize: PAGE_SIZE,
              onPageChange: handlePageChange,
            }}
            actionState={{ markingPaidId, archivingId, deletingId }}
            onEdit={handleEdit}
            onMarkPaid={handleMarkPaid}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <CreatePayableDrawer
        open={drawerOpen}
        payable={editingPayable}
        saving={saving}
        onClose={() => {
          setDrawerOpen(false);
          setEditingPayable(null);
        }}
        onSubmit={handleSave}
        labels={labels.drawer}
      />
    </>
  );
}
