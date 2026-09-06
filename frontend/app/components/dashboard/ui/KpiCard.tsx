import clsx from 'clsx';
import Link from 'next/link';
import type React from 'react';
import { Sparkline } from './Sparkline';

export type KpiTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'info';

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  tone?: KpiTone;
  caption?: React.ReactNode;
  /** Sparkline points; the line takes the card's tone colour. */
  spark?: { points: number[] };
  /** Renders the whole card as a link. */
  href?: string;
}

export function KpiCard({
  label,
  value,
  tone = 'neutral',
  caption,
  spark,
  href,
}: KpiCardProps): React.JSX.Element {
  const body = (
    <>
      <div className="lumio-dashboard__stat-label">{label}</div>
      <div
        className={clsx(
          'lumio-dashboard__stat-value',
          tone !== 'neutral' && `lumio-dashboard__stat-value--${tone}`,
        )}
      >
        {value}
      </div>
      {caption && (
        <div className="lumio-dashboard__stat-row">
          <span className="lumio-dashboard__stat-sub">{caption}</span>
        </div>
      )}
      {spark && spark.points.length >= 2 && (
        <div
          className={clsx(
            'lumio-dashboard__stat-spark',
            tone !== 'neutral' && `lumio-dashboard__stat-spark--${tone}`,
          )}
          aria-hidden="true"
        >
          <Sparkline points={spark.points} />
        </div>
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="lumio-dashboard__stat lumio-dashboard__stat--link">
        {body}
      </Link>
    );
  }
  return <div className="lumio-dashboard__stat">{body}</div>;
}
