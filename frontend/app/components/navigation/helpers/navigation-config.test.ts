import { describe, expect, it } from 'vitest';
import { buildNavItems, buildUserMenuNavItems, isNavItemActive } from './navigation-config';

const nav = {
  dashboard: 'Dashboard',
  statements: 'Statements',
  tables: 'Tables',
  workspaces: 'Workspaces',
  reports: 'Reports',
  netWorth: 'Net worth',
  advice: 'Advice',
  budgets: 'Budgets',
  goals: 'Goals',
  roi: 'Returns',
  subscriptions: 'Subscriptions',
  crypto: 'Crypto',
};

const userMenuNav = {
  activityLog: 'Activity log',
  integrations: 'Integrations',
  plugins: 'Plugins',
  aiAnalysis: 'AI analysis',
  chatMode: 'Chat mode',
};

describe('buildNavItems', () => {
  it('does not include the items that moved into the user menu', () => {
    const items = buildNavItems(nav);

    expect(items.map(item => item.path)).not.toContain('/integrations');
    expect(items.map(item => item.path)).not.toContain('/plugins');
    expect(items.map(item => item.path)).not.toContain('/admin');
    expect(items.map(item => item.path)).not.toContain('/ai-analysis');
    expect(items.map(item => item.path)).not.toContain('/chat');
  });

  it('gates goals behind their own permission and leaves the calculator open', () => {
    const items = buildNavItems(nav);

    expect(items.find(item => item.path === '/goals')?.permission).toBe('goal.view');
    expect(items.find(item => item.path === '/roi')?.permission).toBe('statement.view');
  });

  it('gates crypto behind the wallet permission its endpoints use', () => {
    const items = buildNavItems(nav);

    expect(items.find(item => item.path === '/crypto')?.permission).toBe('wallet.view');
  });

  it('lists net worth next to the other money views', () => {
    const items = buildNavItems(nav);

    expect(items.map(item => item.path)).toContain('/net-worth');
    expect(items.findIndex(item => item.path === '/net-worth')).toBe(
      items.findIndex(item => item.path === '/budgets') - 1,
    );
  });
});

describe('buildUserMenuNavItems', () => {
  it('places AI analysis first, right before chat mode', () => {
    const items = buildUserMenuNavItems(userMenuNav);

    expect(items.at(0)).toMatchObject({
      label: 'AI analysis',
      path: '/ai-analysis',
      permission: 'statement.view',
    });
    expect(items.at(1)).toMatchObject({
      label: 'Chat mode',
      path: '/chat',
      permission: 'statement.view',
    });
  });

  it('marks chat mode experimental so it stays hidden until opted in', () => {
    const items = buildUserMenuNavItems(userMenuNav);

    expect(items.find(item => item.path === '/chat')?.experimental).toBe(true);
    expect(items.find(item => item.path === '/ai-analysis')?.experimental).toBeUndefined();
  });

  it('gates activity log behind the audit log permission', () => {
    const items = buildUserMenuNavItems(userMenuNav);

    expect(items.find(item => item.path === '/admin')?.permission).toBe('audit_log.view');
  });
});

describe('isNavItemActive', () => {
  it('matches the AI analysis route and its children', () => {
    expect(isNavItemActive('/ai-analysis', '/ai-analysis')).toBe(true);
    expect(isNavItemActive('/ai-analysis/chat', '/ai-analysis')).toBe(true);
    expect(isNavItemActive('/statements', '/ai-analysis')).toBe(false);
  });
});
