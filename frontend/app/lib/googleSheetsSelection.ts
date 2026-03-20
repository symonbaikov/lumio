export type PickerSpreadsheetDoc = {
  id: string;
  name?: string;
  title?: string;
  url?: string;
};

export type SpreadsheetSelection = {
  spreadsheetId: string;
  name: string;
  url: string;
};

export type WorksheetOption = {
  title: string;
  index: number;
  rowCount: number;
  columnCount: number;
};

export const normalizeSpreadsheetSelection = (doc: PickerSpreadsheetDoc): SpreadsheetSelection => ({
  spreadsheetId: doc.id,
  name: doc.name || doc.title || doc.id,
  url: doc.url || '',
});

export const getDefaultWorksheetName = (
  currentWorksheetName: string,
  worksheets: WorksheetOption[],
) => {
  if (currentWorksheetName.trim()) {
    return currentWorksheetName;
  }

  return worksheets[0]?.title || '';
};
