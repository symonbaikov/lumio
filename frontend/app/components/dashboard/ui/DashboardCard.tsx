import { ArrowRight } from '@/app/components/icons';
import clsx from 'clsx';
import Link from 'next/link';
import type React from 'react';

export interface DashboardCardProps {
  /** Uppercase eyebrow title. */
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-hand slot: a CardLink, ChipGroup, legend or status pill. */
  action?: React.ReactNode;
  /** `shell` keeps the card a flex column whose body scrolls instead of growing. */
  variant?: 'padded' | 'shell';
  as?: 'section' | 'div';
  className?: string;
  children: React.ReactNode;
}

export function DashboardCard({
  title,
  subtitle,
  action,
  variant = 'padded',
  as: Tag = 'section',
  className,
  children,
}: DashboardCardProps): React.JSX.Element {
  return (
    <Tag
      className={clsx(
        'lumio-dashboard__card',
        variant === 'shell' && 'lumio-dashboard__card--shell',
        className,
      )}
    >
      <div className="lumio-dashboard__card-head">
        <div className="lumio-dashboard__card-heading">
          <div className="lumio-dashboard__card-title">{title}</div>
          {subtitle && <div className="lumio-dashboard__card-sub">{subtitle}</div>}
        </div>
        {action && <div className="lumio-dashboard__card-head-actions">{action}</div>}
      </div>
      <div className="lumio-dashboard__card-body">{children}</div>
    </Tag>
  );
}

export interface CardLinkProps {
  href: string;
  children: React.ReactNode;
}

export function CardLink({ href, children }: CardLinkProps): React.JSX.Element {
  return (
    <Link href={href} className="lumio-dashboard__card-link-btn">
      {children} <ArrowRight size={13} />
    </Link>
  );
}
