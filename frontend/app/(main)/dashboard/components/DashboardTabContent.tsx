'use client';

import { DataHealthTab } from '@/app/components/dashboard/DataHealthTab';
import { FinanceOpsTab } from '@/app/components/dashboard/FinanceOpsTab';
import { OverviewTab } from '@/app/components/dashboard/OverviewTab';
import { TrendsTab } from '@/app/components/dashboard/TrendsTab';
import type { DashboardData } from '@/app/hooks/useDashboard';
import Box from '@mui/material/Box';
import type React from 'react';
import type { DashboardTabId } from '../helpers/dashboard-url-state';

type DashboardTabContentProps = {
  activeTab: DashboardTabId;
  data: DashboardData;
  formatAmount: (value: number) => string;
  isLoading: boolean;
  displayMonth: Date;
};

export function DashboardTabContent({
  activeTab,
  data,
  formatAmount,
  isLoading,
  displayMonth,
}: DashboardTabContentProps): React.JSX.Element {
  return (
    <Box sx={{ width: '100%', px: { xs: 2, md: 4 }, pt: 2.5, flex: 1, pb: 6 }}>
      {activeTab === 'finance-ops' && <FinanceOpsTab data={data} formatAmount={formatAmount} />}
      {activeTab === 'overview' && (
        <OverviewTab
          data={data}
          formatAmount={formatAmount}
          isLoading={isLoading}
          displayMonth={displayMonth}
        />
      )}
      {activeTab === 'trends' && (
        <TrendsTab data={data} formatAmount={formatAmount} displayMonth={displayMonth} />
      )}
      {activeTab === 'data-health' && <DataHealthTab data={data} formatAmount={formatAmount} />}
    </Box>
  );
}
