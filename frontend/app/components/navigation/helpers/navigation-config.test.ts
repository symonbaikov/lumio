import { describe, expect, it } from 'vitest';
import { buildNavItems, isNavItemActive } from './navigation-config';

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
  activityLog: 'Activity log',
  integrations: 'Integrations',
  plugins: 'Plugins',
  aiAnalysis: 'AI analysis',
};

describe('buildNavItems', () => {
  it('places AI analysis last so it renders at the bottom of the sidebar', () => {
    const items = buildNavItems(nav);

    expect(items.at(-1)).toMatchObject({
      label: 'AI analysis',
      path: '/ai-analysis',
      permission: 'statement.view',
    });
  });

  it('gates goals behind their own permission and leaves the calculator open', () => {
    const items = buildNavItems(nav);

    expect(items.find(item => item.path === '/goals')?.permission).toBe('goal.view');
    expect(items.find(item => item.path === '/roi')?.permission).toBe('statement.view');
  });

  it('lists net worth next to the other money views', () => {
    const items = buildNavItems(nav);

    expect(items.map(item => item.path)).toContain('/net-worth');
    expect(items.findIndex(item => item.path === '/net-worth')).toBe(
      items.findIndex(item => item.path === '/budgets') - 1,
    );
  });
});

describe('isNavItemActive', () => {
  it('matches the AI analysis route and its children', () => {
    expect(isNavItemActive('/ai-analysis', '/ai-analysis')).toBe(true);
    expect(isNavItemActive('/ai-analysis/chat', '/ai-analysis')).toBe(true);
    expect(isNavItemActive('/statements', '/ai-analysis')).toBe(false);
  });
});
