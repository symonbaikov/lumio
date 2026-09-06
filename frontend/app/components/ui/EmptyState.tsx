import type React from 'react';
import { EmptyStateIllustration, type EmptyStateIllustrationName } from './EmptyStateIllustration';

export interface EmptyStateProps {
  illustration: EmptyStateIllustrationName;
  /** Illustration width: sm 120px, md 180px, lg 240px. */
  size?: 'sm' | 'md' | 'lg';
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Usually a CTA button or link. */
  action?: React.ReactNode;
  /** Tighter vertical padding for empty states inside a card. */
  compact?: boolean;
}

/** Illustrated empty state: picture, optional title, one-line description, optional CTA. */
export function EmptyState({
  illustration,
  size = 'md',
  title,
  description,
  action,
  compact,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className={compact ? 'lumio-empty-state lumio-empty-state--compact' : 'lumio-empty-state'}>
      <EmptyStateIllustration name={illustration} size={size} />
      {title && <h2 className="lumio-empty-state__title">{title}</h2>}
      {description && <p className="lumio-empty-state__desc">{description}</p>}
      {action && <div className="lumio-empty-state__action">{action}</div>}
    </div>
  );
}
