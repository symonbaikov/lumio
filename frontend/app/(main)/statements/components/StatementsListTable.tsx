'use client';

import { ArrowDown } from '@/app/components/icons';
import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import { Checkbox } from '@/app/components/ui/checkbox';
import { AppPagination } from '@/app/components/ui/pagination';
import { Spinner } from '@/app/components/ui/spinner';
import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';
import {
  getStatementDisplayMerchant,
  getStatementMerchantLabel,
  isManualExpenseStatement,
} from '@/app/lib/statement-status';
import { StatementsGmailSync } from './StatementsGmailSync';
import { StatementsListItem } from './StatementsListItem';
import {
  formatPaginationLabel,
  formatStatementAmount,
  formatStatementDate,
  getBankDisplayName,
  isGmailStatement,
  isReceiptProcessing,
  isStatementParsingInProgress,
} from './StatementsListView.utils';
import {
  DEFAULT_STATEMENT_COLUMNS,
  type StatementColumn,
  type StatementColumnId,
} from './columns/statement-columns';
import type { DuplicateMeta } from './hooks/useStatementSelection';

interface StatementForTable {
  id: string;
  source?: string;
  bankName: string;
  status: string;
  fileName: string;
  fileType: string;
  subject?: string;
  sender?: string;
  exported?: boolean | null;
  paid?: boolean | null;
  processedAt?: string;
  receivedAt?: string;
  createdAt: string;
  parsedData?: {
    vendor?: string;
    amount?: number;
    currency?: string;
    date?: string;
    category?: string;
    categoryId?: string;
    lineItems?: Array<{ description: string; amount?: number }>;
  };
  category?: {
    id?: string | null;
    name?: string | null;
    color?: string | null;
    icon?: string | null;
  } | null;
  tags?: Array<{ id?: string; name?: string; color?: string | null }>;
  googleSheet?: { id?: string; sheetName?: string | null; worksheetName?: string | null } | null;
  transactionSummary?: {
    description?: string | null;
    exchangeRate?: string | number | null;
    exchangeRateMixed?: boolean;
    cardLabel?: string | null;
  } | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  parsingDetails?: {
    importPreview?: {
      attachments?: number;
      description?: string;
      merchant?: string;
      categoryId?: string;
    };
  };
}

interface TableLabels {
  merchant: string;
  date: string;
  amount: string;
  action: string;
  receipt: string;
  scanning: string;
  emptyTitle: string;
  emptyDescription: string;
  paginationShown: string;
  paginationPageOf: string;
}

interface Props {
  loading: boolean;
  displayStatements: StatementForTable[];
  paginatedStatements: StatementForTable[];
  gmailSyncSkeletonKeys: string[];
  allVisibleSelected: boolean;
  selectedCount: number;
  selectedStatementIds: string[];
  dateSortDirection: 'asc' | 'desc';
  page: number;
  totalPagesCount: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  duplicateMetaById: Map<string, DuplicateMeta>;
  columns?: StatementColumn[];
  currentExchangeRateLabels?: Record<string, string>;
  workspaceCurrency?: string | null;
  viewLabel: string;
  reviewDuplicateLabel: string;
  labels: TableLabels;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSortDirection: () => void;
  onToggleStatement: (id: string) => void;
  onView: (statement: StatementForTable) => void;
  onIconClick: (statement: StatementForTable) => void;
  onPageChange: (page: number) => void;
}

const NUMERIC_COLUMN_IDS = new Set<StatementColumnId>(['amount', 'exchangeRate']);
const BOOLEAN_COLUMN_IDS = new Set<StatementColumnId>(['approved', 'billable', 'exported']);
const COLUMN_MIN_WIDTHS: Record<StatementColumnId, number> = {
  receipt: 48,
  date: 124,
  merchant: 260,
  from: 136,
  to: 136,
  category: 136,
  tag: 136,
  amount: 148,
  action: 128,
  approved: 96,
  billable: 96,
  card: 136,
  description: 220,
  exchangeRate: 156,
  exported: 96,
  exportedTo: 136,
};

const columnHeaderStyle = (columnId: StatementColumnId): React.CSSProperties => {
  const common: React.CSSProperties = {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--muted-foreground)',
    textAlign: NUMERIC_COLUMN_IDS.has(columnId) ? 'right' : 'left',
  };

  if (columnId === 'receipt') {
    return { ...common, width: 48, flex: '0 0 48px', textAlign: 'center' };
  }
  if (columnId === 'merchant') {
    return { ...common, minWidth: 220, flex: '1 1 260px' };
  }
  if (columnId === 'description') {
    return { ...common, minWidth: 180, flex: '1 1 220px' };
  }
  if (columnId === 'action') {
    return { ...common, width: 128, flex: '0 0 128px', textAlign: 'right' };
  }
  if (columnId === 'amount') {
    return { ...common, width: 148, flex: '0 0 148px', textAlign: 'right' };
  }
  if (columnId === 'date') {
    return { ...common, width: 124, flex: '0 0 124px' };
  }
  if (columnId === 'exchangeRate') {
    return { ...common, width: 156, flex: '0 0 156px', textAlign: 'right' };
  }
  if (NUMERIC_COLUMN_IDS.has(columnId)) {
    return { ...common, width: 116, flex: '0 0 116px', textAlign: 'right' };
  }
  if (BOOLEAN_COLUMN_IDS.has(columnId)) {
    return { ...common, width: 96, flex: '0 0 96px' };
  }
  return { ...common, width: 136, flex: '0 0 136px' };
};

const getRenderedColumns = (
  columns: StatementColumn[] = DEFAULT_STATEMENT_COLUMNS,
): StatementColumn[] => {
  const visibleColumns = columns.filter(column => column.visible);
  return visibleColumns.length > 0 ? visibleColumns : columns.slice(0, 1);
};

const calculateTableMinWidth = (columns: StatementColumn[] = DEFAULT_STATEMENT_COLUMNS): number => {
  const renderedColumns = getRenderedColumns(columns);
  const columnsWidth = renderedColumns.reduce(
    (sum, column) => sum + COLUMN_MIN_WIDTHS[column.id],
    0,
  );
  const gapWidth = Math.max(0, renderedColumns.length - 1) * 24;
  return 32 + columnsWidth + gapWidth + 64;
};

interface StatementRowData {
  isReceipt: boolean;
  merchantLabel: string;
  isManualExpense: boolean;
  allowAttachFallback: boolean;
  isProcessingReceipt: boolean;
  isProcessingStatement: boolean;
  amountLabel: string;
  dateLabel: string;
}

function resolveStatementRowData(
  statement: StatementForTable,
  scanningLabel: string,
): StatementRowData {
  const isReceipt = statement.source === 'gmail' || statement.source === 'scan';
  const resolvedName = isReceipt
    ? resolveGmailMerchantLabel({
        vendor: statement.parsedData?.vendor,
        sender: isGmailStatement(statement) ? statement.sender : undefined,
        subject: statement.subject,
        fallback: statement.fileName,
      })
    : getStatementDisplayMerchant(statement, getBankDisplayName(statement.bankName));
  const merchantLabel = isReceipt
    ? resolvedName
    : getStatementMerchantLabel(statement.status, resolvedName, scanningLabel);
  const isManualExpense = !isReceipt && isManualExpenseStatement(statement);
  const manualAttachmentCount = Number(statement.parsingDetails?.importPreview?.attachments ?? 0);
  const allowAttachFallback =
    isManualExpense &&
    !isReceipt &&
    (manualAttachmentCount === 0 || statement.fileName.toLowerCase().startsWith('manual-expense-'));
  return {
    isReceipt,
    merchantLabel,
    isManualExpense,
    allowAttachFallback,
    isProcessingReceipt: isReceiptProcessing(statement),
    isProcessingStatement: isStatementParsingInProgress(statement),
    amountLabel: formatStatementAmount(statement),
    dateLabel: formatStatementDate(statement),
  };
}

function TableDesktopHeader({
  allVisibleSelected,
  selectedCount,
  dateSortDirection,
  columns = DEFAULT_STATEMENT_COLUMNS,
  labels,
  onToggleSelectAll,
  onToggleSortDirection,
}: {
  allVisibleSelected: boolean;
  selectedCount: number;
  dateSortDirection: 'asc' | 'desc';
  columns?: StatementColumn[];
  labels: TableLabels;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSortDirection: () => void;
}): React.JSX.Element {
  const renderedColumns = getRenderedColumns(columns);

  return (
    <div className="lumio-stmt-list-view__desktop-header">
      <div
        style={{
          width: 16,
          display: 'flex',
          justifyContent: 'center',
          opacity: 0.7,
          flexShrink: 0,
          marginRight: 16,
        }}
      >
        <Checkbox
          checked={allVisibleSelected}
          indeterminate={selectedCount > 0 && !allVisibleSelected}
          onCheckedChange={onToggleSelectAll}
          aria-label="Select all statements"
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1, minWidth: 0 }}>
        {renderedColumns.map(column => (
          <div key={column.id} style={columnHeaderStyle(column.id)}>
            {column.id === 'date' ? (
              <button
                type="button"
                data-testid="statements-date-sort"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  padding: 0,
                }}
                onClick={onToggleSortDirection}
                aria-label={`Sort by date ${dateSortDirection === 'desc' ? 'ascending' : 'descending'}`}
              >
                {column.label || labels.date}
                <ArrowDown
                  size={12}
                  style={{
                    transition: 'transform 0.2s',
                    transform: dateSortDirection === 'asc' ? 'rotate(180deg)' : 'none',
                  }}
                />
              </button>
            ) : column.id === 'receipt' ? (
              <span className="sr-only">{column.label || labels.receipt}</span>
            ) : (
              column.label
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatementsListTable({
  loading,
  displayStatements,
  paginatedStatements,
  gmailSyncSkeletonKeys,
  allVisibleSelected,
  selectedCount,
  selectedStatementIds,
  dateSortDirection,
  page,
  totalPagesCount,
  rangeStart,
  rangeEnd,
  total,
  duplicateMetaById,
  columns,
  currentExchangeRateLabels,
  workspaceCurrency,
  viewLabel,
  reviewDuplicateLabel,
  labels,
  onToggleSelectAll,
  onToggleSortDirection,
  onToggleStatement,
  onView,
  onIconClick,
  onPageChange,
}: Props): React.JSX.Element {
  if (loading && gmailSyncSkeletonKeys.length === 0) {
    return (
      <div className="lumio-stmt-list-view__loading">
        <Spinner style={{ height: 80, width: 80, color: 'var(--primary)' }} />
      </div>
    );
  }

  if (displayStatements.length === 0 && gmailSyncSkeletonKeys.length === 0) {
    return (
      <div className="lumio-stmt-list-view__empty">
        <EmptyStateIllustration name="statements" size="lg" />
        <h3 style={{ fontSize: 18, fontWeight: 500, color: 'var(--foreground)' }}>
          {labels.emptyTitle}
        </h3>
        <p style={{ marginTop: 4, color: 'var(--muted-foreground)' }}>{labels.emptyDescription}</p>
      </div>
    );
  }

  const tableMinWidth = calculateTableMinWidth(columns);

  return (
    <>
      <div className="lumio-stmt-list-view__table-scroll">
        <div className="lumio-stmt-list-view__table" style={{ minWidth: tableMinWidth }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
            <Checkbox
              checked={allVisibleSelected}
              indeterminate={selectedCount > 0 && !allVisibleSelected}
              onCheckedChange={onToggleSelectAll}
              aria-label="Select all statements"
            />
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
              Select all
            </span>
          </div>
          <TableDesktopHeader
            allVisibleSelected={allVisibleSelected}
            selectedCount={selectedCount}
            dateSortDirection={dateSortDirection}
            columns={columns}
            labels={labels}
            onToggleSelectAll={onToggleSelectAll}
            onToggleSortDirection={onToggleSortDirection}
          />
          <StatementsGmailSync skeletonKeys={gmailSyncSkeletonKeys} />
          {paginatedStatements.map((statement, index) => {
            const rowData = resolveStatementRowData(statement, labels.scanning);
            const duplicateMeta = duplicateMetaById.get(statement.id);
            return (
              <StatementsListItem
                key={statement.id}
                dataTourId={index === 0 ? 'statement-row-primary' : undefined}
                statement={statement as Parameters<typeof StatementsListItem>[0]['statement']}
                viewLabel={viewLabel}
                isReceipt={rowData.isReceipt}
                isProcessing={rowData.isProcessingReceipt}
                merchantLabel={rowData.merchantLabel}
                amountLabel={rowData.amountLabel}
                dateLabel={rowData.dateLabel}
                isPossibleDuplicate={Boolean(duplicateMeta)}
                duplicatePosition={duplicateMeta?.position}
                duplicateGroupSize={duplicateMeta?.total}
                duplicateRole={duplicateMeta?.role}
                duplicateGroupLabel={duplicateMeta?.groupLabel}
                duplicateGroupTone={duplicateMeta?.groupTone}
                duplicateReason={duplicateMeta?.reason}
                duplicateActionLabel={reviewDuplicateLabel}
                typeLabel={rowData.isReceipt ? 'Receipt' : statement.fileType}
                isManualExpense={rowData.isManualExpense}
                viewDisabled={rowData.isProcessingStatement}
                onView={() => onView(statement)}
                onIconClick={() => onIconClick(statement)}
                onToggleSelect={() => onToggleStatement(statement.id)}
                selected={selectedStatementIds.includes(statement.id)}
                columns={columns}
                currentExchangeRateLabels={currentExchangeRateLabels}
                workspaceCurrency={workspaceCurrency}
              />
            );
          })}
        </div>
      </div>
      <div className="lumio-stmt-list-view__pagination" style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
          {formatPaginationLabel(labels.paginationShown, {
            from: rangeStart,
            to: rangeEnd,
            count: total,
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              minWidth: 120,
              textAlign: 'center',
            }}
          >
            {formatPaginationLabel(labels.paginationPageOf, { page, count: totalPagesCount })}
          </span>
          <AppPagination page={page} total={totalPagesCount} onChange={onPageChange} />
        </div>
      </div>
    </>
  );
}
