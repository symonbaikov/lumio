'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import type { DashboardData } from '@/app/hooks/useDashboard';
import { useDashboard } from '@/app/hooks/useDashboard';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';
import { useIntlayer, useLocale } from '@/app/i18n';
import { resolveDashboardEffectivePeriod } from '@/app/lib/dashboard-effective-window';
import { resolveDashboardStatusHeading } from '@/app/lib/dashboard-status-heading';
import {
  fillTemplate,
  formatDateOnly,
  parseDateOnly,
  resolveDashboardGreetingData,
  resolveGreetingState,
  resolveLocale,
  statusHeadingFallback,
  text,
} from '../helpers/dashboard-helpers';
import {
  type DashboardTabId,
  DEFAULT_DASHBOARD_TAB,
  formatMonthParam,
  parseMonthParam,
  parseTabParam,
  withDashboardParams,
} from '../helpers/dashboard-url-state';
import { useDashboardRedirect } from './useDashboardRedirect';

export type { DashboardTabId } from '../helpers/dashboard-url-state';

type DashboardPageText = {
  greeting?: Record<string, unknown> & { fallbackName?: unknown };
  statusHeading?: Record<string, unknown>;
};

/** Month and active tab live in the URL so a reload or shared link restores the view. */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useDashboardUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? '';
  // `null` means "no explicit month picked yet" — the backend defaults to the
  // current month and auto-shifts to the latest month with data. Once the
  // user picks a month, auto-shift is disabled for good.
  const pickedMonth = useMemo(() => parseMonthParam(searchParams?.get('month')), [searchParams]);
  const activeTab = parseTabParam(searchParams?.get('tab'));
  const navigate = useCallback(
    (patch: { month?: string | null; tab?: string | null }): void => {
      const next = withDashboardParams(query, patch);
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [router, pathname, query],
  );
  const changeMonth = useCallback(
    (year: number, month: number): void => {
      navigate({ month: formatMonthParam(new Date(year, month, 1)) });
    },
    [navigate],
  );
  const setActiveTab = useCallback(
    (tab: DashboardTabId): void => {
      navigate({ tab: tab === DEFAULT_DASHBOARD_TAB ? null : tab });
    },
    [navigate],
  );
  return { pickedMonth, activeTab, changeMonth, setActiveTab };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function useDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { locale } = useLocale();
  const t = useIntlayer('dashboardPage');
  const headerT = useIntlayer('dashboardHeader');
  const dashboardText = t as unknown as DashboardPageText;
  const isMobile = useIsMobile();
  const { pickedMonth, activeTab, changeMonth, setActiveTab } = useDashboardUrlState();
  const targetDateParam = pickedMonth ? formatDateOnly(pickedMonth) : undefined;
  const { data, isPending, error, refetch, range } = useDashboard('month', targetDateParam);
  const effectiveSince = data?.effectiveSince;
  const displayMonth = useMemo(() => {
    if (pickedMonth) {
      return pickedMonth;
    }
    if (effectiveSince) {
      return parseDateOnly(effectiveSince);
    }
    return new Date();
  }, [pickedMonth, effectiveSince]);
  const isRedirecting = useDashboardRedirect({
    user,
    authLoading,
    currentWorkspace,
    workspaceLoading,
  });
  const {
    handlers: pullHandlers,
    pullDistance,
    isRefreshing: pullRefreshing,
    isReadyToRefresh,
  } = usePullToRefresh({
    enabled: isMobile,
    onRefresh: () => {
      void refetch();
    },
  });
  // One formatter per locale/currency: Intl.NumberFormat construction is
  // expensive and this runs once per row in several dashboard cards.
  const currency = data?.snapshot?.currency ?? 'KZT';
  const amountFormatter = useMemo(
    () =>
      new Intl.NumberFormat(resolveLocale(locale), {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    [locale, currency],
  );
  const formatAmount = useCallback(
    (value: number): string => amountFormatter.format(value),
    [amountFormatter],
  );
  // eslint-disable-next-line complexity
  const { statusHeading, greetingSubtitle, effectivePeriod } = useMemo(() => {
    const greetingData = resolveDashboardGreetingData({
      lastUploadDate: data?.dataHealth?.lastUploadDate ?? null,
      pendingReviewCount: data?.dataHealth?.statementsPendingReview ?? 0,
    });
    const greetingState = resolveGreetingState(greetingData);
    const greetingName = user?.name ?? text(dashboardText.greeting?.fallbackName) ?? 'User';
    const count = String(data?.dataHealth?.statementsPendingReview ?? 0);
    const greetingCopy = dashboardText.greeting?.[greetingState] as
      | { subtitle?: unknown }
      | undefined;
    const subtitle = fillTemplate(text(greetingCopy?.subtitle), {
      name: greetingName,
      count,
      days: '14',
    });
    const headingKey = resolveDashboardStatusHeading({
      data: (data ?? null) as DashboardData | null,
      error,
      loading: isPending,
    });
    const heading =
      text(dashboardText.statusHeading?.[headingKey]) || statusHeadingFallback[headingKey];
    const period = resolveDashboardEffectivePeriod(data?.effectiveSince, data?.effectiveEndDate);
    return { statusHeading: heading, greetingSubtitle: subtitle, effectivePeriod: period };
  }, [dashboardText.greeting, dashboardText.statusHeading, data, error, isPending, user?.name]);
  const periodBanner = effectivePeriod
    ? fillTemplate(headerT.periodBanner.value, { period: effectivePeriod })
    : null;
  const headerLabels = {
    tabs: {
      financeOps: t.tabs.financeOps.value,
      overview: t.tabs.overview.value,
      trends: t.tabs.trends.value,
      dataHealth: t.tabs.dataHealth.value,
    },
    uploadStatement: headerT.uploadStatement.value,
    monthStrip: {
      group: headerT.monthStripLabel.value,
      previousYear: headerT.previousYear.value,
      nextYear: headerT.nextYear.value,
    },
  };
  return {
    data,
    isPending,
    error,
    refetch,
    range,
    activeTab,
    setActiveTab,
    isMobile,
    pullHandlers,
    pullDistance,
    pullRefreshing,
    isReadyToRefresh,
    isRedirecting,
    formatAmount,
    statusHeading,
    greetingSubtitle,
    periodBanner,
    displayMonth,
    changeMonth,
    locale,
    headerLabels,
    t,
  };
}
