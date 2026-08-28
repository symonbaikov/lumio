import {
  BarChart2,
  Building2,
  Calculator,
  CreditCard,
  FileText,
  Flag,
  LayoutDashboard,
  Lightbulb,
  MessageCircle,
  PiggyBank,
  Plug,
  Puzzle,
  ScrollText,
  Sparkles,
  Table,
  TrendingUp,
  Wallet,
} from '@/app/components/icons';
import { DEFAULT_APP_ROUTE } from '@/app/lib/default-app-route';
import React, { type ReactNode } from 'react';
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
  netWorth: unknown;
  advice: unknown;
  budgets: unknown;
  goals: unknown;
  roi: unknown;
  subscriptions: unknown;
  crypto: unknown;
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
      label: nav.netWorth as ReactNode,
      path: '/net-worth',
      icon: React.createElement(TrendingUp, { size: 18 }),
      // Matches the endpoint's own guard (Permission.REPORT_VIEW) so the item
      // is not offered to roles that would only get a 403 from it.
      permission: 'report.view',
    },
    {
      label: nav.budgets as ReactNode,
      path: '/budgets',
      icon: React.createElement(PiggyBank, { size: 18 }),
      permission: 'budget.view',
    },
    {
      label: nav.advice as ReactNode,
      path: '/advice',
      icon: React.createElement(Lightbulb, { size: 18 }),
      permission: 'statement.view',
    },
    {
      label: nav.goals as ReactNode,
      path: '/goals',
      icon: React.createElement(Flag, { size: 18 }),
      permission: 'goal.view',
    },
    {
      label: nav.roi as ReactNode,
      path: '/roi',
      icon: React.createElement(Calculator, { size: 18 }),
      // A standalone calculator that reads nothing of the workspace's data,
      // so being a member is enough to open it.
      permission: 'statement.view',
    },
    {
      label: nav.subscriptions as ReactNode,
      path: '/subscriptions',
      icon: React.createElement(CreditCard, { size: 18 }),
      permission: 'subscription.view',
    },
    {
      label: nav.crypto as ReactNode,
      path: '/crypto',
      // Crypto wallets are wallets: the endpoints guard on the same permission,
      // so the item is offered to exactly the roles that can open it.
      icon: React.createElement(Wallet, { size: 18 }),
      permission: 'wallet.view',
    },
  ];
}

export function buildUserMenuNavItems(nav: {
  activityLog: unknown;
  integrations: unknown;
  plugins: unknown;
  aiAnalysis: unknown;
  chatMode: unknown;
}): NavItem[] {
  return [
    {
      label: nav.aiAnalysis as ReactNode,
      path: '/ai-analysis',
      icon: React.createElement(Sparkles, { size: 18 }),
      permission: 'statement.view',
    },
    {
      label: nav.chatMode as ReactNode,
      path: '/chat',
      icon: React.createElement(MessageCircle, { size: 18 }),
      permission: 'statement.view',
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
