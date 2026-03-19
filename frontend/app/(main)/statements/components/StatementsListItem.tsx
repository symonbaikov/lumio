'use client';

import { BankLogoAvatar } from '@/app/components/BankLogoAvatar';
import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
import { PDFThumbnail } from '@/app/components/PDFThumbnail';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Tooltip } from '@heroui/tooltip';
import PaymentsIcon from '@mui/icons-material/Payments';
import { AlertCircle, CheckCircle2, ChevronRight, CircleHelp } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type StatementListItem = {
  id: string;
  source?: 'statement' | 'gmail';
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
  receivedAt?: string;
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
  };
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  errorMessage?: string | null;
};

type DuplicateRole = 'primary' | 'suspected';
type DuplicateGroupTone = 'sky' | 'blue' | 'indigo' | 'slate' | 'zinc' | 'stone';

const DUPLICATE_GROUP_STYLES: Record<
  DuplicateGroupTone,
  {
    row: string;
    line: string;
    badge: string;
    button: string;
  }
> = {
  blue: {
    row: 'border-blue-100 bg-blue-50/10',
    line: 'bg-blue-300/90',
    badge: 'bg-blue-100 text-blue-700',
    button:
      'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800',
  },
  sky: {
    row: 'border-sky-100 bg-sky-50/10',
    line: 'bg-sky-300/90',
    badge: 'bg-sky-100 text-sky-700',
    button:
      'border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800',
  },
  indigo: {
    row: 'border-indigo-100 bg-indigo-50/10',
    line: 'bg-indigo-300/90',
    badge: 'bg-indigo-100 text-indigo-700',
    button:
      'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-800',
  },
  slate: {
    row: 'border-slate-200 bg-slate-50/30',
    line: 'bg-slate-300/85',
    badge: 'bg-slate-100 text-slate-700',
    button:
      'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800',
  },
  zinc: {
    row: 'border-zinc-200 bg-zinc-50/30',
    line: 'bg-zinc-300/85',
    badge: 'bg-zinc-100 text-zinc-700',
    button:
      'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-800',
  },
  stone: {
    row: 'border-stone-200 bg-stone-50/30',
    line: 'bg-stone-300/85',
    badge: 'bg-stone-100 text-stone-700',
    button:
      'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-stone-100 hover:text-stone-800',
  },
};

type Props = {
  statement: StatementListItem;
  viewLabel: string;
  duplicateActionLabel?: string;
  isGmail: boolean;
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
};

function StatusBadge({
  status,
  isProcessing,
  errorMessage,
}: { status: string; isProcessing: boolean; errorMessage?: string | null }) {
  if (errorMessage || status === 'error') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-600/20 whitespace-nowrap">
        Error
      </span>
    );
  }
  if (isProcessing || status === 'processing' || status === 'uploaded') {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-semibold text-yellow-800 ring-1 ring-inset ring-yellow-600/30 whitespace-nowrap animate-pulse">
        Pending
      </span>
    );
  }
  if (status === 'completed' || status === 'parsed' || status === 'validated') {
    return (
      <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">Completed</span>
    );
  }
  return null;
}

export function StatementsListItem({
  statement,
  viewLabel,
  duplicateActionLabel,
  isGmail,
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
}: Props) {
  const PREVIEW_WIDTH = 430;
  const PREVIEW_HEIGHT = 620;
  const thumbnailButtonRef = useRef<HTMLButtonElement | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const resolvedTypeLabel = typeLabel || statement.fileType;
  const normalizedPreviewType = (isGmail ? 'pdf' : statement.fileType || statement.fileName || '')
    .trim()
    .toLowerCase();
  const hasHoverPreview =
    normalizedPreviewType === 'pdf' ||
    normalizedPreviewType.includes('pdf') ||
    normalizedPreviewType.endsWith('/pdf') ||
    normalizedPreviewType === 'application/pdf';

  const updatePreviewPosition = useCallback(() => {
    const trigger = thumbnailButtonRef.current;
    if (!trigger || typeof window === 'undefined') return;

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
  }, []);

  useEffect(() => {
    if (!previewVisible) return;

    updatePreviewPosition();

    const handleReposition = () => {
      updatePreviewPosition();
    };

    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [previewVisible, updatePreviewPosition]);

  const hasError = !!statement.errorMessage || statement.status === 'error';
  const isNegativeAmount = amountLabel.startsWith('-') && amountLabel !== '-';
  const isMissingAmount = amountLabel === '-';
  const resolvedDuplicateRole: DuplicateRole = duplicateRole || 'suspected';
  const resolvedDuplicateGroupLabel = duplicateGroupLabel || 'Group';
  const resolvedDuplicateGroupTone: DuplicateGroupTone = duplicateGroupTone || 'stone';
  const duplicateStyle = DUPLICATE_GROUP_STYLES[resolvedDuplicateGroupTone];
  const duplicateGroupShort = resolvedDuplicateGroupLabel.replace(/^Group\s+/, '');
  const duplicateRoleLabel = resolvedDuplicateRole === 'primary' ? 'PRIMARY' : 'SUSPECTED';
  const duplicateBadgeLabel = isPossibleDuplicate
    ? `${resolvedDuplicateGroupLabel} · ${duplicateRoleLabel} #${duplicatePosition || 1}${duplicateGroupSize ? `/${duplicateGroupSize}` : ''}`
    : null;
  const duplicateTooltipText = duplicateReason || 'Same merchant · same date · same amount';
  const actionLabel = isPossibleDuplicate ? duplicateActionLabel || 'Review' : viewLabel;
  const duplicateRoleBadgeClass =
    resolvedDuplicateRole === 'primary'
      ? 'font-bold ring-1 ring-inset ring-current/30 shadow-sm'
      : 'font-medium border border-dashed border-current/25 bg-white/70 text-current/80';
  const duplicateRoleButtonClass =
    resolvedDuplicateRole === 'primary'
      ? 'font-semibold shadow-sm'
      : 'font-medium border-dashed opacity-90';
  const handleView = () => {
    if (viewDisabled) {
      return;
    }
    onView();
  };

  return (
    <div
      className={`group/statement relative overflow-hidden rounded-lg border bg-white p-3 transition hover:border-primary/30 md:py-2.5 md:px-4 md:hover:z-40 ${
        selected ? 'border-primary/60 bg-primary/5' : 'border-gray-200'
      } ${hasError ? 'border-red-200 bg-red-50/40' : ''} ${isPossibleDuplicate ? duplicateStyle.row : ''}`}
    >
      {isPossibleDuplicate ? (
        <span
          aria-hidden
          className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r ${duplicateStyle.line}`}
        />
      ) : null}

      {/* Mobile Layout */}
      <div data-testid={`statement-item-mobile-${statement.id}`} className="md:hidden">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            {selectionDisabled ? (
              <span className="inline-flex h-4 w-4" />
            ) : (
              <Checkbox
                checked={selected}
                onCheckedChange={onToggleSelect}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            )}
          </div>

          <button
            type="button"
            data-testid={`statement-item-mobile-card-${statement.id}`}
            onClick={handleView}
            className="w-full rounded-md text-left focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={actionLabel}
            aria-disabled={viewDisabled}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 shrink-0">
                <DocumentTypeIcon
                  fileType={isGmail ? 'pdf' : statement.fileType}
                  fileName={statement.fileName}
                  fileId={statement.id}
                  source={isGmail ? 'gmail' : 'statement'}
                  size={34}
                  className="text-red-500"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    {isProcessing ? 'Processing...' : merchantLabel}
                    {isPossibleDuplicate && (
                      <Tooltip content={duplicateTooltipText} placement="top" delay={150}>
                        <span
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${duplicateStyle.badge} ${duplicateRoleBadgeClass}`}
                        >
                          {resolvedDuplicateRole === 'primary' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <CircleHelp className="h-3 w-3" />
                          )}
                          {duplicateGroupShort}
                          {resolvedDuplicateRole === 'primary' ? 'P' : 'S'}
                          {duplicatePosition ? `#${duplicatePosition}` : ''}
                        </span>
                      </Tooltip>
                    )}
                  </p>
                  <p
                    className={`shrink-0 text-right text-[15px] font-black tabular-nums tracking-tight ${isNegativeAmount || hasError || isMissingAmount ? 'text-red-600' : 'text-gray-950'}`}
                  >
                    {amountLabel}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-500">{dateLabel}</p>
                  <StatusBadge
                    status={statement.status}
                    isProcessing={isProcessing}
                    errorMessage={statement.errorMessage}
                  />
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleView}
        className="absolute inset-0 hidden rounded-lg md:block z-0"
        aria-label={viewLabel}
        aria-disabled={viewDisabled}
      />

      {/* Desktop Layout - Rebuilt Hierarchy */}
      <div
        data-testid={`statement-item-desktop-${statement.id}`}
        className="pointer-events-none relative z-10 hidden min-w-0 w-full items-center gap-4 md:flex"
      >
        {/* Left Side: Secondary actions, Context (Merchant) */}
        <div className="flex items-center flex-1 min-w-0">
          {/* Secondary Controls: Checkbox and Thumbnail */}
          <div className="flex items-center gap-3 shrink-0 mr-4">
            <div className="w-4 flex justify-center opacity-70 group-hover/statement:opacity-100 transition-opacity">
              {selectionDisabled ? (
                <span className="inline-flex h-4 w-4" />
              ) : (
                <Checkbox
                  checked={selected}
                  onCheckedChange={onToggleSelect}
                  onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
                  className="pointer-events-auto h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              )}
            </div>

            <div className="group/thumbnail relative pointer-events-auto">
              <button
                type="button"
                ref={thumbnailButtonRef}
                data-testid={`statement-thumbnail-trigger-${statement.id}`}
                className="w-8 flex items-center justify-center transition hover:opacity-80"
                onClick={event => {
                  event.stopPropagation();
                  onIconClick();
                }}
                onMouseEnter={() => setPreviewVisible(true)}
                onMouseLeave={() => setPreviewVisible(false)}
                aria-label={statement.fileName}
              >
                <DocumentTypeIcon
                  fileType={isGmail ? 'pdf' : statement.fileType}
                  fileName={statement.fileName}
                  fileId={statement.id}
                  source={isGmail ? 'gmail' : 'statement'}
                  size={28}
                  className="text-gray-400 opacity-60 group-hover/statement:opacity-100 transition-opacity"
                />
              </button>

              {hasHoverPreview && previewVisible && previewPosition
                ? createPortal(
                    <div
                      data-testid="statement-hover-preview"
                      className="pointer-events-none fixed z-[140] rounded-xl border border-gray-200 bg-white p-2 shadow-2xl"
                      style={{
                        top: previewPosition.top,
                        left: previewPosition.left,
                        width: PREVIEW_WIDTH,
                        maxWidth: 'min(430px, calc(100vw - 24px))',
                      }}
                    >
                      <PDFThumbnail
                        fileId={statement.id}
                        fileName={statement.fileName}
                        source={isGmail ? 'gmail' : 'statement'}
                        width={PREVIEW_WIDTH - 16}
                        height={PREVIEW_HEIGHT}
                        preservePageAspect
                        errorMessage="Unable to load document"
                      />
                    </div>,
                    document.body,
                  )
                : null}
            </div>
          </div>

          {/* Main Context: Merchant Name & Date */}
          <div className="flex flex-col min-w-0 pointer-events-auto">
            <div className="flex items-center gap-2">
              {/* Weakened Merchant Icon */}
              <div className="shrink-0 opacity-60">
                {isGmail ? (
                  <img
                    src="/icons/gmail.png"
                    alt="Gmail"
                    width={16}
                    height={16}
                    className="rounded-full object-contain"
                  />
                ) : (
                  <BankLogoAvatar bankName={statement.bankName} size={16} />
                )}
              </div>

              {/* Main Merchant Name */}
              <span className="truncate font-semibold text-gray-900 text-[15px]">
                {isProcessing ? 'Processing...' : merchantLabel}
              </span>

              {/* Weakened Type / Error micro-signal */}
              {hasError ? (
                <AlertCircle className="h-4 w-4 text-red-500 ml-1" />
              ) : isPossibleDuplicate ? (
                <Tooltip content={duplicateTooltipText} placement="top" delay={150}>
                  <div
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide ml-1 ${duplicateStyle.badge} ${duplicateRoleBadgeClass}`}
                  >
                    {resolvedDuplicateRole === 'primary' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <CircleHelp className="h-3 w-3" />
                    )}
                    {duplicateBadgeLabel}
                  </div>
                </Tooltip>
              ) : isManualExpense ? (
                <PaymentsIcon
                  data-testid="manual-expense-type-icon"
                  className="text-gray-500 opacity-50 ml-1"
                  sx={{ fontSize: 14 }}
                />
              ) : (
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 ml-1 opacity-70">
                  {resolvedTypeLabel === 'PDF' ? 'PDF' : resolvedTypeLabel}
                </span>
              )}
            </div>
            {/* Weakened Date */}
            <div className="text-[11px] font-medium text-gray-400 mt-0.5 ml-6">{dateLabel}</div>
          </div>
        </div>

        {/* Right Side: Primary Info & Actions (Strictly right-aligned) */}
        <div className="flex items-center justify-end gap-6 shrink-0 w-[420px] pointer-events-auto pl-4">
          {/* Amount as the main visual anchor, strict right alignment */}
          <div className="w-36 flex flex-col items-end justify-center h-full">
            <span
              className={`block truncate text-[19px] leading-none font-black tracking-tight tabular-nums ${isNegativeAmount || hasError || isMissingAmount ? 'text-red-600' : 'text-gray-950'}`}
            >
              {amountLabel}
            </span>
            <div className="mt-0.5 flex items-center justify-end">
              <StatusBadge
                status={statement.status}
                isProcessing={isProcessing}
                errorMessage={statement.errorMessage}
              />
            </div>
          </div>

          <div className="w-36 flex items-center justify-end">
            <button
              data-testid="statement-view-icon"
              type="button"
              onClick={event => {
                event.stopPropagation();
                handleView();
              }}
              className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-semibold transition shadow-sm ${
                isPossibleDuplicate
                  ? `${duplicateStyle.button} ${duplicateRoleButtonClass}`
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900'
              }`}
              aria-label={actionLabel}
              disabled={viewDisabled}
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
