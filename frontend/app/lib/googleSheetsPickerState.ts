type Params = {
  connected: boolean;
  accessToken: string;
  apiKey: string;
};

export const getGoogleSheetsPickerState = ({ connected, accessToken, apiKey }: Params) => {
  if (!apiKey) {
    return { canOpen: false, reason: 'missing_api_key' as const };
  }

  if (!connected) {
    return { canOpen: false, reason: 'missing_account' as const };
  }

  if (!accessToken) {
    return { canOpen: false, reason: 'missing_access_token' as const };
  }

  return { canOpen: true, reason: null };
};
