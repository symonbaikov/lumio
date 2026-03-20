import { describe, expect, it } from 'vitest';
import { getDefaultWorksheetName, normalizeSpreadsheetSelection } from './googleSheetsSelection';

describe('googleSheetsSelection', () => {
  it('normalizes picker spreadsheet selection into picker payload', () => {
    expect(
      normalizeSpreadsheetSelection({
        id: 'sheet-1',
        name: 'Finance',
        url: 'https://docs.google.com/spreadsheets/d/sheet-1/edit',
      }),
    ).toEqual({
      spreadsheetId: 'sheet-1',
      name: 'Finance',
      url: 'https://docs.google.com/spreadsheets/d/sheet-1/edit',
    });
  });

  it('picks the first worksheet title when no worksheet is preselected', () => {
    expect(
      getDefaultWorksheetName('', [
        { title: 'Sheet A', index: 0, rowCount: 10, columnCount: 2 },
        { title: 'Sheet B', index: 1, rowCount: 5, columnCount: 3 },
      ]),
    ).toBe('Sheet A');
  });
});
