'use client';

import { Spinner } from '@/app/components/ui/spinner';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import Box from '@mui/material/Box';
import type React from 'react';
import type { DashboardTabId } from '../hooks/useDashboardPage';
import { DashboardErrorBanner } from './DashboardErrorBanner';
import { DashboardHeader } from './DashboardHeader';
import { DashboardTabContent } from './DashboardTabContent';

type DashboardContentProps = {
  error: string | null;
  loading: boolean;
  data: DashboardData | null;
  onRefresh: () => void;
  range: DashboardRange;
  activeTab: DashboardTabId;
  setActiveTab: (tab: DashboardTabId) => void;
  formatAmount: (value: number) => string;
  statusHeading: string;
  greetingSubtitle: string;
  effectivePeriod: string | null;
  displayMonth: Date;
  changeMonth: (year: number, month: number) => void;
  exportMenu: unknown;
  headerLabels: React.ComponentProps<typeof DashboardHeader>['labels'];
};

export function DashboardContent({
  error,
  loading,
  data,
  onRefresh,
  range,
  activeTab,
  setActiveTab,
  formatAmount,
  statusHeading,
  greetingSubtitle,
  effectivePeriod,
  displayMonth,
  changeMonth,
  exportMenu,
  headerLabels,
}: DashboardContentProps): React.JSX.Element {
  if (error) {
    return <DashboardErrorBanner error={error} onRefresh={onRefresh} />;
  }
  if (loading && !data) {
    return (
      <Box
        sx={{
          px: 8,
          pt: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
        }}
      >
        <Spinner size={40} />
      </Box>
    );
  }
  if (!data) {
    return <></>;
  }
  return (
    <>
      <DashboardHeader
        statusHeading={statusHeading}
        greetingSubtitle={greetingSubtitle}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        exportMenu={exportMenu}
        labels={headerLabels}
      />
      <DashboardTabContent
        activeTab={activeTab}
        data={data}
        formatAmount={formatAmount}
        range={range}
        isLoading={loading}
        effectivePeriod={effectivePeriod}
        displayMonth={displayMonth}
        changeMonth={changeMonth}
      />
    </>
  );
}
