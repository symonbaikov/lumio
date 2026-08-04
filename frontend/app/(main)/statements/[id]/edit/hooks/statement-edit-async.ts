import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { payablesApi } from '@/app/lib/payables-api';
import { isStageActionBlocked, setStatementStage } from '@/app/lib/statement-workflow';
import type { StatementStageAction, StatementStageActionId } from '@/app/lib/statement-workflow';
import { toast } from 'react-hot-toast';
import type {
  BranchOption,
  CategoryOption,
  Statement,
  Transaction,
  WalletOption,
} from '../editHelpers';
import {
  formatDate,
  normalizeDateInput,
  normalizeNumberInput,
  parseNullableNumber,
} from '../editHelpers';
import { buildPayableFromStatement } from '../payable-from-statement';

type MetaForm = {
  balanceStart: string;
  balanceEnd: string;
  statementDateFrom: string;
  statementDateTo: string;
};

function extractApiData<T>(res: { data?: { data?: T } | T }): T {
  const d = res.data as { data?: T } | undefined;
  return (d?.data ?? res.data) as T;
}

function extractListData<T>(res: { data?: { data?: T[] } | T[] }): T[] {
  const d = res.data as { data?: T[] } | undefined;
  return (d?.data ?? res.data ?? []) as T[];
}

function extractMeta(statementData: Statement | null): Record<string, unknown> {
  const details = statementData?.parsingDetails as
    | { metadataExtracted?: Record<string, unknown> }
    | undefined;
  return details?.metadataExtracted ?? {};
}

function resolveField(primary: unknown, fallback: unknown): unknown {
  return primary ?? fallback;
}

function buildMetadataForm(
  statementData: Statement | null,
  meta: Record<string, unknown>,
): MetaForm {
  return {
    balanceStart: normalizeNumberInput(
      resolveField(statementData?.balanceStart, meta.balanceStart),
    ),
    balanceEnd: normalizeNumberInput(resolveField(statementData?.balanceEnd, meta.balanceEnd)),
    statementDateFrom: normalizeDateInput(
      resolveField(statementData?.statementDateFrom, meta.dateFrom),
    ),
    statementDateTo: normalizeDateInput(resolveField(statementData?.statementDateTo, meta.dateTo)),
  };
}

type LoadSetters = {
  setLoading: (v: boolean) => void;
  setOptionsLoading: (v: boolean) => void;
  setStatement: (v: Statement | null) => void;
  setTransactions: (v: Transaction[]) => void;
  setCategories: (v: CategoryOption[]) => void;
  setBranches: (v: BranchOption[]) => void;
  setWallets: (v: WalletOption[]) => void;
  setMetadataForm: (v: MetaForm) => void;
  setError: (v: string) => void;
};
type LoadMessages = { loadDataError: string };

export async function loadStatementData(
  statementId: string,
  messages: LoadMessages,
  set: LoadSetters,
): Promise<void> {
  try {
    set.setLoading(true);
    set.setOptionsLoading(true);
    const [sRes, tRes, cRes, bRes, wRes] = await Promise.all([
      apiClient.get(`/statements/${statementId}`),
      apiClient.get(`/transactions?statement_id=${statementId}&limit=1000`),
      apiClient.get('/categories'),
      apiClient.get('/branches'),
      apiClient.get('/wallets'),
    ]);
    const statementData = extractApiData<Statement>(sRes);
    set.setStatement(statementData);
    set.setTransactions(extractApiData<Transaction[]>(tRes));
    set.setCategories(extractListData<CategoryOption>(cRes));
    set.setBranches(extractListData<BranchOption>(bRes));
    set.setWallets(extractListData<WalletOption>(wRes));
    set.setMetadataForm(buildMetadataForm(statementData, extractMeta(statementData)));
  } catch (err: unknown) {
    set.setError(getApiErrorMessage(err, messages.loadDataError));
  } finally {
    set.setLoading(false);
    set.setOptionsLoading(false);
  }
}

function getExportTableId(response: { data?: { tableId?: string; id?: string } }):
  | string
  | undefined {
  return response?.data?.tableId ?? response?.data?.id;
}

function buildExportName(prefix: string, fileName: string): string {
  const raw = `${prefix}${fileName}`;
  return raw.length > 120 ? raw.slice(0, 120) : raw;
}

type ExportMsgs = {
  exportLoading: string;
  exportSuccess: string;
  exportFailure: string;
  exportDescription: string;
  statementNamePrefix: string;
};
type ExportArgs = {
  statementId: string;
  statement: Statement | null;
  router: { push: (p: string) => void };
  messages: ExportMsgs;
  setExportingToTable: (v: boolean) => void;
};

export async function exportToCustomTable({
  statementId,
  statement,
  router,
  messages,
  setExportingToTable,
}: ExportArgs): Promise<void> {
  if (!statement) {
    return;
  }
  setExportingToTable(true);
  const toastId = toast.loading(messages.exportLoading);
  try {
    const name = buildExportName(messages.statementNamePrefix, statement.fileName);
    const description = messages.exportDescription
      .replace('{{dateFrom}}', formatDate(statement.statementDateFrom))
      .replace('{{dateTo}}', formatDate(statement.statementDateTo));
    const response = await apiClient.post('/custom-tables/from-statements', {
      statementIds: [statementId],
      name,
      description,
    });
    const tableId = getExportTableId(response);
    if (tableId) {
      toast.success(messages.exportSuccess, { id: toastId });
      router.push(`/custom-tables/${tableId}`);
    } else {
      toast.error(messages.exportFailure, { id: toastId });
      router.push('/custom-tables');
    }
  } catch (err) {
    console.error('Export to custom table failed:', err);
    toast.error(messages.exportFailure, { id: toastId });
  } finally {
    setExportingToTable(false);
  }
}

type SampleResult = {
  statement?: Statement;
  data?: { statement?: Statement; transaction?: Transaction };
  transaction?: Transaction;
};
function resolveUpdatedStatement(data: SampleResult): Statement | undefined {
  return data?.statement ?? data?.data?.statement;
}
function resolveCreatedTransaction(data: SampleResult): Transaction | undefined {
  return data?.transaction ?? data?.data?.transaction;
}
function extractDroppedSampleResult(data: SampleResult): {
  updatedStatement?: Statement;
  createdTransaction?: Transaction;
} {
  return {
    updatedStatement: resolveUpdatedStatement(data),
    createdTransaction: resolveCreatedTransaction(data),
  };
}

const NEW_TRANSACTION_ID_PREFIX = 'new-';

export function isNewTransactionId(id: string): boolean {
  return id.startsWith(NEW_TRANSACTION_ID_PREFIX);
}

export function createDraftTransaction(): Transaction {
  return {
    id: `${NEW_TRANSACTION_ID_PREFIX}${Math.random().toString(36).slice(2)}`,
    transactionDate: new Date().toISOString().slice(0, 10),
    counterpartyName: '',
    paymentPurpose: '',
    debit: undefined,
    credit: undefined,
    transactionType: 'expense',
  };
}

type CreateArgs = {
  statementId: string;
  draft: Partial<Transaction>;
  loadData: () => Promise<void>;
  setEditingRow: (v: string | null) => void;
  setSuccess: (v: boolean) => void;
  setError: (v: string) => void;
  messages: { saveTransactionError: string };
};

function buildCreateTransactionPayload(
  statementId: string,
  draft: Partial<Transaction>,
): Record<string, unknown> {
  return {
    statementId,
    transactionDate: draft.transactionDate,
    counterpartyName: draft.counterpartyName,
    paymentPurpose: draft.paymentPurpose,
    debit: draft.debit ? Number(draft.debit) : undefined,
    credit: draft.credit ? Number(draft.credit) : undefined,
    categoryId: draft.categoryId || undefined,
    branchId: draft.branchId || undefined,
    walletId: draft.walletId || undefined,
    comments: draft.comments || undefined,
  };
}

export async function createTransactionAction({
  statementId,
  draft,
  loadData,
  setEditingRow,
  setSuccess,
  setError,
  messages,
}: CreateArgs): Promise<void> {
  try {
    await apiClient.post('/transactions', buildCreateTransactionPayload(statementId, draft));
    setEditingRow(null);
    await loadData();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  } catch (err: unknown) {
    setError(getApiErrorMessage(err, messages.saveTransactionError));
  }
}

type ConvertArgs = {
  statementId: string;
  sample: { transaction?: unknown };
  index: number;
  warning?: string;
  loadData: () => Promise<void>;
  setStatement: (v: Statement | null) => void;
  setTransactions: (fn: (prev: Transaction[]) => Transaction[]) => void;
  setSuccess: (v: boolean) => void;
};

export async function convertDroppedSampleAction({
  statementId,
  sample,
  index,
  warning,
  loadData,
  setStatement,
  setTransactions,
  setSuccess,
}: ConvertArgs): Promise<void> {
  const response = await apiClient.post(`/statements/${statementId}/convert-dropped-sample`, {
    index,
    warning,
    transaction: sample.transaction,
  });
  const { updatedStatement, createdTransaction } = extractDroppedSampleResult(response.data);
  if (updatedStatement) {
    setStatement(updatedStatement);
  }
  if (createdTransaction) {
    setTransactions(prev => [createdTransaction, ...prev]);
  } else {
    await loadData();
  }
  setSuccess(true);
  setTimeout(() => setSuccess(false), 3000);
}

const STAGE_ERROR: Record<string, string> = {
  pay: 'Failed to create payable',
  default: 'Failed to update stage',
};

type StageArgs = {
  action: StatementStageAction;
  stageActionToasts: Record<StatementStageActionId, string>;
  missingCategoryCount: number;
  statement: Statement | null;
  transactions: Transaction[];
  router: { push: (p: string) => void };
  setStageActionLoadingId: (v: StatementStageActionId | null) => void;
  setCurrentStage: (v: string) => void;
};

function isStageActionReady(
  statement: Statement | null,
  actionId: string,
  missingCount: number,
): statement is Statement {
  return Boolean(statement?.id) && !isStageActionBlocked(actionId, missingCount);
}

async function handlePayStageAction(
  statement: Statement,
  transactions: Transaction[],
  setId: (v: null) => void,
): Promise<boolean> {
  const payableDraft = buildPayableFromStatement({ statement, transactions });
  if (!payableDraft) {
    toast.error('No expense amount available to create payable');
    setId(null);
    return false;
  }
  await payablesApi.create(payableDraft);
  return true;
}

export async function processStageAction({
  action,
  stageActionToasts,
  missingCategoryCount,
  statement,
  transactions,
  router,
  setStageActionLoadingId,
  setCurrentStage,
}: StageArgs): Promise<void> {
  if (!isStageActionReady(statement, action.id, missingCategoryCount)) {
    return;
  }
  setStageActionLoadingId(action.id);
  try {
    if (action.id === 'pay') {
      if (!(await handlePayStageAction(statement, transactions, setStageActionLoadingId))) {
        return;
      }
    }
    setStatementStage(statement.id, action.nextStage);
    setCurrentStage(action.nextStage);
    setStageActionLoadingId(null);
    toast.success(stageActionToasts[action.id]);
    router.push(action.redirectPath);
  } catch (err) {
    console.error('Failed to process stage action:', err);
    setStageActionLoadingId(null);
    toast.error(STAGE_ERROR[action.id] ?? STAGE_ERROR.default);
  }
}

function resolveSelectedCategory(
  responseCategory: unknown,
  flatCategories: { id: string; name: string }[],
  categoryId: string,
): unknown {
  return responseCategory ?? flatCategories.find(c => c.id === categoryId) ?? null;
}

function canUpdateCategory(statement: Statement | null, saving: boolean): statement is Statement {
  return Boolean(statement?.id) && !saving;
}

type CategoryArgs = {
  statement: Statement | null;
  categoryId: string;
  flatCategories: { id: string; name: string }[];
  messages: { categoryUpdated: string; categoryUpdateFailed: string };
  statementCategorySaving: boolean;
  setStatementCategorySaving: (v: boolean) => void;
  setStatement: React.Dispatch<React.SetStateAction<Statement | null>>;
  setError: (v: string) => void;
};

export async function updateStatementCategoryAction({
  statement,
  categoryId,
  flatCategories,
  messages,
  statementCategorySaving,
  setStatementCategorySaving,
  setStatement,
  setError,
}: CategoryArgs): Promise<void> {
  if (!canUpdateCategory(statement, statementCategorySaving)) {
    return;
  }
  try {
    setStatementCategorySaving(true);
    const response = await apiClient.patch(`/storage/files/${statement.id}/category`, {
      categoryId: categoryId || null,
    });
    const selectedCategory = resolveSelectedCategory(
      response.data?.category,
      flatCategories,
      categoryId,
    );
    setStatement(prev =>
      prev
        ? {
            ...prev,
            categoryId: response.data?.categoryId ?? (categoryId || null),
            category: selectedCategory,
          }
        : prev,
    );
    toast.success(messages.categoryUpdated);
  } catch (err: unknown) {
    setError(getApiErrorMessage(err, '') || messages.categoryUpdateFailed);
  } finally {
    setStatementCategorySaving(false);
  }
}

type AutoSaveArgs = {
  statementId: string;
  formData: MetaForm;
  setStatement: (v: Statement | null) => void;
};

export async function metadataAutoSave({
  statementId,
  formData,
  setStatement,
}: AutoSaveArgs): Promise<void> {
  try {
    const payload = {
      balanceStart: parseNullableNumber(formData.balanceStart),
      balanceEnd: parseNullableNumber(formData.balanceEnd),
      statementDateFrom: formData.statementDateFrom || null,
      statementDateTo: formData.statementDateTo || null,
    };
    const response = await apiClient.patch(`/statements/${statementId}`, payload);
    const updatedStatement = response.data?.data || response.data;
    setStatement(updatedStatement as Statement);
  } catch (err) {
    console.error('Metadata autosave failed:', err);
  }
}
