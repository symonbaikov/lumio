'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ArrowLeft, Check, Layers, Receipt, Table2, TriangleAlert } from '@/app/components/icons';
import { DetailActionButton } from '@/app/components/ui/detail-action-button';
import { Spinner } from '@/app/components/ui/spinner';
import {
  isStageActionBlocked,
  type StatementStageAction,
  type StatementStageActionId,
} from '@/app/lib/statement-workflow';
import { labelValue } from '../editHelpers';

type Statement = {
  fileName?: string;
  totalTransactions?: number;
  categoryId?: string;
  category?: {
    id?: string;
    name?: string;
    source?: string;
    isSystem?: boolean;
    isEnabled?: boolean;
  };
};
type HeaderT = {
  labels: {
    back: string;
    transactionsCount: { value?: string };
    requireCategory: { value: string };
    selectCategoryHint: { value: string };
    disabledSuffix: { value: string };
    exportButton: { value: string };
  };
};

type EditStatementHeaderProps = {
  statement: Statement | null;
  missingCategoryCount: number;
  exportingToTable: boolean;
  statementCategorySaving: boolean;
  optionsLoading: boolean;
  stageActionLoadingId: string | null;
  stageActions: StatementStageAction[];
  stageActionLabels: Record<StatementStageActionId, string>;
  selectedStatementCategoryName: string;
  hasDisabledStatementCategory: boolean;
  isStatementCategoryEmpty: boolean;
  labels: Record<string, { value?: string } | undefined>;
  onBack: () => void;
  onOpenCategoryDrawer: () => void;
  onExport: () => void;
  onStageAction: (action: StatementStageAction) => void;
  t: HeaderT;
};

type CatBtnBase = {
  statementCategorySaving: boolean;
  optionsLoading: boolean;
  selectedStatementCategoryName: string;
  onOpenCategoryDrawer: () => void;
};
type StageActionButtonProps = {
  action: StatementStageAction;
  stageActionLoadingId: string | null;
  missingCategoryCount: number;
  stageActionLabels: Record<StatementStageActionId, string>;
  submitBlockedTooltip: string;
  onAction: () => void;
};

function StageActionIcon({
  isLoading,
  actionId,
}: {
  isLoading: boolean;
  actionId: string;
}): React.ReactElement {
  if (isLoading) {
    return <Spinner size={18} />;
  }
  if (actionId === 'unapprove' || actionId === 'rollbackToApprove') {
    return <ArrowLeft size={18} />;
  }
  return <Check size={18} />;
}

function StageActionButton({
  action,
  stageActionLoadingId,
  missingCategoryCount,
  stageActionLabels,
  submitBlockedTooltip,
  onAction,
}: StageActionButtonProps): React.ReactElement {
  const isLoading = stageActionLoadingId === action.id;
  const isSubmitBlocked = isStageActionBlocked(action.id, missingCategoryCount);
  const isDisabled = stageActionLoadingId !== null || isSubmitBlocked;
  const tooltipTitle = isSubmitBlocked ? submitBlockedTooltip : '';
  if (action.id === 'pay') {
    return (
      <Tooltip title={tooltipTitle} placement="top">
        <span style={{ display: 'inline-flex' }}>
          <Button
            variant="contained"
            startIcon={isLoading ? <Spinner size={18} /> : <Check />}
            onClick={onAction}
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
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={tooltipTitle} placement="top">
      <span style={{ display: 'inline-flex' }}>
        <DetailActionButton onClick={onAction} disabled={isDisabled}>
          <StageActionIcon isLoading={isLoading} actionId={action.id} />
          {stageActionLabels[action.id]}
        </DetailActionButton>
      </span>
    </Tooltip>
  );
}

function ErrorCategoryButton({
  statementCategorySaving,
  optionsLoading,
  selectedStatementCategoryName,
  hasDisabledStatementCategory,
  disabledSuffix,
  onOpenCategoryDrawer,
}: CatBtnBase & {
  hasDisabledStatementCategory: boolean;
  disabledSuffix: string;
}): React.ReactElement {
  const label = hasDisabledStatementCategory
    ? `${selectedStatementCategoryName}${disabledSuffix}`
    : selectedStatementCategoryName;
  return (
    <Button
      variant="outlined"
      startIcon={statementCategorySaving ? <Spinner size={18} /> : <Layers size={18} />}
      onClick={onOpenCategoryDrawer}
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
        '& .MuiButton-startIcon': { color: 'var(--destructive) !important' },
        '&:hover': {
          bgcolor: 'var(--color-error-soft-bg) !important',
          borderColor: 'var(--destructive) !important',
        },
      }}
    >
      <Box
        component="span"
        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {label}
      </Box>
    </Button>
  );
}

function NormalCategoryButton({
  statementCategorySaving,
  optionsLoading,
  selectedStatementCategoryName,
  onOpenCategoryDrawer,
}: CatBtnBase): React.ReactElement {
  return (
    <DetailActionButton
      onClick={onOpenCategoryDrawer}
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
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {selectedStatementCategoryName}
      </span>
    </DetailActionButton>
  );
}

type CategoryButtonProps = CatBtnBase & {
  showCategoryError: boolean;
  hasDisabledStatementCategory: boolean;
  disabledSuffix: string;
};
function CategoryButton({ showCategoryError, ...rest }: CategoryButtonProps): React.ReactElement {
  if (showCategoryError) {
    return <ErrorCategoryButton {...rest} />;
  }
  return <NormalCategoryButton {...rest} />;
}

function StatementChips({
  statement,
  missingCategoryCount,
  t,
}: {
  statement: Statement | null;
  missingCategoryCount: number;
  t: HeaderT;
}): React.ReactElement {
  return (
    <Box sx={{ minWidth: 240 }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{ fontWeight: 600, mb: 1, color: 'text.primary', letterSpacing: '-0.02em' }}
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
          sx={{ fontWeight: 500, '& .MuiChip-icon': { color: 'text.secondary' } }}
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
      {missingCategoryCount > 0 && (
        <Typography sx={{ mt: 1, color: 'error.main', fontSize: '0.75rem', fontWeight: 500 }}>
          {t.labels.selectCategoryHint.value}
        </Typography>
      )}
    </Box>
  );
}

export function EditStatementHeader({
  statement,
  missingCategoryCount,
  exportingToTable,
  statementCategorySaving,
  optionsLoading,
  stageActionLoadingId,
  stageActions,
  stageActionLabels,
  selectedStatementCategoryName,
  hasDisabledStatementCategory,
  isStatementCategoryEmpty,
  labels,
  onBack,
  onOpenCategoryDrawer,
  onExport,
  onStageAction,
  t,
}: EditStatementHeaderProps): React.ReactElement {
  const showCategoryError = hasDisabledStatementCategory || isStatementCategoryEmpty;
  const submitBlockedTooltip = labelValue(
    labels.submitBlockedTooltip,
    'Assign categories to all transactions before submitting',
  );
  return (
    <Box sx={{ mb: 4 }}>
      <Button
        startIcon={<ArrowLeft size={18} />}
        onClick={onBack}
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
        <StatementChips statement={statement} missingCategoryCount={missingCategoryCount} t={t} />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <CategoryButton
            showCategoryError={showCategoryError}
            statementCategorySaving={statementCategorySaving}
            optionsLoading={optionsLoading}
            selectedStatementCategoryName={selectedStatementCategoryName}
            hasDisabledStatementCategory={hasDisabledStatementCategory}
            disabledSuffix={t.labels.disabledSuffix.value}
            onOpenCategoryDrawer={onOpenCategoryDrawer}
          />
          <DetailActionButton onClick={onExport} disabled={exportingToTable}>
            {exportingToTable ? <Spinner size={18} /> : <Table2 size={18} />}
            {t.labels.exportButton.value}
          </DetailActionButton>
          {stageActions.map(action => (
            <StageActionButton
              key={action.id}
              action={action}
              stageActionLoadingId={stageActionLoadingId}
              missingCategoryCount={missingCategoryCount}
              stageActionLabels={stageActionLabels}
              submitBlockedTooltip={submitBlockedTooltip}
              onAction={() => onStageAction(action)}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
