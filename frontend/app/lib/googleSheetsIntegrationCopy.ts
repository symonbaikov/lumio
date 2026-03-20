type UnknownRecord = Record<string, any>;

const readNodeValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'value' in (value as UnknownRecord)) {
    const nested = (value as UnknownRecord).value;
    return typeof nested === 'string' ? nested : undefined;
  }

  return undefined;
};

const readPath = (source: unknown, path: string[], fallback: string) => {
  let current: unknown = source;

  for (const key of path) {
    if (!current || typeof current !== 'object' || !(key in (current as UnknownRecord))) {
      return fallback;
    }
    current = (current as UnknownRecord)[key];
  }

  return readNodeValue(current) || fallback;
};

export const getGoogleSheetsIntegrationCopy = (t: unknown) => ({
  step1: {
    chooseSpreadsheetButton: readPath(
      t,
      ['step1', 'chooseSpreadsheetButton'],
      'Choose spreadsheet',
    ),
    chooseSpreadsheetLoading: readPath(
      t,
      ['step1', 'chooseSpreadsheetLoading'],
      'Opening Picker...',
    ),
    connectAccountButton: readPath(t, ['step1', 'connectAccountButton'], 'Sign in with Google'),
    reconnectButton: readPath(t, ['step1', 'reconnectButton'], 'Switch Google account'),
    accountLabel: readPath(t, ['step1', 'accountLabel'], 'Google account'),
    accountHelp: readPath(
      t,
      ['step1', 'accountHelp'],
      'Connect your Google account to browse your spreadsheets.',
    ),
    connectedAs: readPath(t, ['step1', 'connectedAs'], 'Connected as {email}'),
    spreadsheetLabel: readPath(t, ['step1', 'spreadsheetLabel'], 'Spreadsheet to import'),
    spreadsheetHelp: readPath(
      t,
      ['step1', 'spreadsheetHelp'],
      'Open Google Picker and choose the spreadsheet you need.',
    ),
    openSpreadsheet: readPath(t, ['step1', 'openSpreadsheet'], 'Open spreadsheet'),
    selectWorksheet: readPath(t, ['step1', 'selectWorksheet'], 'Choose worksheet'),
    loadingWorksheets: readPath(t, ['step1', 'loadingWorksheets'], 'Loading worksheets...'),
  },
  errors: {
    loadWorksheets: readPath(
      t,
      ['errors', 'loadWorksheets'],
      'Failed to load spreadsheet worksheets',
    ),
    spreadsheetRequired: readPath(
      t,
      ['errors', 'spreadsheetRequired'],
      'Choose a spreadsheet in Google Picker first',
    ),
  },
  toasts: {
    connected: readPath(t, ['toasts', 'connected'], 'Google Sheets connected'),
  },
});
