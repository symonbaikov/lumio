'use client';
import { formatStoredDateWithOptions } from '@/app/lib/user-format-store';

import { fillTemplate, resolveLocale } from '@/app/(main)/dashboard/helpers/dashboard-helpers';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { useIntlayer, useLocale } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

interface DataHealthTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
}

interface RelativeTimeLabels {
  today: string;
  yesterday: string;
  daysAgo: string;
  oneWeekAgo: string;
  weeksAgo: string;
  oneMonthAgo: string;
  monthsAgo: string;
}

function getRelativeTime(isoDate: string, labels: RelativeTimeLabels): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.yesterday;
  if (diffDays < 7) return fillTemplate(labels.daysAgo, { n: String(diffDays) });
  if (diffDays < 14) return labels.oneWeekAgo;
  if (diffDays < 30) return fillTemplate(labels.weeksAgo, { n: String(Math.floor(diffDays / 7)) });
  if (diffDays < 60) return labels.oneMonthAgo;
  return fillTemplate(labels.monthsAgo, { n: String(Math.floor(diffDays / 30)) });
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
  const t = useIntlayer('dataHealthTab');
  const { locale } = useLocale();

  const relativeTimeLabels: RelativeTimeLabels = {
    today: t.relativeToday.value,
    yesterday: t.relativeYesterday.value,
    daysAgo: t.relativeDaysAgo.value,
    oneWeekAgo: t.relativeOneWeekAgo.value,
    weeksAgo: t.relativeWeeksAgo.value,
    oneMonthAgo: t.relativeOneMonthAgo.value,
    monthsAgo: t.relativeMonthsAgo.value,
  };

  const metricCards = [
    {
      key: 'uncategorizedTransactions',
      label: t.uncategorizedLabel,
      value: dataHealth.uncategorizedTransactions,
      severity: (dataHealth.uncategorizedTransactions > 0 ? 'amber' : 'green') as SeverityKey,
    },
    {
      key: 'statementsWithErrors',
      label: t.statementErrorsLabel,
      value: dataHealth.statementsWithErrors,
      severity: (dataHealth.statementsWithErrors > 0 ? 'red' : 'green') as SeverityKey,
    },
    {
      key: 'statementsPendingReview',
      label: t.pendingReviewLabel,
      value: dataHealth.statementsPendingReview,
      severity: (dataHealth.statementsPendingReview > 0 ? 'blue' : 'green') as SeverityKey,
    },
    {
      key: 'receiptsPendingReview',
      label: t.receiptsPendingLabel,
      value: dataHealth.receiptsPendingReview,
      severity: (dataHealth.receiptsPendingReview > 0 ? 'amber' : 'green') as SeverityKey,
    },
    {
      key: 'parsingWarnings',
      label: t.parsingWarningsLabel,
      value: dataHealth.parsingWarnings,
      severity: (dataHealth.parsingWarnings > 0 ? 'amber' : 'green') as SeverityKey,
    },
  ];

  const quickLinks: Array<{ id: string; label: string; href: string }> = [];
  if (dataHealth.uncategorizedTransactions > 0) {
    quickLinks.push({
      id: 'uncategorized-transactions',
      label: fillTemplate(t.quickLinkUncategorized.value, {
        count: String(dataHealth.uncategorizedTransactions),
      }),
      href: '/statements/submit?categoryId=uncategorized',
    });
  }
  if (dataHealth.statementsWithErrors > 0) {
    quickLinks.push({
      id: 'statement-errors',
      label: fillTemplate(t.quickLinkStatementErrors.value, {
        count: String(dataHealth.statementsWithErrors),
      }),
      href: '/statements?status=error',
    });
  }
  if (dataHealth.statementsPendingReview > 0) {
    quickLinks.push({
      id: 'pending-statements',
      label: fillTemplate(t.quickLinkPendingStatements.value, {
        count: String(dataHealth.statementsPendingReview),
      }),
      href: '/statements/approve',
    });
  }
  if (dataHealth.receiptsPendingReview > 0) {
    quickLinks.push({
      id: 'pending-receipts',
      label: fillTemplate(t.quickLinkReceipts.value, {
        count: String(dataHealth.receiptsPendingReview),
      }),
      href: '/statements/submit?status=needs_review',
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', pb: '40px' }}>
      {/* Tab Actions Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, pb: 1 }}>
        <Link
          href="/statements"
          className="ff-dashboard-sans"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--muted-foreground)',
            transition: 'color 150ms',
            textDecoration: 'none',
          }}
        >
          {t.uploadParse}
        </Link>
        <Link
          href="/statements/approve"
          className="ff-dashboard-sans"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--muted-foreground)',
            transition: 'color 150ms',
            textDecoration: 'none',
          }}
        >
          {fillTemplate(t.reviewQueue.value, {
            count: String(dataHealth.statementsPendingReview),
          })}
        </Link>
        <button
          type="button"
          className="ff-dashboard-sans"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--muted-foreground)',
            transition: 'color 150ms',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {t.exportButton}
        </button>
      </Box>

      {/* 1. Summary metric strip */}
      <section>
        <Typography
          component="h2"
          className="ff-dashboard-mono"
          sx={{ mb: 2, color: 'text.primary', fontSize: 24, fontWeight: 700 }}
        >
          {t.dataQualityMetrics}
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
                  transition: 'transform 200ms',
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <Typography
                  component="span"
                  className="ff-dashboard-mono"
                  sx={{
                    color: 'text.secondary',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}
                >
                  {label}
                </Typography>

                <Typography
                  className="ff-dashboard-mono"
                  sx={{
                    color: 'text.primary',
                    fontSize: 40,
                    fontWeight: 700,
                    lineHeight: 1,
                    mt: '20px',
                  }}
                >
                  {isLoading ? '—' : value}
                </Typography>

                <Box sx={{ mt: 'auto' }}>
                  <Typography
                    component="span"
                    className="ff-dashboard-sans"
                    sx={{ fontSize: 13, fontWeight: 500, color: textColor }}
                  >
                    {value === 0
                      ? t.allGood
                      : fillTemplate(t.metricNeedsAttention.value, { value: String(value) })}
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
          }}
        >
          <Typography
            component="span"
            className="ff-dashboard-mono"
            sx={{
              color: 'text.secondary',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            {t.lastUpload}
          </Typography>

          {dataHealth.lastUploadDate ? (
            <>
              <Typography
                className="ff-dashboard-mono"
                sx={{
                  color: 'text.primary',
                  fontSize: 56,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  mt: '90px',
                  letterSpacing: '-0.02em',
                }}
              >
                {getRelativeTime(dataHealth.lastUploadDate, relativeTimeLabels)}
              </Typography>
              <Typography
                className="ff-dashboard-sans"
                sx={{
                  color: 'text.secondary',
                  fontSize: 13,
                  fontWeight: 500,
                  mt: 'auto',
                  pb: '20px',
                }}
              >
                {formatStoredDateWithOptions(
                  dataHealth.lastUploadDate,
                  { year: 'numeric', month: 'short', day: 'numeric' },
                  resolveLocale(locale),
                )}
              </Typography>
            </>
          ) : (
            <Box sx={{ mt: '90px', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography
                className="ff-dashboard-mono"
                sx={{ color: 'text.primary', fontSize: 32, fontWeight: 700 }}
              >
                {t.noDataYet}
              </Typography>
              <Link
                href="/statements/submit"
                className="ff-dashboard-sans"
                style={{
                  color: '#C05A3C',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'color 150ms',
                  textDecoration: 'none',
                }}
              >
                {t.uploadFirstStatement}
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
            sx={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            {t.unapprovedCash}
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
                : t.allCashApproved}
          </Typography>

          {dataHealth.unapprovedCash > 0 && (
            <Link
              href="/statements/approve"
              className="ff-dashboard-sans"
              style={{
                color: 'var(--muted-foreground)',
                fontSize: 13,
                fontWeight: 500,
                marginTop: 'auto',
                paddingBottom: 20,
                transition: 'color 150ms',
                textDecoration: 'none',
              }}
            >
              {t.reviewApproveCash}
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
            sx={{
              mb: 2,
              color: 'text.primary',
              fontSize: 16,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {t.actionRequired}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              borderRadius: tokens.radius.sm,
              bgcolor: 'var(--card)',
              '& > a + a': { borderTop: '1px solid var(--border)' },
            }}
          >
            {quickLinks.map(({ id, label, href }) => (
              <Link
                key={id}
                href={href}
                className="ff-dashboard-sans"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--foreground)',
                  transition: 'background-color 150ms',
                  textDecoration: 'none',
                }}
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
