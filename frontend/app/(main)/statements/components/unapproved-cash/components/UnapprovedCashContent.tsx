import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Spinner } from '@/app/components/ui/spinner';
import { tokens } from '@/lib/theme-tokens';
/* eslint-disable max-lines */
import React from 'react';
import type {
  UnapprovedReasonId,
  UnapprovedSource,
  UnapprovedStatementQueueItem,
} from '../../unapproved-cash-utils';

type BadgeStyle = { borderColor: string; background: string; color: string };

const REASON_BADGE_STYLE: Record<UnapprovedReasonId, BadgeStyle> = {
  'missing-category': {
    borderColor: 'var(--color-warning-soft-border)',
    background: 'var(--color-warning-soft-bg)',
    color: 'var(--color-warning-soft-text)',
  },
  'duplicate-detected': {
    borderColor: 'var(--color-error-soft-border)',
    background: 'var(--color-error-soft-bg)',
    color: 'var(--destructive)',
  },
  'unknown-merchant': {
    borderColor: 'var(--border-color)',
    background: 'var(--muted)',
    color: 'var(--text-secondary)',
  },
  'missing-type': {
    borderColor: 'var(--color-info-soft-border)',
    background: 'var(--color-info-soft-bg)',
    color: 'var(--color-info-soft-text)',
  },
  'missing-currency': {
    borderColor: 'var(--color-info-soft-border)',
    background: 'var(--color-info-soft-bg)',
    color: 'var(--color-info-soft-text)',
  },
  'ocr-issues': {
    borderColor: 'var(--color-error-soft-border)',
    background: 'var(--color-error-soft-bg)',
    color: '#be123c',
  },
  'requires-confirmation': {
    borderColor: 'var(--border-color)',
    background: 'var(--muted)',
    color: 'var(--foreground)',
  },
};

const SOURCE_BADGE_STYLE: Record<UnapprovedSource, BadgeStyle> = {
  gmail: {
    borderColor: 'var(--color-warning-soft-border)',
    background: 'var(--color-warning-soft-bg)',
    color: 'var(--color-warning-soft-text)',
  },
  pdf: {
    borderColor: 'var(--color-info-soft-border)',
    background: 'var(--color-info-soft-bg)',
    color: 'var(--color-info-soft-text)',
  },
  bank: {
    borderColor: 'var(--color-success-soft-border)',
    background: 'var(--color-success-soft-bg)',
    color: 'var(--color-success-soft-text)',
  },
  manual: {
    borderColor: 'var(--color-success-soft-border)',
    background: 'var(--color-success-soft-bg)',
    color: '#036704',
  },
  unknown: {
    borderColor: 'var(--border-color)',
    background: 'var(--muted)',
    color: 'var(--foreground)',
  },
};

interface UnapprovedCashContentProps {
  loading: boolean;
  filteredQueue: UnapprovedStatementQueueItem[];
  selectedIds: string[];
  allVisibleSelected: boolean;
  reasonLabelById: Record<UnapprovedReasonId, string>;
  sourceLabelById: Record<UnapprovedSource, string>;
  labels: {
    empty: { title: string; description: string };
    table: Record<string, string>;
    actions: { reviewFix: string };
  };
  onToggleSelectAllVisible: () => void;
  onToggleSelect: (id: string) => void;
  onReview: (item: UnapprovedStatementQueueItem) => void;
  formatAmount: (item: UnapprovedStatementQueueItem) => string;
  formatDate: (item: UnapprovedStatementQueueItem) => string;
}

// eslint-disable-next-line max-lines-per-function
export function UnapprovedCashContent({
  loading,
  filteredQueue,
  selectedIds,
  allVisibleSelected,
  reasonLabelById,
  sourceLabelById,
  labels,
  onToggleSelectAllVisible,
  onToggleSelect,
  onReview,
  formatAmount,
  formatDate,
}: UnapprovedCashContentProps): React.ReactElement {
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100%',
          minHeight: 280,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner size={80} />
      </div>
    );
  }

  if (filteredQueue.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100%',
          minHeight: 280,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        <EmptyStateIllustration name="unapproved-cash" size="md" />
        <h2 style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
          {labels.empty.title}
        </h2>
        <p style={{ marginTop: 4, fontSize: 14, color: 'var(--muted-foreground)' }}>
          {labels.empty.description}
        </p>
      </div>
    );
  }

  return (
    <>
      <DesktopTable
        filteredQueue={filteredQueue}
        selectedIds={selectedIds}
        allVisibleSelected={allVisibleSelected}
        reasonLabelById={reasonLabelById}
        sourceLabelById={sourceLabelById}
        tableLabels={labels.table}
        reviewFixLabel={labels.actions.reviewFix}
        onToggleSelectAllVisible={onToggleSelectAllVisible}
        onToggleSelect={onToggleSelect}
        onReview={onReview}
        formatAmount={formatAmount}
        formatDate={formatDate}
      />
      <MobileCards
        filteredQueue={filteredQueue}
        selectedIds={selectedIds}
        reasonLabelById={reasonLabelById}
        sourceLabelById={sourceLabelById}
        reviewFixLabel={labels.actions.reviewFix}
        onToggleSelect={onToggleSelect}
        onReview={onReview}
        formatAmount={formatAmount}
        formatDate={formatDate}
      />
    </>
  );
}

interface DesktopTableProps {
  filteredQueue: UnapprovedStatementQueueItem[];
  selectedIds: string[];
  allVisibleSelected: boolean;
  reasonLabelById: Record<UnapprovedReasonId, string>;
  sourceLabelById: Record<UnapprovedSource, string>;
  tableLabels: Record<string, string>;
  reviewFixLabel: string;
  onToggleSelectAllVisible: () => void;
  onToggleSelect: (id: string) => void;
  onReview: (item: UnapprovedStatementQueueItem) => void;
  formatAmount: (item: UnapprovedStatementQueueItem) => string;
  formatDate: (item: UnapprovedStatementQueueItem) => string;
}

const TH_STYLE: React.CSSProperties = {
  padding: '12px 8px',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--muted-foreground)',
  fontWeight: 600,
};

// eslint-disable-next-line max-lines-per-function
function DesktopTable({
  filteredQueue,
  selectedIds,
  allVisibleSelected,
  reasonLabelById,
  sourceLabelById,
  tableLabels,
  reviewFixLabel,
  onToggleSelectAllVisible,
  onToggleSelect,
  onReview,
  formatAmount,
  formatDate,
}: DesktopTableProps): React.ReactElement {
  return (
    <div className="lumio-unapproved__desktop-table">
      <table style={{ minWidth: '100%', tableLayout: 'fixed', fontSize: 14 }}>
        <thead
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'var(--card-bg)',
            textAlign: 'left',
          }}
        >
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <th style={{ width: 48, padding: '12px 16px', ...TH_STYLE }}>
              <Checkbox checked={allVisibleSelected} onCheckedChange={onToggleSelectAllVisible} />
            </th>
            <th style={TH_STYLE}>{tableLabels.merchant}</th>
            <th style={{ width: 128, ...TH_STYLE }}>{tableLabels.date}</th>
            <th style={{ width: 176, ...TH_STYLE }}>{tableLabels.amount}</th>
            <th style={{ width: 288, ...TH_STYLE }}>{tableLabels.reason}</th>
            <th style={{ width: 96, ...TH_STYLE }}>{tableLabels.source}</th>
            <th style={{ width: 192, ...TH_STYLE }}>{tableLabels.actions}</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line max-lines-per-function, complexity */}
          {filteredQueue.map(item => {
            const statementId = item.id;
            const selected = selectedIds.includes(statementId);
            const reasonPreview = item.reasons.slice(0, 2);
            const hiddenReasonCount = Math.max(0, item.reasons.length - reasonPreview.length);

            return (
              <tr key={statementId} style={{ borderBottom: '1px solid var(--muted)' }}>
                <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => onToggleSelect(statementId)}
                  />
                </td>
                <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                  <p style={{ fontWeight: 500, color: 'var(--foreground)' }}>
                    {item.statement.fileName?.trim() || item.statement.bankName?.trim() || '—'}
                  </p>
                  <p style={{ marginTop: 4, fontSize: 12, color: 'var(--muted-foreground)' }}>
                    {item.statement.bankName?.trim() || `#${statementId.slice(0, 8)}`}
                  </p>
                </td>
                <td
                  style={{ padding: '12px 8px', verticalAlign: 'top', color: 'var(--foreground)' }}
                >
                  {formatDate(item)}
                </td>
                <td
                  style={{
                    padding: '12px 8px',
                    verticalAlign: 'top',
                    fontWeight: 500,
                    color: 'var(--foreground)',
                  }}
                >
                  {formatAmount(item)}
                </td>
                <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {reasonPreview.map(reason => (
                      <ReasonBadge key={reason} reason={reason} label={reasonLabelById[reason]} />
                    ))}
                    {hiddenReasonCount > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          border: '1px solid var(--border-color)',
                          background: 'var(--muted)',
                          color: 'var(--text-secondary)',
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 500,
                          borderRadius: tokens.radius.xs,
                        }}
                      >
                        +{hiddenReasonCount}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                  <SourceBadge source={item.source} label={sourceLabelById[item.source]} />
                </td>
                <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => onReview(item)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        borderRadius: tokens.radius.md,
                      }}
                    >
                      {reviewFixLabel}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface MobileCardsProps {
  filteredQueue: UnapprovedStatementQueueItem[];
  selectedIds: string[];
  reasonLabelById: Record<UnapprovedReasonId, string>;
  sourceLabelById: Record<UnapprovedSource, string>;
  reviewFixLabel: string;
  onToggleSelect: (id: string) => void;
  onReview: (item: UnapprovedStatementQueueItem) => void;
  formatAmount: (item: UnapprovedStatementQueueItem) => string;
  formatDate: (item: UnapprovedStatementQueueItem) => string;
}

// eslint-disable-next-line max-lines-per-function
function MobileCards({
  filteredQueue,
  selectedIds,
  reasonLabelById,
  sourceLabelById,
  reviewFixLabel,
  onToggleSelect,
  onReview,
  formatAmount,
  formatDate,
}: MobileCardsProps): React.ReactElement {
  return (
    <div
      className="lumio-unapproved__mobile-cards"
      style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}
    >
      {/* eslint-disable-next-line max-lines-per-function, complexity */}
      {filteredQueue.map(item => {
        const statementId = item.id;
        const selected = selectedIds.includes(statementId);

        return (
          <article
            key={statementId}
            style={{
              border: '1px solid var(--border-color)',
              padding: 12,
              borderRadius: tokens.radius.lg,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(statementId)} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
                    {item.statement.fileName?.trim() || item.statement.bankName?.trim() || '—'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                    {item.statement.bankName?.trim() || formatDate(item)}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
                {formatAmount(item)}
              </p>
            </div>

            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {item.reasons.map(reason => (
                <ReasonBadge key={reason} reason={reason} label={reasonLabelById[reason]} />
              ))}
            </div>

            <div
              style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <SourceBadge source={item.source} label={sourceLabelById[item.source]} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onReview(item)}
                  style={{
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                    borderRadius: tokens.radius.md,
                  }}
                >
                  {reviewFixLabel}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ReasonBadge({
  reason,
  label,
}: {
  reason: UnapprovedReasonId;
  label: string;
}): React.ReactElement {
  const style = REASON_BADGE_STYLE[reason];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${style.borderColor}`,
        background: style.background,
        color: style.color,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 500,
        borderRadius: tokens.radius.xs,
      }}
    >
      {label}
    </span>
  );
}

function SourceBadge({
  source,
  label,
}: {
  source: UnapprovedSource;
  label: string;
}): React.ReactElement {
  const style = SOURCE_BADGE_STYLE[source];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${style.borderColor}`,
        background: style.background,
        color: style.color,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 500,
        borderRadius: tokens.radius.xs,
      }}
    >
      {label}
    </span>
  );
}
