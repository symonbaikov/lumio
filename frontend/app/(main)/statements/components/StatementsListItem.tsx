'use client';

import { BankLogoAvatar } from '@/app/components/BankLogoAvatar';
import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
import { PDFThumbnail } from '@/app/components/PDFThumbnail';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Spinner } from '@/app/components/ui/spinner';
import MuiTooltip from '@mui/material/Tooltip';
import { CreditCard, Receipt } from '@/app/components/icons';
import { AlertCircle, CheckCircle2, CircleHelp } from '@/app/components/icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { tokens } from '@/lib/theme-tokens';
import {
  DEFAULT_STATEMENT_COLUMNS,
  type StatementColumn,
  type StatementColumnId,
} from './columns/statement-columns';

export type StatementListItem = {
  id: string;
  source?: 'statement' | 'gmail' | 'scan';
  receiptSource?: string;
  fileName: string;
  subject?: string;
  sender?: string;
  status: string;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  createdAt: string;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  bankName: string;
  fileType: string;
  currency?: string | null;
  exported?: boolean | null;
  paid?: boolean | null;
  processedAt?: string;
  receivedAt?: string;
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
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
  googleSheet?: {
    id?: string;
    sheetName?: string | null;
    worksheetName?: string | null;
  } | null;
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
  errorMessage?: string | null;
  parsingDetails?: {
    detectedBy?: string;
    importPreview?: {
      source?: string;
      description?: string;
      merchant?: string;
      categoryId?: string;
    };
    metadataExtracted?: {
      currency?: string;
      headerDisplay?: {
        currencyDisplay?: string;
      };
    };
  };
};

type DuplicateRole = 'primary' | 'suspected';
type DuplicateGroupTone = 'sky' | 'blue' | 'indigo' | 'slate' | 'zinc' | 'stone';

type DuplicateGroupStyle = {
  rowBorderColor: string;
  rowBg: string;
  lineColor: string;
  badgeBg: string;
  badgeColor: string;
  buttonBorder: string;
  buttonBg: string;
  buttonColor: string;
  buttonHoverBorder: string;
  buttonHoverBg: string;
  buttonHoverColor: string;
};

const DUPLICATE_GROUP_STYLES: Record<DuplicateGroupTone, DuplicateGroupStyle> = {
  blue: {
    rowBorderColor: 'var(--color-info-soft-border)',
    rowBg: 'rgba(239,246,255,0.1)',
    lineColor: 'rgba(147,197,253,0.9)',
    badgeBg: 'var(--color-info-soft-border)',
    badgeColor: 'var(--color-info-soft-text)',
    buttonBorder: 'var(--color-info-soft-border)',
    buttonBg: 'var(--color-info-soft-bg)',
    buttonColor: 'var(--color-info-soft-text)',
    buttonHoverBorder: 'var(--color-info-soft-border)',
    buttonHoverBg: 'var(--color-info-soft-border)',
    buttonHoverColor: '#1e40af',
  },
  sky: {
    rowBorderColor: 'var(--color-info-soft-bg)',
    rowBg: 'rgba(240,249,255,0.1)',
    lineColor: 'rgba(125,211,252,0.9)',
    badgeBg: 'var(--color-info-soft-bg)',
    badgeColor: 'var(--color-info-soft-text)',
    buttonBorder: 'var(--color-info-soft-border)',
    buttonBg: 'var(--color-info-soft-bg)',
    buttonColor: 'var(--color-info-soft-text)',
    buttonHoverBorder: 'var(--color-info-soft-border)',
    buttonHoverBg: 'var(--color-info-soft-bg)',
    buttonHoverColor: '#075985',
  },
  indigo: {
    rowBorderColor: 'var(--color-success-soft-bg)',
    rowBg: 'rgba(237,247,237,0.1)',
    lineColor: 'rgba(168,213,168,0.9)',
    badgeBg: 'var(--color-success-soft-bg)',
    badgeColor: '#157811',
    buttonBorder: 'var(--color-success-soft-border)',
    buttonBg: 'var(--color-success-soft-bg)',
    buttonColor: '#157811',
    buttonHoverBorder: 'var(--color-success-soft-border)',
    buttonHoverBg: 'var(--color-success-soft-bg)',
    buttonHoverColor: '#036704',
  },
  slate: {
    rowBorderColor: 'var(--border-color)',
    rowBg: 'rgba(248,250,252,0.3)',
    lineColor: 'rgba(148,163,184,0.85)',
    badgeBg: 'var(--muted)',
    badgeColor: 'var(--text-secondary)',
    buttonBorder: 'var(--border-color)',
    buttonBg: 'var(--muted)',
    buttonColor: 'var(--text-secondary)',
    buttonHoverBorder: 'var(--border-color)',
    buttonHoverBg: 'var(--muted)',
    buttonHoverColor: 'var(--text-secondary)',
  },
  zinc: {
    rowBorderColor: 'var(--border-color)',
    rowBg: 'rgba(250,250,250,0.3)',
    lineColor: 'rgba(161,161,170,0.85)',
    badgeBg: 'var(--muted)',
    badgeColor: 'var(--text-secondary)',
    buttonBorder: 'var(--border-color)',
    buttonBg: 'var(--muted)',
    buttonColor: 'var(--text-secondary)',
    buttonHoverBorder: 'var(--border-color)',
    buttonHoverBg: 'var(--muted)',
    buttonHoverColor: 'var(--text-primary)',
  },
  stone: {
    rowBorderColor: 'var(--border-color)',
    rowBg: 'rgba(250,250,249,0.3)',
    lineColor: 'rgba(168,162,158,0.85)',
    badgeBg: 'var(--muted)',
    badgeColor: 'var(--text-secondary)',
    buttonBorder: 'var(--border-color)',
    buttonBg: 'var(--muted)',
    buttonColor: 'var(--text-secondary)',
    buttonHoverBorder: 'var(--border-color)',
    buttonHoverBg: 'var(--muted)',
    buttonHoverColor: 'var(--text-primary)',
  },
};

type Props = {
  dataTourId?: string;
  statement: StatementListItem;
  viewLabel: string;
  duplicateActionLabel?: string;
  isReceipt: boolean;
  isProcessing: boolean;
  merchantLabel: string;
  amountLabel: string;
  dateLabel: string;
  onView: () => void;
  onIconClick: () => void;
  onToggleSelect?: () => void;
  selected?: boolean;
  selectionDisabled?: boolean;
  typeLabel?: string;
  isManualExpense?: boolean;
  isPossibleDuplicate?: boolean;
  duplicatePosition?: number;
  duplicateGroupSize?: number;
  duplicateRole?: DuplicateRole;
  duplicateGroupLabel?: string;
  duplicateGroupTone?: DuplicateGroupTone;
  duplicateReason?: string;
  viewDisabled?: boolean;
  columns?: StatementColumn[];
  currentExchangeRateLabels?: Record<string, string>;
  workspaceCurrency?: string | null;
};

const EMPTY_CELL = '—';
const APPROVED_STATUSES = new Set(['completed', 'parsed', 'validated']);
const NUMERIC_COLUMN_IDS = new Set<StatementColumnId>(['amount', 'exchangeRate']);
const BOOLEAN_COLUMN_IDS = new Set<StatementColumnId>(['approved', 'billable', 'exported']);

const normalizeExchangeRateCurrency = (...currencies: Array<string | null | undefined>): string | null => {
  const normalized = firstNonEmpty(...currencies)?.toUpperCase();
  if (!normalized) {
    return null;
  }
  if (normalized === 'NIS' || normalized === '\u20aa') {
    return 'ILS';
  }
  return normalized;
};

const columnCellStyle = (columnId: StatementColumnId): React.CSSProperties => {
  const common: React.CSSProperties = {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  };

  if (columnId === 'receipt') return { ...common, width: 48, flex: '0 0 48px', justifyContent: 'center' };
  if (columnId === 'merchant') return { ...common, minWidth: 220, flex: '1 1 260px' };
  if (columnId === 'description') return { ...common, minWidth: 180, flex: '1 1 220px' };
  if (columnId === 'action') return { ...common, width: 128, flex: '0 0 128px', justifyContent: 'flex-end' };
  if (columnId === 'amount') return { ...common, width: 148, flex: '0 0 148px', justifyContent: 'flex-end' };
  if (columnId === 'date') return { ...common, width: 124, flex: '0 0 124px' };
  if (columnId === 'exchangeRate') return { ...common, width: 156, flex: '0 0 156px', justifyContent: 'flex-end' };
  if (NUMERIC_COLUMN_IDS.has(columnId)) return { ...common, width: 116, flex: '0 0 116px', justifyContent: 'flex-end' };
  if (BOOLEAN_COLUMN_IDS.has(columnId)) return { ...common, width: 96, flex: '0 0 96px' };
  return { ...common, width: 136, flex: '0 0 136px' };
};

const textCellStyle = (
  columnId: StatementColumnId,
  muted = false,
): React.CSSProperties => ({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  width: '100%',
  textAlign: NUMERIC_COLUMN_IDS.has(columnId) ? 'right' : 'left',
  color: muted ? 'var(--muted-foreground)' : 'var(--foreground)',
});

const firstNonEmpty = (...values: Array<unknown>): string | null => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
};

const formatBoolean = (value: boolean | null): string => {
  if (value === null) return EMPTY_CELL;
  return value ? 'Yes' : 'No';
};

function StatusBadge({
  status,
  isProcessing,
  errorMessage,
}: { status: string; isProcessing: boolean; errorMessage?: string | null }) {
  if (errorMessage || status === 'error') {
    return <span className="lumio-stmt-badge lumio-stmt-badge--error">Error</span>;
  }
  if (isProcessing || status === 'processing' || status === 'uploaded') {
    return <span className="lumio-stmt-badge lumio-stmt-badge--pending">Pending</span>;
  }
  if (status === 'completed' || status === 'parsed' || status === 'validated') {
    return <span className="lumio-stmt-badge lumio-stmt-badge--completed">Completed</span>;
  }
  return null;
}

export function StatementsListItem({
  dataTourId,
  statement,
  viewLabel,
  duplicateActionLabel,
  isReceipt,
  isProcessing,
  merchantLabel,
  amountLabel,
  dateLabel,
  onView,
  onIconClick,
  onToggleSelect,
  selected = false,
  selectionDisabled = false,
  typeLabel,
  isManualExpense = false,
  isPossibleDuplicate = false,
  duplicatePosition,
  duplicateGroupSize,
  duplicateRole,
  duplicateGroupLabel,
  duplicateGroupTone,
  duplicateReason,
  viewDisabled = false,
  columns = DEFAULT_STATEMENT_COLUMNS,
  currentExchangeRateLabels,
  workspaceCurrency,
}: Props) {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const PREVIEW_WIDTH = 430;
  const PREVIEW_HEIGHT = 620;
  const PREVIEW_IMAGE_WIDTH = (PREVIEW_WIDTH - 16) * 2;
  const thumbnailButtonRef = useRef<HTMLButtonElement | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const closePreview = useCallback(() => {
    setPreviewVisible(false);
    setPreviewPosition(null);
  }, []);

  const resolvedTypeLabel = typeLabel || statement.fileType;
  const isGmailReceipt = statement.source === 'gmail';
  const isLocalReceipt = statement.source === 'scan';
  const previewSource = isGmailReceipt ? 'gmail' : isLocalReceipt ? 'receipt' : 'statement';
  const normalizedPreviewType = (isReceipt ? 'pdf' : statement.fileType || statement.fileName || '')
    .trim()
    .toLowerCase();
  const hasHoverPreview =
    normalizedPreviewType === 'pdf' ||
    normalizedPreviewType.includes('pdf') ||
    normalizedPreviewType.endsWith('/pdf') ||
    normalizedPreviewType === 'application/pdf';

  const updatePreviewPosition = useCallback(() => {
    const trigger = thumbnailButtonRef.current;
    if (!trigger || !trigger.isConnected || typeof window === 'undefined') {
      closePreview();
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 12;

    const maxTop = Math.max(16, viewportHeight - PREVIEW_HEIGHT - 16);
    const centeredTop = triggerRect.top + triggerRect.height / 2 - PREVIEW_HEIGHT / 2;
    const top = Math.min(Math.max(16, centeredTop), maxTop);

    const rightSideLeft = triggerRect.right + gap;
    const fitsOnRight = rightSideLeft + PREVIEW_WIDTH <= viewportWidth - 12;
    const left = fitsOnRight ? rightSideLeft : Math.max(12, triggerRect.left - PREVIEW_WIDTH - gap);

    setPreviewPosition({ top, left });
  }, [closePreview]);

  useEffect(() => {
    if (!previewVisible) return;

    updatePreviewPosition();

    const handleDismiss = () => {
      closePreview();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePreview();
      }
    };

    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('wheel', handleDismiss, { capture: true, passive: true });
    window.addEventListener('touchmove', handleDismiss, { capture: true, passive: true });
    window.addEventListener('resize', handleDismiss);
    window.addEventListener('blur', handleDismiss);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('wheel', handleDismiss, true);
      window.removeEventListener('touchmove', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
      window.removeEventListener('blur', handleDismiss);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closePreview, previewVisible, updatePreviewPosition]);

  const hasError = !!statement.errorMessage || statement.status === 'error';
  const isPendingStatement = statement.status === 'uploaded' || statement.status === 'processing';
  const compactAmountLabel = amountLabel.replace(/\s+/g, '');
  const isZeroAmountLabel = /^0(?:[.,]0+)?\D*$/.test(compactAmountLabel);
  const isNegativeAmount = amountLabel.startsWith('-') && amountLabel !== '-';
  const isMissingAmount = amountLabel === '-';
  const showAmountLoader = !isReceipt && isPendingStatement && (isZeroAmountLabel || isMissingAmount);
  const resolvedDuplicateRole: DuplicateRole = duplicateRole || 'suspected';
  const resolvedDuplicateGroupLabel = duplicateGroupLabel || 'Group';
  const resolvedDuplicateGroupTone: DuplicateGroupTone = duplicateGroupTone || 'stone';
  const duplicateStyle = DUPLICATE_GROUP_STYLES[resolvedDuplicateGroupTone];
  const duplicateRoleLabel = resolvedDuplicateRole === 'primary' ? 'PRIMARY' : 'SUSPECTED';
  const duplicateBadgeLabel = isPossibleDuplicate
    ? `${resolvedDuplicateGroupLabel} · ${duplicateRoleLabel} #${duplicatePosition || 1}${duplicateGroupSize ? `/${duplicateGroupSize}` : ''}`
    : null;
  const duplicateTooltipText = duplicateReason || 'Same merchant · same date · same amount';
  const actionLabel = isPossibleDuplicate ? duplicateActionLabel || 'Review' : viewLabel;
  const duplicateRoleBadgeStyle: React.CSSProperties =
    resolvedDuplicateRole === 'primary'
      ? { fontWeight: 700, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)' }
      : resolvedTheme === 'dark'
        ? { fontWeight: 500, border: '1px dashed rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)', opacity: 0.9 }
        : { fontWeight: 500, border: '1px dashed rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.7)', opacity: 0.8 };
  const duplicateRoleButtonStyle: React.CSSProperties =
    resolvedDuplicateRole === 'primary'
      ? { fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
      : { fontWeight: 500, borderStyle: 'dashed', opacity: 0.9 };
  const duplicateCardStyle: React.CSSProperties =
    resolvedTheme === 'dark'
      ? {
          borderColor: duplicateStyle.lineColor,
          background: `linear-gradient(90deg, color-mix(in srgb, ${duplicateStyle.lineColor} 14%, ${c.surface}) 0%, ${c.surface} 42%)`,
          boxShadow: `inset 0 0 0 1px ${duplicateStyle.rowBorderColor}, 0 10px 28px rgba(0,0,0,0.26)`,
        }
      : {
          borderColor: duplicateStyle.rowBorderColor,
          backgroundColor: c.surface,
          boxShadow: `inset 0 0 0 1px ${duplicateStyle.rowBorderColor}, 0 8px 20px rgba(15,23,42,0.05)`,
        };
  const handleView = () => {
    if (viewDisabled) {
      return;
    }
    onView();
  };
  const visibleColumns = columns.filter(column => column.visible);
  const renderedColumns = visibleColumns.length > 0 ? visibleColumns : columns.slice(0, 1);
  const sourceLabel = isGmailReceipt ? 'Gmail' : isLocalReceipt ? 'Receipt' : statement.bankName;
  const categoryLabel = firstNonEmpty(
    statement.category?.name,
    statement.parsedData?.category,
    statement.parsingDetails?.importPreview?.categoryId,
  );
  const tagsLabel = statement.tags?.map(tag => tag.name).filter(Boolean).join(', ') || null;
  const descriptionLabel = firstNonEmpty(
    statement.parsingDetails?.importPreview?.description,
    statement.parsedData?.lineItems?.[0]?.description,
    statement.transactionSummary?.description,
    statement.subject,
  );
  const statementCurrency = normalizeExchangeRateCurrency(
    statement.currency,
    statement.parsedData?.currency,
    statement.parsingDetails?.metadataExtracted?.currency,
    statement.parsingDetails?.metadataExtracted?.headerDisplay?.currencyDisplay,
  );
  const targetCurrency = normalizeExchangeRateCurrency(workspaceCurrency) ?? 'KZT';
  const usdExchangeRateLabel = targetCurrency
    ? currentExchangeRateLabels?.[`USD:${targetCurrency}`]
    : null;
  const currentExchangeRateLabel =
    statementCurrency && targetCurrency
      ? currentExchangeRateLabels?.[`${statementCurrency}:${targetCurrency}`]
      : null;
  const exchangeRateLabel = usdExchangeRateLabel ?? currentExchangeRateLabel ?? (statement.transactionSummary?.exchangeRateMixed
    ? 'Mixed'
    : firstNonEmpty(statement.transactionSummary?.exchangeRate));
  const exportedToLabel = firstNonEmpty(
    statement.googleSheet?.worksheetName,
    statement.googleSheet?.sheetName,
  );
  const approvedLabel = formatBoolean(APPROVED_STATUSES.has(statement.status.toLowerCase()));
  const billableLabel = formatBoolean(!isMissingAmount && !isZeroAmountLabel);
  const exportedLabel = formatBoolean(Boolean(statement.exported ?? statement.processedAt));

  const renderPlainCell = (columnId: StatementColumnId, value: string | null): React.JSX.Element => (
    <span style={textCellStyle(columnId, !value || value === EMPTY_CELL)}>
      {value || EMPTY_CELL}
    </span>
  );

  const renderReceiptCell = (): React.JSX.Element => (
    <div style={{ position: 'relative', pointerEvents: 'auto' }}>
      <button
        type="button"
        ref={thumbnailButtonRef}
        data-testid={`statement-thumbnail-trigger-${statement.id}`}
        style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        onClick={event => {
          event.stopPropagation();
          onIconClick();
        }}
        onMouseEnter={() => setPreviewVisible(true)}
        onMouseLeave={closePreview}
        aria-label={statement.fileName}
      >
        <span style={{ color: c.ink400, opacity: 0.6, transition: 'opacity 0.15s', display: 'contents' }}>
          <DocumentTypeIcon
            fileType={isReceipt ? 'pdf' : statement.fileType}
            fileName={statement.fileName}
            fileId={statement.id}
            source={previewSource}
            size={28}
          />
        </span>
      </button>

      {hasHoverPreview && previewVisible && previewPosition
        ? createPortal(
            <div
              data-testid="statement-hover-preview"
              style={{
                pointerEvents: 'none',
                position: 'fixed',
                zIndex: 140,
                borderRadius: tokens.radius.lg,
                border: `1px solid ${c.ink150}`,
                background: 'var(--card-bg)',
                padding: 8,
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                top: previewPosition.top,
                left: previewPosition.left,
                width: PREVIEW_WIDTH,
                maxWidth: 'min(430px, calc(100vw - 24px))',
              }}
            >
              <PDFThumbnail
                fileId={statement.id}
                fileName={statement.fileName}
                source={previewSource}
                width={PREVIEW_WIDTH - 16}
                thumbnailWidth={PREVIEW_IMAGE_WIDTH}
                height={PREVIEW_HEIGHT}
                preservePageAspect
                errorMessage="Unable to load document"
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );

  const renderMerchantCell = (): React.JSX.Element => (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, pointerEvents: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flexShrink: 0, opacity: 0.6 }}>
          {isGmailReceipt ? (
            <img
              src="/icons/gmail.png"
              alt="Gmail"
              width={16}
              height={16}
              style={{ borderRadius: tokens.radius.full, objectFit: 'contain' }}
            />
          ) : isLocalReceipt ? (
            <Receipt
              data-testid="receipt-statement-type-icon"
              size={16}
              style={{ color: c.ink500 }}
            />
          ) : (
            <BankLogoAvatar bankName={statement.bankName} size={16} />
          )}
        </div>

        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: c.ink900, fontSize: 15 }}>
          {isProcessing ? 'Processing...' : merchantLabel}
        </span>

        {hasError ? (
          <AlertCircle size={16} style={{ color: c.danger, marginLeft: 4 }} />
        ) : isPossibleDuplicate ? (
          <MuiTooltip title={duplicateTooltipText} placement="top" enterDelay={150}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                borderRadius: tokens.radius.xs,
                fontSize: 10,
                letterSpacing: '0.05em',
                marginLeft: 4,
                backgroundColor: duplicateStyle.badgeBg,
                color: duplicateStyle.badgeColor,
                ...duplicateRoleBadgeStyle,
              }}
            >
              {resolvedDuplicateRole === 'primary' ? (
                <CheckCircle2 size={12} />
              ) : (
                <CircleHelp size={12} />
              )}
              {duplicateBadgeLabel}
            </div>
          </MuiTooltip>
        ) : isManualExpense ? (
          <CreditCard
            data-testid="manual-expense-type-icon"
            size={14}
            style={{ color: c.ink500, opacity: 0.5, marginLeft: 4 }}
          />
        ) : (
          <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.ink400, background: c.ink50, borderRadius: tokens.radius.xs, padding: '2px 6px', marginLeft: 4, opacity: 0.7 }}>
            {resolvedTypeLabel === 'PDF' ? 'PDF' : resolvedTypeLabel}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, color: c.ink400, marginTop: 2, marginLeft: 24 }}>{dateLabel}</div>
    </div>
  );

  const renderAmountCell = (): React.JSX.Element => (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 19,
          lineHeight: 1,
          fontWeight: 900,
          letterSpacing: '-0.025em',
          fontVariantNumeric: 'tabular-nums',
          color: isNegativeAmount || hasError || isMissingAmount ? c.danger : c.ink900,
        }}
      >
        {showAmountLoader ? <Spinner style={{ width: 16, height: 16, color: c.ink400 }} /> : amountLabel}
      </span>
      <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <StatusBadge
          status={statement.status}
          isProcessing={isProcessing}
          errorMessage={statement.errorMessage}
        />
      </div>
    </div>
  );

  const renderActionCell = (): React.JSX.Element => (
    <button
      data-testid="statement-view-icon"
      type="button"
      onClick={event => {
        event.stopPropagation();
        handleView();
      }}
      className="lumio-stmt-list-item__view-btn"
      style={
        isPossibleDuplicate
          ? {
              borderColor: duplicateStyle.buttonBorder,
              backgroundColor: duplicateStyle.buttonBg,
              color: duplicateStyle.buttonColor,
              ...duplicateRoleButtonStyle,
            }
          : {}
      }
      aria-label={actionLabel}
      disabled={viewDisabled}
    >
      {actionLabel}
    </button>
  );

  const renderColumnCell = (columnId: StatementColumnId): React.JSX.Element => {
    if (columnId === 'receipt') return renderReceiptCell();
    if (columnId === 'merchant') return renderMerchantCell();
    if (columnId === 'date') return renderPlainCell(columnId, dateLabel);
    if (columnId === 'from') return renderPlainCell(columnId, firstNonEmpty(statement.user?.name, statement.user?.email, statement.sender));
    if (columnId === 'to') return renderPlainCell(columnId, sourceLabel);
    if (columnId === 'category') return renderPlainCell(columnId, categoryLabel);
    if (columnId === 'tag') return renderPlainCell(columnId, tagsLabel);
    if (columnId === 'amount') return renderAmountCell();
    if (columnId === 'action') return renderActionCell();
    if (columnId === 'approved') return renderPlainCell(columnId, approvedLabel);
    if (columnId === 'billable') return renderPlainCell(columnId, billableLabel);
    if (columnId === 'card') return renderPlainCell(columnId, firstNonEmpty(statement.transactionSummary?.cardLabel));
    if (columnId === 'description') return renderPlainCell(columnId, descriptionLabel);
    if (columnId === 'exchangeRate') return renderPlainCell(columnId, exchangeRateLabel);
    if (columnId === 'exported') return renderPlainCell(columnId, exportedLabel);
    if (columnId === 'exportedTo') return renderPlainCell(columnId, exportedToLabel);
    return renderPlainCell(columnId, null);
  };

  // Row styles based on duplicate/error/selected state
  const rowStyle: React.CSSProperties = isPossibleDuplicate
    ? duplicateCardStyle
    : hasError
      ? { borderColor: '#fecaca', backgroundColor: 'rgba(255,241,242,0.4)' }
      : selected
        ? {}
        : {};

  return (
    <div
      data-tour-id={dataTourId}
      className={`lumio-stmt-list-item${selected ? ' lumio-stmt-list-item--selected' : ''}${hasError && !isPossibleDuplicate ? ' lumio-stmt-list-item--error' : ''}`}
      style={{ ...rowStyle, cursor: viewDisabled ? 'default' : 'pointer' }}
      onClick={handleView}
    >
      {isPossibleDuplicate ? (
        <span
          aria-hidden
          className="lumio-stmt-list-item__accent"
          style={{
            width: 4,
            backgroundColor: duplicateStyle.lineColor,
            boxShadow: `0 0 12px ${duplicateStyle.lineColor}`,
          }}
        />
      ) : null}

      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          handleView();
        }}
        className="lumio-stmt-list-item__desktop-overlay"
        aria-label={viewLabel}
        aria-disabled={viewDisabled}
      />

      {/* Desktop Layout */}
      <div
        data-testid={`statement-item-desktop-${statement.id}`}
        className="lumio-stmt-list-item__desktop"
        style={{ pointerEvents: 'none' }}
      >
        <div style={{ width: 16, display: 'flex', justifyContent: 'center', opacity: 0.7, transition: 'opacity 0.15s', flexShrink: 0, marginRight: 16 }}>
          {selectionDisabled ? (
            <span style={{ display: 'inline-flex', height: 16, width: 16 }} />
          ) : (
            <Checkbox
              checked={selected}
              onCheckedChange={onToggleSelect}
              onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
              style={{ pointerEvents: 'auto', height: 16, width: 16 }}
            />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1, minWidth: 0, pointerEvents: 'auto' }}>
          {renderedColumns.map(column => (
            <div
              key={column.id}
              data-testid={`statement-column-${statement.id}-${column.id}`}
              style={columnCellStyle(column.id)}
            >
              {renderColumnCell(column.id)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
