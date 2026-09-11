/* eslint-disable max-lines */
'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { getGoogleSheetsPickerState } from '@/app/lib/googleSheetsPickerState';
import {
  getDefaultWorksheetName,
  type SpreadsheetSelection,
  type WorksheetOption,
} from '@/app/lib/googleSheetsSelection';

export interface GoogleSheetConnection {
  id: string;
  sheetId: string;
  sheetName: string;
  worksheetName?: string | null;
  lastSync?: string | null;
  isActive?: boolean;
  oauthConnected?: boolean;
  createdAt?: string;
}

export type AuthStatus = { connected: boolean; email?: string | null };
type PickerTokenResponse = { accessToken: string; apiKey?: string };

interface UseGoogleSheetsPageInput {
  user: unknown;
  t: {
    errors: {
      loadConnections: { value: string };
      missingAuthUrl: { value: string };
      connectFailed: { value: string };
      syncFailed: { value: string };
      removeFailed: { value: string };
    };
    toasts: {
      openingAuth: { value: string };
      syncStarted: { value: string };
      removed: { value: string };
    };
  };
  copy: {
    errors: { spreadsheetRequired: string; loadWorksheets: string };
    toasts: { connected: string };
  };
}

export interface GoogleSheetsPageHandlers {
  authStatus: AuthStatus;
  pickerAccessToken: string;
  pickerApiKey: string;
  selectedSpreadsheet: SpreadsheetSelection | null;
  worksheets: WorksheetOption[];
  worksheetName: string;
  sheetName: string;
  connections: GoogleSheetConnection[];
  loadingList: boolean;
  connectingAccount: boolean;
  loadingWorksheets: boolean;
  submitting: boolean;
  syncingId: string | null;
  removingId: string | null;
  error: string | null;
  success: string | null;
  emptyState: boolean;
  pickerState: ReturnType<typeof getGoogleSheetsPickerState>;
  setWorksheetName: (v: string) => void;
  setSheetName: (v: string) => void;
  startOauth: () => Promise<void>;
  handleSpreadsheetPick: (selection: SpreadsheetSelection) => Promise<void>;
  handleConnect: () => Promise<void>;
  handleSync: (id: string) => Promise<void>;
  handleRemove: (id: string) => Promise<void>;
  loadConnections: () => Promise<void>;
}

async function fetchConnections(): Promise<GoogleSheetConnection[]> {
  const response = await apiClient.get('/google-sheets');
  return response.data?.data || response.data || [];
}

async function fetchAuthStatus(): Promise<AuthStatus> {
  const response = await apiClient.get('/google-sheets/oauth/status');
  return response.data?.data || response.data || { connected: false };
}

async function fetchPickerToken(): Promise<PickerTokenResponse> {
  const tokenResponse = await apiClient.get('/google-sheets/picker-token');
  return tokenResponse.data?.data || tokenResponse.data || {};
}

async function fetchOauthUrl(state: string): Promise<string> {
  const resp = await apiClient.get('/google-sheets/oauth/url', { params: { state } });
  return resp.data?.url;
}

async function fetchWorksheets(spreadsheetId: string): Promise<WorksheetOption[]> {
  const response = await apiClient.get(`/google-sheets/spreadsheets/${spreadsheetId}/worksheets`);
  return response.data?.data || response.data || [];
}

function useConnectionsState(
  errorSetter: (msg: string | null) => void,
  tErrors: UseGoogleSheetsPageInput['t']['errors'],
): {
  connections: GoogleSheetConnection[];
  loadingList: boolean;
  loadConnections: () => Promise<void>;
} {
  const [connections, setConnections] = useState<GoogleSheetConnection[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const loadConnections = async (): Promise<void> => {
    await (async () => {
      setLoadingList(true);
      setConnections(await fetchConnections());
    })()
      .catch(async () => {
        errorSetter(tErrors.loadConnections.value);
      })
      .finally(async () => {
        setLoadingList(false);
      });
  };

  return { connections, loadingList, loadConnections };
}

interface AuthStateReturn {
  authStatus: AuthStatus;
  pickerAccessToken: string;
  pickerApiKey: string;
  connectingAccount: boolean;
  loadAuthStatus: () => Promise<void>;
  startOauth: () => Promise<void>;
}

function useAuthState(
  tErrors: UseGoogleSheetsPageInput['t']['errors'],
  tToasts: UseGoogleSheetsPageInput['t']['toasts'],
): AuthStateReturn {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ connected: false, email: null });
  const [pickerAccessToken, setPickerAccessToken] = useState('');
  const [pickerApiKey, setPickerApiKey] = useState('');
  const [connectingAccount, setConnectingAccount] = useState(false);

  const loadAuthStatus = async (): Promise<void> => {
    await (async () => {
      const status = await fetchAuthStatus();
      setAuthStatus(status);
      if (status.connected) {
        const picker = await fetchPickerToken();
        setPickerAccessToken(picker.accessToken || '');
        setPickerApiKey(picker.apiKey || '');
      } else {
        setPickerAccessToken('');
        setPickerApiKey('');
      }
    })().catch(async () => {
      setAuthStatus({ connected: false, email: null });
      setPickerAccessToken('');
      setPickerApiKey('');
    });
  };

  const startOauth = async (): Promise<void> => {
    await (async () => {
      setConnectingAccount(true);
      const url = await fetchOauthUrl('integrations/google-sheets');
      if (!url) throw new Error(tErrors.missingAuthUrl.value);
      toast.success(tToasts.openingAuth.value);
      window.location.href = url;
    })()
      .catch(async err => {
        const message = getApiErrorMessage(err, tErrors.connectFailed.value);
        toast.error(message);
      })
      .finally(async () => {
        setConnectingAccount(false);
      });
  };

  return {
    authStatus,
    pickerAccessToken,
    pickerApiKey,
    connectingAccount,
    loadAuthStatus,
    startOauth,
  };
}

interface SpreadsheetStateReturn {
  selectedSpreadsheet: SpreadsheetSelection | null;
  worksheets: WorksheetOption[];
  worksheetName: string;
  sheetName: string;
  loadingWorksheets: boolean;
  setWorksheetName: (v: string) => void;
  setSheetName: (v: string) => void;
  handleSpreadsheetPick: (selection: SpreadsheetSelection) => Promise<void>;
}

function useSpreadsheetState(
  errorSetter: (msg: string | null) => void,
  copyErrors: UseGoogleSheetsPageInput['copy']['errors'],
): SpreadsheetStateReturn {
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<SpreadsheetSelection | null>(null);
  const [worksheets, setWorksheets] = useState<WorksheetOption[]>([]);
  const [worksheetName, setWorksheetName] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [loadingWorksheets, setLoadingWorksheets] = useState(false);

  const loadWorksheets = async (spreadsheetId: string): Promise<void> => {
    await (async () => {
      setLoadingWorksheets(true);
      const items = await fetchWorksheets(spreadsheetId);
      setWorksheets(items);
      setWorksheetName(current => getDefaultWorksheetName(current, items));
    })()
      .catch(async err => {
        const message = getApiErrorMessage(err, copyErrors.loadWorksheets);
        errorSetter(message);
        toast.error(message);
      })
      .finally(async () => {
        setLoadingWorksheets(false);
      });
  };

  const handleSpreadsheetPick = async (selection: SpreadsheetSelection): Promise<void> => {
    setSelectedSpreadsheet(selection);
    setSheetName(selection.name);
    setWorksheetName('');
    setWorksheets([]);
    errorSetter(null);
    await loadWorksheets(selection.spreadsheetId);
  };

  return {
    selectedSpreadsheet,
    worksheets,
    worksheetName,
    sheetName,
    loadingWorksheets,
    setWorksheetName,
    setSheetName,
    handleSpreadsheetPick,
  };
}

// eslint-disable-next-line max-lines-per-function
export function useGoogleSheetsPage({
  user,
  t,
  copy,
}: UseGoogleSheetsPageInput): GoogleSheetsPageHandlers {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { connections, loadingList, loadConnections } = useConnectionsState(setError, t.errors);
  const {
    authStatus,
    pickerAccessToken,
    pickerApiKey,
    connectingAccount,
    loadAuthStatus,
    startOauth,
  } = useAuthState(t.errors, t.toasts);
  const {
    selectedSpreadsheet,
    worksheets,
    worksheetName,
    sheetName,
    loadingWorksheets,
    setWorksheetName,
    setSheetName,
    handleSpreadsheetPick,
  } = useSpreadsheetState(setError, copy.errors);

  useEffect((): void => {
    if (!user) return;
    void loadConnections();
    void loadAuthStatus();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = async (): Promise<void> => {
    if (!selectedSpreadsheet) {
      setError(copy.errors.spreadsheetRequired);
      toast.error(copy.errors.spreadsheetRequired);
      return;
    }

    await (async () => {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      await apiClient.post('/google-sheets/connect-with-picker', {
        spreadsheetId: selectedSpreadsheet.spreadsheetId,
        sheetName: sheetName.trim() || undefined,
        worksheetName: worksheetName.trim() || undefined,
      });
      setSuccess(copy.toasts.connected);
      toast.success(copy.toasts.connected);
      await loadConnections();
    })()
      .catch(async err => {
        const message = getApiErrorMessage(err, t.errors.connectFailed.value);
        setError(message);
        toast.error(message);
      })
      .finally(async () => {
        setSubmitting(false);
      });
  };

  const handleSync = async (id: string): Promise<void> => {
    await (async () => {
      setSyncingId(id);
      setError(null);
      setSuccess(null);
      await apiClient.put(`/google-sheets/${id}/sync`, {});
      setSuccess(t.toasts.syncStarted.value);
      toast.success(t.toasts.syncStarted.value);
      await loadConnections();
    })()
      .catch(async err => {
        const message = getApiErrorMessage(err, t.errors.syncFailed.value);
        setError(message);
        toast.error(message);
      })
      .finally(async () => {
        setSyncingId(null);
      });
  };

  const handleRemove = async (id: string): Promise<void> => {
    await (async () => {
      setRemovingId(id);
      setError(null);
      setSuccess(null);
      await apiClient.delete(`/google-sheets/${id}`);
      setSuccess(t.toasts.removed.value);
      toast.success(t.toasts.removed.value);
      await loadConnections();
    })()
      .catch(async err => {
        const message = getApiErrorMessage(err, t.errors.removeFailed.value);
        setError(message);
        toast.error(message);
      })
      .finally(async () => {
        setRemovingId(null);
      });
  };

  const emptyState = useMemo(
    () => !loadingList && connections.length === 0,
    [loadingList, connections],
  );
  const pickerState = getGoogleSheetsPickerState({
    connected: authStatus.connected,
    accessToken: pickerAccessToken,
    apiKey: pickerApiKey,
  });

  return {
    authStatus,
    pickerAccessToken,
    pickerApiKey,
    selectedSpreadsheet,
    worksheets,
    worksheetName,
    sheetName,
    connections,
    loadingList,
    connectingAccount,
    loadingWorksheets,
    submitting,
    syncingId,
    removingId,
    error,
    success,
    emptyState,
    pickerState,
    setWorksheetName,
    setSheetName,
    startOauth,
    handleSpreadsheetPick,
    handleConnect,
    handleSync,
    handleRemove,
    loadConnections,
  };
}
