/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, complexity, max-lines, max-lines-per-function */
'use client';

import { BudgetSummaryWidget } from '@/app/(main)/dashboard/components/BudgetSummaryWidget';
import {
  fillTemplate,
  formatDateOnly,
  resolveLocale,
} from '@/app/(main)/dashboard/helpers/dashboard-helpers';
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  FileUp,
  Flag,
  Inbox,
  Receipt,
  Tag,
} from '@/app/components/icons';
import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { useIntlayer, useLocale } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import type React from 'react';
import { useMemo } from 'react';
import { Spinner } from '../ui/spinner';
import { CashFlowMini } from './CashFlowMini';
import { CryptoPortfolioCard } from './CryptoPortfolioCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { TopCategoriesCard } from './TopCategoriesCard';
import { computeNet, computeSavingsRate } from './dashboard-stats.util';

interface OverviewTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
  effectivePeriod?: string | null;
  displayMonth: Date;
  changeMonth: (year: number, month: number) => void;
}

// ── Month/year picker ─────────────────────────────────────────────────────────

interface MonthYearPickerProps {
  displayMonth: Date;
  changeMonth: (year: number, month: number) => void;
  locale: string;
}

const YEAR_LOOKBACK = 6;

function MonthYearPicker({ displayMonth, changeMonth, locale }: MonthYearPickerProps) {
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const intlLocale = resolveLocale(locale);

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(intlLocale, { month: 'long' }).format(new Date(2000, i, 1)),
      ),
    [intlLocale],
  );

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const earliest = Math.min(year, currentYear - YEAR_LOOKBACK);
    const list: number[] = [];
    for (let y = currentYear; y >= earliest; y--) {
      list.push(y);
    }
    return list;
  }, [year]);

  return (
    <div className="lumio-dashboard__month-picker">
      <select
        className="lumio-dashboard__month-picker-select"
        value={month}
        onChange={event => changeMonth(year, Number(event.target.value))}
      >
        {monthNames.map((name, i) => (
          <option key={name} value={i}>
            {name}
          </option>
        ))}
      </select>
      <select
        className="lumio-dashboard__month-picker-select lumio-dashboard__month-picker-select--year"
        value={year}
        onChange={event => changeMonth(Number(event.target.value), month)}
      >
        {years.map(y => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
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
  valueTone?: 'positive' | 'negative';
  sub?: string;
  sparkPoints?: number[];
  sparkColor?: string;
}

function StatCard({ label, value, valueTone, sub, sparkPoints, sparkColor }: StatCardProps) {
  const valueClass = valueTone
    ? `lumio-dashboard__stat-value lumio-dashboard__stat-value--${valueTone}`
    : 'lumio-dashboard__stat-value';
  return (
    <div className="lumio-dashboard__stat">
      <div className="lumio-dashboard__stat-label">{label}</div>
      <div className={valueClass}>{value}</div>
      {sub && (
        <div className="lumio-dashboard__stat-row">
          <span className="lumio-dashboard__stat-sub">{sub}</span>
        </div>
      )}
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
  transactions_uncategorized: Tag,
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
  const t = useIntlayer('overviewTab');
  return (
    <div className="lumio-dashboard__card lumio-dashboard__actions">
      <div className="lumio-dashboard__card-title" style={{ marginBottom: 16 }}>
        {t.quickActionsTitle}
      </div>
      {actions.length === 0 ? (
        <div style={{ fontSize: 13, color: emptyColor, textAlign: 'center', padding: '24px 0' }}>
          {t.noActionsNeeded}
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
                    {fillTemplate(t.itemsToReview.value, { count: String(action.count) })}
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

function computeOverviewState(
  data: DashboardData,
  parsingIssuesLabel: string,
  isLoading?: boolean,
) {
  const mappedActions: MappedAction[] = (data.actions || []).map(a => ({
    ...a,
    priority: resolveActionPriority(a.type),
  }));

  if (data.dataHealth?.parsingWarnings > 0) {
    mappedActions.push({
      type: 'parsing_warnings',
      count: data.dataHealth.parsingWarnings,
      label: parsingIssuesLabel,
      href: '/statements?filter=has_errors',
      priority: 'warning' as const,
    });
  }

  const hasNoData =
    data.cashFlow.length === 0 && mappedActions.length === 0 && data.snapshot.totalBalance === 0;

  const cfPoints = data.cashFlow.slice(-10);
  const incomePoints = cfPoints.map(p => p.income);
  const expensePoints = cfPoints.map(p => p.expense);
  const netPoints = cfPoints.map(p => p.income - p.expense);

  const loadingSpinner = isLoading ? <Spinner size={12} /> : null;

  const net = computeNet(data.snapshot.income30d, data.snapshot.expense30d);
  const savingsRate = computeSavingsRate(data.snapshot.income30d, data.snapshot.expense30d);

  return {
    mappedActions,
    hasNoData,
    loadingSpinner,
    net,
    savingsRate,
    netSpark: netPoints.length >= 2 ? netPoints : undefined,
    incomeSpark: incomePoints.length >= 2 ? incomePoints : undefined,
    expenseSpark: expensePoints.length >= 2 ? expensePoints : undefined,
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export function OverviewTab({
  data,
  formatAmount,
  isLoading,
  effectivePeriod,
  displayMonth,
  changeMonth,
}: OverviewTabProps) {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const { locale } = useLocale();
  const t = useIntlayer('overviewTab');
  const s = computeOverviewState(data, t.parsingIssuesFound.value, isLoading);
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(resolveLocale(locale), { month: 'long', year: 'numeric' }).format(
        displayMonth,
      ),
    [locale, displayMonth],
  );
  const viewAllHref = useMemo(() => {
    const monthStart = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
    const monthEnd = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0);
    return `/statements/transactions?startDate=${formatDateOnly(monthStart)}&endDate=${formatDateOnly(monthEnd)}`;
  }, [displayMonth]);

  // ── Empty state ────────────────────────────────────────────────────────────

  if (s.hasNoData) {
    return (
      <div className="lumio-dashboard__empty">
        <EmptyStateIllustration name="dashboard" size="lg" />
        <h2 className="lumio-dashboard__empty-title">{t.emptyTitle}</h2>
        <p className="lumio-dashboard__empty-desc">{t.emptyDescription}</p>
        <Link href="/statements?openExpenseDrawer=scan" className="lumio-dashboard__empty-cta">
          <FileUp size={16} />
          {t.emptyCta}
        </Link>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────

  return (
    <div style={{ paddingBottom: 40 }}>
      <MonthYearPicker displayMonth={displayMonth} changeMonth={changeMonth} locale={locale} />

      {effectivePeriod && (
        <div className="lumio-dashboard__period-banner">
          {fillTemplate(t.periodBanner.value, { period: effectivePeriod })}
        </div>
      )}

      {/* Stat row — 4 cards */}
      <div className="lumio-dashboard__stat-grid">
        <StatCard
          label={t.income.value}
          value={s.loadingSpinner || formatAmount(data.snapshot.income30d)}
          sub={monthLabel}
          sparkPoints={s.incomeSpark}
          sparkColor={c.success}
        />
        <StatCard
          label={t.spentLabel.value}
          value={s.loadingSpinner || formatAmount(data.snapshot.expense30d)}
          sub={monthLabel}
          sparkPoints={s.expenseSpark}
          sparkColor={c.danger}
        />
        <StatCard
          label={t.netLabel.value}
          value={s.loadingSpinner || `${s.net >= 0 ? '+' : '−'}${formatAmount(Math.abs(s.net))}`}
          valueTone={s.net >= 0 ? 'positive' : 'negative'}
          sub={monthLabel}
          sparkPoints={s.netSpark}
          sparkColor={s.net >= 0 ? c.success : c.danger}
        />
        <StatCard
          label={t.savingsRateLabel.value}
          value={
            s.loadingSpinner || (s.savingsRate === null ? '—' : `${Math.round(s.savingsRate)}%`)
          }
          valueTone={
            s.savingsRate === null ? undefined : s.savingsRate >= 0 ? 'positive' : 'negative'
          }
          sub={monthLabel}
        />
      </div>

      <CryptoPortfolioCard formatAmount={formatAmount} />

      {/* Main 2fr/1fr grid */}
      <div className="lumio-dashboard__grid">
        {/* ── Cash flow ── */}
        <div className="lumio-dashboard__card lumio-dashboard__cashflow">
          <div className="lumio-dashboard__card-head">
            <div>
              <div className="lumio-dashboard__card-title">{t.cashFlowTitle}</div>
              <div className="lumio-dashboard__card-sub">
                {fillTemplate(t.cashFlowSubtitle.value, { range: monthLabel })}
              </div>
            </div>
            <div className="lumio-dashboard__card-head-actions">
              <span className="lumio-dashboard__legend">
                <span className="lumio-dashboard__legend-dot" style={{ background: c.primary }} />
                {t.income}
              </span>
              <span className="lumio-dashboard__legend">
                <span className="lumio-dashboard__legend-dot" style={{ background: c.ink300 }} />
                {t.expense}
              </span>
            </div>
          </div>
          <div className="lumio-dashboard__cf-chart">
            <CashFlowMini
              data={data.cashFlow}
              emptyLabel={t.cashFlowEmpty.value}
              incomeLabel={t.income.value}
              expenseLabel={t.expense.value}
            />
          </div>
        </div>

        {/* ── Top categories ── */}
        <div className="lumio-dashboard__card lumio-dashboard__categories">
          <div className="lumio-dashboard__card-head">
            <div>
              <div className="lumio-dashboard__card-title">{t.topCategoriesTitle}</div>
              <div className="lumio-dashboard__card-sub">{monthLabel}</div>
            </div>
            <Link href="/reports" className="lumio-dashboard__card-link-btn">
              {t.viewAll} <ArrowRight size={13} />
            </Link>
          </div>
          <div className="lumio-dashboard__cat-chart">
            <TopCategoriesCard categories={data.topCategories ?? []} formatAmount={formatAmount} />
          </div>
        </div>

        {/* ── Recent transactions ── */}
        <RecentTransactionsCard
          transactions={data.recentTransactions ?? []}
          formatAmount={formatAmount}
          viewAllHref={viewAllHref}
        />

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
            <div className="lumio-dashboard__upload-title">{t.uploadDropTitle}</div>
            <div className="lumio-dashboard__upload-sub">{t.uploadDropSub}</div>
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
