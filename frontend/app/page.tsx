'use client';

import { useIntlayer, useLocale } from '@/app/i18n';
import { Calendar } from '@heroui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@heroui/popover';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
import { Tab, Tabs } from '@mui/material';
import { RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { resolveDashboardStatusHeading } from './lib/dashboard-status-heading';

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
  const fillTemplate = (template: string, values: Record<string, string>) => {
    return Object.entries(values).reduce((acc, [key, value]) => {
      return acc.split(`{${key}}`).join(value);
    }, template);
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

  const greetingName = user?.name || text(t.greeting?.fallbackName) || 'User';
  const pendingReviewCount = data?.dataHealth?.statementsPendingReview ?? 0;
  const lastUploadDate = data?.dataHealth?.lastUploadDate;
  const daysSinceUpload = lastUploadDate
    ? Math.floor((Date.now() - new Date(lastUploadDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isEmptyWorkspace = !lastUploadDate;
  const isStaleImport = !isEmptyWorkspace && daysSinceUpload !== null && daysSinceUpload >= 14;
  const greetingCopy = isEmptyWorkspace
    ? t.greeting?.empty
    : pendingReviewCount > 0
      ? t.greeting?.pendingReview
      : isStaleImport
        ? t.greeting?.stale
        : t.greeting?.upToDate;
  const greetingSubtitle = fillTemplate(text(greetingCopy?.subtitle), {
    name: greetingName,
    count: String(pendingReviewCount),
    days: '14',
  });
  const statusHeadingKey = useMemo(
    () =>
      resolveDashboardStatusHeading({
        data,
        error,
        loading,
      }),
    [data, error, loading],
  );
  const statusHeading = text(t.statusHeading?.[statusHeadingKey]) || 'All good';

  if (isRedirecting) {
    return (
      <div className="flex min-h-[calc(100vh-var(--global-nav-height,0px))] items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
      </div>
    );
  }

  return (
    <main
      className="min-h-[calc(100vh-var(--global-nav-height,0px))] bg-white flex flex-col font-sans"
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

        {/* Swiss Clean Header Section */}
        {data ? (
          <div className="px-10 pt-10 w-full shrink-0 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1
                  className="text-[32px] md:text-[40px] font-medium text-[#0D0D0D] tracking-tight"
                  style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                >
                  {statusHeading}
                </h1>
                <p className="mt-1 text-[14px] text-[#7A7A7A]">{greetingSubtitle}</p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/reports"
                  className="flex items-center gap-2 px-5 py-2.5 border border-[#E8E8E8] text-[#0D0D0D] hover:bg-gray-50 transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <title>Export</title>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span
                    className="text-[13px] font-medium"
                    style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                  >
                    Export
                  </span>
                </Link>
                <Link
                  href="/statements/submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <title>New Record</title>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span
                    className="text-[13px] font-medium"
                    style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                  >
                    New Record
                  </span>
                </Link>
              </div>
            </div>

            <div className="flex items-end justify-between border-b border-[#E8E8E8] pb-0 w-full mt-2">
              <div className="flex px-2">
                <Tabs
                  value={activeTab}
                  onChange={(_, newValue) => setActiveTab(newValue)}
                  sx={{
                    minHeight: '48px',
                    '& .MuiTabs-indicator': {
                      backgroundColor: 'var(--primary)',
                      height: '2px',
                    },
                    '& .MuiTabs-flexContainer': {
                      gap: '40px',
                    },
                    '& .MuiTab-root:hover': {
                      backgroundColor: 'transparent !important',
                      color: '#0D0D0D',
                    },
                  }}
                >
                  <Tab
                    value="overview"
                    label="Overview"
                    disableRipple
                    sx={{
                      fontSize: '13px',
                      letterSpacing: '1px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-dashboard-mono)',
                      textTransform: 'uppercase',
                      color: '#7A7A7A',
                      minWidth: 'auto',
                      padding: '0 0 16px 0',
                      '&.Mui-selected': { color: '#0D0D0D' },
                    }}
                  />
                  <Tab
                    value="trends"
                    label="Trends"
                    disableRipple
                    sx={{
                      fontSize: '13px',
                      letterSpacing: '1px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-dashboard-mono)',
                      textTransform: 'uppercase',
                      color: '#7A7A7A',
                      minWidth: 'auto',
                      padding: '0 0 16px 0',
                      '&.Mui-selected': { color: '#0D0D0D' },
                    }}
                  />
                  <Tab
                    value="data-health"
                    label="Data Health"
                    disableRipple
                    sx={{
                      fontSize: '13px',
                      letterSpacing: '1px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-dashboard-mono)',
                      textTransform: 'uppercase',
                      color: '#7A7A7A',
                      minWidth: 'auto',
                      padding: '0 0 16px 0',
                      '&.Mui-selected': { color: '#0D0D0D' },
                    }}
                  />
                </Tabs>
              </div>
              {/* @ts-ignore */}
              <Popover placement="bottom-end" as="div">
                <PopoverTrigger>
                  <div className="mb-2 flex items-center gap-2 text-[#7A7A7A] text-[13px] font-medium bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer px-4 py-2 border border-[#E8E8E8]">
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
                <PopoverContent className="p-0 border border-[#E8E8E8] bg-white rounded-none shadow-sm">
                  <Calendar
                    aria-label="Date selection"
                    value={targetDate ? parseDate(targetDate) : today(getLocalTimeZone())}
                    onChange={(val: any) => changeTargetDate(val.toString())}
                    classNames={{
                      base: 'bg-white',
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ) : null}

        {/* Content Body */}
        {data ? (
          <div className="bg-white w-full px-10 py-8 flex-1 pb-12">
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
