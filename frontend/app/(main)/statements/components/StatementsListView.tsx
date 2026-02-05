"use client";

import { BankLogoAvatar } from "@/app/components/BankLogoAvatar";
import { DocumentTypeIcon } from "@/app/components/DocumentTypeIcon";
import { PDFPreviewModal } from "@/app/components/PDFPreviewModal";
import LoadingAnimation from "@/app/components/LoadingAnimation";
import { useAuth } from "@/app/hooks/useAuth";
import { useLockBodyScroll } from "@/app/hooks/useLockBodyScroll";
import apiClient from "@/app/lib/api";
import { getStatementMerchantLabel } from "@/app/lib/statement-status";
import {
  getStatementStage,
  type StatementStage,
} from "@/app/lib/statement-workflow";
import { resolveBankLogo } from "@bank-logos";
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
} from "lucide-react";
import { useIntlayer } from "next-intlayer";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

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
  return resolved.key !== "other" ? resolved.displayName : bankName;
};

const resolveStatementCurrency = (statement: Statement) =>
  (
    statement.currency ||
    statement.parsingDetails?.metadataExtracted?.currency ||
    statement.parsingDetails?.metadataExtracted?.headerDisplay?.currencyDisplay ||
    ""
  ).toString();

const parseAmountValue = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

const formatStatementAmount = (statement: Statement) => {
  const debit = parseAmountValue(statement.totalDebit);
  const credit = parseAmountValue(statement.totalCredit);
  const rawAmount =
    (debit && debit > 0 ? debit : credit && credit > 0 ? credit : 0) || 0;
  const currency = resolveStatementCurrency(statement);
  const formatted =
    rawAmount === 0
      ? "0"
      : new Intl.NumberFormat(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(rawAmount);
  return `${formatted}${currency || ""}`;
};

const formatStatementDate = (statement: Statement) => {
  const dateValue =
    statement.statementDateTo ||
    statement.statementDateFrom ||
    statement.createdAt ||
    "";
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

type Props = {
  stage: StatementStage;
};

export default function StatementsListView({ stage }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const t = useIntlayer("statementsPage");
  const PAGE_SIZE = 20;
  const [statements, setStatements] = useState<Statement[]>([]);
  const statementsRef = useRef<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const resolveLabel = (value: any, fallback: string) =>
    value?.value ?? value ?? fallback;
  const searchPlaceholder =
    (t.searchPlaceholder as any)?.value ??
    t.searchPlaceholder ??
    "Поиск по выпискам";
  const filterLabels = {
    type: resolveLabel(t.filters?.type, "Тип"),
    status: resolveLabel(t.filters?.status, "Статус"),
    date: resolveLabel(t.filters?.date, "Дата"),
    from: resolveLabel(t.filters?.from, "От"),
    filters: resolveLabel(t.filters?.filters, "Фильтры"),
    columns: resolveLabel(t.filters?.columns, "Колонки"),
  };
  const listHeaderLabels = {
    receipt: resolveLabel(t.listHeader?.receipt, "Receipt"),
    type: resolveLabel(t.listHeader?.type, "Type"),
    date: resolveLabel(t.listHeader?.date, "Date"),
    merchant: resolveLabel(t.listHeader?.merchant, "Merchant"),
    amount: resolveLabel(t.listHeader?.amount, "Amount"),
    action: resolveLabel(t.listHeader?.action, "Action"),
    scanning: resolveLabel(t.listHeader?.scanning, "Scanning..."),
  };
  const viewLabel = resolveLabel(t.actions?.view, "View");
  const uploadLabel = resolveLabel(t.uploadStatement, "Upload");
  const allowDuplicatesLabel = resolveLabel(
    (t.uploadModal as any)?.allowDuplicates,
    "Разрешить загрузку дубликатов",
  );
  const uploadModalLabels = {
    title: resolveLabel(t.uploadModal?.title, "Upload files"),
    subtitle: resolveLabel(
      t.uploadModal?.subtitle,
      "PDF, Excel, CSV and images are supported",
    ),
    dropHint1: resolveLabel(t.uploadModal?.dropHint1, "Click to select"),
    dropHint2: resolveLabel(t.uploadModal?.dropHint2, "or drag and drop files"),
    maxHint: resolveLabel(t.uploadModal?.maxHint, "Up to 5 files, 10 MB each"),
    mbShort: resolveLabel(t.uploadModal?.mbShort, "MB"),
    cancel: resolveLabel(t.uploadModal?.cancel, "Cancel"),
    uploadFiles: resolveLabel(t.uploadModal?.uploadFiles, "Upload files"),
    uploading: resolveLabel(t.uploadModal?.uploading, "Uploading..."),
  };
  const emptyLabels = {
    title: resolveLabel(t.empty?.title, "No statements yet"),
    description: resolveLabel(
      t.empty?.description,
      "Upload your first statement to get started",
    ),
  };
  const filterChipClassName =
    "inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary hover:text-primary";
  const filterLinkClassName =
    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-primary";

  useLockBodyScroll(!!uploadModalOpen);
  const totalPagesCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, page * pageSize);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");

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
    return statements.filter((stmt) =>
      stmt.fileName.toLowerCase().includes(query),
    );
  }, [searchInput, statements]);

  const stagedStatements = useMemo(() => {
    return filteredStatements.filter((statement) => {
      const currentStage = getStatementStage(statement.id);
      return currentStage === stage;
    });
  }, [filteredStatements, stage]);

  const loadStatements = async (opts?: {
    silent?: boolean;
    notifyOnCompletion?: boolean;
    page?: number;
    search?: string;
  }) => {
    const { silent, notifyOnCompletion, page, search } = opts || {};
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await apiClient.get("/statements", {
        params: {
          page,
          pageSize,
          search,
        },
      });

      const rawData = response.data?.data || response.data || [];
      const statementsWithFileType = rawData.map((stmt: Statement) => ({
        ...stmt,
        fileType: stmt.fileName?.toLowerCase().includes("pdf") ? "pdf" : "file",
      }));
      setStatements(statementsWithFileType);
      setTotal(response.data?.total || statementsWithFileType.length);

      if (notifyOnCompletion && Array.isArray(statementsWithFileType)) {
        const firstFinished = statementsWithFileType.find(
          (next: Statement) => next.status === "parsed",
        );
        if (firstFinished && lastAutoOpenedIdRef.current !== firstFinished.id) {
          lastAutoOpenedIdRef.current = firstFinished.id;
          router.push(`/statements/${firstFinished.id}/edit`);
        }
      }
    } catch (error) {
      console.error("Failed to load statements:", error);
      toast.error(resolveLabel(t.loadListError, "Failed to load statements"));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      setUploadError(resolveLabel(t.uploadModal?.pickAtLeastOne, "Select at least one file"));
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    uploadFiles.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("allowDuplicates", allowDuplicates ? "true" : "false");

    try {
      await apiClient.post("/statements/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(resolveLabel(t.uploadModal?.uploadedProcessing, "Files uploaded"));
      setUploadModalOpen(false);
      setUploadFiles([]);
      loadStatements({ page: 1, search, notifyOnCompletion: true });
    } catch (error) {
      console.error("Failed to upload statements:", error);
      setUploadError(resolveLabel(t.uploadModal?.uploadFailed, "Failed to upload files"));
    } finally {
      setUploading(false);
    }
  };

  const handleView = (statement: Statement) => {
    if (
      statement.status === "completed" ||
      statement.status === "parsed" ||
      statement.status === "validated"
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
              onChange={(e) => setSearchInput(e.target.value)}
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
        ) : stagedStatements.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="mx-auto h-16 w-16 text-gray-300 mb-4 bg-gray-50 rounded-full flex items-center justify-center">
              <File className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              {emptyLabels.title}
            </h3>
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
                <div className="w-20">{listHeaderLabels.type}</div>
                <div className="w-24 flex items-center gap-1">
                  {listHeaderLabels.date}
                  <ArrowDown className="h-3 w-3" />
                </div>
                <div className="flex-1">{listHeaderLabels.merchant}</div>
                <div className="w-28 text-right">{listHeaderLabels.amount}</div>
                <div className="w-28 text-right">{listHeaderLabels.action}</div>
              </div>
              {stagedStatements.map((statement) => {
                const resolvedName = getBankDisplayName(statement.bankName);
                const merchantLabel = getStatementMerchantLabel(
                  statement.status,
                  resolvedName,
                  listHeaderLabels.scanning,
                );
                return (
                  <div
                    key={statement.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-primary/30"
                  >
                    <div className="w-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>
                    <button
                      type="button"
                      className="w-11 flex items-center justify-center hover:opacity-80 transition"
                      onClick={() => {
                        setPreviewFileId(statement.id);
                        setPreviewFileName(statement.fileName);
                        setPreviewModalOpen(true);
                      }}
                      aria-label={statement.fileName}
                    >
                      <DocumentTypeIcon
                        fileType={statement.fileType}
                        fileName={statement.fileName}
                        fileId={statement.id}
                        size={36}
                        className="text-red-500"
                      />
                    </button>
                    <div className="w-3" />
                    <div className="w-20 flex items-center gap-2 text-sm font-medium text-gray-700">
                      <span className="uppercase">{statement.fileType}</span>
                    </div>
                    <div className="w-24 text-sm font-medium text-gray-900">
                      {formatStatementDate(statement)}
                    </div>
                    <div className="flex-1 flex items-center gap-2 text-sm text-gray-900">
                      <BankLogoAvatar bankName={statement.bankName} size={20} />
                      <span className="font-medium">{merchantLabel}</span>
                    </div>
                    <div className="w-28 text-right text-sm font-semibold text-gray-900">
                      {formatStatementAmount(statement)}
                    </div>
                    <div className="w-28 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(statement)}
                        className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-primary hover:text-primary"
                      >
                        {viewLabel}
                      </button>
                      <button
                        onClick={() => handleView(statement)}
                        className="inline-flex items-center justify-center rounded-md border border-gray-200 p-2 text-gray-400 transition hover:border-primary hover:text-primary"
                        aria-label={viewLabel}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="text-sm text-gray-500">
                Показано {rangeStart}–{rangeEnd} из {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-500 disabled:opacity-50"
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Предыдущая
                </button>
                <span className="text-sm text-gray-600">
                  Страница {page} из {totalPagesCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPagesCount, prev + 1))}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-500 disabled:opacity-50"
                  disabled={page === totalPagesCount}
                >
                  Следующая
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {previewFileId && (
        <PDFPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          fileId={previewFileId}
          fileName={previewFileName}
        />
      )}

      {uploadModalOpen && (
        <dialog
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 px-4"
          open
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {uploadModalLabels.title}
                </h2>
                <p className="text-sm text-gray-500">{uploadModalLabels.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
                <UploadCloud className="h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-700">
                  {uploadModalLabels.dropHint1}
                </p>
                <p className="text-xs text-gray-500">{uploadModalLabels.dropHint2}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {uploadModalLabels.maxHint}
                </p>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    if (!e.target.files) return;
                    setUploadFiles(Array.from(e.target.files));
                  }}
                />
              </label>

              {uploadFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} {uploadModalLabels.mbShort}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <input
                  id="allow-duplicates"
                  type="checkbox"
                  checked={allowDuplicates}
                  onChange={(e) => setAllowDuplicates(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="allow-duplicates" className="text-sm text-gray-600">
                  {allowDuplicatesLabel}
                </label>
              </div>

              {uploadError && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {uploadError}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300"
              >
                {uploadModalLabels.cancel}
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {uploading ? uploadModalLabels.uploading : uploadModalLabels.uploadFiles}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
