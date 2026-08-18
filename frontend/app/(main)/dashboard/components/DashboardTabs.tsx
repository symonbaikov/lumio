'use client';

import { sharedMuiTabsSx } from '@/app/components/ui/mui-tabs';
import { Tab, Tabs } from '@mui/material';
import type React from 'react';
import type { DashboardTabId } from '../hooks/useDashboardPage';

type DashboardTabsLabels = {
  financeOps: string;
  overview: string;
  trends: string;
  dataHealth: string;
};

type DashboardTabsProps = {
  activeTab: DashboardTabId;
  onTabChange: (tab: DashboardTabId) => void;
  labels: DashboardTabsLabels;
};

export function DashboardTabs({
  activeTab,
  onTabChange,
  labels,
}: DashboardTabsProps): React.JSX.Element {
  // eslint-disable-next-line max-params
  const handleChange = (_: React.SyntheticEvent, value: DashboardTabId): void => onTabChange(value);
  return (
    <Tabs
      value={activeTab}
      onChange={handleChange}
      variant="scrollable"
      scrollButtons={false}
      sx={sharedMuiTabsSx}
    >
      <Tab value="finance-ops" label={labels.financeOps} />
      <Tab value="overview" label={labels.overview} />
      <Tab value="trends" label={labels.trends} />
      <Tab value="data-health" label={labels.dataHealth} />
    </Tabs>
  );
}
