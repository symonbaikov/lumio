import clsx from 'clsx';
import Link from 'next/link';
import type React from 'react';

export interface ListRowProps {
  /** Icon badge or avatar. */
  leading?: React.ReactNode;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Renders the row as a link. */
  href?: string;
  className?: string;
}

/** A list row with a hairline above every sibling; used for categories, transactions, checklists. */
export function ListRow({
  leading,
  primary,
  secondary,
  trailing,
  href,
  className,
}: ListRowProps): React.JSX.Element {
  const content = (
    <>
      {leading && <div className="lumio-dashboard__row-leading">{leading}</div>}
      <div className="lumio-dashboard__row-body">
        <div className="lumio-dashboard__row-primary">{primary}</div>
        {secondary && <div className="lumio-dashboard__row-secondary">{secondary}</div>}
      </div>
      {trailing && <div className="lumio-dashboard__row-trailing">{trailing}</div>}
    </>
  );
  const rowClass = clsx('lumio-dashboard__row', href && 'lumio-dashboard__row--link', className);
  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {content}
      </Link>
    );
  }
  return <div className={rowClass}>{content}</div>;
}
