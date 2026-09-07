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
  insights: (workspaceId: string | null) => ['insights', workspaceId] as const,
  cryptoWallets: (workspaceId: string | null) => ['crypto', 'wallets', workspaceId] as const,
  cryptoSummary: (workspaceId: string | null) => ['crypto', 'summary', workspaceId] as const,
  notifications: (workspaceId: string | null) => ['notifications', workspaceId] as const,
} as const;
