export type ShortcutCategory = 'navigation' | 'action';

export type ShortcutEntry = {
  keys: string;
  label: string;
  category: ShortcutCategory;
};

// Event names for page-level shortcut listeners
export const SHORTCUT_OPEN_FILTERS = 'shortcuts:open-filters';
export const SHORTCUT_EXPORT = 'shortcuts:export';
export const SHORTCUT_FOCUS_SEARCH = 'shortcuts:focus-search';
export const SHORTCUT_SELECT_ALL = 'shortcuts:select-all';
export const SHORTCUT_DELETE_SELECTED = 'shortcuts:delete-selected';

export const GLOBAL_SHORTCUTS: ShortcutEntry[] = [
  { keys: 'Shift+D', label: 'Go to Dashboard', category: 'navigation' },
  { keys: 'Shift+S', label: 'Go to Statements', category: 'navigation' },
  { keys: 'Shift+T', label: 'Go to Custom Tables', category: 'navigation' },
  { keys: 'Shift+R', label: 'Go to Reports', category: 'navigation' },
  { keys: 'Shift+W', label: 'Go to Workspaces', category: 'navigation' },
  { keys: '?', label: 'Show keyboard shortcuts', category: 'action' },
  { keys: 'Shift+A', label: 'Open statement upload', category: 'action' },
  { keys: 'Shift+F', label: 'Open filters', category: 'action' },
  { keys: 'Shift+E', label: 'Export', category: 'action' },
  { keys: '/', label: 'Focus search', category: 'action' },
];

export const STATEMENTS_SHORTCUTS: ShortcutEntry[] = [
  { keys: 'Shift+X', label: 'Select all', category: 'action' },
  { keys: 'Shift+Delete', label: 'Delete selected', category: 'action' },
];
