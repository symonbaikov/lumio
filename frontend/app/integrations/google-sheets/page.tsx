'use client';

import { GoogleSheetsPickerButton } from '@/app/components/GoogleSheetsPickerButton';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getGoogleSheetsIntegrationCopy } from '@/app/lib/googleSheetsIntegrationCopy';
import { getGoogleSheetsPickerState } from '@/app/lib/googleSheetsPickerState';
import {
  type SpreadsheetSelection,
  type WorksheetOption,
  getDefaultWorksheetName,
} from '@/app/lib/googleSheetsSelection';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Plug,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface GoogleSheetConnection {
  id: string;
  sheetId: string;
  sheetName: string;
  worksheetName?: string | null;
  lastSync?: string | null;
  isActive?: boolean;
  oauthConnected?: boolean;
  createdAt?: string;
}

type AuthStatus = {
  connected: boolean;
  email?: string | null;
};

type PickerTokenResponse = {
  accessToken: string;
  apiKey?: string;
};

export default function GoogleSheetsIntegrationPage() {
  const { user, loading: authLoading } = useAuth();
  const t = useIntlayer('googleSheetsIntegrationPage');
  const copy = getGoogleSheetsIntegrationCopy(t);
  const { locale } = useLocale();
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ connected: false, email: null });
  const [pickerAccessToken, setPickerAccessToken] = useState('');
  const [pickerApiKey, setPickerApiKey] = useState('');
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<SpreadsheetSelection | null>(null);
  const [worksheets, setWorksheets] = useState<WorksheetOption[]>([]);
  const [worksheetName, setWorksheetName] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [connections, setConnections] = useState<GoogleSheetConnection[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [connectingAccount, setConnectingAccount] = useState(false);
  const [loadingWorksheets, setLoadingWorksheets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const pickerState = getGoogleSheetsPickerState({
    connected: authStatus.connected,
    accessToken: pickerAccessToken,
    apiKey: pickerApiKey,
  });

  const loadConnections = async () => {
    try {
      setLoadingList(true);
      const response = await apiClient.get('/google-sheets');
      const items: GoogleSheetConnection[] = response.data?.data || response.data || [];
      setConnections(items);
    } catch {
      setError(t.errors.loadConnections.value);
    } finally {
      setLoadingList(false);
    }
  };

  const loadAuthStatus = async () => {
    try {
      const response = await apiClient.get('/google-sheets/oauth/status');
      const status: AuthStatus = response.data?.data || response.data || { connected: false };
      setAuthStatus(status);

      if (status.connected) {
        const tokenResponse = await apiClient.get('/google-sheets/picker-token');
        const picker: PickerTokenResponse = tokenResponse.data?.data || tokenResponse.data || {};
        setPickerAccessToken(picker.accessToken || '');
        setPickerApiKey(picker.apiKey || '');
      } else {
        setPickerAccessToken('');
        setPickerApiKey('');
      }
    } catch {
      setAuthStatus({ connected: false, email: null });
      setPickerAccessToken('');
      setPickerApiKey('');
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadConnections();
    void loadAuthStatus();
  }, [user]);

  const startOauth = async () => {
    try {
      setConnectingAccount(true);
      setError(null);
      const resp = await apiClient.get('/google-sheets/oauth/url', {
        params: { state: 'integrations/google-sheets' },
      });
      const url = resp.data?.url;
      if (!url) {
        throw new Error(t.errors.missingAuthUrl.value);
      }
      toast.success(t.toasts.openingAuth.value);
      window.location.href = url;
    } catch (err: any) {
      const message = err?.response?.data?.message || t.errors.connectFailed.value;
      setError(message);
      toast.error(message);
    } finally {
      setConnectingAccount(false);
    }
  };

  const loadWorksheets = async (spreadsheetId: string) => {
    try {
      setLoadingWorksheets(true);
      const response = await apiClient.get(
        `/google-sheets/spreadsheets/${spreadsheetId}/worksheets`,
      );
      const items: WorksheetOption[] = response.data?.data || response.data || [];
      setWorksheets(items);
      setWorksheetName(current => getDefaultWorksheetName(current, items));
    } catch (err: any) {
      const message = err?.response?.data?.message || copy.errors.loadWorksheets;
      setError(message);
      toast.error(message);
    } finally {
      setLoadingWorksheets(false);
    }
  };

  const handleSpreadsheetPick = async (selection: SpreadsheetSelection) => {
    setSelectedSpreadsheet(selection);
    setSheetName(selection.name);
    setWorksheetName('');
    setWorksheets([]);
    setSuccess(null);
    setError(null);
    await loadWorksheets(selection.spreadsheetId);
  };

  const handleConnect = async () => {
    if (!selectedSpreadsheet) {
      setError(copy.errors.spreadsheetRequired);
      toast.error(copy.errors.spreadsheetRequired);
      return;
    }

    try {
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
    } catch (err: any) {
      const message = err?.response?.data?.message || t.errors.connectFailed.value;
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async (id: string) => {
    try {
      setSyncingId(id);
      setError(null);
      setSuccess(null);
      await apiClient.put(`/google-sheets/${id}/sync`, {});
      setSuccess(t.toasts.syncStarted.value);
      toast.success(t.toasts.syncStarted.value);
      await loadConnections();
    } catch (err: any) {
      const message = err?.response?.data?.message || t.errors.syncFailed.value;
      setError(message);
      toast.error(message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      setRemovingId(id);
      setError(null);
      setSuccess(null);
      await apiClient.delete(`/google-sheets/${id}`);
      setSuccess(t.toasts.removed.value);
      toast.success(t.toasts.removed.value);
      await loadConnections();
    } catch (err: any) {
      const message = err?.response?.data?.message || t.errors.removeFailed.value;
      setError(message);
      toast.error(message);
    } finally {
      setRemovingId(null);
    }
  };

  const emptyState = useMemo(
    () => !loadingList && connections.length === 0,
    [loadingList, connections],
  );

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <p className="text-gray-800 font-semibold mb-2">{t.loginRequired.title}</p>
          <p className="text-sm text-gray-600">{t.loginRequired.subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-shared px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start gap-3 mb-6" data-tour-id="gs-integration-header">
        <div className="p-2 rounded-full bg-primary/10 text-primary">
          <Plug className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.header.title}</h1>
          <p className="text-secondary mt-1">{t.header.subtitle}</p>
        </div>
      </div>

      {(error || success) && (
        <div className="mb-4 space-y-2">
          {success ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              <span>{success}</span>
            </div>
          ) : null}
          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            data-tour-id="gs-integration-step1"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t.step1.label}</p>
                <h2 className="text-lg font-semibold text-gray-900">{t.step1.title}</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div
                className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                data-tour-id="gs-integration-account"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {copy.step1.accountLabel}
                    </div>
                    <div className="text-sm text-gray-500">
                      {authStatus.connected
                        ? copy.step1.connectedAs.replace('{email}', authStatus.email || 'Google')
                        : copy.step1.accountHelp}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={startOauth}
                    disabled={connectingAccount}
                    data-tour-id="gs-integration-connect-account"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {connectingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {authStatus.connected
                      ? copy.step1.reconnectButton
                      : copy.step1.connectAccountButton}
                  </button>
                </div>
              </div>

              <div
                className="rounded-lg border border-gray-200 p-3"
                data-tour-id="gs-integration-picker"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {copy.step1.spreadsheetLabel}
                    </div>
                    <div className="text-sm text-gray-500">
                      {selectedSpreadsheet?.name || copy.step1.spreadsheetHelp}
                    </div>
                  </div>
                  <GoogleSheetsPickerButton
                    accessToken={pickerAccessToken}
                    apiKey={pickerApiKey}
                    disabled={!pickerState.canOpen}
                    onPick={handleSpreadsheetPick}
                    onError={message => {
                      setError(message);
                      toast.error(message);
                    }}
                    label={copy.step1.chooseSpreadsheetButton}
                    loadingLabel={copy.step1.chooseSpreadsheetLoading}
                  />
                </div>
                {!pickerState.canOpen ? (
                  <div className="mt-2 text-xs text-amber-700">
                    {pickerState.reason === 'missing_api_key'
                      ? 'Google Picker API key is missing. Add NEXT_PUBLIC_GOOGLE_API_KEY to your frontend env and restart the frontend.'
                      : pickerState.reason === 'missing_access_token'
                        ? 'Google Picker access token is missing. Reconnect Google account or reload the page after backend restart.'
                        : 'Connect a Google account first.'}
                  </div>
                ) : null}
                {selectedSpreadsheet?.url ? (
                  <a
                    href={selectedSpreadsheet.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {copy.step1.openSpreadsheet}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">{t.step1.worksheetLabel}</span>
                <select
                  value={worksheetName}
                  onChange={e => setWorksheetName(e.target.value)}
                  data-tour-id="gs-integration-worksheet"
                  disabled={!selectedSpreadsheet || loadingWorksheets}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                >
                  <option value="">
                    {loadingWorksheets ? copy.step1.loadingWorksheets : copy.step1.selectWorksheet}
                  </option>
                  {worksheets.map(item => (
                    <option key={item.title} value={item.title}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">{t.step1.nameLabel}</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={t.step1.namePlaceholder.value}
                  value={sheetName}
                  onChange={e => setSheetName(e.target.value)}
                  data-tour-id="gs-integration-sheet-name"
                />
                <div className="mt-1 text-xs text-gray-500">{t.step1.nameHelp}</div>
              </label>

              <button
                type="button"
                onClick={handleConnect}
                disabled={submitting || !selectedSpreadsheet}
                data-tour-id="gs-integration-connect"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70 w-fit"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t.step1.connectButton}
              </button>

              <div className="rounded-lg bg-primary/5 p-3 text-sm text-primary mt-2">
                {t.step1.successText}
              </div>
            </div>
          </div>

          <div
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            data-tour-id="gs-integration-step2"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Plug className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t.step2.label}</p>
                <h2 className="text-lg font-semibold text-gray-900">{t.step2.title}</h2>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">{t.step2.description}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://github.com/symonbaikov/parse-ledger/blob/main/docs/google-sheets-apps-script.md"
                target="_blank"
                rel="noreferrer"
                data-tour-id="gs-integration-apps-script"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t.step2.appsScriptDoc}
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href="https://docs.google.com/spreadsheets/u/0/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t.step2.openSheets}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(prev => !prev)}
                className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                {t.step2.showTechnicalDetails}
                {showTechnicalDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {showTechnicalDetails ? (
                <div className="mt-3 rounded-lg bg-gray-50 border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-600">
                  {t.step2.webhookEndpointLabel.value}:{' '}
                  <code className="font-mono">/api/v1/integrations/google-sheets/update</code>
                  <br />
                  {t.step2.webhookHeaderLabel.value}:{' '}
                  <code className="font-mono">
                    X-Webhook-Token: &lt;{t.step2.webhookTokenHint.value}&gt;
                  </code>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            data-tour-id="gs-integration-list"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">{t.list.title}</h3>
              <span className="text-xs text-gray-500">{t.list.subtitle}</span>
            </div>

            {loadingList ? (
              <div className="space-y-2">
                {[1, 2].map(key => (
                  <div
                    key={key}
                    className="animate-pulse rounded-lg border border-gray-100 bg-gray-50 p-3 h-20"
                  />
                ))}
              </div>
            ) : emptyState ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                {t.list.empty}
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                    data-tour-id={index === 0 ? 'gs-integration-connection-card' : undefined}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{item.sheetName}</span>
                            {item.oauthConnected === false ? (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-100">
                                <AlertCircle className="h-3 w-3 mr-1" /> {t.list.badges.oauthNeeded}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-100">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> {t.list.badges.active}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 break-all">ID: {item.sheetId}</p>
                          {item.worksheetName ? (
                            <p className="text-xs text-gray-500">
                              {t.list.fields.worksheetPrefix.value}: {item.worksheetName}
                            </p>
                          ) : null}
                          <p className="text-xs text-gray-500">
                            {t.list.fields.lastSyncPrefix.value}:{' '}
                            {item.lastSync
                              ? new Date(item.lastSync).toLocaleString(
                                  locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
                                )
                              : t.list.dash}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.oauthConnected === false ? (
                          <button
                            type="button"
                            onClick={startOauth}
                            data-tour-id={index === 0 ? 'gs-integration-authorize' : undefined}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                          >
                            <Plug className="h-4 w-4" />
                            {t.list.actions.authorize}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleSync(item.id)}
                          disabled={syncingId === item.id || item.oauthConnected === false}
                          data-tour-id={index === 0 ? 'gs-integration-sync' : undefined}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
                        >
                          {syncingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCcw className="h-4 w-4" />
                          )}
                          {t.list.actions.sync}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          disabled={removingId === item.id}
                          data-tour-id={index === 0 ? 'gs-integration-disconnect' : undefined}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          {removingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          {t.list.actions.disconnect}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
