'use client';

import { ExportDropdown } from '@/app/components/dashboard/ExportDropdown';
import { Plus } from '@/app/components/icons';
import Link from 'next/link';
import type React from 'react';
import type { DashboardTabId } from '../helpers/dashboard-url-state';
import { DashboardTabs, type DashboardTabsLabels } from './DashboardTabs';
import { MonthStrip, type MonthStripLabels } from './MonthStrip';

export type DashboardHeaderLabels = {
  tabs: DashboardTabsLabels;
  uploadStatement: string;
  monthStrip: MonthStripLabels;
};

type DashboardHeaderProps = {
  statusHeading: string;
  greetingSubtitle: string;
  activeTab: DashboardTabId;
  onTabChange: (tab: DashboardTabId) => void;
  displayMonth: Date;
  changeMonth: (year: number, month: number) => void;
  locale: string;
  /** "Showing latest available period …" when the backend auto-shifted the window. */
  periodBanner: string | null;
  exportMenu: unknown;
  labels: DashboardHeaderLabels;
};

export function DashboardHeader({
  statusHeading,
  greetingSubtitle,
  activeTab,
  onTabChange,
  displayMonth,
  changeMonth,
  locale,
  periodBanner,
  exportMenu,
  labels,
}: DashboardHeaderProps): React.JSX.Element {
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
          <ExportDropdown t={exportMenu as React.ComponentProps<typeof ExportDropdown>['t']} />
          <Link
            href="/statements?openExpenseDrawer=scan"
            className="lumio-dashboard-header__icon-btn"
            aria-label={labels.uploadStatement}
            title={labels.uploadStatement}
          >
            <Plus size={22} />
          </Link>
        </div>
      </div>
      <div className="lumio-dashboard-header__tabs">
        <DashboardTabs activeTab={activeTab} onTabChange={onTabChange} labels={labels.tabs} />
      </div>
      <div className="lumio-dashboard-header__controls">
        <MonthStrip
          displayMonth={displayMonth}
          onChange={changeMonth}
          locale={locale}
          labels={labels.monthStrip}
        />
        {periodBanner && <div className="lumio-dashboard__period-banner">{periodBanner}</div>}
      </div>
    </div>
  );
}
