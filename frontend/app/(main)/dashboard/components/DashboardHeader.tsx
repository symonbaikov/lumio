'use client';

import { ExportDropdown } from '@/app/components/dashboard/ExportDropdown';
import { Plus } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import type React from 'react';
import type { DashboardTabId } from '../hooks/useDashboardPage';
import { DashboardTabs } from './DashboardTabs';

type DashboardHeaderLabels = {
  tabs: { financeOps: string; overview: string; trends: string; dataHealth: string };
  uploadStatement: string;
};

type DashboardHeaderProps = {
  statusHeading: string;
  greetingSubtitle: string;
  activeTab: DashboardTabId;
  onTabChange: (tab: DashboardTabId) => void;
  exportMenu: unknown;
  labels: DashboardHeaderLabels;
};

export function DashboardHeader({
  statusHeading,
  greetingSubtitle,
  activeTab,
  onTabChange,
  exportMenu,
  labels,
}: DashboardHeaderProps): React.JSX.Element {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;

  return (
    <div className="lumio-dashboard-header">
      <div className="lumio-dashboard-header__row">
        <div>
          <h1 className="lumio-dashboard-header__title">{statusHeading}</h1>
          {greetingSubtitle && (
            <p className="lumio-dashboard-header__subtitle">{greetingSubtitle}</p>
          )}
        </div>
        <div className="lumio-dashboard-header__actions">
          <ExportDropdown t={exportMenu} />
          <Link
            href="/statements?openExpenseDrawer=scan"
            className="lumio-dashboard-header__icon-btn lumio-dashboard-header__icon-btn--upload"
            aria-label={labels.uploadStatement}
            title={labels.uploadStatement}
          >
            <Plus size={22} />
          </Link>
        </div>
      </div>
      <div style={{ marginTop: 24, borderBottom: `1px solid ${c.border}` }}>
        <DashboardTabs activeTab={activeTab} onTabChange={onTabChange} labels={labels.tabs} />
      </div>
    </div>
  );
}
