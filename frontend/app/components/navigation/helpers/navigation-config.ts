import { BarChart2, Building2, CreditCard, FileText, LayoutDashboard, PiggyBank, Plug, Puzzle, ScrollText, Table } from '@/app/components/icons';
import React, { type ReactNode } from 'react';
import { DEFAULT_APP_ROUTE } from '@/app/lib/default-app-route';
export const MOBILE_MENU_VISIBILITY_EVENT = 'lumio-mobile-menu-visibility';

export type { AppLocale as AppLanguage } from '@/app/lib/locale';

export interface NavItem {
  label: ReactNode;
  path: string;
  icon: React.ReactElement;
  permission: string;
}

export function buildNavItems(nav: {
  dashboard: unknown;
  statements: unknown;
  tables: unknown;
  workspaces: unknown;
  reports: unknown;
  budgets: unknown;
  subscriptions: unknown;
  activityLog: unknown;
  integrations: unknown;
  plugins: unknown;
}): NavItem[] {
  return [
    {
      label: nav.dashboard as ReactNode,
      path: DEFAULT_APP_ROUTE,
      icon: React.createElement(LayoutDashboard, { size: 18 }),
      permission: 'statement.view',
    },
    {
      label: nav.statements as ReactNode,
      path: '/statements',
      icon: React.createElement(FileText, { size: 18 }),
      permission: 'statement.view',
    },
    {
      label: nav.tables as ReactNode,
      path: '/custom-tables',
      icon: React.createElement(Table, { size: 18 }),
      permission: 'statement.view',
    },
    {
      label: nav.workspaces as ReactNode,
      path: '/workspaces',
      icon: React.createElement(Building2, { size: 18 }),
      permission: 'workspaces.view',
    },
    {
      label: nav.reports as ReactNode,
      path: '/reports',
      icon: React.createElement(BarChart2, { size: 18 }),
      permission: 'statement.view',
    },
    {
      label: nav.budgets as ReactNode,
      path: '/budgets',
      icon: React.createElement(PiggyBank, { size: 18 }),
      permission: 'budget.view',
    },
    {
      label: nav.subscriptions as ReactNode,
      path: '/subscriptions',
      icon: React.createElement(CreditCard, { size: 18 }),
      permission: 'subscription.view',
    },
    {
      label: nav.integrations as ReactNode,
      path: '/integrations',
      icon: React.createElement(Plug, { size: 18 }),
      permission: 'google_sheet.view',
    },
    {
      label: nav.plugins as ReactNode,
      path: '/plugins',
      icon: React.createElement(Puzzle, { size: 18 }),
      permission: 'google_sheet.view',
    },
    {
      label: nav.activityLog as ReactNode,
      path: '/admin',
      icon: React.createElement(ScrollText, { size: 18 }),
      permission: 'audit_log.view',
    },
  ];
}

export function isNavItemActive(pathname: string, itemPath: string): boolean {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
