/* eslint-disable max-lines */
'use client';

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Layers,
  Pencil,
  Receipt,
  Save,
  Table2,
  Trash2,
  TriangleAlert,
  XCircle,
} from '@/app/components/icons';
import { Checkbox } from '@/app/components/ui/checkbox';
import { DetailActionButton } from '@/app/components/ui/detail-action-button';
import { useAuth } from '@/app/hooks/useAuth';
import { flattenStatementCategories, getCategoryDisplayName } from '@/app/lib/statement-categories';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
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

import { useIntlayer, useLocale } from '@/app/i18n';
import { useParams, useRouter } from 'next/navigation';

import CustomDatePicker from '@/app/components/CustomDatePicker';
import { Spinner } from '@/app/components/ui/spinner';
import {
  type StatementStageActionId,
  getStatementStageActions,
  isStageActionBlocked,
} from '@/app/lib/statement-workflow';
import { tokens } from '@/lib/theme-tokens';
import { ParsingWarningsPanel } from './ParsingWarningsPanel';
import StatementCategoryDrawer from './StatementCategoryDrawer';
import { BalanceReviewAlert } from './components/BalanceReviewAlert';
import {
  type Transaction,
  filterEnabledCategories,
  formatLabel,
  formatNumber as formatNumberHelper,
  isIdEmpty,
  resolveLocale,
} from './editHelpers';
import { useStatementEditForm } from './hooks/useStatementEditForm';

// eslint-disable-next-line max-lines-per-function, complexity
export default function EditStatementPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const t = useIntlayer('statementEditPage');
  const labels = t.labels as Record<string, { value?: string }>;
  const columns = t.columns as Record<string, { value?: string }>;
  const { locale } = useLocale();
  const statementId = params.id as string;

  const {
    statement,
    setStatement: SetStatement,
    transactions,
    setTransactions: SetTransactions,
    loading,
    saving,
    exportingToTable,
    optionsLoading,
    error,
    setError,
    success,
    setSuccess,
    selectedRows,
    setSelectedRows: SetSelectedRows,
    editingRow,
    editedData,
    categories,
    branches,
    wallets,
    bulkCategoryDialogOpen,
    setBulkCategoryDialogOpen,
    statementCategoryDrawerOpen,
    setStatementCategoryDrawerOpen,
    statementCategorySaving,
    stageActionLoadingId,
    currentStage,
    bulkCategoryId,
    setBulkCategoryId,
    metadataForm,
    setMetadataForm: SetMetadataForm,
    exportConfirmOpen,
    setExportConfirmOpen,
    parsingDetailsExpanded,
    setParsingDetailsExpanded,
    balanceStartInputRef,
    balanceEndInputRef,
    loadData: LoadData,
    handleExportToCustomTable,
    handleRowSelect,
    handleSelectAll,
    handleEdit,
    handleFieldChange,
    handleSave,
    handleCancel,
    handleMetadataChange,
    handleResolveParsingWarning,
    handleConvertDroppedSample,
    handleDelete,
    handleBulkUpdate,
    handleBulkDelete,
    handleOpenBulkCategory,
    handleApplyBulkCategory,
    handleStageAction,
    handleStatementCategorySelect,
  } = useStatementEditForm({
    statementId,
    user,
    router,
    messages: {
      loadDataError: t.errors.loadData.value,
      saveTransactionError: t.errors.saveTransaction.value,
      deleteTransactionError: t.errors.deleteTransaction.value,
      updateTransactionsError: t.errors.updateTransactions.value,
      deleteTransactionsError: t.errors.deleteTransactions.value,
      assignCategoryError: t.errors.assignCategory.value,
      exportLoading: t.labels.exportLoading.value,
      exportSuccess: t.labels.exportSuccess.value,
      exportFailure: t.labels.exportFailure.value,
      exportDescription: t.labels.exportDescription.value,
      statementNamePrefix: t.labels.statementNamePrefix.value,
      categoryUpdated: labels.categoryUpdated?.value || 'Category updated',
      categoryUpdateFailed: labels.categoryUpdateFailed?.value || 'Failed to update category',
    },
  });

  const formatNumber = (num?: number | null): string => formatNumberHelper(num, locale);

  // eslint-disable-next-line max-lines-per-function
  const renderEditCell = (
    transaction: Transaction,
    edited: Partial<Transaction>,
    field: keyof Transaction,
    // eslint-disable-next-line max-params, complexity
  ): React.JSX.Element => {
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

  // eslint-disable-next-line max-params, complexity
  const renderDisplayCell = (
    transaction: Transaction,
    field: keyof Transaction,
  ): React.ReactNode => {
    if (field === 'transactionDate') {
      return new Date(transaction.transactionDate).toLocaleDateString(resolveLocale(locale));
    }
    if (field === 'debit' || field === 'credit') {
      const value = transaction[field];
      return value ? formatNumber(value) : '—';
    }
    if (field === 'categoryId') {
      return transaction.category?.name
        ? getCategoryDisplayName(
            {
              name: transaction.category.name,
              source: transaction.category.source,
              isSystem: transaction.category.isSystem,
            },
            locale,
          )
        : '—';
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
  const flattenedStatementCategories = flattenStatementCategories(categories, '', locale);
  const flattenedEnabledStatementCategories = flattenStatementCategories(
    enabledStatementCategories,
    '',
    locale,
  );

  const stageActions = getStatementStageActions(currentStage);

  if (loading) {
    return (
      <Container
        maxWidth="xl"
        data-testid="statement-edit-loading"
        style={{
          display: 'flex',
          minHeight: '60vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner style={{ width: 40, height: 40, color: 'var(--primary)' }} />
      </Container>
    );
  }

  const missingCategoryCount = transactions.filter(transaction => {
    const noCategory = isIdEmpty(transaction.categoryId) && isIdEmpty(transaction.category?.id);
    return noCategory || transaction.category?.isEnabled === false;
  }).length;

  // eslint-disable-next-line max-params
  const totalIncome = transactions.reduce((sum, t) => {
    const credit = Number(t.credit);
    return sum + (Number.isNaN(credit) ? 0 : credit);
  }, 0);

  // eslint-disable-next-line max-params
  const totalExpense = transactions.reduce((sum, t) => {
    const debit = Number(t.debit);
    return sum + (Number.isNaN(debit) ? 0 : debit);
  }, 0);

  const selectedStatementCategoryName =
    (statement?.category?.name
      ? getCategoryDisplayName(
          {
            name: statement.category.name,
            source: statement.category.source,
            isSystem: statement.category.isSystem,
          },
          locale,
        ).trim()
      : '') ||
    flattenedStatementCategories.find(category => category.id === statement?.categoryId)?.name ||
    labels.categoryButton?.value ||
    'Category';
  const hasStatementCategory = !(
    isIdEmpty(statement?.categoryId) && isIdEmpty(statement?.category?.id || undefined)
  );
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
      ? labels.alertNeedsFixTitle?.value || 'Fix required before submit'
      : readinessSeverity === 'warning'
        ? labels.alertReviewTitle?.value || 'Review statement before submit'
        : labels.alertReadyTitle?.value || 'Statement is ready to submit';

  const readinessDetails: string[] = [];

  if (!hasStatementCategory) {
    readinessDetails.push(
      labels.alertStatementCategoryMissing?.value || 'Statement category is not selected.',
    );
  }

  if (hasDisabledStatementCategory) {
    readinessDetails.push(
      labels.alertStatementCategoryDisabled?.value ||
        'Selected statement category is disabled. Choose an active category.',
    );
  }

  if (missingCategoryCount > 0) {
    readinessDetails.push(
      (
        labels.alertTransactionsCategoryMissing?.value ||
        '{count} transactions require a category. Assign categories for all rows.'
      ).replace('{count}', String(missingCategoryCount)),
    );
  }

  if (parsingErrorCount > 0) {
    readinessDetails.push(
      (
        labels.alertParsingErrors?.value ||
        '{count} parsing errors found. Review parsing details and statement data.'
      ).replace('{count}', String(parsingErrorCount)),
    );
  }

  if (parsingWarningCount > 0) {
    readinessDetails.push(
      (
        labels.alertParsingWarnings?.value ||
        '{count} parsing warnings found. It is recommended to review flagged rows.'
      ).replace('{count}', String(parsingWarningCount)),
    );
  }

  if (!transactions.length) {
    readinessDetails.push(
      labels.alertNoTransactions?.value ||
        'No transactions found in this statement. Check file or import settings.',
    );
  }

  const readinessMessage =
    readinessDetails.length > 0
      ? readinessDetails.join(' · ')
      : labels.alertReadyBody?.value ||
        'All required categories are assigned. The data looks good and ready to submit.';

  const readinessInlineText = `${readinessTitle}: ${readinessMessage}`;

  return (
    <Container
      maxWidth={false}
      sx={{ py: 5, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => router.back()}
          sx={{
            mb: 3,
            color: 'text.secondary',
            textTransform: 'none',
            fontWeight: 500,
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
                label={`${statement?.totalTransactions} ${t.labels.transactionsCount.value || 'transactions'}`}
                size="small"
                data-testid="statement-transactions-chip"
                style={{
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                }}
                sx={{
                  fontWeight: 500,
                  '& .MuiChip-icon': { color: 'text.secondary' },
                }}
              />
              {missingCategoryCount > 0 && (
                <Chip
                  icon={<TriangleAlert size={18} />}
                  label={t.labels.requireCategory.value.replace(
                    '{{count}}',
                    String(missingCategoryCount),
                  )}
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
                {t.labels.selectCategoryHint.value}
              </Typography>
            ) : null}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {hasDisabledStatementCategory ||
            (isIdEmpty(statement?.categoryId) && isIdEmpty(statement?.category?.id)) ? (
              <Button
                variant="outlined"
                startIcon={statementCategorySaving ? <Spinner size={18} /> : <Layers size={18} />}
                onClick={() => setStatementCategoryDrawerOpen(true)}
                disabled={statementCategorySaving || optionsLoading}
                title={selectedStatementCategoryName}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  minWidth: 0,
                  maxWidth: { xs: '100%', md: 280 },
                  overflow: 'hidden',
                  borderColor: 'var(--destructive) !important',
                  color: 'var(--destructive) !important',
                  bgcolor: 'var(--color-error-soft-bg) !important',
                  borderWidth: '2px !important',
                  '& .MuiButton-startIcon': {
                    color: 'var(--destructive) !important',
                  },
                  '&:hover': {
                    bgcolor: '#fee2e2 !important',
                    borderColor: 'var(--destructive) !important',
                  },
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
                    ? `${selectedStatementCategoryName}${t.labels.disabledSuffix.value}`
                    : selectedStatementCategoryName}
                </Box>
              </Button>
            ) : (
              <DetailActionButton
                onClick={() => setStatementCategoryDrawerOpen(true)}
                disabled={statementCategorySaving || optionsLoading}
                title={selectedStatementCategoryName}
                style={{
                  minWidth: 0,
                  maxWidth: '100%',
                  justifyContent: 'flex-start',
                  padding: '8px 16px',
                  fontWeight: 700,
                }}
              >
                {statementCategorySaving ? <Spinner size={18} /> : <Layers size={18} />}
                <span
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {selectedStatementCategoryName}
                </span>
              </DetailActionButton>
            )}
            <DetailActionButton
              onClick={() => setExportConfirmOpen(true)}
              disabled={exportingToTable || !transactions.length}
            >
              {exportingToTable ? <Spinner size={18} /> : <Table2 size={18} />}
              {t.labels.exportButton.value}
            </DetailActionButton>
            {/* eslint-disable-next-line max-lines-per-function, complexity */}
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
                    {isPrimary ? (
                      <Button
                        variant="contained"
                        startIcon={isLoading ? <Spinner size={18} /> : <Check />}
                        onClick={() =>
                          handleStageAction(action, stageActionToasts, missingCategoryCount)
                        }
                        disabled={isDisabled}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          boxShadow: 'none',
                          '&:hover': { boxShadow: 'none' },
                        }}
                      >
                        {stageActionLabels[action.id]}
                      </Button>
                    ) : (
                      <DetailActionButton
                        onClick={() =>
                          handleStageAction(action, stageActionToasts, missingCategoryCount)
                        }
                        disabled={isDisabled}
                      >
                        {isLoading ? (
                          <Spinner size={18} />
                        ) : action.id === 'unapprove' || action.id === 'rollbackToApprove' ? (
                          <ArrowLeft size={18} />
                        ) : (
                          <Check size={18} />
                        )}
                        {stageActionLabels[action.id]}
                      </DetailActionButton>
                    )}
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

      {statement && (
        <BalanceReviewAlert
          statementId={statement.id}
          status={statement.status}
          parsingDetails={statement.parsingDetails}
          formatNumber={formatNumber}
          onConfirmed={LoadData}
          labels={{
            title: labels.balanceReviewTitle?.value || 'Balance does not reconcile',
            description:
              labels.balanceReviewDescription?.value ||
              'This statement stays out of analytics until you confirm the discrepancy.',
            expected: labels.balanceReviewExpected?.value || 'Expected',
            actual: labels.balanceReviewActual?.value || 'Reported',
            difference: labels.balanceReviewDifference?.value || 'Difference',
            confirm: labels.balanceReviewConfirm?.value || 'Confirm discrepancy',
            confirmFailed:
              labels.balanceReviewConfirmFailed?.value || 'Failed to confirm the discrepancy',
          }}
        />
      )}

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
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {labels.period?.value || 'Period'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
            {statement?.statementDateFrom && statement?.statementDateTo
              ? `${new Date(statement.statementDateFrom).toLocaleDateString()} - ${new Date(statement.statementDateTo).toLocaleDateString()}`
              : labels.notSpecified?.value || 'Not specified'}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {labels.balanceStart?.value || 'Opening balance'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
            {statement?.balanceStart !== null &&
            statement?.balanceStart !== undefined &&
            statement?.balanceStart !== ''
              ? formatNumber(Number(statement.balanceStart))
              : labels.notSpecified?.value || 'Not specified'}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {labels.expenses?.value || 'Expenses'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, color: 'error.main' }}>
            {!Number.isNaN(totalExpense) && totalExpense >= 0 ? formatNumber(totalExpense) : '0.00'}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {labels.income?.value || 'Income'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, color: 'success.main' }}>
            {!Number.isNaN(totalIncome) && totalIncome >= 0 ? formatNumber(totalIncome) : '0.00'}
          </Typography>
        </Paper>
      </Box>

      {/* Editing & Parsing Details Accordion */}
      <Accordion
        expanded={parsingDetailsExpanded}
        // eslint-disable-next-line max-params
        onChange={(_, expanded) => setParsingDetailsExpanded(expanded)}
        elevation={0}
        sx={{
          mb: 4,
          border: '1px solid',
          borderColor: 'divider',
          '&:before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary
          expandIcon={<ChevronDown size={20} />}
          sx={{
            bgcolor: theme => (theme.palette.mode === 'dark' ? '#18222d' : theme.palette.grey[50]),
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {t.labels.parsingDetails?.value || 'Parsing details'}
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
              containerTestId="statement-metadata-field-start-date"
              label={labels.startDate?.value || 'Start date'}
              value={metadataForm.statementDateFrom}
              onChange={value => handleMetadataChange('statementDateFrom', value)}
              helperText={
                statement?.parsingDetails?.metadataExtracted?.dateFrom
                  ? `${labels.fromFilePrefix?.value || 'From file: '}${new Date(statement.parsingDetails.metadataExtracted.dateFrom).toLocaleDateString(resolveLocale(locale))}`
                  : undefined
              }
            />
            <CustomDatePicker
              containerTestId="statement-metadata-field-end-date"
              label={labels.endDate?.value || 'End date'}
              value={metadataForm.statementDateTo}
              onChange={value => handleMetadataChange('statementDateTo', value)}
              helperText={
                statement?.parsingDetails?.metadataExtracted?.dateTo
                  ? `${labels.fromFilePrefix?.value || 'From file: '}${new Date(statement.parsingDetails.metadataExtracted.dateTo).toLocaleDateString(resolveLocale(locale))}`
                  : undefined
              }
            />
            <div data-testid="statement-metadata-field-opening-balance">
              <TextField
                type="number"
                fullWidth
                size="small"
                label={labels.openingBalance?.value || 'Opening balance'}
                inputRef={balanceStartInputRef}
                value={metadataForm.balanceStart}
                onChange={e => handleMetadataChange('balanceStart', e.target.value)}
                placeholder="0.00"
                helperText={
                  statement?.parsingDetails?.metadataExtracted?.balanceStart
                    ? `${labels.fromFilePrefix?.value || 'From file: '}${formatNumber(statement.parsingDetails.metadataExtracted.balanceStart)}`
                    : labels.enterOpeningBalance?.value || 'Enter opening balance'
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
            <div data-testid="statement-metadata-field-closing-balance">
              <TextField
                type="number"
                fullWidth
                size="small"
                label={labels.balanceEnd?.value || 'Closing balance'}
                inputRef={balanceEndInputRef}
                value={metadataForm.balanceEnd}
                onChange={e => handleMetadataChange('balanceEnd', e.target.value)}
                placeholder="0.00"
                helperText={
                  statement?.parsingDetails?.metadataExtracted?.balanceEnd
                    ? `${labels.fromFilePrefix?.value || 'From file: '}${formatNumber(statement.parsingDetails.metadataExtracted.balanceEnd)}`
                    : labels.enterManuallyHint?.value || 'Enter manually if it was not detected'
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
                {labels.extractedMetadata?.value || 'Extracted metadata'}
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
                    {labels.bank?.value || 'Bank'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {statement.parsingDetails.detectedBank || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {labels.bankDetectedBy?.value || 'Detected by'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {statement.parsingDetails.detectedBy || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {labels.format?.value || 'Format'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {statement.parsingDetails.detectedFormat?.toUpperCase() || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {labels.foundTransactions?.value || 'Transactions found'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {statement.parsingDetails.transactionsFound ?? '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {labels.createdTransactions?.value || 'Transactions created'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {statement.parsingDetails.transactionsCreated ?? '—'}
                  </Typography>
                </Box>
                {statement.parsingDetails.errors && statement.parsingDetails.errors.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="error">
                      {labels.errors?.value || 'Errors'}
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
                        {labels.warnings?.value || 'Warnings'}
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
                        {labels.otherBankMentions?.value || 'Other bank mentions'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {statement.parsingDetails.otherBankMentions.join(', ')}
                      </Typography>
                    </Box>
                  )}
              </Box>

              {(statement.parsingDetails.warnings?.length || 0) > 0 ||
              (statement.parsingDetails.droppedSamples?.length || 0) > 0 ? (
                <ParsingWarningsPanel
                  warnings={statement.parsingDetails.warnings || []}
                  droppedSamples={statement.parsingDetails.droppedSamples || []}
                  onConvertDroppedSample={handleConvertDroppedSample}
                  onResolveWarning={handleResolveParsingWarning}
                  fixTooltipLabel={labels.fixDroppedRow?.value || 'Fix'}
                  resolveBalanceTooltipLabel={labels.balanceEnd?.value || 'Review balances'}
                  title={labels.warnings?.value || 'Warnings'}
                  helperText={
                    labels.alertParsingWarnings?.value?.replace(
                      '{count}',
                      String(statement.parsingDetails.warnings?.length || 0),
                    ) || 'Review the flagged rows before submitting this statement.'
                  }
                />
              ) : null}
            </>
          )}
        </AccordionDetails>
      </Accordion>

      <Dialog
        open={exportConfirmOpen}
        onClose={() => setExportConfirmOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: 22, fontWeight: 600 }}>
          {t.labels.exportConfirmTitle.value}
        </DialogTitle>
        <DialogContent dividers>
          <p style={{ fontSize: 16, lineHeight: 2, color: 'var(--foreground)' }}>
            {t.labels.exportConfirmBody.value}
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 4, py: 3, gap: 1.5, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setExportConfirmOpen(false)}
            style={{
              borderRadius: tokens.radius.md,
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              padding: '10px 24px',
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {t.labels.cancel.value}
          </button>
          <button
            type="button"
            onClick={() => {
              setExportConfirmOpen(false);
              void handleExportToCustomTable();
            }}
            disabled={exportingToTable || !transactions.length}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: tokens.radius.md,
              background: 'var(--primary-fill)',
              padding: '10px 24px',
              fontSize: 16,
              fontWeight: 500,
              color: '#fff',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            {exportingToTable ? <Spinner style={{ height: 16, width: 16, color: '#fff' }} /> : null}
            {t.labels.exportConfirmConfirm.value}
          </button>
        </DialogActions>
      </Dialog>

      <StatementCategoryDrawer
        open={statementCategoryDrawerOpen}
        onClose={() => setStatementCategoryDrawerOpen(false)}
        categories={enabledStatementCategories}
        selectedCategoryId={statement?.categoryId || ''}
        selecting={statementCategorySaving}
        onSelect={categoryId =>
          handleStatementCategorySelect(categoryId, flattenedStatementCategories)
        }
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
              {formatLabel(labels.selectedTransactions?.value, { count: selectedRows.size }) ||
                `Selected: ${selectedRows.size} transactions`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={handleOpenBulkCategory}
                startIcon={<Layers size={18} />}
                disabled={saving}
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor: 'primary.300',
                  color: 'primary.700',
                  '&:hover': {
                    borderColor: 'primary.400',
                    bgcolor: 'primary.100',
                  },
                }}
              >
                {labels.assignCategory?.value || 'Assign category'}
              </Button>
              <Button
                variant="contained"
                onClick={handleBulkUpdate}
                disabled={saving}
                startIcon={saving ? <Spinner size={20} /> : <Save size={18} />}
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: 'none',
                }}
              >
                {labels.save?.value || 'Save'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() =>
                  handleBulkDelete(
                    formatLabel(labels.confirmDeleteMany?.value, { count: selectedRows.size }) ||
                      `Delete ${selectedRows.size} transactions?`,
                  )
                }
                disabled={saving}
                startIcon={<Trash2 size={18} />}
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                {labels.delete?.value || 'Delete'}
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
          overflow: 'hidden',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                bgcolor: theme =>
                  theme.palette.mode === 'dark' ? '#18222d' : theme.palette.grey[50],
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
                {columns.date?.value || 'Date'}
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
                {columns.counterparty?.value || 'Counterparty'}
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
                {columns.paymentPurposeShort?.value || 'Payment purpose'}
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
                {columns.expense?.value || 'Expense'}
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
                {columns.income?.value || 'Income'}
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
                {columns.category?.value || 'Category'}
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
                {columns.actions?.value || 'Actions'}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* eslint-disable-next-line max-lines-per-function, complexity */}
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
                                ? `${getCategoryDisplayName(
                                    {
                                      name: transaction.category.name,
                                      source: transaction.category.source,
                                      isSystem: transaction.category.isSystem,
                                    },
                                    locale,
                                  )} — ${labels.assignCategory?.value || 'Assign category'}`
                                : getCategoryDisplayName(
                                    {
                                      name: transaction.category.name,
                                      source: transaction.category.source,
                                      isSystem: transaction.category.isSystem,
                                    },
                                    locale,
                                  )
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
                            label={labels.noCategoryOption?.value || 'No category'}
                            size="small"
                            icon={<TriangleAlert size={16} />}
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
                          <CheckCircle2 size={18} />
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
                          <XCircle size={18} />
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
                          <Pencil size={18} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (
                              window.confirm(
                                labels.confirmDeleteOne?.value || 'Delete transaction?',
                              )
                            ) {
                              void handleDelete(transaction.id);
                            }
                          }}
                          sx={{
                            color: 'error.600',
                            '&:hover': {
                              bgcolor: 'error.50',
                            },
                          }}
                        >
                          <Trash2 size={18} />
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
          {formatLabel(labels.assignCategoryForTransactions?.value, { count: selectedRows.size }) ||
            `Assign category for ${selectedRows.size} transactions`}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            select
            label={labels.category?.value || 'Category'}
            fullWidth
            value={bulkCategoryId}
            onChange={e => setBulkCategoryId(e.target.value)}
            helperText={
              labels.bulkCategoryHelper?.value ||
              'The category will be applied to all selected transactions'
            }
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          >
            <MenuItem value="">{labels.notSelected?.value || 'Not selected'}</MenuItem>
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
            {labels.cancel?.value || 'Cancel'}
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <Spinner size={18} /> : <CheckCircle2 size={18} />}
            onClick={handleApplyBulkCategory}
            disabled={saving || !bulkCategoryId}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none',
              },
            }}
          >
            {labels.apply?.value || 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
