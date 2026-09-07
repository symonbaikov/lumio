import { describe, expect, it } from 'vitest';
import { queryKeys } from './query-keys';

/**
 * Снапшот форм ключей. Перестановка или пропажа сегмента молча раскалывает
 * кэш надвое (или, хуже, склеивает данные двух воркспейсов) — без падения тестов.
 */
describe('queryKeys', () => {
  it('keeps every key shape stable', () => {
    expect({
      dashboard: queryKeys.dashboard({ workspaceId: 'w1', range: '30d', date: null }),
      dashboardTrends: queryKeys.dashboardTrends({ workspaceId: 'w1', days: 30 }),
      statements: queryKeys.statements({ workspaceId: 'w1', params: { stage: 'submit' } }),
      gmailReceipts: queryKeys.gmailReceipts({ workspaceId: 'w1', params: { limit: 50 } }),
      transactions: queryKeys.transactions({ workspaceId: 'w1', params: { limit: 500 } }),
      categories: queryKeys.categories('w1'),
      insights: queryKeys.insights('w1'),
      cryptoWallets: queryKeys.cryptoWallets('w1'),
      cryptoSummary: queryKeys.cryptoSummary('w1'),
      notifications: queryKeys.notifications('w1'),
    }).toEqual({
      dashboard: ['dashboard', 'w1', '30d', null],
      dashboardTrends: ['dashboard', 'trends', 'w1', 30],
      statements: ['statements', 'w1', { stage: 'submit' }],
      gmailReceipts: ['gmail-receipts', 'w1', { limit: 50 }],
      transactions: ['transactions', 'w1', { limit: 500 }],
      categories: ['categories', 'w1'],
      insights: ['insights', 'w1'],
      cryptoWallets: ['crypto', 'wallets', 'w1'],
      cryptoSummary: ['crypto', 'summary', 'w1'],
      notifications: ['notifications', 'w1'],
    });
  });

  it('carries the workspace id so two workspaces never share a cache entry', () => {
    const a = queryKeys.dashboard({ workspaceId: 'w1', range: '30d', date: null });
    const b = queryKeys.dashboard({ workspaceId: 'w2', range: '30d', date: null });
    expect(a).not.toEqual(b);
  });

  it('nests crypto keys under one prefix so a single invalidation sweeps the feature', () => {
    expect(queryKeys.cryptoWallets('w1')[0]).toBe('crypto');
    expect(queryKeys.cryptoSummary('w1')[0]).toBe('crypto');
  });
});
