'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { useAuth } from '@/app/hooks/useAuth';
import { useAutoSave } from '@/app/hooks/useAutoSave';
import apiClient from '@/app/lib/api';
import { flattenStatementCategories } from '@/app/lib/statement-categories';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/modal';
import {
  AccountBalance,
  ArrowBack,
  CalendarToday,
  Cancel,
  Category,
  Check,
  CheckCircle,
  Delete,
  Edit,
  Error as ErrorIcon,
  ExpandMore,
  Info,
  Receipt,
  Save,
  TableChart,
  TrendingDown,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Alert from '@mui/material/Alert';

import { useIntlayer, useLocale } from 'next-intlayer';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import CustomDatePicker from '@/app/components/CustomDatePicker';
import {
  type StatementStage,
  type StatementStageAction,
  type StatementStageActionId,
  getStatementStage,
  getStatementStageActions,
  isStageActionBlocked,
  setStatementStage,
} from '@/app/lib/statement-workflow';
import StatementCategoryDrawer from './StatementCategoryDrawer';

interface CategoryOption {
  id: string;
  name: string;
  type?: 'income' | 'expense';
  isEnabled?: boolean;
  children?: CategoryOption[];
}

interface BranchOption {
  id: string;
  name: string;
}

interface WalletOption {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  transactionDate: string;
  documentNumber?: string;
  counterpartyName: string;
  counterpartyBin?: string;
  counterpartyAccount?: string;
  counterpartyBank?: string;
  debit?: number;
  credit?: number;
  paymentPurpose: string;
  currency?: string;
  exchangeRate?: number;
  amountForeign?: number;
  categoryId?: string;
  branchId?: string;
  walletId?: string;
  article?: string;
  comments?: string;
  transactionType: 'income' | 'expense';
  category?: { id: string; name: string; isEnabled?: boolean };
  branch?: { id: string; name: string };
  wallet?: { id: string; name: string };
}

interface Statement {
  id: string;
  fileName: string;
  status: string;
  totalTransactions: number;
  categoryId?: string | null;
  category?: { id: string; name: string; isEnabled?: boolean } | null;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  balanceStart?: number | string | null;
  balanceEnd?: number | string | null;
  parsingDetails?: {
    detectedBank?: string;
    detectedFormat?: string;
    detectedBy?: string;
    detectedEvidence?: string[];
    otherBankMentions?: string[];
    parserUsed?: string;
    totalLinesProcessed?: number;
    transactionsFound?: number;
    transactionsCreated?: number;
    errors?: string[];
    warnings?: string[];
    metadataExtracted?: {
      accountNumber?: string;
      dateFrom?: string;
      dateTo?: string;
      balanceStart?: number;
      balanceEnd?: number;
      rawHeader?: string;
      normalizedHeader?: string;
      headerDisplay?: {
        title?: string;
        subtitle?: string;
        periodDisplay?: string;
        accountDisplay?: string;
        institutionDisplay?: string;
        currencyDisplay?: string;
      };
    };
    processingTime?: number;
    logEntries?: Array<{ timestamp: string; level: string; message: string }>;
  } | null;
}

const normalizeDateInput = (value?: string | Date | null) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

const normalizeNumberInput = (value?: number | string | null) => {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : value.toString();
};

const parseNullableNumber = (value: string) => {
  if (value.trim() === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveLocale = (locale: string) => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

const isIdEmpty = (id?: string | null) =>
  !id || id === 'null' || id === 'undefined' || id === '0' || id === '';

const filterEnabledCategories = (items: CategoryOption[]): CategoryOption[] => {
  return items
    .filter(item => item.isEnabled !== false)
    .map(item => ({
      ...item,
      children: item.children ? filterEnabledCategories(item.children) : undefined,
    }));
};

export default function EditStatementPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const t = useIntlayer('statementEditPage');
  const labels = t.labels as Record<string, { value?: string }>;
  const { locale } = useLocale();
  const statementId = params.id as string;

  const [statement, setStatement] = useState<Statement | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [exportingToTable, setExportingToTable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Record<string, Partial<Transaction>>>({});
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [statementCategoryDrawerOpen, setStatementCategoryDrawerOpen] = useState(false);
  const [statementCategorySaving, setStatementCategorySaving] = useState(false);
  const [stageActionLoadingId, setStageActionLoadingId] = useState<StatementStageActionId | null>(
    null,
  );
  const [currentStage, setCurrentStage] = useState<StatementStage>('submit');

  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [metadataForm, setMetadataForm] = useState({
    balanceStart: '',
    balanceEnd: '',
    statementDateFrom: '',
    statementDateTo: '',
  });
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);

  useEffect(() => {
    if (user && statementId) {
      setCurrentStage(getStatementStage(statementId));
      loadData();
    }
  }, [user, statementId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setOptionsLoading(true);
      const [statementRes, transactionsRes, categoriesRes, branchesRes, walletsRes] =
        await Promise.all([
          apiClient.get(`/statements/${statementId}`),
          apiClient.get(`/transactions?statement_id=${statementId}&limit=1000`),
          apiClient.get('/categories'),
          apiClient.get('/branches'),
          apiClient.get('/wallets'),
        ]);

      const statementData = statementRes.data?.data || statementRes.data;

      setStatement(statementData);

      const transactionsData = transactionsRes.data.data || transactionsRes.data;

      setTransactions(transactionsData);
      setCategories(categoriesRes.data?.data || categoriesRes.data || []);
      setBranches(branchesRes.data?.data || branchesRes.data || []);
      setWallets(walletsRes.data?.data || walletsRes.data || []);

      const extractedMeta = statementData?.parsingDetails?.metadataExtracted || {};

      setMetadataForm({
        balanceStart: normalizeNumberInput(
          statementData?.balanceStart ?? extractedMeta.balanceStart,
        ),
        balanceEnd: normalizeNumberInput(statementData?.balanceEnd ?? extractedMeta.balanceEnd),
        statementDateFrom: normalizeDateInput(
          statementData?.statementDateFrom ?? extractedMeta.dateFrom,
        ),
        statementDateTo: normalizeDateInput(statementData?.statementDateTo ?? extractedMeta.dateTo),
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t.errors.loadData.value);
    } finally {
      setLoading(false);
      setOptionsLoading(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch (err) {
      return String(dateString);
    }
  };

  const handleExportToCustomTable = async () => {
    if (!statementId) return;
    setExportingToTable(true);
    const toastId = toast.loading(t.labels.exportLoading.value);

    if (!statement) {
      toast.error(t.labels.exportFailure.value, { id: toastId });
      setExportingToTable(false);
      return;
    }

    try {
      const rawName = `Выписка — ${statement.fileName}`;
      const MAX_NAME_LENGTH = 120;
      const name = rawName.length > MAX_NAME_LENGTH ? rawName.slice(0, MAX_NAME_LENGTH) : rawName;

      const payload = {
        statementIds: [statementId],
        name,
        description: `Экспорт из выписки от ${formatDate(statement.statementDateFrom)} - ${formatDate(
          statement.statementDateTo,
        )}`,
      };

      const response = await apiClient.post('/custom-tables/from-statements', payload);
      const tableId = response?.data?.tableId || response?.data?.id;

      if (tableId) {
        toast.success(t.labels.exportSuccess.value, { id: toastId });
        router.push(`/custom-tables/${tableId}`);
      } else {
        toast.error(t.labels.exportFailure.value, { id: toastId });
        router.push('/custom-tables');
      }
    } catch (err) {
      console.error('Export to custom table failed:', err);
      toast.error(t.labels.exportFailure.value, { id: toastId });
    } finally {
      setExportingToTable(false);
    }
  };

  const handleRowSelect = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === transactions.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(transactions.map(t => t.id)));
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingRow(transaction.id);
    setEditedData({
      [transaction.id]: { ...transaction },
    });
  };

  const handleFieldChange = (transactionId: string, field: keyof Transaction, value: any) => {
    setEditedData({
      ...editedData,
      [transactionId]: {
        ...editedData[transactionId],
        [field]: value,
      },
    });
  };

  const handleSave = async (transactionId: string) => {
    try {
      const updates = editedData[transactionId];
      await apiClient.patch(`/transactions/${transactionId}`, updates);
      setTransactions(prev => prev.map(t => (t.id === transactionId ? { ...t, ...updates } : t)));
      setEditingRow(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось сохранить транзакцию');
    }
  };

  const handleMetadataChange = (field: string, value: string) => {
    setMetadataForm({
      ...metadataForm,
      [field]: value,
    });
  };

  const handleMetadataAutoSave = useCallback(
    async (formData: typeof metadataForm) => {
      try {
        const payload = {
          balanceStart: parseNullableNumber(formData.balanceStart),
          balanceEnd: parseNullableNumber(formData.balanceEnd),
          statementDateFrom: formData.statementDateFrom || null,
          statementDateTo: formData.statementDateTo || null,
        };
        const response = await apiClient.patch(`/statements/${statementId}`, payload);
        const updatedStatement = response.data?.data || response.data;
        setStatement(updatedStatement);
      } catch (err) {
        console.error('Metadata autosave failed:', err);
      }
    },
    [statementId],
  );

  useAutoSave({
    data: metadataForm,
    onSave: handleMetadataAutoSave,
    debounceMs: 500,
    enabled: Boolean(statementId && statement && !loading),
  });

  const handleCancel = () => {
    setEditingRow(null);
    setEditedData({});
  };

  const handleDelete = async (transactionId: string) => {
    if (!window.confirm('Удалить транзакцию?')) return;
    try {
      await apiClient.delete(`/transactions/${transactionId}`);
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось удалить транзакцию');
    }
  };

  const handleBulkUpdate = async () => {
    try {
      setSaving(true);
      const updates = Array.from(selectedRows)
        .filter(id => editedData[id])
        .map(id => ({
          id,
          updates: editedData[id],
        }));
      await apiClient.patch('/transactions/bulk', { items: updates });
      loadData();
      setSelectedRows(new Set());
      setEditedData({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось обновить транзакции');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Удалить ${selectedRows.size} транзакций?`)) return;
    try {
      setSaving(true);
      await apiClient.post('/transactions/bulk-delete', {
        ids: Array.from(selectedRows),
      });
      setTransactions(prev => prev.filter(t => !selectedRows.has(t.id)));
      setSelectedRows(new Set());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось удалить транзакции');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBulkCategory = () => {
    if (selectedRows.size === 0) return;
    setBulkCategoryDialogOpen(true);
  };

  const handleApplyBulkCategory = async () => {
    if (!bulkCategoryId) return;
    try {
      setSaving(true);
      const items = Array.from(selectedRows).map(id => ({
        id,
        updates: { categoryId: bulkCategoryId },
      }));
      await apiClient.patch('/transactions/bulk', { items });
      loadData();
      setSelectedRows(new Set());
      setBulkCategoryDialogOpen(false);
      setBulkCategoryId('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t.errors.assignCategory.value);
    } finally {
      setSaving(false);
    }
  };

  const formatNumber = (num?: number | null) => {
    if (num === null || num === undefined) return '—';
    return new Intl.NumberFormat(resolveLocale(locale), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const renderEditCell = (
    transaction: Transaction,
    edited: Partial<Transaction>,
    field: keyof Transaction,
  ) => {
    const commonTextFieldProps = {
      size: 'small' as const,
      fullWidth: true,
      multiline: field === 'paymentPurpose' || field === 'comments',
    };

    if (field === 'categoryId') {
      return (
        <TextField
          {...commonTextFieldProps}
          select
          value={edited.categoryId || transaction.categoryId || ''}
          onChange={e => handleFieldChange(transaction.id, 'categoryId', e.target.value)}
        >
          <MenuItem value="">{t.labels.notSelected}</MenuItem>
          {flattenedEnabledStatementCategories.map(cat => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    if (field === 'branchId') {
      return (
        <TextField
          {...commonTextFieldProps}
          select
          value={edited.branchId || transaction.branchId || ''}
          onChange={e => handleFieldChange(transaction.id, 'branchId', e.target.value)}
        >
          <MenuItem value="">{t.labels.notSelected}</MenuItem>
          {branches.map(branch => (
            <MenuItem key={branch.id} value={branch.id}>
              {branch.name}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    if (field === 'walletId') {
      return (
        <TextField
          {...commonTextFieldProps}
          select
          value={edited.walletId || transaction.walletId || ''}
          onChange={e => handleFieldChange(transaction.id, 'walletId', e.target.value)}
        >
          <MenuItem value="">{t.labels.notSelected}</MenuItem>
          {wallets.map(wallet => (
            <MenuItem key={wallet.id} value={wallet.id}>
              {wallet.name}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    return (
      <TextField
        {...commonTextFieldProps}
        value={edited[field] ?? transaction[field] ?? ''}
        onChange={e => handleFieldChange(transaction.id, field, e.target.value)}
      />
    );
  };

  const renderDisplayCell = (transaction: Transaction, field: keyof Transaction) => {
    if (field === 'transactionDate') {
      return new Date(transaction.transactionDate).toLocaleDateString(resolveLocale(locale));
    }
    if (field === 'debit' || field === 'credit') {
      const value = transaction[field];
      return value ? formatNumber(value) : '—';
    }
    if (field === 'categoryId') {
      return transaction.category?.name || '—';
    }
    if (field === 'branchId') {
      return transaction.branch?.name || '—';
    }
    if (field === 'walletId') {
      return transaction.wallet?.name || '—';
    }
    return transaction[field] || '—';
  };

  const stageActionLabels: Record<StatementStageActionId, string> = {
    submitForApproval: labels.submitForApproval?.value || 'Submit',
    unapprove: labels.unapprove?.value || 'Unapprove',
    pay: labels.pay?.value || 'Pay',
    rollbackToApprove: labels.rollbackToApprove?.value || 'Return to approve',
  };

  const stageActionToasts: Record<StatementStageActionId, string> = {
    submitForApproval: labels.submitSuccess?.value || 'Statement submitted for approval',
    unapprove: labels.unapproveSuccess?.value || 'Statement moved back to submit',
    pay: labels.paySuccess?.value || 'Statement moved to pay',
    rollbackToApprove: labels.rollbackToApproveSuccess?.value || 'Statement moved back to approve',
  };

  const enabledStatementCategories = filterEnabledCategories(categories);
  const flattenedStatementCategories = flattenStatementCategories(categories);
  const flattenedEnabledStatementCategories = flattenStatementCategories(
    enabledStatementCategories,
  );

  const stageActions = getStatementStageActions(currentStage);

  const handleStageAction = (action: StatementStageAction) => {
    if (!statement?.id) return;
    if (isStageActionBlocked(action.id, missingCategoryCount)) {
      return;
    }

    setStageActionLoadingId(action.id);
    setStatementStage(statement.id, action.nextStage);
    setCurrentStage(action.nextStage);
    toast.success(stageActionToasts[action.id]);

    setTimeout(() => {
      setStageActionLoadingId(null);
      router.push(action.redirectPath);
    }, 200);
  };

  const handleStatementCategorySelect = async (categoryId: string) => {
    if (!statement?.id || statementCategorySaving) return;

    try {
      setStatementCategorySaving(true);
      const response = await apiClient.patch(`/storage/files/${statement.id}/category`, {
        categoryId: categoryId || null,
      });

      const selectedCategory =
        response.data?.category ||
        flattenedStatementCategories.find(category => category.id === categoryId) ||
        null;

      setStatement(prev =>
        prev
          ? {
              ...prev,
              categoryId: response.data?.categoryId ?? (categoryId || null),
              category: selectedCategory,
            }
          : prev,
      );

      toast.success(labels.categoryUpdated?.value || 'Category updated');
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          labels.categoryUpdateFailed?.value ||
          'Failed to update category',
      );
    } finally {
      setStatementCategorySaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  const missingCategoryCount = transactions.filter(transaction => {
    const noCategory = isIdEmpty(transaction.categoryId) && isIdEmpty(transaction.category?.id);
    return noCategory || transaction.category?.isEnabled === false;
  }).length;

  const totalIncome = transactions.reduce((sum, t) => {
    const credit = Number(t.credit);
    return sum + (Number.isNaN(credit) ? 0 : credit);
  }, 0);

  const totalExpense = transactions.reduce((sum, t) => {
    const debit = Number(t.debit);
    return sum + (Number.isNaN(debit) ? 0 : debit);
  }, 0);

  const selectedStatementCategoryName =
    statement?.category?.name?.trim() ||
    flattenedStatementCategories.find(category => category.id === statement?.categoryId)?.name ||
    labels.categoryButton?.value ||
    'Category';
  const hasStatementCategory =
    !isIdEmpty(statement?.categoryId) || !isIdEmpty(statement?.category?.id || undefined);
  const hasDisabledStatementCategory = statement?.category?.isEnabled === false;
  const parsingErrorCount = statement?.parsingDetails?.errors?.length || 0;
  const parsingWarningCount = statement?.parsingDetails?.warnings?.length || 0;
  const hasCategoryIssues =
    !hasStatementCategory || hasDisabledStatementCategory || missingCategoryCount > 0;
  const readinessSeverity: 'success' | 'warning' | 'error' = hasCategoryIssues
    ? 'error'
    : parsingErrorCount > 0 || parsingWarningCount > 0
      ? 'warning'
      : 'success';

  const readinessTitle =
    readinessSeverity === 'error'
      ? labels.alertNeedsFixTitle?.value || 'Нужно исправить перед отправкой'
      : readinessSeverity === 'warning'
        ? labels.alertReviewTitle?.value || 'Проверьте выписку перед отправкой'
        : labels.alertReadyTitle?.value || 'Выписка готова к отправке';

  const readinessDetails: string[] = [];

  if (!hasStatementCategory) {
    readinessDetails.push(
      labels.alertStatementCategoryMissing?.value || 'Не выбрана категория выписки.',
    );
  }

  if (hasDisabledStatementCategory) {
    readinessDetails.push(
      labels.alertStatementCategoryDisabled?.value ||
        'Выбранная категория выписки отключена. Выберите активную.',
    );
  }

  if (missingCategoryCount > 0) {
    readinessDetails.push(
      (
        labels.alertTransactionsCategoryMissing?.value ||
        '{count} транзакций требуют категорию. Назначьте категории для всех строк.'
      ).replace('{count}', String(missingCategoryCount)),
    );
  }

  if (parsingErrorCount > 0) {
    readinessDetails.push(
      (
        labels.alertParsingErrors?.value ||
        'Обнаружено {count} ошибок парсинга. Проверьте детали и данные выписки.'
      ).replace('{count}', String(parsingErrorCount)),
    );
  }

  if (parsingWarningCount > 0) {
    readinessDetails.push(
      (
        labels.alertParsingWarnings?.value ||
        'Есть {count} предупреждений парсинга. Рекомендуется проверить спорные строки.'
      ).replace('{count}', String(parsingWarningCount)),
    );
  }

  if (!transactions.length) {
    readinessDetails.push(
      labels.alertNoTransactions?.value ||
        'В выписке нет транзакций. Проверьте файл или параметры импорта.',
    );
  }

  const readinessMessage =
    readinessDetails.length > 0
      ? readinessDetails.join(' · ')
      : labels.alertReadyBody?.value ||
        'Все обязательные категории назначены. Данные выглядят корректно, можно отправлять.';

  const readinessInlineText = `${readinessTitle}: ${readinessMessage}`;

  return (
    <Container
      maxWidth={false}
      sx={{ py: 5, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{
            mb: 3,
            color: 'text.secondary',
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 2,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {t.labels.back}
        </Button>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ minWidth: 240 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 600,
                mb: 1,
                color: 'text.primary',
                letterSpacing: '-0.02em',
              }}
            >
              {statement?.fileName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                icon={<Receipt />}
                label={`${statement?.totalTransactions} ${t.labels.transactionsCount.value || 'транзакций'}`}
                size="small"
                sx={{
                  bgcolor: 'grey.50',
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'grey.200',
                  fontWeight: 500,
                  borderRadius: 1.5,
                  '& .MuiChip-icon': { color: 'text.secondary' },
                }}
              />
              {missingCategoryCount > 0 && (
                <Chip
                  icon={<Warning />}
                  label={`${missingCategoryCount} требуют категории`}
                  size="small"
                  sx={{
                    bgcolor: 'error.50',
                    color: 'error.800',
                    border: '1px solid',
                    borderColor: 'error.200',
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: 'error.700' },
                  }}
                />
              )}
            </Box>
            {missingCategoryCount > 0 ? (
              <Typography sx={{ mt: 1, color: 'error.main', fontSize: '0.75rem', fontWeight: 500 }}>
                Выберите категорию для каждой транзакции с пустой или отключенной категорией
              </Typography>
            ) : null}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={statementCategorySaving ? <CircularProgress size={18} /> : <Category />}
              onClick={() => setStatementCategoryDrawerOpen(true)}
              disabled={statementCategorySaving || optionsLoading}
              title={selectedStatementCategoryName}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                minWidth: 0,
                maxWidth: { xs: '100%', md: 280 },
                overflow: 'hidden',
                ...(hasDisabledStatementCategory ||
                (isIdEmpty(statement?.categoryId) && isIdEmpty(statement?.category?.id))
                  ? {
                      borderColor: '#ef4444 !important',
                      color: '#b91c1c !important',
                      bgcolor: '#fef2f2 !important',
                      borderWidth: '2px !important',
                      '& .MuiButton-startIcon': {
                        color: '#dc2626 !important',
                      },
                      '&:hover': {
                        bgcolor: '#fee2e2 !important',
                        borderColor: '#dc2626 !important',
                      },
                    }
                  : {
                      borderColor: '#e5e7eb',
                      color: '#4b5563',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'rgba(25, 118, 210, 0.04)',
                      },
                    }),
              }}
            >
              <Box
                component="span"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {hasDisabledStatementCategory
                  ? `${selectedStatementCategoryName} — отключена`
                  : selectedStatementCategoryName}
              </Box>
            </Button>
            <Button
              variant="outlined"
              startIcon={exportingToTable ? <CircularProgress size={18} /> : <TableChart />}
              onClick={() => setExportConfirmOpen(true)}
              disabled={exportingToTable || !transactions.length}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'grey.300',
                color: 'text.secondary',
                borderRadius: 2,
                '&:hover': {
                  borderColor: 'primary.300',
                  color: 'primary.700',
                  bgcolor: 'primary.50',
                },
              }}
            >
              {t.labels.exportButton.value}
            </Button>
            {stageActions.map(action => {
              const isLoading = stageActionLoadingId === action.id;
              const isPrimary = action.id === 'pay';
              const isSubmitBlocked = isStageActionBlocked(action.id, missingCategoryCount);
              const isDisabled = stageActionLoadingId !== null || isSubmitBlocked;
              const tooltipTitle = isSubmitBlocked
                ? labels.submitBlockedTooltip?.value ||
                  'Assign categories to all transactions before submitting'
                : '';

              return (
                <Tooltip key={action.id} title={tooltipTitle} placement="top">
                  <span style={{ display: 'inline-flex' }}>
                    <Button
                      variant={isPrimary ? 'contained' : 'outlined'}
                      startIcon={
                        isLoading ? (
                          <CircularProgress size={18} />
                        ) : action.id === 'unapprove' || action.id === 'rollbackToApprove' ? (
                          <ArrowBack />
                        ) : (
                          <Check />
                        )
                      }
                      onClick={() => handleStageAction(action)}
                      disabled={isDisabled}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 2,
                        boxShadow: isPrimary ? 'none' : undefined,
                        borderColor: isPrimary ? undefined : 'grey.300',
                        color: isPrimary ? undefined : 'text.secondary',
                        '&:hover': isPrimary
                          ? { boxShadow: 'none' }
                          : {
                              borderColor: 'primary.300',
                              color: 'primary.700',
                              bgcolor: 'primary.50',
                            },
                      }}
                    >
                      {stageActionLabels[action.id]}
                    </Button>
                  </span>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          mb: 3,
          width: { xs: 'calc(100% + 32px)', sm: 'calc(100% + 48px)' },
          ml: { xs: -2, sm: -3 },
        }}
      >
        <Alert
          variant="filled"
          severity={readinessSeverity}
          sx={{
            borderRadius: 0,
            px: { xs: 2.5, sm: 4 },
            py: 0.75,
            minHeight: 42,
            alignItems: 'center',
            '& .MuiAlert-message': {
              width: '100%',
              py: 0,
              overflow: 'hidden',
            },
            '& .MuiAlert-icon': {
              py: 0,
              mr: 1.25,
              alignItems: 'center',
            },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              width: '100%',
              fontWeight: 600,
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={readinessInlineText}
          >
            {readinessInlineText}
          </Typography>
        </Alert>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert variant="filled" severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="filled" severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          {t.labels.changesSaved}
        </Alert>
      )}

      {/* Summary Metrics */}
      <Box
        sx={{
          mb: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, p: 2 }}
        >
          <Typography variant="caption" color="text.secondary">
            {labels.period?.value || 'Период'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
            {statement?.statementDateFrom && statement?.statementDateTo
              ? `${new Date(statement.statementDateFrom).toLocaleDateString()} - ${new Date(statement.statementDateTo).toLocaleDateString()}`
              : 'Не указан'}
          </Typography>
        </Paper>
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, p: 2 }}
        >
          <Typography variant="caption" color="text.secondary">
            {labels.balanceStart?.value || 'Начальный баланс'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
            {statement?.balanceStart !== null &&
            statement?.balanceStart !== undefined &&
            statement?.balanceStart !== ''
              ? formatNumber(Number(statement.balanceStart))
              : 'Не указан'}
          </Typography>
        </Paper>
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, p: 2 }}
        >
          <Typography variant="caption" color="text.secondary">
            {labels.expenses?.value || 'Расходы'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, color: 'error.main' }}>
            {!Number.isNaN(totalExpense) && totalExpense >= 0 ? formatNumber(totalExpense) : '0.00'}
          </Typography>
        </Paper>
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, p: 2 }}
        >
          <Typography variant="caption" color="text.secondary">
            {labels.income?.value || 'Доходы'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, color: 'success.main' }}>
            {!Number.isNaN(totalIncome) && totalIncome >= 0 ? formatNumber(totalIncome) : '0.00'}
          </Typography>
        </Paper>
      </Box>

      {/* Editing & Parsing Details Accordion */}
      <Accordion
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          '&:before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {t.labels.parsingDetails?.value || 'Параметры и детали парсинга'}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: '1fr 1fr 1fr 1fr',
              },
              gap: 3,
              mb: statement?.parsingDetails ? 3 : 0,
            }}
          >
            <CustomDatePicker
              label="Дата начала"
              value={metadataForm.statementDateFrom}
              onChange={value => handleMetadataChange('statementDateFrom', value)}
              helperText={
                statement?.parsingDetails?.metadataExtracted?.dateFrom
                  ? `Из файла: ${new Date(statement.parsingDetails.metadataExtracted.dateFrom).toLocaleDateString(resolveLocale(locale))}`
                  : undefined
              }
            />
            <CustomDatePicker
              label="Дата окончания"
              value={metadataForm.statementDateTo}
              onChange={value => handleMetadataChange('statementDateTo', value)}
              helperText={
                statement?.parsingDetails?.metadataExtracted?.dateTo
                  ? `Из файла: ${new Date(statement.parsingDetails.metadataExtracted.dateTo).toLocaleDateString(resolveLocale(locale))}`
                  : undefined
              }
            />
            <div>
              <span className="text-xs text-gray-500 block mb-1 font-medium ml-1">
                Начальный баланс
              </span>
              <TextField
                type="number"
                fullWidth
                size="small"
                value={metadataForm.balanceStart}
                onChange={e => handleMetadataChange('balanceStart', e.target.value)}
                placeholder="0.00"
                helperText={
                  statement?.parsingDetails?.metadataExtracted?.balanceStart
                    ? `Из файла: ${formatNumber(statement.parsingDetails.metadataExtracted.balanceStart)}`
                    : 'Введите начальный баланс'
                }
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    },
                  },
                }}
              />
            </div>
            <div>
              <span className="text-xs text-gray-500 block mb-1 font-medium ml-1">
                Конечный баланс
              </span>
              <TextField
                type="number"
                fullWidth
                size="small"
                value={metadataForm.balanceEnd}
                onChange={e => handleMetadataChange('balanceEnd', e.target.value)}
                placeholder="0.00"
                helperText={
                  statement?.parsingDetails?.metadataExtracted?.balanceEnd
                    ? `Из файла: ${formatNumber(statement.parsingDetails.metadataExtracted.balanceEnd)}`
                    : 'Введите конечный баланс'
                }
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    },
                  },
                }}
              />
            </div>
          </Box>

          {statement?.parsingDetails && (
            <>
              <Divider sx={{ mb: 3 }} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 2, fontWeight: 600, textTransform: 'uppercase' }}
              >
                {t.labels.extractedMetadata?.value || 'Извлеченные данные парсером'}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr 1fr',
                    sm: 'repeat(3, 1fr)',
                    md: 'repeat(6, 1fr)',
                  },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Банк
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {statement.parsingDetails.detectedBank || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {labels.bankDetectedBy?.value || 'Определено по'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {statement.parsingDetails.detectedBy || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Формат
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {statement.parsingDetails.detectedFormat?.toUpperCase() || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Найдено транзакций
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {statement.parsingDetails.transactionsFound ?? '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Создано
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {statement.parsingDetails.transactionsCreated ?? '—'}
                  </Typography>
                </Box>
                {statement.parsingDetails.errors && statement.parsingDetails.errors.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="error">
                      Ошибки
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'error.main' }}>
                      {statement.parsingDetails.errors.length}
                    </Typography>
                  </Box>
                )}
                {statement.parsingDetails.warnings &&
                  statement.parsingDetails.warnings.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="warning.main">
                        Предупреждения
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'warning.main' }}>
                        {statement.parsingDetails.warnings.length}
                      </Typography>
                    </Box>
                  )}
                {statement.parsingDetails.otherBankMentions &&
                  statement.parsingDetails.otherBankMentions.length > 0 && (
                    <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 2' } }}>
                      <Typography variant="caption" color="text.secondary">
                        {labels.otherBankMentions?.value || 'Упоминания других банков'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {statement.parsingDetails.otherBankMentions.join(', ')}
                      </Typography>
                    </Box>
                  )}
              </Box>
            </>
          )}
        </AccordionDetails>
      </Accordion>

      <Modal
        isOpen={exportConfirmOpen}
        onOpenChange={next => {
          if (!next) {
            setExportConfirmOpen(false);
          }
        }}
        size="2xl"
        placement="center"
        backdrop="opaque"
        classNames={{
          base: 'rounded-2xl border border-gray-200 shadow-xl',
          backdrop: 'bg-gray-900/40 backdrop-blur-[1px]',
          closeButton:
            'text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors',
        }}
      >
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="text-[22px] font-semibold text-gray-900 px-8 py-6 border-b border-gray-200">
                {t.labels.exportConfirmTitle.value}
              </ModalHeader>
              <ModalBody className="px-8 py-8 border-b border-gray-200">
                <p className="text-base leading-8 text-gray-700">
                  {t.labels.exportConfirmBody.value}
                </p>
              </ModalBody>
              <ModalFooter className="px-8 py-6 gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-gray-200 bg-white px-6 py-2.5 text-base font-medium text-gray-600 hover:border-primary hover:text-primary"
                >
                  {t.labels.cancel.value}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    handleExportToCustomTable();
                  }}
                  disabled={exportingToTable || !transactions.length}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-base font-medium text-white shadow-none hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportingToTable ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : null}
                  {t.labels.exportConfirmConfirm.value}
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <StatementCategoryDrawer
        open={statementCategoryDrawerOpen}
        onClose={() => setStatementCategoryDrawerOpen(false)}
        categories={enabledStatementCategories}
        selectedCategoryId={statement?.categoryId || ''}
        selecting={statementCategorySaving}
        onSelect={handleStatementCategorySelect}
        labels={{
          title: labels.categoryDrawerTitle?.value || 'Category',
          searchPlaceholder: labels.categorySearchPlaceholder?.value || 'Search',
          allOption: labels.categoryAllOption?.value || 'All',
          noResults: labels.categoryNoResults?.value || 'No categories found',
        }}
      />

      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 3,
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.200',
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: 'primary.700',
                fontSize: '0.9375rem',
              }}
            >
              Выбрано: {selectedRows.size} транзакций
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={handleOpenBulkCategory}
                startIcon={<Category />}
                disabled={saving}
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor: 'primary.300',
                  color: 'primary.700',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: 'primary.400',
                    bgcolor: 'primary.100',
                  },
                }}
              >
                Назначить категорию
              </Button>
              <Button
                variant="contained"
                onClick={handleBulkUpdate}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 'none',
                }}
              >
                Сохранить
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleBulkDelete}
                disabled={saving}
                startIcon={<Delete />}
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  borderRadius: 2,
                }}
              >
                Удалить
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Transactions Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                bgcolor: 'grey.50',
                borderBottom: '1px solid',
                borderBottomColor: 'divider',
              }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedRows.size === transactions.length && transactions.length > 0}
                  indeterminate={selectedRows.size > 0 && selectedRows.size < transactions.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Дата
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Контрагент
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Назначение платежа
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Расход
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Доход
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Категория
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Действия
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map(transaction => {
              const isEditing = editingRow === transaction.id;
              const edited = editedData[transaction.id] || transaction;
              const missingCategory =
                isIdEmpty(edited.categoryId) &&
                isIdEmpty(transaction.categoryId) &&
                isIdEmpty(transaction.category?.id);

              return (
                <TableRow
                  key={transaction.id}
                  hover
                  sx={{
                    bgcolor: missingCategory ? 'error.50' : undefined,
                    borderLeft: missingCategory ? '3px solid' : undefined,
                    borderLeftColor: missingCategory ? 'error.400' : undefined,
                    transition: 'all 0.15s',
                    '&:hover': {
                      bgcolor: missingCategory ? 'error.100' : 'grey.50',
                    },
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRows.has(transaction.id)}
                      onCheckedChange={() => handleRowSelect(transaction.id)}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 100 }}>
                    {isEditing
                      ? renderEditCell(transaction, edited, 'transactionDate')
                      : String(renderDisplayCell(transaction, 'transactionDate'))}
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    {isEditing
                      ? renderEditCell(transaction, edited, 'counterpartyName')
                      : transaction.counterpartyName}
                  </TableCell>
                  <TableCell sx={{ minWidth: 200, maxWidth: 300 }}>
                    {isEditing ? (
                      renderEditCell(transaction, edited, 'paymentPurpose')
                    ) : (
                      <Tooltip title={transaction.paymentPurpose}>
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {transaction.paymentPurpose}
                        </Typography>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: 'error.600',
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                    }}
                  >
                    {transaction.debit ? formatNumber(transaction.debit) : '—'}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: 'success.600',
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                    }}
                  >
                    {transaction.credit ? formatNumber(transaction.credit) : '—'}
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    {isEditing ? (
                      renderEditCell(transaction, edited, 'categoryId')
                    ) : (
                      <Box>
                        {transaction.category?.name ? (
                          <Chip
                            label={
                              transaction.category.isEnabled === false
                                ? `${transaction.category.name} — выберите категорию`
                                : transaction.category.name
                            }
                            size="small"
                            sx={{
                              bgcolor:
                                transaction.category.isEnabled === false
                                  ? 'error.50'
                                  : 'primary.50',
                              color:
                                transaction.category.isEnabled === false
                                  ? 'error.700'
                                  : 'primary.700',
                              border:
                                transaction.category.isEnabled === false ? '1px solid' : 'none',
                              borderColor:
                                transaction.category.isEnabled === false
                                  ? 'error.200'
                                  : 'transparent',
                              fontWeight: 500,
                              fontSize: '0.8125rem',
                            }}
                          />
                        ) : (
                          <Chip
                            label="Без категории"
                            size="small"
                            icon={<Warning sx={{ fontSize: 16 }} />}
                            sx={{
                              bgcolor: 'error.50',
                              color: 'error.700',
                              border: '1px solid',
                              borderColor: 'error.100',
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                              '& .MuiChip-icon': {
                                color: 'error.600',
                              },
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleSave(transaction.id)}
                          sx={{
                            color: 'success.600',
                            '&:hover': {
                              bgcolor: 'success.50',
                            },
                          }}
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleCancel}
                          sx={{
                            color: 'text.secondary',
                            '&:hover': {
                              bgcolor: 'grey.100',
                            },
                          }}
                        >
                          <Cancel fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(transaction)}
                          sx={{
                            color: 'primary.600',
                            '&:hover': {
                              bgcolor: 'primary.50',
                            },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(transaction.id)}
                          sx={{
                            color: 'error.600',
                            '&:hover': {
                              bgcolor: 'error.50',
                            },
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bulk Category Dialog */}
      <Dialog
        open={bulkCategoryDialogOpen}
        onClose={() => setBulkCategoryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'grey.200',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: '1rem',
            color: 'text.primary',
            letterSpacing: '-0.01em',
            pb: 1,
          }}
        >
          Назначить категорию для {selectedRows.size} транзакций
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            select
            label="Категория"
            fullWidth
            value={bulkCategoryId}
            onChange={e => setBulkCategoryId(e.target.value)}
            helperText="Выберите категорию для назначения всем выбранным транзакциям"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          >
            <MenuItem value="">Не выбрано</MenuItem>
            {flattenedEnabledStatementCategories.map(cat => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => setBulkCategoryDialogOpen(false)}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              color: 'text.secondary',
            }}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} /> : <CheckCircle />}
            onClick={handleApplyBulkCategory}
            disabled={saving || !bulkCategoryId}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none',
              },
            }}
          >
            Применить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
