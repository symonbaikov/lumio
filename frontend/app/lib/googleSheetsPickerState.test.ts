import { describe, expect, it } from 'vitest';
import { getGoogleSheetsPickerState } from './googleSheetsPickerState';

describe('getGoogleSheetsPickerState', () => {
  it('reports missing api key before anything else', () => {
    expect(
      getGoogleSheetsPickerState({
        connected: true,
        accessToken: 'token',
        apiKey: '',
      }),
    ).toEqual({
      canOpen: false,
      reason: 'missing_api_key',
    });
  });

  it('reports missing picker token when account is connected', () => {
    expect(
      getGoogleSheetsPickerState({
        connected: true,
        accessToken: '',
        apiKey: 'api-key',
      }),
    ).toEqual({
      canOpen: false,
      reason: 'missing_access_token',
    });
  });

  it('reports ready state when api key and token are present', () => {
    expect(
      getGoogleSheetsPickerState({
        connected: true,
        accessToken: 'token',
        apiKey: 'api-key',
      }),
    ).toEqual({
      canOpen: true,
      reason: null,
    });
  });
});
