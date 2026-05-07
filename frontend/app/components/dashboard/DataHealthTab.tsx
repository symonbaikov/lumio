'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { cn } from '@/app/lib/utils';
import Link from 'next/link';
import { tokens } from '@/lib/theme-tokens';

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

const severityTextColor: Record<SeverityKey, string> = {
  green: '#4A7C59',
  amber: '#C05A3C',
  red: 'var(--primary)',
  blue: '#3B82F6',
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
      key: 'receiptsPendingReview',
      label: 'RECEIPTS PENDING',
      value: dataHealth.receiptsPendingReview,
      severity: (dataHealth.receiptsPendingReview > 0 ? 'amber' : 'green') as SeverityKey,
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
  if (dataHealth.receiptsPendingReview > 0) {
    quickLinks.push({
      label: `Review ${dataHealth.receiptsPendingReview} receipt${dataHealth.receiptsPendingReview !== 1 ? 's' : ''}`,
      href: '/statements/submit',
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', pb: '40px' }}>
      {/* Tab Actions Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, pb: 1 }}>
        <Link
          href="/statements"
          className="ff-dashboard-sans"
          style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', transition: 'color 150ms', textDecoration: 'none' }}
        >
          Upload / Parse
        </Link>
        <Link
          href="/statements/approve"
          className="ff-dashboard-sans"
          style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', transition: 'color 150ms', textDecoration: 'none' }}
        >
          Review Queue ({dataHealth.statementsPendingReview})
        </Link>
        <button
          type="button"
          className="ff-dashboard-sans"
          style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', transition: 'color 150ms', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Export
        </button>
      </Box>

      {/* 1. Summary metric strip */}
      <section>
        <Typography
          component="h2"
          className="ff-dashboard-mono"
          sx={{ mb: 2, color: 'text.primary', fontSize: 24, fontWeight: 700 }}
        >
          DATA QUALITY METRICS
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {metricCards.map(({ key, label, value, severity }) => {
            const textColor = severityTextColor[severity];
            return (
              <Box
                key={key}
                sx={{
                  height: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid var(--border)',
                  borderRadius: tokens.radius.sm,
                  bgcolor: 'var(--card)',
                  p: '14px',
                  backdropFilter: 'blur(24px)',
                  boxShadow: '0 8px 32px 0 rgba(0,0,0,0.04)',
                  transition: 'transform 200ms',
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <Typography
                  component="span"
                  className="ff-dashboard-mono"
                  sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', lineHeight: 1 }}
                >
                  {label}
                </Typography>

                <Typography
                  className="ff-dashboard-mono"
                  sx={{ color: 'text.primary', fontSize: 40, fontWeight: 700, lineHeight: 1, mt: '20px' }}
                >
                  {isLoading ? '—' : value}
                </Typography>

                <Box sx={{ mt: 'auto' }}>
                  <Typography
                    component="span"
                    className="ff-dashboard-sans"
                    sx={{ fontSize: 13, fontWeight: 500, color: textColor }}
                  >
                    {value === 0 ? 'All good' : `${value} need${value === 1 ? 's' : ''} attention`}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </section>

      {/* 2. Last upload + Unapproved cash row */}
      <Box
        component="section"
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 2 }}
      >
        {/* Last upload card */}
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            height: 340,
            border: '1px solid var(--border)',
            borderRadius: tokens.radius.sm,
            bgcolor: 'var(--card)',
            p: '16px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.04)',
          }}
        >
          <Typography
            component="span"
            className="ff-dashboard-mono"
            sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', lineHeight: 1 }}
          >
            LAST UPLOAD
          </Typography>

          {dataHealth.lastUploadDate ? (
            <>
              <Typography
                className="ff-dashboard-mono"
                sx={{ color: 'text.primary', fontSize: 56, fontWeight: 700, lineHeight: 1.1, mt: '90px', letterSpacing: '-0.02em' }}
              >
                {getRelativeTime(dataHealth.lastUploadDate)}
              </Typography>
              <Typography
                className="ff-dashboard-sans"
                sx={{ color: 'text.secondary', fontSize: 13, fontWeight: 500, mt: 'auto', pb: '20px' }}
              >
                {new Date(dataHealth.lastUploadDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Typography>
            </>
          ) : (
            <Box sx={{ mt: '90px', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography
                className="ff-dashboard-mono"
                sx={{ color: 'text.primary', fontSize: 32, fontWeight: 700 }}
              >
                No data yet
              </Typography>
              <Link
                href="/statements/submit"
                className="ff-dashboard-sans"
                style={{ color: '#C05A3C', fontSize: 13, fontWeight: 500, transition: 'color 150ms', textDecoration: 'none' }}
              >
                Upload your first statement →
              </Link>
            </Box>
          )}
        </Box>

        {/* Unapproved cash card */}
        <Box
          sx={{
            bgcolor: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: tokens.radius.sm,
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.2)',
            p: '16px',
            height: 340,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <Typography
            component="span"
            className="ff-dashboard-mono"
            sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600, letterSpacing: '1.4px', textTransform: 'uppercase', lineHeight: 1 }}
          >
            UNAPPROVED CASH
          </Typography>

          <Typography
            className="ff-dashboard-mono"
            sx={{
              fontWeight: 700,
              lineHeight: 1.1,
              mt: '100px',
              letterSpacing: '-0.02em',
              color: dataHealth.unapprovedCash > 0 ? 'var(--primary)' : '#F5F3EF',
              fontSize: dataHealth.unapprovedCash > 0 ? 56 : 48,
            }}
          >
            {isLoading
              ? '—'
              : dataHealth.unapprovedCash > 0
                ? formatAmount(dataHealth.unapprovedCash)
                : 'ALL CASH APPROVED'}
          </Typography>

          {dataHealth.unapprovedCash > 0 && (
            <Link
              href="/statements/approve"
              className="ff-dashboard-sans"
              style={{ color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500, marginTop: 'auto', paddingBottom: 20, transition: 'color 150ms', textDecoration: 'none' }}
            >
              Review &amp; approve cash →
            </Link>
          )}
        </Box>
      </Box>

      {/* 3. Quick links (only if there are issues) */}
      {quickLinks.length > 0 && (
        <Box component="section" sx={{ mt: 2 }}>
          <Typography
            component="h2"
            className="ff-dashboard-mono"
            sx={{ mb: 2, color: 'text.primary', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            ACTION REQUIRED
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              borderRadius: tokens.radius.sm,
              bgcolor: 'var(--card)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px 0 rgba(0,0,0,0.04)',
              '& > a + a': { borderTop: '1px solid var(--border)' },
            }}
          >
            {quickLinks.map(({ label, href }) => (
              <Link
                key={`${href}:${label}`}
                href={href}
                className="ff-dashboard-sans"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', fontSize: 14, fontWeight: 500, color: 'var(--foreground)', transition: 'background-color 150ms', textDecoration: 'none' }}
              >
                <span>{label}</span>
                <span style={{ color: '#C05A3C' }}>→</span>
              </Link>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
