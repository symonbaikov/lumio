"use client";

import { BankLogoAvatar } from "@/app/components/BankLogoAvatar";
import { DocumentTypeIcon } from "@/app/components/DocumentTypeIcon";
import { PDFPreviewModal } from "@/app/components/PDFPreviewModal";
import LoadingAnimation from "@/app/components/LoadingAnimation";
import { ColumnsDrawer } from "@/app/(main)/statements/components/columns/ColumnsDrawer";
import {
  DEFAULT_STATEMENT_COLUMNS,
  loadStatementColumns,
  reorderStatementColumns,
  saveStatementColumns,
  type StatementColumn,
  type StatementColumnId,
} from "@/app/(main)/statements/components/columns/statement-columns";
import { DateFilterDropdown } from "@/app/(main)/statements/components/filters/DateFilterDropdown";
import { FiltersDrawer } from "@/app/(main)/statements/components/filters/FiltersDrawer";
import { FromFilterDropdown } from "@/app/(main)/statements/components/filters/FromFilterDropdown";
import { StatusFilterDropdown } from "@/app/(main)/statements/components/filters/StatusFilterDropdown";
import {
  DEFAULT_STATEMENT_FILTERS,
  applyStatementsFilters,
  loadStatementFilters,
  saveStatementFilters,
  type StatementFilters,
} from "@/app/(main)/statements/components/filters/statement-filters";
import { TypeFilterDropdown } from "@/app/(main)/statements/components/filters/TypeFilterDropdown";
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
  exported?: boolean | null;
  paid?: boolean | null;
  createdAt: string;
  processedAt?: string;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  bankName: string;
  fileType: string;
  currency?: string | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  errorMessage?: string | null;
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
  const filterChipActiveClassName =
    "inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary";

  useLockBodyScroll(!!uploadModalOpen);
  const totalPagesCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, page * pageSize);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");

  const [draftFilters, setDraftFilters] = useState<StatementFilters>(
    DEFAULT_STATEMENT_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = useState<StatementFilters>(
    DEFAULT_STATEMENT_FILTERS,
  );
  const [filtersDrawerScreen, setFiltersDrawerScreen] = useState("root");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [columnsDrawerOpen, setColumnsDrawerOpen] = useState(false);
  const [columns, setColumns] = useState<StatementColumn[]>(DEFAULT_STATEMENT_COLUMNS);
  const [draftColumns, setDraftColumns] = useState<StatementColumn[]>(DEFAULT_STATEMENT_COLUMNS);

  const filterOptionLabels = {
    apply: resolveLabel((t.filters as any)?.apply, "Apply"),
    reset: resolveLabel((t.filters as any)?.reset, "Reset"),
    resetFilters: resolveLabel((t.filters as any)?.resetFilters, "Reset filters"),
    viewResults: resolveLabel((t.filters as any)?.viewResults, "View results"),
    save: resolveLabel((t.filters as any)?.save, "Save"),
    saveSearch: resolveLabel((t.filters as any)?.saveSearch, "Save search"),
    any: resolveLabel((t.filters as any)?.any, "Any"),
    yes: resolveLabel((t.filters as any)?.yes, "Yes"),
    no: resolveLabel((t.filters as any)?.no, "No"),
    typeExpense: resolveLabel((t.filters as any)?.typeExpense, "Expense"),
    typeReport: resolveLabel((t.filters as any)?.typeReport, "Expense Report"),
    typeChat: resolveLabel((t.filters as any)?.typeChat, "Chat"),
    typeTrip: resolveLabel((t.filters as any)?.typeTrip, "Trip"),
    typeTask: resolveLabel((t.filters as any)?.typeTask, "Task"),
    statusUnreported: resolveLabel((t.filters as any)?.statusUnreported, "Unreported"),
    statusDraft: resolveLabel((t.filters as any)?.statusDraft, "Draft"),
    statusOutstanding: resolveLabel(
      (t.filters as any)?.statusOutstanding,
      "Outstanding",
    ),
    statusApproved: resolveLabel((t.filters as any)?.statusApproved, "Approved"),
    statusPaid: resolveLabel((t.filters as any)?.statusPaid, "Paid"),
    statusDone: resolveLabel((t.filters as any)?.statusDone, "Done"),
    dateThisMonth: resolveLabel((t.filters as any)?.dateThisMonth, "This month"),
    dateLastMonth: resolveLabel((t.filters as any)?.dateLastMonth, "Last month"),
    dateYearToDate: resolveLabel((t.filters as any)?.dateYearToDate, "Year to date"),
    dateOn: resolveLabel((t.filters as any)?.dateOn, "On"),
    dateAfter: resolveLabel((t.filters as any)?.dateAfter, "After"),
    dateBefore: resolveLabel((t.filters as any)?.dateBefore, "Before"),
    drawerTitle: resolveLabel((t.filters as any)?.drawerTitle, "Filters"),
    drawerGeneral: resolveLabel((t.filters as any)?.drawerGeneral, "General"),
    drawerExpenses: resolveLabel((t.filters as any)?.drawerExpenses, "Expenses"),
    drawerReports: resolveLabel((t.filters as any)?.drawerReports, "Reports"),
    drawerGroupBy: resolveLabel((t.filters as any)?.drawerGroupBy, "Group by"),
    drawerHas: resolveLabel((t.filters as any)?.drawerHas, "Has"),
    drawerKeywords: resolveLabel((t.filters as any)?.drawerKeywords, "Keywords"),
    drawerLimit: resolveLabel((t.filters as any)?.drawerLimit, "Limit"),
    drawerTo: resolveLabel((t.filters as any)?.drawerTo, "To"),
    drawerAmount: resolveLabel((t.filters as any)?.drawerAmount, "Amount"),
    drawerApproved: resolveLabel((t.filters as any)?.drawerApproved, "Approved"),
    drawerBillable: resolveLabel((t.filters as any)?.drawerBillable, "Billable"),
    groupByDate: resolveLabel((t.filters as any)?.groupByDate, "Date"),
    groupByStatus: resolveLabel((t.filters as any)?.groupByStatus, "Status"),
    groupByType: resolveLabel((t.filters as any)?.groupByType, "Type"),
    groupByBank: resolveLabel((t.filters as any)?.groupByBank, "Bank"),
    groupByUser: resolveLabel((t.filters as any)?.groupByUser, "User"),
    groupByAmount: resolveLabel((t.filters as any)?.groupByAmount, "Amount"),
    hasErrors: resolveLabel((t.filters as any)?.hasErrors, "Errors"),
    hasLogs: resolveLabel((t.filters as any)?.hasLogs, "Logs"),
    hasTransactions: resolveLabel((t.filters as any)?.hasTransactions, "Transactions"),
    hasDateRange: resolveLabel((t.filters as any)?.hasDateRange, "Date range"),
    hasCurrency: resolveLabel((t.filters as any)?.hasCurrency, "Currency"),
    columnReceipt: resolveLabel((t.filters as any)?.columnReceipt, "Receipt"),
    columnDate: resolveLabel((t.filters as any)?.columnDate, "Date"),
    columnMerchant: resolveLabel((t.filters as any)?.columnMerchant, "Merchant"),
    columnFrom: resolveLabel((t.filters as any)?.columnFrom, "From"),
    columnTo: resolveLabel((t.filters as any)?.columnTo, "To"),
    columnCategory: resolveLabel((t.filters as any)?.columnCategory, "Category"),
    columnTag: resolveLabel((t.filters as any)?.columnTag, "Tag"),
    columnAmount: resolveLabel((t.filters as any)?.columnAmount, "Amount"),
    columnAction: resolveLabel((t.filters as any)?.columnAction, "Action"),
    columnApproved: resolveLabel((t.filters as any)?.columnApproved, "Approved"),
    columnBillable: resolveLabel((t.filters as any)?.columnBillable, "Billable"),
    columnCard: resolveLabel((t.filters as any)?.columnCard, "Card"),
    columnDescription: resolveLabel((t.filters as any)?.columnDescription, "Description"),
    columnExchangeRate: resolveLabel(
      (t.filters as any)?.columnExchangeRate,
      "Exchange rate",
    ),
    columnExported: resolveLabel((t.filters as any)?.columnExported, "Exported"),
    columnExportedTo: resolveLabel((t.filters as any)?.columnExportedTo, "Exported to"),
    columnsTitle: resolveLabel((t.filters as any)?.columnsTitle, "Columns"),
  };

  const typeOptions = [
    { value: "expense", label: filterOptionLabels.typeExpense },
    { value: "expense_report", label: filterOptionLabels.typeReport },
    { value: "chat", label: filterOptionLabels.typeChat },
    { value: "trip", label: filterOptionLabels.typeTrip },
    { value: "task", label: filterOptionLabels.typeTask },
    { value: "pdf", label: "PDF" },
    { value: "xlsx", label: "Excel" },
    { value: "csv", label: "CSV" },
    { value: "image", label: "Image" },
  ];

  const statusOptions = [
    { value: "unreported", label: filterOptionLabels.statusUnreported },
    { value: "draft", label: filterOptionLabels.statusDraft },
    { value: "outstanding", label: filterOptionLabels.statusOutstanding },
    { value: "approved", label: filterOptionLabels.statusApproved },
    { value: "paid", label: filterOptionLabels.statusPaid },
    { value: "done", label: filterOptionLabels.statusDone },
  ];

  const datePresets = [
    { value: "thisMonth" as const, label: filterOptionLabels.dateThisMonth },
    { value: "lastMonth" as const, label: filterOptionLabels.dateLastMonth },
    { value: "yearToDate" as const, label: filterOptionLabels.dateYearToDate },
  ];

  const dateModes = [
    { value: "on" as const, label: filterOptionLabels.dateOn },
    { value: "after" as const, label: filterOptionLabels.dateAfter },
    { value: "before" as const, label: filterOptionLabels.dateBefore },
  ];

  const groupByOptions = [
    { value: "date", label: filterOptionLabels.groupByDate },
    { value: "status", label: filterOptionLabels.groupByStatus },
    { value: "type", label: filterOptionLabels.groupByType },
    { value: "bank", label: filterOptionLabels.groupByBank },
    { value: "user", label: filterOptionLabels.groupByUser },
    { value: "amount", label: filterOptionLabels.groupByAmount },
  ];

  const hasOptions = [
    { value: "errors", label: filterOptionLabels.hasErrors },
    { value: "processingDetails", label: filterOptionLabels.hasLogs },
    { value: "transactions", label: filterOptionLabels.hasTransactions },
    { value: "dateRange", label: filterOptionLabels.hasDateRange },
    { value: "currency", label: filterOptionLabels.hasCurrency },
  ];

  const columnLabels = {
    receipt: filterOptionLabels.columnReceipt,
    date: filterOptionLabels.columnDate,
    merchant: filterOptionLabels.columnMerchant,
    from: filterOptionLabels.columnFrom,
    to: filterOptionLabels.columnTo,
    category: filterOptionLabels.columnCategory,
    tag: filterOptionLabels.columnTag,
    amount: filterOptionLabels.columnAmount,
    action: filterOptionLabels.columnAction,
    approved: filterOptionLabels.columnApproved,
    billable: filterOptionLabels.columnBillable,
    card: filterOptionLabels.columnCard,
    description: filterOptionLabels.columnDescription,
    exchangeRate: filterOptionLabels.columnExchangeRate,
    exported: filterOptionLabels.columnExported,
    exportedTo: filterOptionLabels.columnExportedTo,
  };

  const columnsWithLabels = useMemo(() => {
    return draftColumns.map((column) => ({
      ...column,
      label: columnLabels[column.id] ?? column.label,
    }));
  }, [draftColumns, columnLabels]);

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

  useEffect(() => {
    const storedFilters = loadStatementFilters();
    setDraftFilters(storedFilters);
    setAppliedFilters(storedFilters);
    const storedColumns = loadStatementColumns();
    setColumns(storedColumns);
    setDraftColumns(storedColumns);
  }, []);

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

  const displayStatements = useMemo(() => {
    return applyStatementsFilters<Statement>(stagedStatements, appliedFilters);
  }, [stagedStatements, appliedFilters]);

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
      await loadStatements({ page: 1, search, notifyOnCompletion: false });
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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.type) count += 1;
    if (appliedFilters.statuses.length > 0) count += 1;
    if (appliedFilters.date?.preset || appliedFilters.date?.mode) count += 1;
    if (appliedFilters.from.length > 0) count += 1;
    if (appliedFilters.to.length > 0) count += 1;
    if (appliedFilters.keywords.trim()) count += 1;
    if (appliedFilters.amountMin !== null || appliedFilters.amountMax !== null) count += 1;
    if (appliedFilters.approved !== null) count += 1;
    if (appliedFilters.billable !== null) count += 1;
    if (appliedFilters.groupBy) count += 1;
    if (appliedFilters.has.length > 0) count += 1;
    if (appliedFilters.currencies.length > 0) count += 1;
    if (appliedFilters.exported !== null) count += 1;
    if (appliedFilters.paid !== null) count += 1;
    if (appliedFilters.limit !== null) count += 1;
    return count;
  }, [appliedFilters]);

  const updateFilter = (next: Partial<StatementFilters>) => {
    setDraftFilters((prev) => ({ ...prev, ...next }));
  };

  const applyFilterChanges = () => {
    setAppliedFilters(draftFilters);
    saveStatementFilters(draftFilters);
  };

  const resetFilterChanges = (key: keyof StatementFilters) => {
    const next = { ...draftFilters, [key]: DEFAULT_STATEMENT_FILTERS[key] } as StatementFilters;
    setDraftFilters(next);
  };

  const applyAndClose = (close: () => void) => {
    applyFilterChanges();
    close();
  };

  const resetAndClose = (key: keyof StatementFilters, close: () => void) => {
    resetFilterChanges(key);
    setTimeout(() => {
      applyFilterChanges();
      close();
    }, 0);
  };

  const resetAllFilters = () => {
    setDraftFilters(DEFAULT_STATEMENT_FILTERS);
    setAppliedFilters(DEFAULT_STATEMENT_FILTERS);
    saveStatementFilters(DEFAULT_STATEMENT_FILTERS);
  };

  const updateColumnsToggle = (id: StatementColumnId, visible: boolean) => {
    setDraftColumns((prev) =>
      prev.map((column) =>
        column.id === id
          ? {
              ...column,
              visible,
            }
          : column,
      ),
    );
  };

  const handleSaveColumns = () => {
    const next = draftColumns.map((column, index) => ({ ...column, order: index }));
    setColumns(next);
    saveStatementColumns(next);
    setColumnsDrawerOpen(false);
  };

  const handleColumnsOpen = () => {
    setDraftColumns(columns);
    setColumnsDrawerOpen(true);
  };

  const fromOptions = useMemo(() => {
    const seen = new Map<
      string,
      {
        id: string;
        label: string;
        description?: string | null;
        avatarUrl?: string | null;
        bankName?: string | null;
      }
    >();
    const addOption = (
      id: string,
      option: {
        id: string;
        label: string;
        description?: string | null;
        avatarUrl?: string | null;
        bankName?: string | null;
      },
    ) => {
      if (!seen.has(id)) {
        seen.set(id, option);
      }
    };

    stagedStatements.forEach((statement) => {
      if (statement.user?.id) {
        addOption(`user:${statement.user.id}`, {
          id: `user:${statement.user.id}`,
          label: statement.user.name || statement.user.email || "User",
          description: statement.user.email ? `@${statement.user.email.split("@")[0]}` : null,
          avatarUrl: statement.user.avatarUrl || null,
        });
      }
      if (statement.bankName) {
        addOption(`bank:${statement.bankName}`, {
          id: `bank:${statement.bankName}`,
          label: getBankDisplayName(statement.bankName),
          description: null,
          bankName: statement.bankName,
        });
      }
    });

    return Array.from(seen.values());
  }, [stagedStatements]);

  const toOptions = fromOptions;

  const currencyOptions = useMemo(() => {
    const unique = new Set<string>();
    stagedStatements.forEach((statement) => {
      const currency = resolveStatementCurrency(statement);
      if (currency) {
        unique.add(currency);
      }
    });
    return Array.from(unique.values());
  }, [stagedStatements]);

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
          <TypeFilterDropdown
            open={typeDropdownOpen}
            onOpenChange={setTypeDropdownOpen}
            options={typeOptions}
            value={draftFilters.type}
            onChange={(value) => updateFilter({ type: value })}
            onApply={() => applyAndClose(() => setTypeDropdownOpen(false))}
            onReset={() => resetAndClose("type", () => setTypeDropdownOpen(false))}
            trigger={
              <button
                type="button"
                className={draftFilters.type ? filterChipActiveClassName : filterChipClassName}
              >
                {draftFilters.type
                  ? typeOptions.find((option) => option.value === draftFilters.type)?.label ||
                    filterLabels.type
                  : filterLabels.type}
                <ChevronDown className="h-4 w-4" />
              </button>
            }
            applyLabel={filterOptionLabels.apply}
            resetLabel={filterOptionLabels.reset}
          />

          <StatusFilterDropdown
            open={statusDropdownOpen}
            onOpenChange={setStatusDropdownOpen}
            options={statusOptions}
            values={draftFilters.statuses}
            onChange={(values) => updateFilter({ statuses: values })}
            onApply={() => applyAndClose(() => setStatusDropdownOpen(false))}
            onReset={() => resetAndClose("statuses", () => setStatusDropdownOpen(false))}
            trigger={
              <button
                type="button"
                className={
                  draftFilters.statuses.length > 0
                    ? filterChipActiveClassName
                    : filterChipClassName
                }
              >
                {draftFilters.statuses.length > 0
                  ? `${filterLabels.status} (${draftFilters.statuses.length})`
                  : filterLabels.status}
                <ChevronDown className="h-4 w-4" />
              </button>
            }
            applyLabel={filterOptionLabels.apply}
            resetLabel={filterOptionLabels.reset}
          />

          <DateFilterDropdown
            open={dateDropdownOpen}
            onOpenChange={setDateDropdownOpen}
            presets={datePresets}
            modes={dateModes}
            value={draftFilters.date}
            onChange={(value) => updateFilter({ date: value })}
            onApply={() => applyAndClose(() => setDateDropdownOpen(false))}
            onReset={() => resetAndClose("date", () => setDateDropdownOpen(false))}
            trigger={
              <button
                type="button"
                className={draftFilters.date ? filterChipActiveClassName : filterChipClassName}
              >
                {draftFilters.date?.preset
                  ? datePresets.find((option) => option.value === draftFilters.date?.preset)?.label
                  : draftFilters.date?.mode
                    ? dateModes.find((option) => option.value === draftFilters.date?.mode)?.label
                    : filterLabels.date}
                <ChevronDown className="h-4 w-4" />
              </button>
            }
            applyLabel={filterOptionLabels.apply}
            resetLabel={filterOptionLabels.reset}
          />

          <FromFilterDropdown
            open={fromDropdownOpen}
            onOpenChange={setFromDropdownOpen}
            options={fromOptions}
            values={draftFilters.from}
            onChange={(values) => updateFilter({ from: values })}
            onApply={() => applyAndClose(() => setFromDropdownOpen(false))}
            onReset={() => resetAndClose("from", () => setFromDropdownOpen(false))}
            trigger={
              <button
                type="button"
                className={
                  draftFilters.from.length > 0
                    ? filterChipActiveClassName
                    : filterChipClassName
                }
              >
                {draftFilters.from.length > 0
                  ? `${filterLabels.from} (${draftFilters.from.length})`
                  : filterLabels.from}
                <ChevronDown className="h-4 w-4" />
              </button>
            }
            applyLabel={filterOptionLabels.apply}
            resetLabel={filterOptionLabels.reset}
          />

          <button
            type="button"
            className={filterLinkClassName}
            onClick={() => {
              setDraftFilters(appliedFilters);
              setFiltersDrawerScreen("root");
              setFiltersDrawerOpen(true);
            }}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {filterLabels.filters}
            {activeFilterCount > 0 ? (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
          <button type="button" className={filterLinkClassName} onClick={handleColumnsOpen}>
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
        ) : displayStatements.length === 0 ? (
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
              {displayStatements.map((statement) => {
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

      <FiltersDrawer
        open={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        filters={draftFilters}
        screen={filtersDrawerScreen}
        onBack={() => setFiltersDrawerScreen("root")}
        onSelect={(field) => setFiltersDrawerScreen(field)}
        onUpdateFilters={updateFilter}
        onResetAll={resetAllFilters}
        onViewResults={() => {
          applyFilterChanges();
          setFiltersDrawerOpen(false);
        }}
        typeOptions={typeOptions}
        statusOptions={statusOptions}
        datePresets={datePresets}
        dateModes={dateModes}
        fromOptions={fromOptions}
        toOptions={toOptions}
        groupByOptions={groupByOptions}
        hasOptions={hasOptions}
        currencyOptions={currencyOptions}
        labels={{
          title: filterOptionLabels.drawerTitle,
          viewResults: filterOptionLabels.viewResults,
          saveSearch: filterOptionLabels.saveSearch,
          resetFilters: filterOptionLabels.resetFilters,
          general: filterOptionLabels.drawerGeneral,
          expenses: filterOptionLabels.drawerExpenses,
          reports: filterOptionLabels.drawerReports,
          type: filterLabels.type,
          from: filterLabels.from,
          groupBy: filterOptionLabels.drawerGroupBy,
          has: filterOptionLabels.drawerHas,
          keywords: filterOptionLabels.drawerKeywords,
          limit: filterOptionLabels.drawerLimit,
          status: filterLabels.status,
          to: filterOptionLabels.drawerTo,
          amount: filterOptionLabels.drawerAmount,
          approved: filterOptionLabels.drawerApproved,
          billable: filterOptionLabels.drawerBillable,
          currency: filterOptionLabels.hasCurrency,
          date: filterLabels.date,
          exported: filterOptionLabels.columnExported,
          paid: filterOptionLabels.statusPaid,
          any: filterOptionLabels.any,
          yes: filterOptionLabels.yes,
          no: filterOptionLabels.no,
        }}
        activeCount={activeFilterCount}
      />

      <ColumnsDrawer
        open={columnsDrawerOpen}
        onClose={() => setColumnsDrawerOpen(false)}
        columns={columnsWithLabels}
        onToggle={updateColumnsToggle}
        onSave={handleSaveColumns}
        labels={{
          title: filterOptionLabels.columnsTitle,
          save: filterOptionLabels.save,
        }}
      />

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
