'use client';

import { Calendar } from '@heroui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@heroui/popover';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
import { Tab, Tabs } from '@mui/material';
import { RefreshCcw } from 'lucide-react';
import { useIntlayer, useLocale } from "@/app/i18n";
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { DataHealthTab } from './components/dashboard/DataHealthTab';
import { OverviewTab } from './components/dashboard/OverviewTab';
import { QuickActionsBar } from './components/dashboard/QuickActionsBar';
import { TrendsTab } from './components/dashboard/TrendsTab';
import { Card, CardContent } from './components/ui/card';
import { useWorkspace } from './contexts/WorkspaceContext';
import { useAuth } from './hooks/useAuth';
import { useDashboard } from './hooks/useDashboard';
import { useIsMobile } from './hooks/useIsMobile';
import { usePullToRefresh } from './hooks/usePullToRefresh';

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
  const { data, loading, error, refresh, range, targetDate, changeTargetDate } =
    useDashboard('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'data-health'>('overview');

  const needsOnboarding = user?.onboardingCompletedAt == null;

  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (needsOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (!currentWorkspace) {
      router.replace('/workspaces');
    }
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

  const isRedirecting =
    authLoading || workspaceLoading || !user || needsOnboarding || !currentWorkspace;

  if (isRedirecting) {
    return (
      <div className="flex min-h-[calc(100vh-var(--global-nav-height,0px))] items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
      </div>
    );
  }

  return (
    <main
      className="min-h-[calc(100vh-var(--global-nav-height,0px))] bg-[#1a2130] flex flex-col"
      {...pullToRefreshHandlers}
    >
      <div className="w-full flex-1 flex flex-col">
        {/* Pull-to-refresh indicator */}
        {isMobile && (pullDistance > 0 || pullRefreshing) ? (
          <div className="pointer-events-none flex justify-center pt-4">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                isReadyToRefresh || pullRefreshing
                  ? 'border-primary/40 text-primary bg-white'
                  : 'border-gray-200 text-gray-500 bg-white'
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

        {/* Error */}
        {error ? (
          <div className="px-8 pt-6">
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
          </div>
        ) : null}

        {/* Skeleton loading */}
        {loading && !data ? (
          <div className="px-8 pt-8 flex items-center justify-center min-h-[50vh]">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        ) : null}

        {/* Finlab Dark Header Section */}
        {data ? (
          <div className="px-8 pt-8 w-full shrink-0">
            <h1 className="text-[28px] font-bold text-white tracking-tight">
              Welcome back, {user?.name || 'User'} <span className="ml-1">👋</span>
            </h1>

            <div className="mt-6 flex items-end justify-between border-b border-white/10 pb-0 w-full">
              <div className="flex px-2">
                <Tabs
                  value={activeTab}
                  onChange={(_, newValue) => setActiveTab(newValue)}
                  sx={{
                    minHeight: '48px',
                    '& .MuiTabs-indicator': {
                      backgroundColor: 'var(--primary)',
                      height: '3px',
                    },
                    '& .MuiTabs-flexContainer': {
                      gap: '40px',
                    },
                    '& .MuiTab-root:hover': {
                      backgroundColor: 'transparent !important',
                      color: '#ffffff',
                    },
                  }}
                >
                  <Tab
                    value="overview"
                    label="Overview"
                    disableRipple
                    sx={{
                      textTransform: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#94a3b8',
                      minWidth: 'auto',
                      padding: '0 0 16px 0',
                      '&.Mui-selected': { color: '#ffffff' },
                    }}
                  />
                  <Tab
                    value="trends"
                    label="Trends"
                    disableRipple
                    sx={{
                      textTransform: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#94a3b8',
                      minWidth: 'auto',
                      padding: '0 0 16px 0',
                      '&.Mui-selected': { color: '#ffffff' },
                    }}
                  />
                  <Tab
                    value="data-health"
                    label="Data Health"
                    disableRipple
                    sx={{
                      textTransform: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#94a3b8',
                      minWidth: 'auto',
                      padding: '0 0 16px 0',
                      '&.Mui-selected': { color: '#ffffff' },
                    }}
                  />
                </Tabs>
              </div>
              <Popover placement="bottom-end">
                <PopoverTrigger>
                  <div className="mb-2 flex items-center gap-2 text-slate-300 text-[13px] font-medium bg-white/5 hover:bg-white/10 transition-colors cursor-pointer px-4 py-2 rounded-xl border border-white/10">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-label="Calendar icon"
                    >
                      <title>Calendar</title>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {targetDate
                      ? new Date(targetDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : new Date().toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="p-0 border-none bg-transparent">
                  <Calendar
                    aria-label="Date selection"
                    value={targetDate ? parseDate(targetDate) : today(getLocalTimeZone())}
                    onChange={val => changeTargetDate(val.toString())}
                    classNames={{
                      base: 'bg-white dark:bg-[#0b1220] rounded-xl shadow-xl',
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ) : null}

        {/* Finlab White Content Body */}
        {data ? (
          <div className="bg-background w-full px-8 py-5 flex-1 rounded-bl-3xl lg:rounded-bl-[40px] rounded-br-3xl lg:rounded-br-[40px] lg:rounded-b-none pb-12 lg:pb-8">
            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between mb-4">
              <QuickActionsBar
                reviewCount={
                  data.actions
                    ?.filter(a =>
                      ['statements_pending_review', 'receipts_pending_review'].includes(a.type),
                    )
                    .reduce((sum, a) => sum + a.count, 0) || 0
                }
              />
            </div>

            {activeTab === 'overview' && (
              <OverviewTab
                data={data}
                formatAmount={formatAmount}
                range={range}
                isLoading={loading}
              />
            )}

            {activeTab === 'trends' && (
              <TrendsTab
                data={data}
                formatAmount={formatAmount}
                range={range}
                isLoading={loading}
              />
            )}

            {activeTab === 'data-health' && (
              <DataHealthTab
                data={data}
                formatAmount={formatAmount}
                range={range}
                isLoading={loading}
              />
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
