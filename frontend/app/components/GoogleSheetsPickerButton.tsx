'use client';

import { pickSpreadsheet } from '@/app/lib/googleSheetsPicker';
import type { SpreadsheetSelection } from '@/app/lib/googleSheetsSelection';
import { Loader2 } from 'lucide-react';
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

  const handleClick = async () => {
    if (!accessToken || !apiKey || disabled) return;

    try {
      setLoading(true);
      const selection = await pickSpreadsheet({ accessToken, apiKey });
      if (!selection) return;
      await onPick(selection);
    } catch (error: any) {
      onError(error?.message || 'Google Picker is unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading || !accessToken || !apiKey}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {loading ? loadingLabel : label}
    </button>
  );
}
