/**
 * Фабрика ключей React Query.
 *
 * workspaceId — обязательный сегмент в каждом ключе: apiClient подставляет
 * заголовок X-Workspace-Id из localStorage, поэтому один и тот же URL в разных
 * воркспейсах возвращает разные данные и обязан кэшироваться раздельно.
 *
 * Префиксные сегменты подобраны так, чтобы инвалидация сметала фичу целиком:
 * invalidateQueries({ queryKey: ['crypto'] }).
 */
export const queryKeys = {
  dashboard: (o: { workspaceId: string | null; range: string; date: string | null }) =>
    ['dashboard', o.workspaceId, o.range, o.date] as const,
  dashboardTrends: (o: { workspaceId: string | null; days: number }) =>
    ['dashboard', 'trends', o.workspaceId, o.days] as const,
  statements: (o: { workspaceId: string | null; params: Record<string, unknown> }) =>
    ['statements', o.workspaceId, o.params] as const,
  gmailReceipts: (o: { workspaceId: string | null; params: Record<string, unknown> }) =>
    ['gmail-receipts', o.workspaceId, o.params] as const,
  transactions: (o: { workspaceId: string | null; params: Record<string, unknown> }) =>
    ['transactions', o.workspaceId, o.params] as const,
  categories: (workspaceId: string | null) => ['categories', workspaceId] as const,
  categoryUsage: (workspaceId: string | null) => ['categories', workspaceId, 'usage'] as const,
  goalsList: (workspaceId: string | null) => ['goals', 'list', workspaceId] as const,
  goalFlow: (o: { workspaceId: string | null; goalId: string; month: string }) =>
    ['goals', 'flow', o.workspaceId, o.goalId, o.month] as const,
  goalPlan: (o: { workspaceId: string | null; goalId: string }) =>
    ['goals', 'plan', o.workspaceId, o.goalId] as const,
  goalItems: (o: { workspaceId: string | null; goalId: string }) =>
    ['goals', 'items', o.workspaceId, o.goalId] as const,
  insights: (workspaceId: string | null) => ['insights', workspaceId] as const,
  integrationStatus: (o: { workspaceId: string | null; apiPath: string }) =>
    ['integration-status', o.workspaceId, o.apiPath] as const,
  webhookEndpoints: (workspaceId: string | null) => ['webhook-endpoints', workspaceId] as const,
  webhookSubscriptions: (workspaceId: string | null) =>
    ['webhook-subscriptions', workspaceId] as const,
  apiKeys: (workspaceId: string | null) => ['api-keys', workspaceId] as const,
  customTables: (workspaceId: string | null) => ['custom-tables', workspaceId] as const,
  adminUsers: (workspaceId: string | null) => ['admin-users', workspaceId] as const,
  budgets: (workspaceId: string | null) => ['budgets', workspaceId] as const,
  balanceSheet: (o: { workspaceId: string | null; date: string | null; locale: string }) =>
    ['balance-sheet', o.workspaceId, o.date, o.locale] as const,
  tablesReport: (o: { workspaceId: string | null; params: Record<string, unknown> }) =>
    ['tables-report', o.workspaceId, o.params] as const,
  storageFiles: (o: { workspaceId: string | null; listMode: 'active' | 'trash' }) =>
    ['storage-files', o.workspaceId, o.listMode] as const,
  taxReturn: (o: { workspaceId: string | null; periodStart: string; periodEnd: string }) =>
    ['tax-return', o.workspaceId, o.periodStart, o.periodEnd] as const,
  subscriptions: (o: { workspaceId: string | null; status: string }) =>
    ['subscriptions', o.workspaceId, 'list', o.status] as const,
  subscriptionsSummary: (workspaceId: string | null) =>
    ['subscriptions', workspaceId, 'summary'] as const,
  auditEvents: (o: { workspaceId: string | null; params: Record<string, unknown> }) =>
    ['audit-events', o.workspaceId, o.params] as const,
  netWorth: (o: { workspaceId: string | null; range: string }) =>
    ['net-worth', o.workspaceId, o.range] as const,
  cryptoWallets: (workspaceId: string | null) => ['crypto', 'wallets', workspaceId] as const,
  cryptoSummary: (workspaceId: string | null) => ['crypto', 'summary', workspaceId] as const,
  notifications: (workspaceId: string | null) => ['notifications', workspaceId] as const,
  notes: (o: { workspaceId: string | null; entityType: string; entityId: string }) =>
    ['notes', o.workspaceId, o.entityType, o.entityId] as const,
  noteCounts: (o: { workspaceId: string | null; entityType: string; entityIds: string[] }) =>
    ['notes', 'counts', o.workspaceId, o.entityType, o.entityIds] as const,
  workspaceMembers: (workspaceId: string | null) => ['workspace-members', workspaceId] as const,
} as const;
