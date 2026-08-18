'use client';

import { CheckCircle2, CircleAlert, ExternalLink, ListChecks } from '@/app/components/icons';
import type { DashboardData } from '@/app/hooks/useDashboard';
import { useIntlayer } from '@/app/i18n';
import { fillTemplate } from '@/app/(main)/dashboard/helpers/dashboard-helpers';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import type React from 'react';
import {
  type FinanceOpsFeatureStatus,
  type FinanceOpsLabels,
  buildFinanceOpsModel,
} from './finance-ops-model';

type FinanceOpsTabProps = {
  data: DashboardData;
  formatAmount: (value: number) => string;
};

export function FinanceOpsTab({ data, formatAmount }: FinanceOpsTabProps): React.JSX.Element {
  const t = useIntlayer('financeOpsTab');

  const statusTone: Record<FinanceOpsFeatureStatus, { label: string; color: string; bg: string }> = {
    ready: { label: t.statusReady.value, color: '#166534', bg: 'rgba(22, 101, 52, 0.1)' },
    review: { label: t.statusReview.value, color: '#0369a1', bg: 'rgba(3, 105, 161, 0.1)' },
    blocked: { label: t.statusBlocked.value, color: '#b42318', bg: 'rgba(180, 35, 24, 0.1)' },
  };

  const labels: FinanceOpsLabels = {
    checklist: {
      statementsImported: t.checklist.statementsImported.value,
      reviewQueueClear: t.checklist.reviewQueueClear.value,
      categoriesResolved: t.checklist.categoriesResolved.value,
      receiptsMatched: t.checklist.receiptsMatched.value,
      cashReconciled: t.checklist.cashReconciled.value,
    },
    savedViews: {
      uncategorized: t.savedViews.uncategorized.value,
      needsReceipt: t.savedViews.needsReceipt.value,
      statementReview: t.savedViews.statementReview.value,
      largeExpenses: t.savedViews.largeExpenses.value,
      monthClose: t.savedViews.monthClose.value,
    },
    pluralStatement: t.pluralStatement.value,
    pluralWarning: t.pluralWarning.value,
    pluralTransaction: t.pluralTransaction.value,
    pluralReceipt: t.pluralReceipt.value,
    features: {
      importReviewInbox: {
        title: t.features.importReviewInbox.title.value,
        summary: t.features.importReviewInbox.summary.value,
        primaryActionOpen: t.features.importReviewInbox.primaryActionOpen.value,
        primaryActionImport: t.features.importReviewInbox.primaryActionImport.value,
        evidence: t.features.importReviewInbox.evidence.value,
      },
      transactionTriageMode: {
        title: t.features.transactionTriageMode.title.value,
        summary: t.features.transactionTriageMode.summary.value,
        primaryAction: t.features.transactionTriageMode.primaryAction.value,
        evidence: t.features.transactionTriageMode.evidence.value,
      },
      smartCategorySuggestions: {
        title: t.features.smartCategorySuggestions.title.value,
        summary: t.features.smartCategorySuggestions.summary.value,
        primaryAction: t.features.smartCategorySuggestions.primaryAction.value,
        evidenceTopCategory: t.features.smartCategorySuggestions.evidenceTopCategory.value,
        evidenceNoPressure: t.features.smartCategorySuggestions.evidenceNoPressure.value,
      },
      periodCloseChecklistFeature: {
        title: t.features.periodCloseChecklistFeature.title.value,
        summary: t.features.periodCloseChecklistFeature.summary.value,
        primaryActionResolve: t.features.periodCloseChecklistFeature.primaryActionResolve.value,
        primaryActionExport: t.features.periodCloseChecklistFeature.primaryActionExport.value,
        evidence: t.features.periodCloseChecklistFeature.evidence.value,
      },
      anomalyDetectionFeed: {
        title: t.features.anomalyDetectionFeed.title.value,
        summary: t.features.anomalyDetectionFeed.summary.value,
        primaryAction: t.features.anomalyDetectionFeed.primaryAction.value,
        evidenceOverdue: t.features.anomalyDetectionFeed.evidenceOverdue.value,
        evidenceTopMerchant: t.features.anomalyDetectionFeed.evidenceTopMerchant.value,
        evidenceNone: t.features.anomalyDetectionFeed.evidenceNone.value,
      },
      reconciliationDashboard: {
        title: t.features.reconciliationDashboard.title.value,
        summary: t.features.reconciliationDashboard.summary.value,
        primaryAction: t.features.reconciliationDashboard.primaryAction.value,
        evidence: t.features.reconciliationDashboard.evidence.value,
      },
      savedViewsTeamFilters: {
        title: t.features.savedViewsTeamFilters.title.value,
        summary: t.features.savedViewsTeamFilters.summary.value,
        primaryAction: t.features.savedViewsTeamFilters.primaryAction.value,
        evidence: t.features.savedViewsTeamFilters.evidence.value,
      },
      receiptMatchingAssistant: {
        title: t.features.receiptMatchingAssistant.title.value,
        summary: t.features.receiptMatchingAssistant.summary.value,
        primaryAction: t.features.receiptMatchingAssistant.primaryAction.value,
        evidence: t.features.receiptMatchingAssistant.evidence.value,
      },
      actionableNotifications: {
        title: t.features.actionableNotifications.title.value,
        summary: t.features.actionableNotifications.summary.value,
        primaryActionOpen: t.features.actionableNotifications.primaryActionOpen.value,
        primaryActionNone: t.features.actionableNotifications.primaryActionNone.value,
        evidenceAllClear: t.features.actionableNotifications.evidenceAllClear.value,
      },
      explainThisNumber: {
        title: t.features.explainThisNumber.title.value,
        summary: t.features.explainThisNumber.summary.value,
        primaryAction: t.features.explainThisNumber.primaryAction.value,
        evidenceTopCategoryAmount: t.features.explainThisNumber.evidenceTopCategoryAmount.value,
        evidenceBalance: t.features.explainThisNumber.evidenceBalance.value,
      },
    },
  };

  const model = buildFinanceOpsModel(data, formatAmount, labels);
  const closeDone = model.closeChecklist.filter(item => item.done).length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: '40px' }}>
      <Box
        component="section"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' },
          gap: 2,
        }}
      >
        <Box
          sx={{
            border: '1px solid var(--border)',
            borderRadius: tokens.radius.sm,
            bgcolor: 'var(--card)',
            p: 2.5,
          }}
        >
          <Typography
            component="span"
            className="ff-dashboard-mono"
            sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}
          >
            {t.cockpitLabel}
          </Typography>
          <Typography component="h2" sx={{ mt: 1, fontSize: 26, fontWeight: 700 }}>
            {model.totalPending === 0
              ? t.noPendingWork
              : fillTemplate(t.pendingItemsCount.value, { count: String(model.totalPending) })}
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary', maxWidth: 760, fontSize: 14 }}>
            {t.cockpitSubtitle}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            {model.savedViews.map(view => (
              <Link
                key={view.id}
                href={view.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 34,
                  padding: '0 12px',
                  border: '1px solid var(--border)',
                  borderRadius: tokens.radius.sm,
                  color: 'var(--foreground)',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {view.label}
                <span style={{ color: 'var(--muted-foreground)', fontWeight: 500 }}>
                  {view.count}
                </span>
              </Link>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            border: '1px solid var(--border)',
            borderRadius: tokens.radius.sm,
            bgcolor: 'var(--card)',
            p: 2.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ListChecks size={18} />
            <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700 }}>
              {t.periodCloseChecklist}
            </Typography>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
            {fillTemplate(t.controlsComplete.value, {
              done: String(closeDone),
              total: String(model.closeChecklist.length),
            })}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1, mt: 2 }}>
            {model.closeChecklist.map(item => (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'var(--foreground)',
                  textDecoration: 'none',
                  fontSize: 13,
                }}
              >
                {item.done ? (
                  <CheckCircle2 size={17} color="#15803d" />
                ) : (
                  <CircleAlert size={17} color="#b42318" />
                )}
                <span>{item.label}</span>
              </Link>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        component="section"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {model.features.map(feature => {
          const tone = statusTone[feature.status];
          return (
            <Box
              key={feature.id}
              sx={{
                minHeight: 238,
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border)',
                borderRadius: tokens.radius.sm,
                bgcolor: 'var(--card)',
                p: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography component="h3" sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>
                  {feature.title}
                </Typography>
                <Box
                  component="span"
                  sx={{
                    flexShrink: 0,
                    height: 26,
                    px: 1,
                    borderRadius: tokens.radius.sm,
                    bgcolor: tone.bg,
                    color: tone.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {tone.label}
                </Box>
              </Box>
              <Typography sx={{ mt: 1.2, color: 'text.secondary', fontSize: 14, lineHeight: 1.55 }}>
                {feature.summary}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography
                  component="span"
                  className="ff-dashboard-mono"
                  sx={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}
                >
                  {feature.pendingCount}
                </Typography>
                <Typography component="span" sx={{ ml: 1, color: 'text.secondary', fontSize: 13 }}>
                  {t.pendingSuffix}
                </Typography>
              </Box>
              <Typography sx={{ mt: 1, color: 'text.secondary', fontSize: 13 }}>
                {feature.evidence}
              </Typography>
              <Box sx={{ mt: 'auto', pt: 2 }}>
                <Link
                  href={feature.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {feature.primaryAction}
                  <ExternalLink size={14} />
                </Link>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
