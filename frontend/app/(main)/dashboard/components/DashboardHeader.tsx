'use client';

import { ExportDropdown } from '@/app/components/dashboard/ExportDropdown';
import { Plus } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import type React from 'react';
import type { DashboardTabId } from '../hooks/useDashboardPage';
import { DashboardTabs } from './DashboardTabs';

type DashboardHeaderProps = {
  statusHeading: string;
  greetingSubtitle: string;
  activeTab: DashboardTabId;
  onTabChange: (tab: DashboardTabId) => void;
  exportMenu: unknown;
};

export function DashboardHeader({
  statusHeading,
  greetingSubtitle,
  activeTab,
  onTabChange,
  exportMenu,
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 48,
              backgroundColor: c.primaryFill,
              color: '#fff',
              padding: '0 20px',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1,
              borderRadius: tokens.radius.md,
              textDecoration: 'none',
              transition: 'background-color 150ms',
            }}
          >
            <Plus size={16} />
            Upload statement
          </Link>
        </div>
      </div>
      <div style={{ marginTop: 24, borderBottom: `1px solid ${c.border}` }}>
        <DashboardTabs activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </div>
  );
}
