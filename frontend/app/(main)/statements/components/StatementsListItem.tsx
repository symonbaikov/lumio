'use client';

import { BankLogoAvatar } from '@/app/components/BankLogoAvatar';
import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
import { PDFThumbnail } from '@/app/components/PDFThumbnail';
import PaymentsIcon from '@mui/icons-material/Payments';
import { ChevronRight } from 'lucide-react';
import React from 'react';

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

type Props = {
  statement: StatementListItem;
  viewLabel: string;
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
};

export function StatementsListItem({
  statement,
  viewLabel,
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
}: Props) {
  const resolvedTypeLabel = typeLabel || statement.fileType;
  const normalizedPreviewType = (isGmail ? 'pdf' : statement.fileType || statement.fileName || '')
    .trim()
    .toLowerCase();
  const hasHoverPreview =
    normalizedPreviewType === 'pdf' ||
    normalizedPreviewType.includes('pdf') ||
    normalizedPreviewType.endsWith('/pdf') ||
    normalizedPreviewType === 'application/pdf';

  return (
    <div
      className={`relative rounded-lg border bg-white p-3 transition hover:border-primary/30 md:p-4 ${
        selected ? 'border-primary/60 bg-primary/5' : 'border-gray-200'
      }`}
    >
      <div data-testid={`statement-item-mobile-${statement.id}`} className="md:hidden">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            {selectionDisabled ? (
              <span className="inline-flex h-4 w-4" />
            ) : (
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            )}
          </div>

          <button
            type="button"
            data-testid={`statement-item-mobile-card-${statement.id}`}
            onClick={onView}
            className="w-full rounded-md text-left focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={viewLabel}
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
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {isProcessing ? 'Processing...' : merchantLabel}
                  </p>
                  <p className="shrink-0 text-right text-sm font-bold text-gray-900 tabular-nums">
                    {amountLabel}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{dateLabel}</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onView}
        className="absolute inset-0 hidden rounded-lg md:block"
        aria-label={viewLabel}
      />
      <div
        data-testid={`statement-item-desktop-${statement.id}`}
        className="pointer-events-none relative z-10 hidden items-center gap-3 md:flex"
      >
        <div className="w-4">
          {selectionDisabled ? (
            <span className="inline-flex h-4 w-4" />
          ) : (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              onClick={event => event.stopPropagation()}
              className="pointer-events-auto h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          )}
        </div>
        <div className="group/thumbnail relative pointer-events-auto">
          <button
            type="button"
            className="w-11 flex items-center justify-center transition hover:opacity-80"
            onClick={event => {
              event.stopPropagation();
              onIconClick();
            }}
            aria-label={statement.fileName}
          >
            <DocumentTypeIcon
              fileType={isGmail ? 'pdf' : statement.fileType}
              fileName={statement.fileName}
              fileId={statement.id}
              source={isGmail ? 'gmail' : 'statement'}
              size={36}
              className="text-red-500"
            />
          </button>

          {hasHoverPreview ? (
            <div className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 hidden w-56 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-2 shadow-xl transition group-hover/thumbnail:block">
              <PDFThumbnail
                fileId={statement.id}
                fileName={statement.fileName}
                source={isGmail ? 'gmail' : 'statement'}
                size={208}
              />
            </div>
          ) : null}
        </div>
        <div className="w-3" />
        <div className="w-20 flex items-center gap-2 text-sm font-medium text-gray-500">
          {isManualExpense ? (
            <PaymentsIcon
              data-testid="manual-expense-type-icon"
              className="text-primary"
              fontSize="small"
            />
          ) : (
            <span className="uppercase">{resolvedTypeLabel}</span>
          )}
        </div>
        <div className="w-24 text-sm font-medium text-gray-500 tabular-nums">{dateLabel}</div>
        <div className="flex-1 flex items-center gap-2 text-sm text-gray-900">
          {isGmail ? (
            <>
              <img
                src="/icons/gmail.png"
                alt="Gmail"
                width={20}
                height={20}
                className="rounded-full object-contain"
              />
              <span className="font-medium text-gray-900">
                {isProcessing ? 'Processing...' : merchantLabel}
              </span>
            </>
          ) : (
            <>
              <BankLogoAvatar bankName={statement.bankName} size={20} />
              <span className="font-semibold text-gray-900">{merchantLabel}</span>
            </>
          )}
        </div>
        <div className="w-36 text-right text-sm font-bold text-gray-900 tabular-nums break-keep shrink-0">
          {amountLabel}
        </div>
        <div className="w-36 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onView();
            }}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:border-primary hover:text-primary"
          >
            {viewLabel}
          </button>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onView();
            }}
            className="pointer-events-auto inline-flex items-center justify-center rounded-md border border-gray-200 p-1.5 text-gray-400 transition hover:border-primary hover:text-primary"
            aria-label={viewLabel}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
