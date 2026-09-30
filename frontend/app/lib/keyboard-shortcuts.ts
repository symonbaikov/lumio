export type ShortcutCategory = 'navigation' | 'action';

/** Key into the `keyboardShortcutsModal` dictionary's `labels`. */
export type ShortcutLabelKey =
  | 'goDashboard'
  | 'goStatements'
  | 'goCustomTables'
  | 'goReports'
  | 'goWorkspaces'
  | 'showShortcuts'
  | 'openUpload'
  | 'openFilters'
  | 'export'
  | 'focusSearch'
  | 'selectAll'
  | 'deleteSelected';

export type ShortcutEntry = {
  keys: string;
  labelKey: ShortcutLabelKey;
  category: ShortcutCategory;
};

// Event names for page-level shortcut listeners
export const SHORTCUT_OPEN_FILTERS = 'shortcuts:open-filters';
export const SHORTCUT_EXPORT = 'shortcuts:export';
export const SHORTCUT_FOCUS_SEARCH = 'shortcuts:focus-search';
export const SHORTCUT_SELECT_ALL = 'shortcuts:select-all';
export const SHORTCUT_DELETE_SELECTED = 'shortcuts:delete-selected';

export const GLOBAL_SHORTCUTS: ShortcutEntry[] = [
  { keys: 'Shift+D', labelKey: 'goDashboard', category: 'navigation' },
  { keys: 'Shift+S', labelKey: 'goStatements', category: 'navigation' },
  { keys: 'Shift+T', labelKey: 'goCustomTables', category: 'navigation' },
  { keys: 'Shift+R', labelKey: 'goReports', category: 'navigation' },
  { keys: 'Shift+W', labelKey: 'goWorkspaces', category: 'navigation' },
  { keys: '?', labelKey: 'showShortcuts', category: 'action' },
  { keys: 'Shift+A', labelKey: 'openUpload', category: 'action' },
  { keys: 'Shift+F', labelKey: 'openFilters', category: 'action' },
  { keys: 'Shift+E', labelKey: 'export', category: 'action' },
  { keys: '/', labelKey: 'focusSearch', category: 'action' },
];

export const STATEMENTS_SHORTCUTS: ShortcutEntry[] = [
  { keys: 'Shift+X', labelKey: 'selectAll', category: 'action' },
  { keys: 'Shift+Delete', labelKey: 'deleteSelected', category: 'action' },
];
