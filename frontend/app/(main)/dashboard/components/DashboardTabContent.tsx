'use client';

import { DataHealthTab } from '@/app/components/dashboard/DataHealthTab';
import { FinanceOpsTab } from '@/app/components/dashboard/FinanceOpsTab';
import { OverviewTab } from '@/app/components/dashboard/OverviewTab';
import { TrendsTab } from '@/app/components/dashboard/TrendsTab';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import Box from '@mui/material/Box';
import type React from 'react';
import type { DashboardTabId } from '../hooks/useDashboardPage';

type DashboardTabContentProps = {
  activeTab: DashboardTabId;
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading: boolean;
  effectivePeriod: string | null;
  displayMonth: Date;
  changeMonth: (year: number, month: number) => void;
};

export function DashboardTabContent({
  activeTab,
  data,
  formatAmount,
  range,
  isLoading,
  effectivePeriod,
  displayMonth,
  changeMonth,
}: DashboardTabContentProps): React.JSX.Element {
  return (
    <Box sx={{ width: '100%', px: { xs: 2, md: 4 }, py: 4, flex: 1, pb: 6 }}>
      {activeTab === 'finance-ops' && <FinanceOpsTab data={data} formatAmount={formatAmount} />}
      {activeTab === 'overview' && (
        <OverviewTab
          data={data}
          formatAmount={formatAmount}
          range={range}
          isLoading={isLoading}
          effectivePeriod={effectivePeriod}
          displayMonth={displayMonth}
          changeMonth={changeMonth}
        />
      )}
      {activeTab === 'trends' && (
        <TrendsTab data={data} formatAmount={formatAmount} range={range} isLoading={isLoading} />
      )}
      {activeTab === 'data-health' && (
        <DataHealthTab
          data={data}
          formatAmount={formatAmount}
          range={range}
          isLoading={isLoading}
        />
      )}
    </Box>
  );
}
