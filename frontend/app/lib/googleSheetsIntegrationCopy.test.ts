import { describe, expect, it } from 'vitest';
import { getGoogleSheetsIntegrationCopy } from './googleSheetsIntegrationCopy';

describe('getGoogleSheetsIntegrationCopy', () => {
  it('returns fallback text when picker labels are missing from dictionary', () => {
    const copy = getGoogleSheetsIntegrationCopy({
      step1: {
        connectButton: 'Connect',
      },
    });

    expect(copy.step1.chooseSpreadsheetButton).toBe('Choose spreadsheet');
    expect(copy.step1.chooseSpreadsheetLoading).toBe('Opening Picker...');
  });
});
