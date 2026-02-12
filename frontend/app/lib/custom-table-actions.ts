export type CustomTableSourceFilter = 'all' | 'manual' | 'google_sheets_import' | 'statement';

export type CustomTableSortOrder = 'updated_desc' | 'name_asc';

export type CustomTableAction = 'create-empty' | 'import-statement' | 'import-google-sheets';

export const CUSTOM_TABLES_OPEN_ACTION_EVENT = 'custom-tables:open-action';
export const CUSTOM_TABLES_VIEW_EVENT = 'custom-tables:view-change';

export type CustomTableActionEventDetail = {
  action: CustomTableAction;
};

export type CustomTableViewEventDetail =
  | {
      type: 'filter-source';
      value: CustomTableSourceFilter;
    }
  | {
      type: 'sort-order';
      value: CustomTableSortOrder;
    };

export function dispatchCustomTableAction(action: CustomTableAction): void {
  if (typeof window === 'undefined') return;

  const detail: CustomTableActionEventDetail = { action };
  window.dispatchEvent(new CustomEvent(CUSTOM_TABLES_OPEN_ACTION_EVENT, { detail }));
}

export function dispatchCustomTableViewEvent(detail: CustomTableViewEventDetail): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(CUSTOM_TABLES_VIEW_EVENT, { detail }));
}
