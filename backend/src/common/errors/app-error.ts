/**
 * Catalogue of domain error codes and their English messages.
 *
 * The English text here is the wire-level fallback: the frontend translates by
 * `code` when it knows one, and renders `message` verbatim when it does not.
 * Never localise these strings on the backend — see HttpExceptionFilter.
 */
export const ERR = {
  // ── custom-tables: table ────────────────────────────────────────────────
  TABLE_NOT_FOUND: 'Table not found',
  TABLE_ID_INVALID: 'Invalid table identifier',
  TABLE_SCHEMA_OUTDATED:
    'The database schema is not up to date for Custom Tables. Run the migrations (`npm -C backend run migration:run`) or enable automatic migrations (env `RUN_MIGRATIONS=true`) and restart the backend.',
  TABLE_COLUMNS_BUILD_FAILED: 'Could not build table columns',
  TABLE_NO_COLUMNS: 'Table has no columns',
  TABLE_NO_COLUMNS_TO_CONVERT: 'Table has no columns to convert',
  TABLE_NO_ROWS_TO_CONVERT: 'Table has no rows to convert',
  TABLE_NO_VALID_ROWS_TO_CONVERT: 'Table has no valid rows to convert',
  TABLE_NOT_LINKED_TO_DATA_ENTRY: 'Table is not linked to data entry',
  TABLES_NOT_FOUND: 'One or more tables were not found',
  TOO_MANY_CUSTOM_COLUMNS:
    'Too many custom columns ({{count}}). Simplify the names or build the table from a single tab (limit {{limit}}).',
  REQUIRED_COLUMNS_UNRESOLVED: 'Could not determine the required columns: {{columns}}',

  // ── custom-tables: rows & columns ───────────────────────────────────────
  ROW_NOT_FOUND: 'Row not found',
  ROW_ID_INVALID: 'Invalid row identifier',
  COLUMN_NOT_FOUND: 'Column not found',
  COLUMN_NOT_FOUND_NAMED: 'Column not found: {{column}}',
  COLUMN_SOME_NOT_FOUND: 'One of the columns was not found',
  COLUMN_ID_INVALID: 'Invalid column identifier',
  COLUMN_KEY_REQUIRED: 'columnKey is required',
  COLUMN_TITLE_REQUIRED: 'Enter a column name',
  COLUMN_NAME_TAKEN: 'A column with this name already exists',
  COLUMN_REQUIRED_VALUE: 'Column "{{column}}" is required',
  VALUE_DUPLICATE_IN_BATCH: 'Value "{{value}}" in column "{{column}}" is repeated in this upload',
  VALUE_DUPLICATE_IN_TABLE: 'Value "{{value}}" in column "{{column}}" already exists in the table',
  COLUMN_RELATION_TARGET_REQUIRED: 'A relation column requires a target table',
  COLUMN_RELATION_TARGET_MISSING: 'The relation column has no target table',
  COLUMN_NOT_RELATION: 'Column is not a relation',
  RELATION_COLUMN_REQUIRED: 'No relation column specified',
  COLUMN_FORMULA_REQUIRED: 'A formula column requires a formula',
  COLUMN_NOT_AI: 'Column is not an AI column',
  COLUMN_AI_PROMPT_MISSING: 'The AI column has no prompt',
  COLUMN_DISPLAY_INVALID: 'Invalid display column',
  COLUMN_DISPLAY_NOT_FOUND: 'Display column not found: {{column}}',

  // ── custom-tables: query (filter / sort / aggregate / group) ────────────
  FILTER_INVALID: 'Invalid filter',
  FILTER_FORMAT_INVALID: 'Invalid filters format',
  FILTER_JSON_INVALID: 'Invalid JSON in filters',
  FILTER_TOO_MANY: 'Too many filters',
  FILTER_COLUMN_NOT_FOUND: 'Filter column not found: {{column}}',
  FILTER_OPERATOR_UNKNOWN: 'Unknown filter operator: {{operator}}',
  FILTER_OPERATOR_UNSUPPORTED: 'Operator {{operator}} is not supported for type {{type}}',
  FILTER_BETWEEN_UNSUPPORTED: 'The between operator is not supported for type {{type}}',
  SORT_INVALID: 'Invalid sort',
  SORT_FORMAT_INVALID: 'Invalid sort format',
  SORT_JSON_INVALID: 'Invalid JSON in sort',
  SORT_DIRECTION_INVALID: 'Sort direction must be asc or desc',
  SORT_COLUMN_NOT_FOUND: 'Sort column not found: {{column}}',
  AGG_INVALID: 'Invalid aggregate',
  AGG_FORMAT_INVALID: 'Invalid aggs format',
  AGG_JSON_INVALID: 'Invalid JSON in aggs',
  AGG_TOO_MANY: 'Too many aggregates',
  AGG_COLUMN_NOT_FOUND: 'Aggregate column not found: {{column}}',
  AGG_FUNCTION_UNKNOWN: 'Unknown aggregate function: {{fn}}',
  AGG_FUNCTION_UNSUPPORTED: 'Function {{fn}} is not supported for type {{type}}',
  AGG_TOTAL_FUNCTION_UNKNOWN: 'Unknown total function on column {{column}}: {{fn}}',
  GROUP_COLUMN_REQUIRED: 'No grouping column specified',
  GROUP_COLUMN_NOT_FOUND: 'Grouping column not found: {{column}}',
  DUPLICATE_KEY_COLUMNS_REQUIRED: 'No columns specified for duplicate detection',
  DUPLICATE_KEY_TOO_MANY_COLUMNS: 'Too many columns in the key',

  // ── custom-tables: views, rules, comments, shares, schedules ────────────
  VIEW_NOT_FOUND: 'Custom view not found',
  VIEW_EMPTY: 'This custom view has no records',
  VIEW_ID_DUPLICATE: 'Duplicate view identifier: {{id}}',
  VIEW_ACTIVE_MISSING: 'The active view is not in the list',
  RULE_TARGET_INVALID: 'A rule must target cell or row',
  RULE_COLUMN_NOT_FOUND: 'Rule column not found: {{column}}',
  COMMENT_NOT_FOUND: 'Comment not found',
  COMMENT_EMPTY: 'Comment is empty',
  COMMENT_TOO_LONG: 'Comment is too long',
  SHARE_LINK_NOT_FOUND: 'Link not found',
  SHARE_LINK_REVOKED: 'Link has been revoked',
  SHARE_LINK_EXPIRED: 'Link has expired',
  SCHEDULE_NOT_FOUND: 'Schedule not found',
  JOB_NOT_FOUND: 'Job not found',

  // ── custom-tables: import / export / sync ───────────────────────────────
  EXPORT_NO_COLUMNS: 'No columns to export',
  EXPORT_TOO_MANY_ROWS:
    'Too many rows to export: {{total}}. Narrow the selection with filters (maximum {{max}}).',
  EXPORT_FILE_NOT_READY: 'The generated file is not ready yet',
  EXPORT_FILE_UNAVAILABLE: 'The export file is unavailable',
  IMPORT_COLUMN_REQUIRED: 'Select at least one column to import',
  IMPORT_USER_UNRESOLVED: 'Could not determine the user for the import',
  IMPORT_NO_ROWS: 'No rows to import',
  SYNC_SOURCE_REQUIRED: 'Specify a synchronisation source first',
  SYNC_SOURCE_NOT_CONFIGURED: 'The table has no synchronisation source configured',
  SYNC_TYPE_REQUIRED: 'No synchronisation type specified',
  SYNC_COLUMNS_NOT_FOUND: 'Columns to synchronise were not found: {{columns}}',
  DATA_ENTRY_EMPTY: 'No “Data entry” records to build a table from',

  // ── workspaces ──────────────────────────────────────────────────────────
  WORKSPACE_NOT_FOUND: 'Workspace not found',
  WORKSPACE_OWNER_NOT_FOUND: 'Workspace owner not found',
  WORKSPACE_NOT_A_MEMBER: 'You are not a member of this workspace',
  WORKSPACE_ONLY_OWNER_CAN_DELETE: 'Only the owner can delete the workspace',
  WORKSPACE_ONLY_OWNER_CAN_MANAGE_ADMINS: 'Only the owner can manage administrators',
  WORKSPACE_ONLY_OWNER_CAN_MANAGE_ADMINS_AND_OWNER:
    'Only the owner can manage administrators and ownership',
  WORKSPACE_ONLY_OWNER_CAN_TRANSFER: 'Only the current owner can transfer ownership',
  WORKSPACE_ADMIN_REQUIRED_TO_INVITE: 'Only the owner or an administrator can invite members',
  WORKSPACE_ADMIN_REQUIRED_TO_EDIT_SETTINGS:
    'Only the owner or an administrator can change settings',
  WORKSPACE_TRANSFER_OWNERSHIP_FIRST: 'Transfer ownership to another member first',
  MEMBER_NOT_FOUND: 'Member not found',
  MEMBER_ALREADY_IN_WORKSPACE: 'User is already in the workspace',
  MEMBER_CANNOT_REMOVE_OWNER: 'The workspace owner cannot be removed',
  MEMBER_CANNOT_CHANGE_OWN_ROLE: 'You cannot change your own role',
  INVITATION_NOT_FOUND: 'Invitation not found',
  INVITATION_NOT_FOUND_OR_USED: 'Invitation not found or already used',
  INVITATION_INVALID: 'Invalid invitation',
  INVITATION_TOKEN_INVALID: 'Invalid invitation token',
  INVITATION_UNAVAILABLE: 'Invitation is unavailable',
  INVITATION_REVOKED: 'Invitation has been revoked',
  INVITATION_EXPIRED: 'Invitation has expired',
  INVITATION_WRONG_ACCOUNT: 'Sign in as {{email}}',

  // ── google-sheets ───────────────────────────────────────────────────────
  SHEETS_NOT_FOUND: 'Google Sheet not found or inaccessible',
  SHEETS_CONNECTION_NOT_FOUND: 'Google Sheet connection not found',
  SHEETS_CONNECTION_OR_URL_REQUIRED: 'Specify a Google Sheet connection or link',
  SHEETS_URL_REQUIRED: 'Specify a Google Sheets link to import',
  SHEETS_URL_INVALID: 'Specify a valid Google Sheets link',
  SHEETS_URL_SCHEME_INVALID: 'Only http/https Google Sheets links are supported',
  SHEETS_URL_HOST_INVALID: 'Only docs.google.com is supported for link imports',
  SHEETS_SPREADSHEET_ID_NOT_FOUND: 'Could not find the spreadsheet id in the Google Sheets link',
  SHEETS_WORKSHEET_UNRESOLVED: 'Could not determine the Google Sheets worksheet',
  SHEETS_WORKSHEET_NOT_FOUND: 'Worksheet "{{worksheet}}" was not found in the Google Sheet',
  SHEETS_NO_WORKSHEETS: 'No worksheets to import were found in the Google Sheet',
  SHEETS_WORKSHEET_LIST_FAILED: 'Could not retrieve the list of Google Sheets worksheets.',
  SHEETS_READ_FAILED: 'Could not read the Google Sheet. Check the access permissions.',
  SHEETS_EXPORT_READ_FAILED: 'Could not read the Google Sheets export',
  SHEETS_RANGE_PARSE_FAILED: 'Could not parse the Google Sheets A1 range',
  SHEETS_FILE_TOO_LARGE: 'The Google Sheets file is too large to import',
  SHEETS_MATRIX_UNSUPPORTED: 'Matrix worksheets are not yet supported for transaction import',
  SHEETS_DOWNLOAD_FAILED_SHARE:
    'Could not download the Google Sheet. Enable link sharing or publish the spreadsheet.',
  SHEETS_DOWNLOAD_FAILED_LINK_ACCESS:
    'Could not download the Google Sheet. Check that link sharing is enabled.',
  SHEETS_REFRESH_TOKEN_MISSING_RECONNECT:
    'No Google refresh token. Reconnect the spreadsheet via OAuth.',
  SHEETS_REFRESH_TOKEN_MISSING_CONNECT:
    'No Google refresh token. Connect the spreadsheet via OAuth.',
  SHEETS_ENDPOINT_DEPRECATED:
    'Connecting through this endpoint is no longer supported. Use OAuth: GET /google-sheets/oauth/url \u2192 POST /google-sheets/oauth/callback',
  SHEETS_REFRESH_TOKEN_MISSING: 'No valid Google refresh token',
  SHEETS_AUTH_CODE_EXCHANGE_FAILED: 'Could not exchange the Google authorization code',

  // ── data-entry ──────────────────────────────────────────────────────────
  ENTRY_NOT_FOUND: 'Record not found',
  ENTRY_CUSTOM_COLUMN_TITLE_REQUIRED: 'Enter a custom column name',

  // ── statements ──────────────────────────────────────────────────────────
  STATEMENT_NOT_FOUND: 'Statement not found',
  STATEMENT_REQUIRED: 'Select a statement',
  STATEMENT_NO_TRANSACTIONS: 'The selected statement has no transactions',
  STATEMENT_TOO_MANY: 'Too many statements (limit 10)',
  STATEMENT_NOT_AWAITING_BALANCE: 'The statement is not awaiting balance confirmation',
  STATEMENT_DUPLICATE_FILE: 'This statement has already been uploaded (duplicate file)',
  STATEMENT_DUPLICATE_RECENT: 'A similar statement was uploaded recently',
  STATEMENT_EDIT_FORBIDDEN: 'Not enough permissions to edit this statement',
  STATEMENTS_EDIT_FORBIDDEN: 'Not enough permissions to edit statements',
  EXPENSE_DUPLICATE: 'A similar expense already exists',

  // ── shared ──────────────────────────────────────────────────────────────
  CATEGORY_NOT_FOUND: 'Category not found',
  USER_NOT_FOUND: 'User not found',
  USER_INVALID: 'Invalid user',
  FILE_NOT_UPLOADED: 'No file uploaded',
  SHARING_FORBIDDEN: 'Not enough permissions to create links and grant access',
  CATEGORIES_EDIT_FORBIDDEN: 'Not enough permissions to edit categories',
  TABLES_EDIT_FORBIDDEN: 'Not enough permissions to edit tables',
  DATA_ENTRY_EDIT_FORBIDDEN: 'Not enough permissions to edit data entry',
} as const;

export type ErrorCode = keyof typeof ERR;

const interpolate = (template: string, params: Record<string, string | number>): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(params[key] ?? ''));

export type AppErrorBody = {
  code: ErrorCode;
  message: string;
  params?: Record<string, string | number>;
};

/**
 * Builds the body for a Nest HttpException so the global filter can emit a
 * machine-readable `code` alongside the English `message`.
 *
 * @example throw new NotFoundException(appError('TABLE_NOT_FOUND'))
 * @example throw new BadRequestException(appError('COLUMN_NOT_FOUND_NAMED', { column: key }))
 */
export const appError = (
  code: ErrorCode,
  params?: Record<string, string | number>,
): AppErrorBody => ({
  code,
  message: params ? interpolate(ERR[code], params) : ERR[code],
  ...(params ? { params } : {}),
});

export const isAppErrorBody = (value: unknown): value is AppErrorBody =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  typeof (value as AppErrorBody).code === 'string' &&
  (value as AppErrorBody).code in ERR;
