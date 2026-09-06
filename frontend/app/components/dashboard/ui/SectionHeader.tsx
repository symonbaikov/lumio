import type React from 'react';

export interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

/** Eyebrow heading placed above a group of cards. */
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps): React.JSX.Element {
  return (
    <div className="lumio-dashboard__section-head">
      <div>
        <h2 className="lumio-dashboard__section-title">{title}</h2>
        {subtitle && <p className="lumio-dashboard__section-sub">{subtitle}</p>}
      </div>
      {action && <div className="lumio-dashboard__section-actions">{action}</div>}
    </div>
  );
}
