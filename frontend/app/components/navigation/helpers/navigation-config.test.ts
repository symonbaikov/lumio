import { describe, expect, it } from 'vitest';
import { buildNavItems, isNavItemActive } from './navigation-config';

const nav = {
  dashboard: 'Dashboard',
  statements: 'Statements',
  tables: 'Tables',
  workspaces: 'Workspaces',
  reports: 'Reports',
  budgets: 'Budgets',
  subscriptions: 'Subscriptions',
  activityLog: 'Activity log',
  integrations: 'Integrations',
  plugins: 'Plugins',
  aiAnalysis: 'AI analysis',
  chatMode: 'Chat mode',
};

describe('buildNavItems', () => {
  it('places chat mode last, right after AI analysis', () => {
    const items = buildNavItems(nav);

    expect(items.at(-2)).toMatchObject({
      label: 'AI analysis',
      path: '/ai-analysis',
      permission: 'statement.view',
    });
    expect(items.at(-1)).toMatchObject({
      label: 'Chat mode',
      path: '/chat',
      permission: 'statement.view',
    });
  });
});

describe('isNavItemActive', () => {
  it('matches the AI analysis route and its children', () => {
    expect(isNavItemActive('/ai-analysis', '/ai-analysis')).toBe(true);
    expect(isNavItemActive('/ai-analysis/chat', '/ai-analysis')).toBe(true);
    expect(isNavItemActive('/statements', '/ai-analysis')).toBe(false);
  });
});
