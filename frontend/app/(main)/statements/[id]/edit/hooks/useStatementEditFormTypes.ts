import type {
  StatementStage,
  StatementStageAction,
  StatementStageActionId,
} from '@/app/lib/statement-workflow';
import type {
  BranchOption,
  CategoryOption,
  Statement,
  Transaction,
  WalletOption,
} from '../editHelpers';

type MetaForm = {
  balanceStart: string;
  balanceEnd: string;
  statementDateFrom: string;
  statementDateTo: string;
};

export interface UseStatementEditFormReturn {
  statement: Statement | null;
  setStatement: React.Dispatch<React.SetStateAction<Statement | null>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  loading: boolean;
  saving: boolean;
  exportingToTable: boolean;
  optionsLoading: boolean;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  success: boolean;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  selectedRows: Set<string>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  editingRow: string | null;
  editedData: Record<string, Partial<Transaction>>;
  categories: CategoryOption[];
  branches: BranchOption[];
  wallets: WalletOption[];
  bulkCategoryDialogOpen: boolean;
  setBulkCategoryDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  statementCategoryDrawerOpen: boolean;
  setStatementCategoryDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  statementCategorySaving: boolean;
  stageActionLoadingId: StatementStageActionId | null;
  currentStage: StatementStage;
  bulkCategoryId: string;
  setBulkCategoryId: React.Dispatch<React.SetStateAction<string>>;
  metadataForm: MetaForm;
  setMetadataForm: React.Dispatch<React.SetStateAction<MetaForm>>;
  exportConfirmOpen: boolean;
  setExportConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  parsingDetailsExpanded: boolean;
  setParsingDetailsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  balanceStartInputRef: React.RefObject<HTMLInputElement | null>;
  balanceEndInputRef: React.RefObject<HTMLInputElement | null>;
  loadData: () => Promise<void>;
  handleExportToCustomTable: () => Promise<void>;
  handleRowSelect: (id: string) => void;
  handleSelectAll: () => void;
  handleEdit: (transaction: Transaction) => void;
  handleAddTransaction: () => void;
  handleFieldChange: (
    transactionId: string,
    field: keyof Transaction,
    value: Transaction[keyof Transaction],
  ) => void;
  handleSave: (transactionId: string) => Promise<void>;
  handleCancel: () => void;
  handleMetadataChange: (field: string, value: string) => void;
  handleResolveParsingWarning: (warning: string) => void;
  handleConvertDroppedSample: (
    sample: { transaction?: unknown },
    index: number,
    warning?: string,
  ) => Promise<void>;
  handleDelete: (transactionId: string) => Promise<void>;
  handleBulkUpdate: () => Promise<void>;
  handleBulkDelete: (confirmMessage: string) => Promise<void>;
  handleOpenBulkCategory: () => void;
  handleApplyBulkCategory: () => Promise<void>;
  handleStageAction: (
    action: StatementStageAction,
    stageActionToasts: Record<StatementStageActionId, string>,
    missingCategoryCount: number,
  ) => Promise<void>;
  handleStatementCategorySelect: (
    categoryId: string,
    flattenedStatementCategories: { id: string; name: string }[],
  ) => Promise<void>;
}
