'use client';

import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { cn } from '@/app/lib/utils';
import Link from 'next/link';

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

const severityText: Record<SeverityKey, string> = {
  green: 'text-[#4A7C59]',
  amber: 'text-[#C05A3C]', // Adapted amber to a warm rusty tone
  red: 'text-[var(--primary)]',
  blue: 'text-[#3B82F6]',
};

export function DataHealthTab({ data, formatAmount, isLoading }: DataHealthTabProps) {
  const { dataHealth } = data;

  const metricCards = [
    {
      key: 'uncategorizedTransactions',
      label: 'UNCATEGORIZED',
      value: dataHealth.uncategorizedTransactions,
      severity: (dataHealth.uncategorizedTransactions > 0 ? 'amber' : 'green') as SeverityKey,
    },
    {
      key: 'statementsWithErrors',
      label: 'STATEMENT ERRORS',
      value: dataHealth.statementsWithErrors,
      severity: (dataHealth.statementsWithErrors > 0 ? 'red' : 'green') as SeverityKey,
    },
    {
      key: 'statementsPendingReview',
      label: 'PENDING REVIEW',
      value: dataHealth.statementsPendingReview,
      severity: (dataHealth.statementsPendingReview > 0 ? 'blue' : 'green') as SeverityKey,
    },
    {
      key: 'parsingWarnings',
      label: 'PARSING WARNINGS',
      value: dataHealth.parsingWarnings,
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
    <div className="flex flex-col gap-8 w-full pb-10">
      {/* Tab Actions Header */}
      <div className="flex items-center gap-6 pb-2">
        <Link
          href="/upload"
          className="text-[#666666] ff-dashboard-sans text-[12px] font-medium hover:text-[#1a1a1a] transition-colors"
        >
          Upload / Parse
        </Link>
        <Link
          href="/statements/approve"
          className="text-[#666666] ff-dashboard-sans text-[12px] font-medium hover:text-[#1a1a1a] transition-colors"
        >
          Review Queue ({dataHealth.statementsPendingReview})
        </Link>
        <button
          type="button"
          className="text-[#666666] ff-dashboard-sans text-[12px] font-medium hover:text-[#1a1a1a] transition-colors"
        >
          Export
        </button>
      </div>

      {/* 1. Summary metric strip */}
      <section>
        <h2 className="mb-4 text-[#1a1a1a] ff-dashboard-mono text-[24px] font-bold">
          DATA QUALITY METRICS
        </h2>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {metricCards.map(({ key, label, value, severity }) => {
            const textColor = severityText[severity];
            return (
              <div
                key={key}
                className={cn(
                  'bg-[#E8E4DC] border border-[#D1CCC4] rounded-none flex flex-col p-[14px] h-[120px] transition-all duration-200 hover:-translate-y-0.5',
                )}
              >
                <span className="text-[#555555] ff-dashboard-mono text-[11px] font-semibold tracking-[1px] uppercase leading-none">
                  {label}
                </span>

                <div className="text-[#1a1a1a] ff-dashboard-mono text-[40px] font-bold leading-none mt-[20px]">
                  {isLoading ? '—' : value}
                </div>

                <div className="mt-auto">
                  <span className={cn('ff-dashboard-sans text-[13px] font-medium', textColor)}>
                    {value === 0 ? 'All good' : `${value} need${value === 1 ? 's' : ''} attention`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Last upload + Unapproved cash row */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Last upload card */}
        <div className="bg-[#E8E4DC] border border-[#D1CCC4] rounded-none p-[16px] h-[340px] flex flex-col relative">
          <span className="text-[#555555] ff-dashboard-mono text-[11px] font-semibold tracking-[1px] uppercase leading-none">
            LAST UPLOAD
          </span>

          {dataHealth.lastUploadDate ? (
            <>
              <div className="text-[#1a1a1a] ff-dashboard-mono text-[56px] font-bold leading-[1.1] mt-[90px] tracking-tight">
                {getRelativeTime(dataHealth.lastUploadDate)}
              </div>
              <div className="text-[#666666] ff-dashboard-sans text-[13px] font-medium mt-auto pb-[20px]">
                {new Date(dataHealth.lastUploadDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </>
          ) : (
            <div className="mt-[90px] flex flex-col gap-2">
              <p className="text-[#1a1a1a] ff-dashboard-mono text-[32px] font-bold">No data yet</p>
              <Link
                href="/statements/submit"
                className="text-[#C05A3C] hover:text-[#A0452C] ff-dashboard-sans text-[13px] font-medium transition-colors"
              >
                Upload your first statement →
              </Link>
            </div>
          )}
        </div>

        {/* Unapproved cash card */}
        <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-none p-[16px] h-[340px] flex flex-col relative">
          <span className="text-[#888888] ff-dashboard-mono text-[11px] font-semibold tracking-[1px] uppercase leading-none">
            UNAPPROVED CASH
          </span>

          <div
            className={cn(
              'ff-dashboard-mono font-bold leading-[1.1] mt-[100px] tracking-tight',
              dataHealth.unapprovedCash > 0
                ? 'text-[var(--primary)] text-[56px]'
                : 'text-[#F5F3EF] text-[48px]',
            )}
          >
            {isLoading
              ? '—'
              : dataHealth.unapprovedCash > 0
                ? formatAmount(dataHealth.unapprovedCash)
                : 'ALL CASH APPROVED'}
          </div>

          {dataHealth.unapprovedCash > 0 && (
            <Link
              href="/statements/approve"
              className="text-[#888888] hover:text-[#F5F3EF] ff-dashboard-sans text-[13px] font-medium mt-auto pb-[20px] transition-colors"
            >
              Review &amp; approve cash →
            </Link>
          )}
        </div>
      </section>

      {/* 3. Quick links (only if there are issues) */}
      {quickLinks.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-4 text-[#1a1a1a] ff-dashboard-mono text-[16px] font-bold uppercase tracking-wide">
            ACTION REQUIRED
          </h2>
          <div className="flex flex-col border border-[#D1CCC4] bg-[#E8E4DC] divide-y divide-[#D1CCC4] rounded-none">
            {quickLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between p-4 text-[#1a1a1a] hover:bg-[#D1CCC4]/30 ff-dashboard-sans text-[14px] font-medium transition-colors"
              >
                <span>{label}</span>
                <span className="text-[#C05A3C]">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
