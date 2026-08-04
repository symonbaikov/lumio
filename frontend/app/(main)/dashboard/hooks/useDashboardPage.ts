'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import type { DashboardData } from '@/app/hooks/useDashboard';
import { useDashboard } from '@/app/hooks/useDashboard';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';
import { useIntlayer, useLocale } from '@/app/i18n';
import { resolveDashboardEffectivePeriod } from '@/app/lib/dashboard-effective-window';
import { resolveDashboardStatusHeading } from '@/app/lib/dashboard-status-heading';
import { resolveCurrencyCode } from '@/app/lib/format-money';
import { useCallback, useMemo, useState } from 'react';
import {
  fillTemplate,
  resolveDashboardGreetingData,
  resolveGreetingState,
  resolveLocale,
  statusHeadingFallback,
  text,
} from '../helpers/dashboard-helpers';
import { useDashboardRedirect } from './useDashboardRedirect';

export type DashboardTabId = 'finance-ops' | 'overview' | 'trends' | 'data-health';

type DashboardPageText = {
  greeting?: Record<string, unknown> & { fallbackName?: unknown };
  statusHeading?: Record<string, unknown>;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function useDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { locale } = useLocale();
  const t = useIntlayer('dashboardPage');
  const dashboardText = t as unknown as DashboardPageText;
  const isMobile = useIsMobile();
  const { data, loading, error, refresh, range } = useDashboard('30d');
  const [activeTab, setActiveTab] = useState<DashboardTabId>('finance-ops');
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
      void refresh();
    },
  });
  const snapshotCurrency = resolveCurrencyCode(
    data?.snapshot?.currency ?? currentWorkspace?.currency,
  );
  const formatAmount = useCallback(
    (value: number): string =>
      new Intl.NumberFormat(resolveLocale(locale), {
        style: 'currency',
        currency: snapshotCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value),
    [locale, snapshotCurrency],
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
    const greetingCopy = dashboardText.greeting?.[greetingState] as { subtitle?: unknown } | undefined;
    const subtitle = fillTemplate(text(greetingCopy?.subtitle), {
      name: greetingName,
      count,
      days: '14',
    });
    const headingKey = resolveDashboardStatusHeading({
      data: data as DashboardData | null,
      error,
      loading,
    });
    const heading = text(dashboardText.statusHeading?.[headingKey]) || statusHeadingFallback[headingKey];
    const period = resolveDashboardEffectivePeriod(data?.effectiveSince, data?.effectiveEndDate);
    return { statusHeading: heading, greetingSubtitle: subtitle, effectivePeriod: period };
  }, [dashboardText.greeting, dashboardText.statusHeading, data, error, loading, user?.name]);
  return {
    data,
    loading,
    error,
    refresh,
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
    effectivePeriod,
    t,
  };
}
