'use client';

import { type PickerSpreadsheetDoc, normalizeSpreadsheetSelection } from './googleSheetsSelection';

declare global {
  interface Window {
    gapi?: {
      load: (name: string, options: { callback: () => void }) => void;
    };
  }
}

const SHEETS_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      return resolve();
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Picker API'));
    document.body.appendChild(script);
  });

let pickerReady = false;

const ensurePickerLoaded = async () => {
  if (pickerReady) return;

  await loadScript('https://apis.google.com/js/api.js');
  await new Promise<void>((resolve, reject) => {
    if (!window.gapi?.load) {
      reject(new Error('Google API is not available'));
      return;
    }

    window.gapi.load('picker', {
      callback: () => resolve(),
    });
  });

  pickerReady = true;
};

export const pickSpreadsheet = async (params: { accessToken: string; apiKey: string }) => {
  await ensurePickerLoaded();
  const picker = (window as any).google?.picker;
  if (!picker) {
    throw new Error('Google Picker is not available');
  }

  return new Promise<ReturnType<typeof normalizeSpreadsheetSelection> | null>(resolve => {
    const view = new picker.DocsView(picker.ViewId.SPREADSHEETS)
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false)
      .setMimeTypes(SHEETS_MIME_TYPE);

    const pickerInstance = new picker.PickerBuilder()
      .setDeveloperKey(params.apiKey)
      .setOAuthToken(params.accessToken)
      .addView(view)
      .setCallback((data: { action: string; docs?: PickerSpreadsheetDoc[] }) => {
        if (data.action === picker.Action.PICKED) {
          resolve(data.docs?.[0] ? normalizeSpreadsheetSelection(data.docs[0]) : null);
          return;
        }

        if (data.action === picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();

    pickerInstance.setVisible(true);
  });
};
