'use client';

import { BankLogoAvatar } from '@/app/components/BankLogoAvatar';
import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { PDFPreviewModal } from '@/app/components/PDFPreviewModal';
import { createBasicSidePanelConfig, useSidePanelConfig } from '@/app/components/side-panel';
import { useAuth } from '@/app/hooks/useAuth';
import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import apiClient from '@/app/lib/api';
import { getStatementMerchantLabel, isStatementProcessingStatus } from '@/app/lib/statement-status';
import { resolveBankLogo } from '@bank-logos';
import {
  AlertCircle,
  ArrowDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns2,
  File,
  Loader2,
  Search,
  SlidersHorizontal,
  UploadCloud,
  X,
} from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface Statement {
  id: string;
  fileName: string;
  status: string;
  totalTransactions: number;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  createdAt: string;
  processedAt?: string;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  bankName: string;
  fileType: string;
  currency?: string | null;
  parsingDetails?: {
    logEntries?: Array<{ timestamp: string; level: string; message: string }>;
    metadataExtracted?: {
      currency?: string;
      headerDisplay?: {
        currencyDisplay?: string;
      };
    };
  };
}

const getBankDisplayName = (bankName: string) => {
  const resolved = resolveBankLogo(bankName);
  if (!resolved) return bankName;
  return resolved.key !== 'other' ? resolved.displayName : bankName;
};

export default function ReceiptsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useIntlayer('receiptsPage');
  const sidePanelConfig = useMemo(
    () =>
      createBasicSidePanelConfig({
        pageId: 'receipts',
        title: 'Receipts',
        subtitle: 'Overview',
      }),
    [],
  );
  useSidePanelConfig({ config: sidePanelConfig, autoRegister: true });
  const PAGE_SIZE = 20;
  const [statements, setStatements] = useState<Statement[]>([]);
  const statementsRef = useRef<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const resolveLabel = (value: any, fallback: string) => value?.value ?? value ?? fallback;
  const searchPlaceholder =
    (t.searchPlaceholder as any)?.value ?? t.searchPlaceholder ?? 'Поиск по чекам';
  const filterLabels = {
    type: resolveLabel(t.filters?.type, 'Тип'),
    status: resolveLabel(t.filters?.status, 'Статус'),
    date: resolveLabel(t.filters?.date, 'Дата'),
    from: resolveLabel(t.filters?.from, 'От'),
    filters: resolveLabel(t.filters?.filters, 'Фильтры'),
    columns: resolveLabel(t.filters?.columns, 'Колонки'),
  };
  const listHeaderLabels = {
    receipt: resolveLabel(t.listHeader?.receipt, 'Receipt'),
    type: resolveLabel(t.listHeader?.type, 'Type'),
    date: resolveLabel(t.listHeader?.date, 'Date'),
    merchant: resolveLabel(t.listHeader?.merchant, 'Merchant'),
    amount: resolveLabel(t.listHeader?.amount, 'Amount'),
    action: resolveLabel(t.listHeader?.action, 'Action'),
    scanning: resolveLabel(t.listHeader?.scanning, 'Scanning...'),
  };
  const viewLabel = resolveLabel(t.actions?.view, 'View');
  const uploadLabel = resolveLabel(t.uploadStatement, 'Upload');
  const allowDuplicatesLabel = resolveLabel(
    (t.uploadModal as any)?.allowDuplicates,
    'Разрешить загрузку дубликатов',
  );
  const uploadModalLabels = {
    title: resolveLabel(t.uploadModal?.title, 'Upload files'),
    subtitle: resolveLabel(t.uploadModal?.subtitle, 'PDF, Excel, CSV and images are supported'),
    dropHint1: resolveLabel(t.uploadModal?.dropHint1, 'Click to select'),
    dropHint2: resolveLabel(t.uploadModal?.dropHint2, 'or drag and drop files'),
    maxHint: resolveLabel(t.uploadModal?.maxHint, 'Up to 5 files, 10 MB each'),
    mbShort: resolveLabel(t.uploadModal?.mbShort, 'MB'),
    cancel: resolveLabel(t.uploadModal?.cancel, 'Cancel'),
    uploadFiles: resolveLabel(t.uploadModal?.uploadFiles, 'Upload files'),
    uploading: resolveLabel(t.uploadModal?.uploading, 'Uploading...'),
  };
  const emptyLabels = {
    title: resolveLabel(t.empty?.title, 'No receipts yet'),
    description: resolveLabel(t.empty?.description, 'Upload your first receipt to get started'),
  };
  const filterChipClassName =
    'inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary hover:text-primary';
  const filterLinkClassName =
    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-primary';

  useLockBodyScroll(!!uploadModalOpen);
  const totalPagesCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, page * pageSize);

  // PDF Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    statementsRef.current = statements;
  }, [statements]);

  const lastAutoOpenedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadStatements({ page, search });
  }, [user, page, search]);

  const filteredStatements = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return statements;
    return statements.filter(stmt => stmt.fileName.toLowerCase().includes(query));
  }, [searchInput, statements]);

  const loadStatements = async (opts?: {
    silent?: boolean;
    notifyOnCompletion?: boolean;
    page?: number;
    search?: string;
  }) => {
    try {
      const { silent = false, notifyOnCompletion = false } = opts || {};
      const targetPage = opts?.page ?? page;
      const targetSearch = opts?.search ?? search;
      const prevStatements = statementsRef.current;
      const prevStatusById = new Map(prevStatements.map(s => [s.id, s.status]));
      if (!silent) setLoading(true);

      const response = await apiClient.get('/statements', {
        params: {
          page: targetPage,
          limit: PAGE_SIZE,
          search: targetSearch || undefined,
        },
      });

      const payload = response.data;
      const rawData = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
          ? payload.data
          : [];

      const statementsWithFileType = rawData.map((stmt: Statement & { file_type?: string }) => ({
        ...stmt,
        fileType: stmt.fileType || stmt.file_type || 'pdf',
      }));

      const nextTotal =
        !Array.isArray(payload) && typeof payload.total === 'number'
          ? payload.total
          : statementsWithFileType.length;
      const nextPage = !Array.isArray(payload) && payload.page ? Number(payload.page) : targetPage;
      const nextLimit =
        !Array.isArray(payload) && payload.limit ? Number(payload.limit) : PAGE_SIZE;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / nextLimit) || 1);

      if (nextPage > nextTotalPages && nextTotal > 0) {
        setPage(nextTotalPages);
        return;
      }

      if (notifyOnCompletion && Array.isArray(statementsWithFileType)) {
        const processedStatuses = new Set(['parsed', 'validated', 'completed']);
        const finishedList: Statement[] = [];
        for (const next of statementsWithFileType) {
          const prevStatus = prevStatusById.get(next.id);
          if (!prevStatus) continue;

          const startedButNotFinished = prevStatus === 'processing' || prevStatus === 'uploaded';
          const finished = next.status !== 'processing' && next.status !== 'uploaded';
          if (!startedButNotFinished || !finished) continue;

          // collect for toasts and auto-open decision
          finishedList.push(next);

          if (processedStatuses.has(next.status)) {
            toast.success(`${t.notify.donePrefix.value}: ${next.fileName}`);
          } else if (next.status === 'error') {
            toast.error(`${t.notify.errorPrefix.value}: ${next.fileName}`);
          } else {
            toast.success(`${t.notify.donePrefix.value}: ${next.fileName}`);
          }
        }

        if (finishedList.length > 0) {
          // pick the earliest uploaded/created statement among finished ones
          const firstFinished = finishedList.sort((a, b) => {
            const ta = Date.parse(a.createdAt || '');
            const tb = Date.parse(b.createdAt || '');
            return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
          })[0];

          if (firstFinished && lastAutoOpenedIdRef.current !== firstFinished.id) {
            lastAutoOpenedIdRef.current = firstFinished.id;
            // navigate to the statement view page
            try {
              if (
                firstFinished.status === 'completed' ||
                firstFinished.status === 'parsed' ||
                firstFinished.status === 'validated'
              ) {
                router.push(`/statements/${firstFinished.id}/edit`);
              } else {
                router.push(`/storage/${firstFinished.id}`);
              }
            } catch (err) {
              // ignore navigation errors
            }
          }
        }
      }

      setStatements(statementsWithFileType);
      setTotal(nextTotal);
      setPageSize(nextLimit);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load statements:', error);
      toast.error(t.loadListError.value);
    } finally {
      const { silent = false } = opts || {};
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const hasProcessing = statements.some(
      s => s.status === 'processing' || (s.status === 'uploaded' && !s.processedAt),
    );
    if (!hasProcessing) return;
    const interval = setInterval(() => {
      loadStatements({ silent: true, notifyOnCompletion: true, page, search });
    }, 3000);
    return () => clearInterval(interval);
  }, [statements, page, search]);

  const addFiles = (files: File[]) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'image/jpeg',
      'image/png',
    ];
    const filtered = files.filter(f => allowed.includes(f.type));
    if (filtered.length === 0) {
      toast.error(t.uploadModal.unsupportedFormat.value);
      return;
    }
    setUploadFiles(prev => [...prev, ...filtered].slice(0, 5));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast.error(t.uploadModal.pickAtLeastOne.value);
      return;
    }
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    uploadFiles.forEach(file => formData.append('files', file));
    if (allowDuplicates) {
      formData.append('allowDuplicates', 'true');
    }

    try {
      await apiClient.post('/statements/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadFiles([]);
      setUploadModalOpen(false);
      setAllowDuplicates(false);
      setUploadError(null);
      setPage(1);
      toast.success(t.uploadModal.uploadedProcessing.value);
      await loadStatements({ page: 1, search });
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        t.uploadModal.uploadFailed.value;
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType?: string, fileName?: string, fileId?: string) => {
    return (
      <DocumentTypeIcon
        fileType={fileType}
        fileName={fileName}
        fileId={fileId}
        size={36}
        className="text-red-500"
      />
    );
  };

  const resolveStatementCurrency = (statement: Statement) =>
    (
      statement.currency ||
      statement.parsingDetails?.metadataExtracted?.currency ||
      statement.parsingDetails?.metadataExtracted?.headerDisplay?.currencyDisplay ||
      ''
    ).toString();

  const parseAmountValue = (value?: number | string | null) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(parsed) ? parsed : null;
  };

  const formatStatementAmount = (statement: Statement) => {
    const debit = parseAmountValue(statement.totalDebit);
    const credit = parseAmountValue(statement.totalCredit);
    const rawAmount = (debit && debit > 0 ? debit : credit && credit > 0 ? credit : 0) || 0;
    const currency = resolveStatementCurrency(statement);
    const formatted =
      rawAmount === 0
        ? '0'
        : new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(rawAmount);
    return `${formatted}${currency || ''}`;
  };

  const formatStatementDate = (statement: Statement) => {
    const dateValue =
      statement.statementDateTo || statement.statementDateFrom || statement.createdAt || '';
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
  };

  const handleView = (statement: Statement) => {
    if (
      statement.status === 'completed' ||
      statement.status === 'parsed' ||
      statement.status === 'validated'
    ) {
      router.push(`/statements/${statement.id}/edit`);
    } else {
      router.push(`/storage/${statement.id}`);
    }
  };

  return (
    <div className="container-shared px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1" data-tour-id="search-bar">
            <Search className="h-4 w-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full rounded-md border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <button
            onClick={() => setUploadModalOpen(true)}
            data-tour-id="upload-statement-button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary text-white transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={uploadLabel}
          >
            <UploadCloud className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={filterChipClassName}>
            {filterLabels.type}
            <ChevronDown className="h-4 w-4 text-gray-600" />
          </button>
          <button type="button" className={filterChipClassName}>
            {filterLabels.status}
            <ChevronDown className="h-4 w-4 text-gray-600" />
          </button>
          <button type="button" className={filterChipClassName}>
            {filterLabels.date}
            <ChevronDown className="h-4 w-4 text-gray-600" />
          </button>
          <button type="button" className={filterChipClassName}>
            {filterLabels.from}
            <ChevronDown className="h-4 w-4 text-gray-600" />
          </button>
          <button type="button" className={filterLinkClassName}>
            <SlidersHorizontal className="h-4 w-4" />
            {filterLabels.filters}
          </button>
          <button type="button" className={filterLinkClassName}>
            <Columns2 className="h-4 w-4" />
            {filterLabels.columns}
          </button>
        </div>
      </div>

      <div data-tour-id="statements-table">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingAnimation size="lg" />
          </div>
        ) : filteredStatements.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="mx-auto h-16 w-16 text-gray-300 mb-4 bg-gray-50 rounded-full flex items-center justify-center">
              <File className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">{emptyLabels.title}</h3>
            <p className="mt-1 text-gray-500">{emptyLabels.description}</p>
            <div className="mt-6">
              <button
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-md text-gray-700 bg-white hover:border-primary hover:text-primary focus:outline-none"
              >
                <UploadCloud className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                {uploadModalLabels.uploadFiles}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="hidden md:flex items-center gap-3 px-4 text-xs font-medium uppercase tracking-wide text-gray-500">
                <div className="w-4" />
                <div className="w-11">{listHeaderLabels.receipt}</div>
                <div className="w-3" />
                <div className="w-16">{listHeaderLabels.type}</div>
                <div className="flex items-center gap-1 w-28">
                  {listHeaderLabels.date}
                  <ArrowDown className="h-3 w-3 text-gray-400" />
                </div>
                <div className="flex-1">{listHeaderLabels.merchant}</div>
                <div className="w-36 text-right uppercase tracking-wide">
                  {listHeaderLabels.amount}
                </div>
                <div className="w-36 text-right uppercase tracking-wide">
                  {listHeaderLabels.action}
                </div>
              </div>
              {filteredStatements.map(statement => {
                const isProcessing = isStatementProcessingStatus(statement.status);
                const merchantLabel = getStatementMerchantLabel(
                  statement.status,
                  getBankDisplayName(statement.bankName),
                  listHeaderLabels.scanning,
                );
                const fileTypeLabel = (statement.fileType || 'pdf').toUpperCase();

                return (
                  <div
                    key={statement.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      aria-label={statement.fileName}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary shrink-0"
                    />
                    <button
                      type="button"
                      className="w-11 shrink-0 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        setPreviewFileId(statement.id);
                        setPreviewFileName(statement.fileName);
                        setPreviewModalOpen(true);
                      }}
                      title="Открыть предпросмотр"
                    >
                      {getFileIcon(statement.fileType, statement.fileName, statement.id)}
                    </button>
                    <div className="w-3 shrink-0" />
                    <span className="w-16 text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
                      {fileTypeLabel}
                    </span>
                    <span className="w-28 text-sm font-semibold text-gray-900 whitespace-nowrap shrink-0">
                      {formatStatementDate(statement)}
                    </span>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isProcessing ? (
                        <span className="text-sm font-semibold text-emerald-700">
                          {merchantLabel}
                        </span>
                      ) : (
                        <>
                          <BankLogoAvatar
                            bankName={statement.bankName}
                            size={24}
                            className="shrink-0"
                          />
                          <span className="text-sm text-gray-700 truncate">{merchantLabel}</span>
                        </>
                      )}
                    </div>
                    <span className="w-36 text-sm font-semibold text-gray-900 tabular-nums text-right shrink-0">
                      {formatStatementAmount(statement)}
                    </span>
                    <div className="flex items-center justify-end gap-2 w-36 shrink-0">
                      <button
                        onClick={() => handleView(statement)}
                        className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary hover:text-primary"
                      >
                        {viewLabel}
                      </button>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4"
              data-tour-id="pagination"
            >
              <div className="text-sm text-gray-600">
                {total === 0 ? emptyLabels.title : `Показано ${rangeStart}–${rangeEnd} из ${total}`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm border transition-all ${
                    page <= 1
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" /> Предыдущая
                </button>
                <span className="text-sm text-gray-600">
                  Страница {page} из {totalPagesCount}
                </span>
                <button
                  onClick={() => setPage(prev => Math.min(totalPagesCount, prev + 1))}
                  disabled={page >= totalPagesCount}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm border transition-all ${
                    page >= totalPagesCount
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  Следующая <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 transition-opacity"
            role="button"
            tabIndex={0}
            onClick={() => {
              setUploadModalOpen(false);
              setUploadFiles([]);
              setUploadError(null);
              setAllowDuplicates(false);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setUploadModalOpen(false);
                setUploadFiles([]);
                setUploadError(null);
                setAllowDuplicates(false);
              }
            }}
          />
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-gray-900/5 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-8 pt-8 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{uploadModalLabels.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{uploadModalLabels.subtitle}</p>
              </div>
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadFiles([]);
                  setUploadError(null);
                  setAllowDuplicates(false);
                }}
                className="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-8 pb-8">
              {uploadError && (
                <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {uploadError}
                </div>
              )}

              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="group relative rounded-2xl border-2 border-solid border-gray-200 bg-gray-50/50 hover:border-blue-500 transition-all duration-200"
              >
                <input
                  type="file"
                  multiple
                  className="absolute inset-0 cursor-pointer opacity-0 z-10"
                  accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
                  onChange={handleFileInput}
                />
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="mb-4 rounded-full bg-white p-4 shadow-sm ring-1 ring-gray-100 group-hover:scale-110 transition-transform duration-200">
                    <UploadCloud className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-base font-medium text-gray-900">
                    {uploadModalLabels.dropHint1}{' '}
                    <span className="font-normal text-gray-500">{uploadModalLabels.dropHint2}</span>
                  </p>
                  <p className="mt-2 text-xs text-gray-400">{uploadModalLabels.maxHint}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input
                  id="allow-duplicates"
                  type="checkbox"
                  checked={allowDuplicates}
                  onChange={e => setAllowDuplicates(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="allow-duplicates" className="text-sm text-gray-700">
                  {allowDuplicatesLabel}
                </label>
              </div>

              {uploadFiles.length > 0 && (
                <div className="mt-6 flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {uploadFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                          <DocumentTypeIcon
                            fileType={file.type}
                            fileName={file.name}
                            size={20}
                            className="text-red-500"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} {uploadModalLabels.mbShort}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeUploadFile(idx)}
                        className="rounded-full p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 pb-8 pt-2 flex justify-end gap-3">
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadFiles([]);
                  setUploadError(null);
                  setAllowDuplicates(false);
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                disabled={uploading}
              >
                {uploadModalLabels.cancel}
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || uploadFiles.length === 0}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:bg-primary-hover hover:shadow-primary/40 focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:shadow-none transition-all"
              >
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploading ? uploadModalLabels.uploading : uploadModalLabels.uploadFiles}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewModalOpen && previewFileId && (
        <PDFPreviewModal
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setPreviewFileId(null);
            setPreviewFileName('');
          }}
          fileId={previewFileId}
          fileName={previewFileName}
        />
      )}
    </div>
  );
}
