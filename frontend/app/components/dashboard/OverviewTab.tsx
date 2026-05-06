/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, complexity, max-lines, max-lines-per-function */
'use client';

import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  FileUp,
  Flag,
  Inbox,
  Receipt,
  Tag,
} from '@/app/components/icons';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { tokens } from '@/lib/theme-tokens';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import type React from 'react';
import { Spinner } from '../ui/spinner';
import { BudgetSummaryWidget } from '@/app/(main)/dashboard/components/BudgetSummaryWidget';
import { CashFlowMini } from './CashFlowMini';
import { RecentActivity } from './RecentActivity';
import { TopCategoriesCard } from './TopCategoriesCard';

interface OverviewTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
  effectivePeriod?: string | null;
}

// ── Inline SVG sparkline ──────────────────────────────────────────────────────

interface SparkProps {
  points: number[];
  color?: string;
  fill?: boolean;
  h?: number;
  w?: number;
}

function Spark({ points, color = tokens.color.primary, fill = true, h = 38, w = 120 }: SparkProps) {
  if (points.length < 2) {
    return null;
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    // eslint-disable-next-line max-params
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / range) * h}`)
    .join(' ');
  const fillD = `${d} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {fill && <path d={fillD} fill={color} opacity="0.08" />}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaDir?: 'up' | 'down' | 'flat';
  sub?: string;
  sparkPoints?: number[];
  sparkColor?: string;
}

function StatCard({
  label,
  value,
  delta,
  deltaDir = 'flat',
  sub,
  sparkPoints,
  sparkColor,
}: StatCardProps) {
  return (
    <div className="lumio-dashboard__stat">
      <div className="lumio-dashboard__stat-label">{label}</div>
      <div className="lumio-dashboard__stat-value">{value}</div>
      <div className="lumio-dashboard__stat-row">
        {delta && (
          <span className={`lumio-dashboard__stat-delta lumio-dashboard__stat-delta--${deltaDir}`}>
            {deltaDir === 'up' && <ArrowUp size={12} />}
            {delta}
          </span>
        )}
        {sub && <span className="lumio-dashboard__stat-sub">{sub}</span>}
      </div>
      {sparkPoints && sparkPoints.length >= 2 && (
        <div className="lumio-dashboard__stat-spark" aria-hidden="true">
          <Spark points={sparkPoints} color={sparkColor} />
        </div>
      )}
    </div>
  );
}

// ── Action icon helper ────────────────────────────────────────────────────────

const ACTION_ICON_MAP: Record<string, React.ComponentType<{ size: number }>> = {
  payments_overdue: AlertTriangle,
  uncategorized_transactions: Tag,
  parsing_warnings: Flag,
  receipts_pending_review: Receipt,
};

function ActionIcon({ type, size = 15 }: { type: string; size?: number }): React.JSX.Element {
  const IconComp = ACTION_ICON_MAP[type] || Inbox;
  return <IconComp size={size} />;
}

const ACTION_ICO_CLASS_MAP: Record<string, string> = {
  critical: 'lumio-dashboard__action-ico--critical',
  warning: 'lumio-dashboard__action-ico--warning',
  success: 'lumio-dashboard__action-ico--success',
};

function actionIcoClass(priority: string): string {
  return ACTION_ICO_CLASS_MAP[priority] || 'lumio-dashboard__action-ico--info';
}

// ── Priority mapping ─────────────────────────────────────────────────────────

const ACTION_PRIORITY_MAP: Record<string, 'critical' | 'warning' | 'info' | 'success'> = {
  payments_overdue: 'critical',
  statements_pending_review: 'warning',
  receipts_pending_review: 'warning',
  statements_pending_submit: 'warning',
};

function resolveActionPriority(type: string): 'critical' | 'warning' | 'info' | 'success' {
  return ACTION_PRIORITY_MAP[type] || 'info';
}

const RANGE_LABELS: Record<string, string> = {
  '7d': '7 days',
  '90d': '90 days',
};

// ── Quick actions card ───────────────────────────────────────────────────────

interface MappedAction {
  type: string;
  count: number;
  label: string;
  href: string;
  priority: 'critical' | 'warning' | 'info' | 'success';
}

function QuickActionsCard({
  actions,
  emptyColor,
}: {
  actions: MappedAction[];
  emptyColor: string;
}) {
  return (
    <div className="lumio-dashboard__card lumio-dashboard__actions">
      <div className="lumio-dashboard__card-title" style={{ marginBottom: 16 }}>
        Quick actions
      </div>
      {actions.length === 0 ? (
        <div style={{ fontSize: 13, color: emptyColor, textAlign: 'center', padding: '24px 0' }}>
          No actions needed
        </div>
      ) : (
        <div className="lumio-dashboard__action-list">
          {actions.slice(0, 5).map(action => (
            <Link key={action.type} href={action.href} className="lumio-dashboard__action-row">
              <div className={`lumio-dashboard__action-ico ${actionIcoClass(action.priority)}`}>
                <ActionIcon type={action.type} />
              </div>
              <div className="lumio-dashboard__action-body">
                <div className="lumio-dashboard__action-title">{action.label}</div>
                {action.count > 0 && (
                  <div className="lumio-dashboard__action-sub">
                    {action.count} item{action.count !== 1 ? 's' : ''} to review
                  </div>
                )}
              </div>
              <ChevronRight size={14} className="lumio-dashboard__action-chevron" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Overview state computation ───────────────────────────────────────────────

function computeOverviewState(data: DashboardData, range: DashboardRange, isLoading?: boolean) {
  const mappedActions: MappedAction[] = (data.actions || []).map(a => ({
    ...a,
    priority: resolveActionPriority(a.type),
  }));

  if (data.dataHealth?.parsingWarnings > 0) {
    mappedActions.push({
      type: 'parsing_warnings',
      count: data.dataHealth.parsingWarnings,
      label: 'Parsing issues found',
      href: '/statements?filter=has_errors',
      priority: 'warning' as const,
    });
  }

  const hasNoData =
    data.cashFlow.length === 0 && mappedActions.length === 0 && data.snapshot.totalBalance === 0;

  const rangeLabel = RANGE_LABELS[range] || '30 days';

  const cfPoints = data.cashFlow.slice(-10);
  const incomePoints = cfPoints.map(p => p.income);
  const expensePoints = cfPoints.map(p => p.expense);
  const netPoints = cfPoints.map(p => p.income - p.expense);

  const uncatCount = data.dataHealth?.uncategorizedTransactions ?? 0;

  const loadingSpinner = isLoading ? <Spinner size={12} /> : null;
  const isNegativeBalance = data.snapshot.totalBalance < 0;

  return {
    mappedActions,
    hasNoData,
    rangeLabel,
    uncatCount,
    loadingSpinner,
    balanceDelta: isNegativeBalance ? ('Negative' as const) : undefined,
    balanceDeltaDir: isNegativeBalance ? ('down' as const) : undefined,
    uncatDelta: uncatCount > 0 ? 'Needs review' : 'All clear',
    uncatDeltaDir: uncatCount > 0 ? ('flat' as const) : ('up' as const),
    netSpark: netPoints.length >= 2 ? netPoints : undefined,
    incomeSpark: incomePoints.length >= 2 ? incomePoints : undefined,
    expenseSpark: expensePoints.length >= 2 ? expensePoints : undefined,
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export function OverviewTab({
  data,
  formatAmount,
  range,
  isLoading,
  effectivePeriod,
}: OverviewTabProps) {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const s = computeOverviewState(data, range, isLoading);

  // ── Empty state ────────────────────────────────────────────────────────────

  if (s.hasNoData) {
    return (
      <div className="lumio-dashboard__empty">
        <div className="lumio-dashboard__empty-icon">
          <FileUp size={40} color={c.ink400} />
        </div>
        <h2 className="lumio-dashboard__empty-title">Upload your first statement</h2>
        <p className="lumio-dashboard__empty-desc">
          Start tracking your finances by uploading a bank statement. We&apos;ll parse it
          automatically and show your cash flow, categories, and insights.
        </p>
        <Link href="/statements?openExpenseDrawer=scan" className="lumio-dashboard__empty-cta">
          <FileUp size={16} />
          Parse statement
        </Link>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────

  return (
    <div style={{ paddingBottom: 40 }}>
      {effectivePeriod && (
        <div className="lumio-dashboard__period-banner">
          Showing latest available period: {effectivePeriod}
        </div>
      )}

      {/* Stat row — 4 cards */}
      <div className="lumio-dashboard__stat-grid">
        <StatCard
          label="Net balance"
          value={s.loadingSpinner || formatAmount(Math.abs(data.snapshot.totalBalance))}
          delta={s.balanceDelta}
          deltaDir={s.balanceDeltaDir}
          sub={data.snapshot.currency}
          sparkPoints={s.netSpark}
          sparkColor={c.success}
        />
        <StatCard
          label="Income"
          value={s.loadingSpinner || formatAmount(data.snapshot.income30d)}
          sub={s.rangeLabel}
          sparkPoints={s.incomeSpark}
          sparkColor={c.primary}
        />
        <StatCard
          label="Expenses"
          value={s.loadingSpinner || formatAmount(data.snapshot.expense30d)}
          sub={s.rangeLabel}
          sparkPoints={s.expenseSpark}
          sparkColor={c.warning}
        />
        <StatCard
          label="Uncategorized"
          value={s.loadingSpinner || String(s.uncatCount)}
          delta={s.uncatDelta}
          deltaDir={s.uncatDeltaDir}
          sparkColor={c.danger}
        />
      </div>

      {/* Main 2fr/1fr grid */}
      <div className="lumio-dashboard__grid">
        {/* ── Cash flow ── */}
        <div className="lumio-dashboard__card lumio-dashboard__cashflow">
          <div className="lumio-dashboard__card-head">
            <div>
              <div className="lumio-dashboard__card-title">Cash flow</div>
              <div className="lumio-dashboard__card-sub">Income vs. expenses · {s.rangeLabel}</div>
            </div>
            <div className="lumio-dashboard__card-head-actions">
              <span className="lumio-dashboard__legend">
                <span className="lumio-dashboard__legend-dot" style={{ background: c.primary }} />
                Income
              </span>
              <span className="lumio-dashboard__legend">
                <span className="lumio-dashboard__legend-dot" style={{ background: c.ink300 }} />
                Expense
              </span>
            </div>
          </div>
          <div className="lumio-dashboard__cf-chart">
            <CashFlowMini data={data.cashFlow} emptyLabel="No cash flow data yet" />
          </div>
        </div>

        {/* ── Top categories ── */}
        <div className="lumio-dashboard__card lumio-dashboard__categories">
          <div className="lumio-dashboard__card-head">
            <div>
              <div className="lumio-dashboard__card-title">Top categories</div>
              <div className="lumio-dashboard__card-sub">{s.rangeLabel}</div>
            </div>
            <Link href="/reports" className="lumio-dashboard__card-link-btn">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="lumio-dashboard__cat-chart">
            <TopCategoriesCard categories={data.topCategories ?? []} />
          </div>
        </div>

        {/* ── Recent activity ── */}
        <div className="lumio-dashboard__card-shell lumio-dashboard__activity">
          <div className="lumio-dashboard__card-shell-head">
            <div>
              <div className="lumio-dashboard__card-title">Recent activity</div>
              <div className="lumio-dashboard__card-sub">Across all connected accounts</div>
            </div>
            <Link href="/statements" className="lumio-dashboard__card-link-btn">
              All transactions <ArrowRight size={13} />
            </Link>
          </div>
          <div className="lumio-dashboard__card-shell-body">
            <RecentActivity
              activities={data.recentActivity ?? []}
              formatAmount={formatAmount}
              title="Recent activity"
              emptyLabel="No recent activity yet"
            />
          </div>
        </div>

        {/* ── Budget summary ── */}
        <BudgetSummaryWidget />

        {/* ── Quick actions ── */}
        <QuickActionsCard actions={s.mappedActions} emptyColor={c.ink400} />

        {/* ── Upload zone ── */}
        <div className="lumio-dashboard__card lumio-dashboard__upload">
          <Link href="/statements?openExpenseDrawer=scan" className="lumio-dashboard__upload-zone">
            <div className="lumio-dashboard__upload-ico">
              <FileUp size={20} />
            </div>
            <div className="lumio-dashboard__upload-title">Drop a statement here</div>
            <div className="lumio-dashboard__upload-sub">PDF, CSV, XLSX up to 10 MB</div>
            <div className="lumio-dashboard__upload-formats">
              <span className="lumio-dashboard__format-tag">PDF</span>
              <span className="lumio-dashboard__format-tag">CSV</span>
              <span className="lumio-dashboard__format-tag">XLSX</span>
              <span className="lumio-dashboard__format-tag">JPG/PNG</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
