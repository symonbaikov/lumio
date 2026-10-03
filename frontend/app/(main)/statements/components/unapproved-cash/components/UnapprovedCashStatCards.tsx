import { tokens } from '@/lib/theme-tokens';
import type { UnapprovedReasonId } from '../../unapproved-cash-utils';

interface UnapprovedCashStatCardsProps {
  totalCount: number;
  reasonCounts: Record<UnapprovedReasonId, number>;
  labels: {
    total: string;
    missingCategory: string;
    duplicates: string;
    confirmation: string;
  };
}

/** No fill, just a hairline: the tiles frame numbers, they are not cards to read. */
const CARD_STYLE: React.CSSProperties = {
  border: '1px solid var(--border-color)',
  background: 'transparent',
  padding: 12,
  borderRadius: tokens.radius.lg,
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--muted-foreground)',
};

/** A zero is "nothing to do": muted, so only real counts draw the eye. */
const valueStyle = (value: number): React.CSSProperties => ({
  marginTop: 4,
  fontSize: 20,
  fontWeight: 600,
  color: value === 0 ? 'var(--muted-foreground)' : 'var(--foreground)',
});

export function UnapprovedCashStatCards({
  totalCount,
  reasonCounts,
  labels,
}: UnapprovedCashStatCardsProps): React.ReactElement {
  return (
    <div className="lumio-stat-tiles">
      <div style={CARD_STYLE}>
        <p style={LABEL_STYLE}>{labels.total}</p>
        <p style={valueStyle(totalCount)}>{totalCount}</p>
      </div>
      <div style={CARD_STYLE}>
        <p style={LABEL_STYLE}>{labels.missingCategory}</p>
        <p style={valueStyle(reasonCounts['missing-category'])}>
          {reasonCounts['missing-category']}
        </p>
      </div>
      <div style={CARD_STYLE}>
        <p style={LABEL_STYLE}>{labels.duplicates}</p>
        <p style={valueStyle(reasonCounts['duplicate-detected'])}>
          {reasonCounts['duplicate-detected']}
        </p>
      </div>
      <div style={CARD_STYLE}>
        <p style={LABEL_STYLE}>{labels.confirmation}</p>
        <p style={valueStyle(reasonCounts['requires-confirmation'])}>
          {reasonCounts['requires-confirmation']}
        </p>
      </div>
    </div>
  );
}
