export enum Permission {
  // Statements
  STATEMENT_VIEW = 'statement.view',
  STATEMENT_UPLOAD = 'statement.upload',
  STATEMENT_DELETE = 'statement.delete',
  STATEMENT_EDIT = 'statement.edit',

  // Transactions
  TRANSACTION_VIEW = 'transaction.view',
  TRANSACTION_EDIT = 'transaction.edit',
  TRANSACTION_DELETE = 'transaction.delete',
  TRANSACTION_BULK_UPDATE = 'transaction.bulk_update',

  // Categories
  CATEGORY_VIEW = 'category.view',
  CATEGORY_CREATE = 'category.create',
  CATEGORY_EDIT = 'category.edit',
  CATEGORY_DELETE = 'category.delete',

  // Branches
  BRANCH_VIEW = 'branch.view',
  BRANCH_CREATE = 'branch.create',
  BRANCH_EDIT = 'branch.edit',
  BRANCH_DELETE = 'branch.delete',

  // Wallets
  WALLET_VIEW = 'wallet.view',
  WALLET_CREATE = 'wallet.create',
  WALLET_EDIT = 'wallet.edit',
  WALLET_DELETE = 'wallet.delete',

  // Payables
  PAYABLE_VIEW = 'payable.view',
  PAYABLE_CREATE = 'payable.create',
  PAYABLE_EDIT = 'payable.edit',
  PAYABLE_DELETE = 'payable.delete',

  // Reports
  REPORT_VIEW = 'report.view',
  REPORT_EXPORT = 'report.export',

  // Telegram
  TELEGRAM_VIEW = 'telegram.view',
  TELEGRAM_CONNECT = 'telegram.connect',
  TELEGRAM_SEND = 'telegram.send',

  // Google Sheets
  GOOGLE_SHEET_VIEW = 'google_sheet.view',
  GOOGLE_SHEET_CONNECT = 'google_sheet.connect',
  GOOGLE_SHEET_SYNC = 'google_sheet.sync',

  // Admin
  USER_MANAGE = 'user.manage',
  USER_VIEW_ALL = 'user.view_all',
  AUDIT_VIEW = 'audit_view',
  AUDIT_LOG_VIEW = 'audit_log.view',

  // Budgets
  BUDGET_VIEW = 'budget.view',
  BUDGET_CREATE = 'budget.create',
  BUDGET_EDIT = 'budget.edit',
  BUDGET_DELETE = 'budget.delete',

  // Subscriptions
  SUBSCRIPTION_VIEW = 'subscription.view',
  SUBSCRIPTION_CREATE = 'subscription.create',
  SUBSCRIPTION_EDIT = 'subscription.edit',
  SUBSCRIPTION_DELETE = 'subscription.delete',

  // API Keys
  API_KEY_MANAGE = 'api_key.manage',
}

// Default permissions for each role
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: Object.values(Permission), // Admin has all permissions
  // Note: API_KEY_MANAGE is intentionally NOT in user/viewer roles
  user: [
    // View-only permissions
    Permission.STATEMENT_VIEW,
    Permission.TRANSACTION_VIEW,
    Permission.CATEGORY_VIEW,
    Permission.BRANCH_VIEW,
    Permission.WALLET_VIEW,
    Permission.PAYABLE_VIEW,
    Permission.REPORT_VIEW,
    Permission.GOOGLE_SHEET_VIEW,
    Permission.TELEGRAM_VIEW,
    Permission.TELEGRAM_CONNECT,
    Permission.TELEGRAM_SEND,
    Permission.BUDGET_VIEW,
    Permission.SUBSCRIPTION_VIEW,
  ],
  viewer: [
    // Read-only permissions
    Permission.STATEMENT_VIEW,
    Permission.TRANSACTION_VIEW,
    Permission.CATEGORY_VIEW,
    Permission.BRANCH_VIEW,
    Permission.WALLET_VIEW,
    Permission.PAYABLE_VIEW,
    Permission.REPORT_VIEW,
    Permission.TELEGRAM_VIEW,
    Permission.BUDGET_VIEW,
    Permission.SUBSCRIPTION_VIEW,
  ],
};
