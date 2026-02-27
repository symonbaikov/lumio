'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useIntlayer, useLocale } from 'next-intlayer';
import { useAuth } from './hooks/useAuth';
import { useWorkspace } from './contexts/WorkspaceContext';
import { type DashboardRange, useDashboard } from './hooks/useDashboard';
import { useIsMobile } from './hooks/useIsMobile';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { QuickActions } from './components/dashboard/QuickActions';
import { FinancialSnapshot } from './components/dashboard/FinancialSnapshot';
import { CashFlowChart } from './components/dashboard/CashFlowChart';
import { ActionRequired } from './components/dashboard/ActionRequired';
import { RecentActivity } from './components/dashboard/RecentActivity';
import { TopMerchantsCard } from './components/dashboard/TopMerchantsCard';
import { TopCategoriesCard } from './components/dashboard/TopCategoriesCard';
import { RangeSwitcher } from './components/dashboard/RangeSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';

const resolveLocale = (locale: string) => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { locale } = useLocale();
  const t = useIntlayer('dashboardPage' as any) as any;
  const text = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'value' in value) {
      const tokenValue = (value as { value?: string }).value;
      if (typeof tokenValue === 'string') return tokenValue;
    }
    return '';
  };
  const isMobile = useIsMobile();
  const { data, loading, error, refresh, range, changeRange } = useDashboard('30d');

  const needsOnboarding = user?.onboardingCompletedAt == null;

  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (needsOnboarding) { router.replace('/onboarding'); return; }
    if (!currentWorkspace) { router.replace('/workspaces'); }
  }, [authLoading, currentWorkspace, needsOnboarding, router, user, workspaceLoading]);

  const {
    handlers: pullToRefreshHandlers,
    pullDistance,
    isRefreshing: pullRefreshing,
    isReadyToRefresh,
  } = usePullToRefresh({
    enabled: isMobile,
    onRefresh: () => refresh(),
  });

  const formatAmount = useCallback(
    (value: number) => {
      return new Intl.NumberFormat(resolveLocale(locale), {
        style: 'currency',
        currency: data?.snapshot?.currency || 'KZT',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    },
    [locale, data?.snapshot?.currency],
  );

  const rangeLabels: Record<DashboardRange, string> = useMemo(
    () => ({
      '7d': text(t.range?.['7d']),
      '30d': text(t.range?.['30d']),
      '90d': text(t.range?.['90d']),
    }),
    [t],
  );

  const isRedirecting =
    authLoading || workspaceLoading || !user || needsOnboarding || !currentWorkspace;
  const hasSnapshotData = Boolean(
    data &&
      (data.snapshot.totalBalance !== 0 ||
        data.snapshot.income30d !== 0 ||
        data.snapshot.expense30d !== 0 ||
        data.snapshot.totalPayable !== 0 ||
        data.snapshot.totalOverdue !== 0),
  );
  const hasActions = (data?.actions?.length ?? 0) > 0;
  const hasCashFlow = (data?.cashFlow?.length ?? 0) > 0;
  const hasTopMerchants = (data?.topMerchants?.length ?? 0) > 0;
  const hasTopCategories = (data?.topCategories?.length ?? 0) > 0;
  const hasRecentActivity = (data?.recentActivity?.length ?? 0) > 0;
  const topGridCols = hasTopMerchants && hasTopCategories ? 'lg:grid-cols-2' : 'lg:grid-cols-1';

  if (isRedirecting) {
    return (
      <div className="flex min-h-[calc(100vh-var(--global-nav-height,0px))] items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
      </div>
    );
  }

  return (
    <main
      className="min-h-[calc(100vh-var(--global-nav-height,0px))] bg-background"
      {...pullToRefreshHandlers}
    >
      <div className="container-shared space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        {/* Pull-to-refresh indicator */}
        {isMobile && (pullDistance > 0 || pullRefreshing) ? (
          <div className="pointer-events-none flex justify-center">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                isReadyToRefresh || pullRefreshing
                  ? 'border-primary/40 text-primary'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${pullRefreshing ? 'animate-spin' : ''}`} />
              <span>
                {pullRefreshing
                  ? text(t.refresh?.loading)
                  : isReadyToRefresh
                    ? text(t.refresh?.ready)
                    : text(t.refresh?.idle)}
              </span>
            </div>
          </div>
        ) : null}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{text(t.title)}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {currentWorkspace?.name || text(t.workspaceFallback)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RangeSwitcher
              value={range}
              onChange={changeRange}
              labels={rangeLabels}
            />
            {data?.role !== 'viewer' ? (
              <QuickActions
                allowed={
                  data?.role === 'member'
                    ? ['upload', 'expense']
                    : ['upload', 'payment', 'expense']
                }
                labels={{
                  upload: text(t.quickActions?.upload),
                  payment: text(t.quickActions?.payment),
                  expense: text(t.quickActions?.expense),
                }}
              />
            ) : null}
          </div>
        </div>

        {/* Error */}
        {error ? (
          <Card className="border-rose-200 bg-rose-50 shadow-sm">
            <CardContent className="flex items-center gap-2 px-4 py-3 text-sm text-rose-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => refresh()}
                className="ml-auto rounded-full p-1 text-rose-600 transition-colors hover:bg-rose-100"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ) : null}

        {/* Skeleton loading */}
        {loading && !data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={`skeleton-card-${index + 1}`} className="border-gray-200/80 bg-white shadow-sm">
                  <CardContent className="h-20 animate-pulse" />
                </Card>
              ))}
            </div>
            <Card className="border-gray-200/80 bg-white shadow-sm">
              <CardContent className="h-24 animate-pulse" />
            </Card>
            <Card className="border-gray-200/80 bg-white shadow-sm">
              <CardContent className="h-72 animate-pulse" />
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-gray-200/80 bg-white shadow-sm">
                <CardContent className="h-48 animate-pulse" />
              </Card>
              <Card className="border-gray-200/80 bg-white shadow-sm">
                <CardContent className="h-48 animate-pulse" />
              </Card>
            </div>
            <Card className="border-gray-200/80 bg-white shadow-sm">
              <CardContent className="h-64 animate-pulse" />
            </Card>
          </div>
        ) : null}

        {/* Dashboard content */}
        {data ? (
          <>
            {/* Row 1: Summary Cards */}
            {hasSnapshotData ? (
              <FinancialSnapshot
                snapshot={data.snapshot}
                formatAmount={formatAmount}
                labels={{
                  totalBalance: text(t.snapshot?.totalBalance),
                  income: text(t.snapshot?.income),
                  expense: text(t.snapshot?.expense),
                  netFlow: text(t.snapshot?.netFlow),
                  toPay: text(t.snapshot?.toPay),
                  overdue: text(t.snapshot?.overdue),
                }}
              />
            ) : null}

            {/* Row 2: Action Required */}
            {hasActions ? (
              <ActionRequired
                actions={data.actions}
                title={text(t.actions?.title)}
                emptyLabel={text(t.actions?.empty)}
              />
            ) : null}

            {/* Row 3: Cash Flow Chart */}
            {hasCashFlow ? (
              <Card className="border-gray-200/80 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-900">
                    {text(t.cashFlow?.title)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CashFlowChart
                    data={data.cashFlow}
                    emptyLabel={text(t.cashFlow?.empty)}
                  />
                </CardContent>
              </Card>
            ) : null}

            {/* Row 4: Top Merchants + Top Categories */}
            {hasTopMerchants || hasTopCategories ? (
              <div className={`grid gap-4 ${topGridCols}`}>
                {hasTopMerchants ? (
                  <TopMerchantsCard
                    merchants={data.topMerchants ?? []}
                    title={text(t.topMerchants?.title)}
                    emptyLabel={text(t.topMerchants?.empty)}
                    formatAmount={formatAmount}
                  />
                ) : null}
                {hasTopCategories ? (
                  <TopCategoriesCard
                    categories={data.topCategories ?? []}
                    title={text(t.topCategories?.title)}
                    emptyLabel={text(t.topCategories?.empty)}
                    formatAmount={formatAmount}
                  />
                ) : null}
              </div>
            ) : null}

            {/* Row 5: Recent Activity */}
            {hasRecentActivity ? (
              <RecentActivity
                activities={data.recentActivity}
                formatAmount={formatAmount}
                title={text(t.activity?.title)}
                emptyLabel={text(t.activity?.empty)}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
