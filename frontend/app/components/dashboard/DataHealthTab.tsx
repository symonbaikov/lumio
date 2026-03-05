'use client';

import { cn } from '@/app/lib/utils';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { AlertTriangle, CheckCircle2, Clock, FileWarning, Link2 } from 'lucide-react';
import Link from 'next/link';
import { cardShell } from '@/app/components/dashboard/common';

interface DataHealthTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
}

function getRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}

type SeverityKey = 'green' | 'amber' | 'red' | 'blue';

const severityClasses: Record<SeverityKey, { card: string; icon: string; badge: string }> = {
  green: {
    card: 'bg-emerald-50 border-emerald-100',
    icon: 'text-emerald-600',
    badge: 'text-emerald-700',
  },
  amber: {
    card: 'bg-amber-50 border-amber-100',
    icon: 'text-amber-600',
    badge: 'text-amber-800',
  },
  red: {
    card: 'bg-rose-50 border-rose-100',
    icon: 'text-rose-600',
    badge: 'text-rose-700',
  },
  blue: {
    card: 'bg-blue-50 border-blue-100',
    icon: 'text-blue-600',
    badge: 'text-blue-700',
  },
};

export function DataHealthTab({ data, formatAmount, isLoading }: DataHealthTabProps) {
  const { dataHealth } = data;

  const metricCards = [
    {
      key: 'uncategorizedTransactions',
      label: 'Uncategorized',
      value: dataHealth.uncategorizedTransactions,
      icon: AlertTriangle,
      severity: (dataHealth.uncategorizedTransactions > 0 ? 'amber' : 'green') as SeverityKey,
    },
    {
      key: 'statementsWithErrors',
      label: 'Statement Errors',
      value: dataHealth.statementsWithErrors,
      icon: FileWarning,
      severity: (dataHealth.statementsWithErrors > 0 ? 'red' : 'green') as SeverityKey,
    },
    {
      key: 'statementsPendingReview',
      label: 'Pending Review',
      value: dataHealth.statementsPendingReview,
      icon: Clock,
      severity: (dataHealth.statementsPendingReview > 0 ? 'blue' : 'green') as SeverityKey,
    },
    {
      key: 'parsingWarnings',
      label: 'Parsing Warnings',
      value: dataHealth.parsingWarnings,
      icon: AlertTriangle,
      severity: (dataHealth.parsingWarnings > 0 ? 'amber' : 'green') as SeverityKey,
    },
  ];

  const quickLinks: Array<{ label: string; href: string }> = [];
  if (dataHealth.uncategorizedTransactions > 0) {
    quickLinks.push({
      label: `Review ${dataHealth.uncategorizedTransactions} uncategorized transaction${dataHealth.uncategorizedTransactions !== 1 ? 's' : ''}`,
      href: '/statements?missingCategory=true',
    });
  }
  if (dataHealth.statementsWithErrors > 0) {
    quickLinks.push({
      label: `Fix ${dataHealth.statementsWithErrors} statement error${dataHealth.statementsWithErrors !== 1 ? 's' : ''}`,
      href: '/statements?status=error',
    });
  }
  if (dataHealth.statementsPendingReview > 0) {
    quickLinks.push({
      label: `Review ${dataHealth.statementsPendingReview} pending statement${dataHealth.statementsPendingReview !== 1 ? 's' : ''}`,
      href: '/statements/approve',
    });
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Summary metric strip */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
          Data Quality Metrics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metricCards.map(({ key, label, value, icon: Icon, severity }) => {
            const classes = severityClasses[severity];
            return (
              <div
                key={key}
                className={cn(
                  cardShell,
                  classes.card,
                  'flex flex-col gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 leading-tight">
                    {label}
                  </span>
                  <Icon className={cn('h-4 w-4 shrink-0', classes.icon)} strokeWidth={2} />
                </div>
                <div className={cn('text-2xl font-bold font-ibm-plex-sans tracking-tight', classes.badge)}>
                  {isLoading ? '—' : value}
                </div>
                <div className="flex items-center gap-1">
                  {value === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
                  ) : null}
                  <span className={cn('text-xs font-medium', classes.badge)}>
                    {value === 0 ? 'All good' : `${value} need${value === 1 ? 's' : ''} attention`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Last upload + Unapproved cash row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Last upload card */}
        <div className={cn(cardShell, 'p-5 flex flex-col gap-3')}>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" strokeWidth={2} />
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
              Last Upload
            </span>
          </div>
          {dataHealth.lastUploadDate ? (
            <div>
              <p className="text-xl font-bold text-slate-900 font-ibm-plex-sans">
                {getRelativeTime(dataHealth.lastUploadDate)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date(dataHealth.lastUploadDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-slate-500">No statements uploaded yet</p>
              <Link
                href="/statements/submit"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a66c2] hover:text-[#004182] transition-colors"
              >
                <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                Upload your first statement
              </Link>
            </div>
          )}
        </div>

        {/* Unapproved cash card */}
        <div
          className={cn(
            cardShell,
            dataHealth.unapprovedCash > 0
              ? 'bg-amber-50 border-amber-100'
              : 'bg-emerald-50 border-emerald-100',
            'p-5 flex flex-col gap-3',
          )}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                'h-4 w-4',
                dataHealth.unapprovedCash > 0 ? 'text-amber-500' : 'text-emerald-500',
              )}
              strokeWidth={2}
            />
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
              Unapproved Cash
            </span>
          </div>
          {dataHealth.unapprovedCash > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xl font-bold text-amber-800 font-ibm-plex-sans">
                {isLoading ? '—' : formatAmount(dataHealth.unapprovedCash)}
              </p>
              <Link
                href="/statements/approve"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                Review &amp; approve cash
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2} />
              <p className="text-sm font-semibold text-emerald-700">All cash approved</p>
            </div>
          )}
        </div>
      </section>

      {/* 3. Quick links (only if there are issues) */}
      {quickLinks.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
            Quick Actions
          </h2>
          <div className={cn(cardShell, 'p-4 flex flex-col divide-y divide-slate-100')}>
            {quickLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 py-3 text-sm font-medium text-[#0a66c2] hover:text-[#004182] transition-colors first:pt-0 last:pb-0"
              >
                <Link2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                {label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
