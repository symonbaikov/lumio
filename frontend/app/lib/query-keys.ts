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
  dashboardTrends: (o: { workspaceId: string | null; days: number; month: string | null }) =>
    ['dashboard', 'trends', o.workspaceId, o.days, o.month] as const,
  dashboardHealthHistory: (o: { workspaceId: string | null; year: number }) =>
    ['dashboard', 'health-history', o.workspaceId, o.year] as const,
  dashboardCashFlow: (o: { workspaceId: string | null; range: string; month: string | null }) =>
    ['dashboard', 'cash-flow', o.workspaceId, o.range, o.month] as const,
  statements: (o: { workspaceId: string | null; params: Record<string, unknown> }) =>
    ['statements', o.workspaceId, o.params] as const,
  gmailReceipts: (o: { workspaceId: string | null; params: Record<string, unknown> }) =>
    ['gmail-receipts', o.workspaceId, o.params] as const,
  transactions: (o: { workspaceId: string | null; params: Record<string, unknown> }) =>
    ['transactions', o.workspaceId, o.params] as const,
  categories: (workspaceId: string | null) => ['categories', workspaceId] as const,
  wallets: (workspaceId: string | null) => ['wallets', workspaceId] as const,
  payablePaymentCandidates: (o: { workspaceId: string | null; payableId: string }) =>
    ['payables', o.workspaceId, o.payableId, 'payment-candidates'] as const,
  // Tile-server configuration is the same in every workspace, hence no workspace segment.
  mapStyles: () => ['map-styles'] as const,
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
  integrationCatalogStatuses: (workspaceId: string | null) =>
    ['integration-status', workspaceId, 'catalog'] as const,
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
  // Prefix ['income-tax', workspaceId] invalidates every part of the declaration at once.
  incomeTaxDisclaimer: (workspaceId: string | null) =>
    ['income-tax', workspaceId, 'disclaimer'] as const,
  incomeTaxProfile: (o: { workspaceId: string | null; taxYear: number }) =>
    ['income-tax', o.workspaceId, 'profile', o.taxYear] as const,
  incomeTaxMappings: (o: { workspaceId: string | null; taxYear: number }) =>
    ['income-tax', o.workspaceId, 'mappings', o.taxYear] as const,
  incomeTaxDraft: (o: { workspaceId: string | null; taxYear: number }) =>
    ['income-tax', o.workspaceId, 'draft', o.taxYear] as const,
  subscriptions: (o: { workspaceId: string | null; status: string }) =>
    ['subscriptions', o.workspaceId, 'list', o.status] as const,
  subscriptionsSummary: (workspaceId: string | null) =>
    ['subscriptions', workspaceId, 'summary'] as const,
  subscriptionsChargeCalendar: (o: { workspaceId: string | null; months: number }) =>
    ['subscriptions', o.workspaceId, 'charge-calendar', o.months] as const,
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
  // Every ledger key starts ['ledger', workspaceId]: one invalidation refreshes the whole ledger
  // after a posting, since an entry moves the journal, the reports and the backlog at once.
  ledgerSettings: (workspaceId: string | null) => ['ledger', workspaceId, 'settings'] as const,
  ledgerIntegrity: (workspaceId: string | null) => ['ledger', workspaceId, 'integrity'] as const,
  ledgerAccounts: (workspaceId: string | null) => ['ledger', workspaceId, 'accounts'] as const,
  ledgerEntries: (o: { workspaceId: string | null; params: Record<string, unknown> }) =>
    ['ledger', o.workspaceId, 'entries', o.params] as const,
  ledgerEntry: (o: { workspaceId: string | null; id: string | null }) =>
    ['ledger', o.workspaceId, 'entry', o.id] as const,
  ledgerTrialBalance: (o: { workspaceId: string | null; params: Record<string, unknown> }) =>
    ['ledger', o.workspaceId, 'trial-balance', o.params] as const,
  ledgerAccountCard: (o: {
    workspaceId: string | null;
    accountId: string | null;
    params: Record<string, unknown>;
  }) => ['ledger', o.workspaceId, 'account-card', o.accountId, o.params] as const,
} as const;
