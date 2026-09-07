'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { pickSpreadsheet } from '@/app/lib/googleSheetsPicker';
import type { SpreadsheetSelection } from '@/app/lib/googleSheetsSelection';
import MuiButton from '@mui/material/Button';
import { useState } from 'react';

type Props = {
  accessToken: string;
  apiKey: string;
  disabled?: boolean;
  onPick: (selection: SpreadsheetSelection) => Promise<void> | void;
  onError: (message: string) => void;
  label: string;
  loadingLabel: string;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, max-lines-per-function
export function GoogleSheetsPickerButton({
  accessToken,
  apiKey,
  disabled,
  onPick,
  onError,
  label,
  loadingLabel,
}: Props) {
  const [loading, setLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const getErrorMessage = (error: unknown) => {
    if (!error || typeof error !== 'object') {
      return 'Google Picker is unavailable';
    }
    return (error as { message?: string }).message || 'Google Picker is unavailable';
  };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleClick = async () => {
    if (!(accessToken && apiKey) || disabled) {
      return;
    }

    return await (async () => {
      setLoading(true);
      const selection = await pickSpreadsheet({ accessToken, apiKey });
      if (!selection) {
        return;
      }
      await onPick(selection);
    })()
      .catch(async (error: unknown) => {
        onError(getErrorMessage(error));
      })
      .finally(async () => {
        setLoading(false);
      });
  };

  return (
    <MuiButton
      variant="outlined"
      color="primary"
      size="small"
      disabled={disabled || loading || !accessToken || !apiKey}
      onClick={handleClick}
      startIcon={loading ? <Spinner style={{ width: 16, height: 16 }} /> : null}
    >
      {loading ? loadingLabel : label}
    </MuiButton>
  );
}
