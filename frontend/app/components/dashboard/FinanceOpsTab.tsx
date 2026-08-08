'use client';

import { CheckCircle2, CircleAlert, ExternalLink, ListChecks } from '@/app/components/icons';
import type { DashboardData } from '@/app/hooks/useDashboard';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import type React from 'react';
import { type FinanceOpsFeatureStatus, buildFinanceOpsModel } from './finance-ops-model';

type FinanceOpsTabProps = {
  data: DashboardData;
  formatAmount: (value: number) => string;
};

const statusTone: Record<FinanceOpsFeatureStatus, { label: string; color: string; bg: string }> = {
  ready: { label: 'Ready', color: '#166534', bg: 'rgba(22, 101, 52, 0.1)' },
  review: { label: 'Review', color: '#0369a1', bg: 'rgba(3, 105, 161, 0.1)' },
  blocked: { label: 'Blocked', color: '#b42318', bg: 'rgba(180, 35, 24, 0.1)' },
};

export function FinanceOpsTab({ data, formatAmount }: FinanceOpsTabProps): React.JSX.Element {
  const model = buildFinanceOpsModel(data, formatAmount);
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
            FINANCE OPS COCKPIT
          </Typography>
          <Typography component="h2" sx={{ mt: 1, fontSize: 26, fontWeight: 700 }}>
            {model.totalPending === 0
              ? 'No operational work is pending'
              : `${model.totalPending} pending work items need review`}
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary', maxWidth: 760, fontSize: 14 }}>
            A single workspace for import review, transaction triage, month close, receipt matching,
            anomaly checks, and explainable reporting.
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
              Period close checklist
            </Typography>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
            {closeDone}/{model.closeChecklist.length} controls complete
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
                  pending
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
