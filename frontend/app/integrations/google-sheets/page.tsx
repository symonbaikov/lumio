/* eslint-disable max-lines */
'use client';
import { formatStoredDateTime } from '@/app/lib/user-format-store';

import { GoogleSheetsPickerButton } from '@/app/components/GoogleSheetsPickerButton';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileSpreadsheet,
  Plug,
  RefreshCcw,
  Trash2,
} from '@/app/components/icons';
import { Spinner } from '@/app/components/ui/spinner';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { getGoogleSheetsIntegrationCopy } from '@/app/lib/googleSheetsIntegrationCopy';
import { getGoogleSheetsPickerState } from '@/app/lib/googleSheetsPickerState';
import {
  type SpreadsheetSelection,
  type WorksheetOption,
  getDefaultWorksheetName,
} from '@/app/lib/googleSheetsSelection';
import { tokens } from '@/lib/theme-tokens';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useTheme } from 'next-themes';
import type React from 'react';
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

// eslint-disable-next-line max-lines-per-function, complexity
export default function GoogleSheetsIntegrationPage(): React.JSX.Element {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
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

  const loadConnections = async (): Promise<void> => {
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

  // eslint-disable-next-line complexity
  const loadAuthStatus = async (): Promise<void> => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const startOauth = async (): Promise<void> => {
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
    } catch (err) {
      const message = getApiErrorMessage(err, t.errors.connectFailed.value);
      setError(message);
      toast.error(message);
    } finally {
      setConnectingAccount(false);
    }
  };

  const loadWorksheets = async (spreadsheetId: string): Promise<void> => {
    try {
      setLoadingWorksheets(true);
      const response = await apiClient.get(
        `/google-sheets/spreadsheets/${spreadsheetId}/worksheets`,
      );
      const items: WorksheetOption[] = response.data?.data || response.data || [];
      setWorksheets(items);
      setWorksheetName(current => getDefaultWorksheetName(current, items));
    } catch (err) {
      const message = getApiErrorMessage(err, copy.errors.loadWorksheets);
      setError(message);
      toast.error(message);
    } finally {
      setLoadingWorksheets(false);
    }
  };

  const handleSpreadsheetPick = async (selection: SpreadsheetSelection): Promise<void> => {
    setSelectedSpreadsheet(selection);
    setSheetName(selection.name);
    setWorksheetName('');
    setWorksheets([]);
    setSuccess(null);
    setError(null);
    await loadWorksheets(selection.spreadsheetId);
  };

  const handleConnect = async (): Promise<void> => {
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
    } catch (err) {
      const message = getApiErrorMessage(err, t.errors.connectFailed.value);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async (id: string): Promise<void> => {
    try {
      setSyncingId(id);
      setError(null);
      setSuccess(null);
      await apiClient.put(`/google-sheets/${id}/sync`, {});
      setSuccess(t.toasts.syncStarted.value);
      toast.success(t.toasts.syncStarted.value);
      await loadConnections();
    } catch (err) {
      const message = getApiErrorMessage(err, t.errors.syncFailed.value);
      setError(message);
      toast.error(message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleRemove = async (id: string): Promise<void> => {
    try {
      setRemovingId(id);
      setError(null);
      setSuccess(null);
      await apiClient.delete(`/google-sheets/${id}`);
      setSuccess(t.toasts.removed.value);
      toast.success(t.toasts.removed.value);
      await loadConnections();
    } catch (err) {
      const message = getApiErrorMessage(err, t.errors.removeFailed.value);
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
      <Box
        sx={{
          display: 'flex',
          minHeight: '60vh',
          alignItems: 'center',
          justifyContent: 'center',
          color: c.ink500,
        }}
      >
        <Spinner size={24} />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ maxWidth: 768, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 5 }}>
        <Box
          sx={{
            borderRadius: tokens.radius.lg,
            border: `1px solid ${c.ink150}`,
            bgcolor: 'background.paper',
            p: 3,
            boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
            textAlign: 'center',
          }}
        >
          <Typography style={{ color: c.ink800, fontWeight: 600, marginBottom: 8 }}>
            {t.loginRequired.title}
          </Typography>
          <Typography style={{ fontSize: 14, color: c.ink700 }}>
            {t.loginRequired.subtitle}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 5 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 3 }}
        data-tour-id="gs-integration-header"
      >
        <Box
          sx={{
            p: 1,
            borderRadius: tokens.radius.full,
            bgcolor: 'rgba(var(--color-primary-rgb), 0.1)',
            color: 'primary.main',
            display: 'flex',
          }}
        >
          <Plug style={{ height: 24, width: 24 }} />
        </Box>
        <Box>
          <Typography variant="h4" style={{ fontWeight: 700, color: c.ink900 }}>
            {t.header.title}
          </Typography>
          <Typography style={{ color: c.ink500, marginTop: 4 }}>{t.header.subtitle}</Typography>
        </Box>
      </Box>

      {(error || success) && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {success && (
            <Alert severity="success" icon={<CheckCircle2 style={{ height: 16, width: 16 }} />}>
              {success}
            </Alert>
          )}
          {error && (
            <Alert severity="error" icon={<AlertCircle style={{ height: 16, width: 16 }} />}>
              {error}
            </Alert>
          )}
        </Stack>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 2,
        }}
      >
        <Stack spacing={2}>
          <Box
            sx={{
              borderRadius: tokens.radius.lg,
              border: `1px solid ${c.ink150}`,
              bgcolor: 'background.paper',
              p: 2,
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
            }}
            data-tour-id="gs-integration-step1"
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: tokens.radius.sm,
                  bgcolor: 'rgba(var(--color-primary-rgb), 0.1)',
                  border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
                  display: 'flex',
                }}
              >
                <FileSpreadsheet style={{ height: 20, width: 20, color: 'var(--color-primary)' }} />
              </Box>
              <Box>
                <Typography style={{ fontSize: 14, color: c.ink500 }}>{t.step1.label}</Typography>
                <Typography style={{ fontSize: 18, fontWeight: 600, color: c.ink900 }}>
                  {t.step1.title}
                </Typography>
              </Box>
            </Box>

            <Stack spacing={2}>
              <Box
                sx={{
                  borderRadius: tokens.radius.lg,
                  border: `1px solid ${c.ink150}`,
                  bgcolor: c.ink50,
                  p: 1.5,
                }}
                data-tour-id="gs-integration-account"
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography style={{ fontSize: 14, fontWeight: 500, color: c.ink900 }}>
                      {copy.step1.accountLabel}
                    </Typography>
                    <Typography style={{ fontSize: 14, color: c.ink500 }}>
                      {authStatus.connected
                        ? copy.step1.connectedAs.replace('{email}', authStatus.email || 'Google')
                        : copy.step1.accountHelp}
                    </Typography>
                  </Box>
                  <button
                    type="button"
                    onClick={startOauth}
                    disabled={connectingAccount}
                    data-tour-id="gs-integration-connect-account"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderRadius: tokens.radius.md,
                      background: 'var(--color-primary)',
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: c.surface,
                      border: 'none',
                      cursor: connectingAccount ? 'not-allowed' : 'pointer',
                      opacity: connectingAccount ? 0.7 : 1,
                    }}
                  >
                    {connectingAccount ? <Spinner size={16} /> : null}
                    {authStatus.connected
                      ? copy.step1.reconnectButton
                      : copy.step1.connectAccountButton}
                  </button>
                </Box>
              </Box>

              <Box
                sx={{ borderRadius: tokens.radius.lg, border: `1px solid ${c.ink150}`, p: 1.5 }}
                data-tour-id="gs-integration-picker"
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography style={{ fontSize: 14, fontWeight: 500, color: c.ink900 }}>
                      {copy.step1.spreadsheetLabel}
                    </Typography>
                    <Typography style={{ fontSize: 14, color: c.ink500 }}>
                      {selectedSpreadsheet?.name || copy.step1.spreadsheetHelp}
                    </Typography>
                  </Box>
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
                </Box>
                {!pickerState.canOpen ? (
                  <Typography style={{ marginTop: 8, fontSize: 12, color: c.warning }}>
                    {pickerState.reason === 'missing_api_key'
                      ? 'Google Picker API key is missing. Add NEXT_PUBLIC_GOOGLE_API_KEY to your frontend env and restart the frontend.'
                      : pickerState.reason === 'missing_access_token'
                        ? 'Google Picker access token is missing. Reconnect Google account or reload the page after backend restart.'
                        : 'Connect a Google account first.'}
                  </Typography>
                ) : null}
                {selectedSpreadsheet?.url ? (
                  <a
                    href={selectedSpreadsheet.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      marginTop: 8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: 'var(--color-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    {copy.step1.openSpreadsheet}
                    <ExternalLink style={{ height: 12, width: 12 }} />
                  </a>
                ) : null}
              </Box>

              <label style={{ display: 'block' }}>
                <Typography style={{ fontSize: 14, fontWeight: 500, color: c.ink800 }}>
                  {t.step1.worksheetLabel}
                </Typography>
                <select
                  value={worksheetName}
                  onChange={e => setWorksheetName(e.target.value)}
                  data-tour-id="gs-integration-worksheet"
                  disabled={!selectedSpreadsheet || loadingWorksheets}
                  style={{
                    marginTop: 4,
                    width: '100%',
                    border: `1px solid ${c.ink150}`,
                    borderRadius: tokens.radius.md,
                    background: 'var(--card-bg)',
                    padding: '8px 12px',
                    fontSize: 14,
                    opacity: !selectedSpreadsheet || loadingWorksheets ? 0.6 : 1,
                  }}
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

              <label style={{ display: 'block' }}>
                <Typography style={{ fontSize: 14, fontWeight: 500, color: c.ink800 }}>
                  {t.step1.nameLabel}
                </Typography>
                <input
                  type="text"
                  style={{
                    marginTop: 4,
                    width: '100%',
                    border: `1px solid ${c.ink150}`,
                    borderRadius: tokens.radius.md,
                    background: 'var(--card-bg)',
                    padding: '8px 12px',
                    fontSize: 14,
                  }}
                  placeholder={t.step1.namePlaceholder.value}
                  value={sheetName}
                  onChange={e => setSheetName(e.target.value)}
                  data-tour-id="gs-integration-sheet-name"
                />
                <Typography style={{ marginTop: 4, fontSize: 12, color: c.ink500 }}>
                  {t.step1.nameHelp}
                </Typography>
              </label>

              <button
                type="button"
                onClick={handleConnect}
                disabled={submitting || !selectedSpreadsheet}
                data-tour-id="gs-integration-connect"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: tokens.radius.md,
                  background: 'var(--color-primary)',
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: c.surface,
                  border: 'none',
                  cursor: submitting || !selectedSpreadsheet ? 'not-allowed' : 'pointer',
                  opacity: submitting || !selectedSpreadsheet ? 0.7 : 1,
                  width: 'fit-content',
                }}
              >
                {submitting ? <Spinner size={16} /> : null}
                {t.step1.connectButton}
              </button>

              <Box
                sx={{
                  borderRadius: tokens.radius.lg,
                  bgcolor: 'rgba(var(--color-primary-rgb), 0.05)',
                  p: 1.5,
                  mt: 1,
                }}
              >
                <Typography style={{ fontSize: 14, color: 'var(--color-primary)' }}>
                  {t.step1.successText}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box
            sx={{
              borderRadius: tokens.radius.lg,
              border: `1px solid ${c.ink150}`,
              bgcolor: 'background.paper',
              p: 2,
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
            }}
            data-tour-id="gs-integration-step2"
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: tokens.radius.sm,
                  bgcolor: 'rgba(var(--color-primary-rgb), 0.1)',
                  border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
                  display: 'flex',
                }}
              >
                <Plug style={{ height: 20, width: 20, color: 'var(--color-primary)' }} />
              </Box>
              <Box>
                <Typography style={{ fontSize: 14, color: c.ink500 }}>{t.step2.label}</Typography>
                <Typography style={{ fontSize: 18, fontWeight: 600, color: c.ink900 }}>
                  {t.step2.title}
                </Typography>
              </Box>
            </Box>
            <Typography style={{ fontSize: 14, color: c.ink700, marginBottom: 12 }}>
              {t.step2.description}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <a
                href="https://github.com/symonbaikov/parse-ledger/blob/main/docs/google-sheets-apps-script.md"
                target="_blank"
                rel="noreferrer"
                data-tour-id="gs-integration-apps-script"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: `1px solid ${c.ink150}`,
                  borderRadius: tokens.radius.md,
                  padding: '8px 12px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: c.ink800,
                  textDecoration: 'none',
                }}
              >
                {t.step2.appsScriptDoc}
                <ExternalLink style={{ height: 16, width: 16 }} />
              </a>
              <a
                href="https://docs.google.com/spreadsheets/u/0/"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: `1px solid ${c.ink150}`,
                  borderRadius: tokens.radius.md,
                  padding: '8px 12px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: c.ink800,
                  textDecoration: 'none',
                }}
              >
                {t.step2.openSheets}
                <ExternalLink style={{ height: 16, width: 16 }} />
              </a>
            </Box>
            <Box sx={{ mt: 2 }}>
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 14,
                  fontWeight: 500,
                  color: c.ink500,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t.step2.showTechnicalDetails}
                {showTechnicalDetails ? (
                  <ChevronUp style={{ height: 16, width: 16 }} />
                ) : (
                  <ChevronDown style={{ height: 16, width: 16 }} />
                )}
              </button>
              {showTechnicalDetails ? (
                <Box
                  sx={{
                    mt: 1.5,
                    borderRadius: tokens.radius.lg,
                    bgcolor: c.ink50,
                    border: `1px dashed ${c.ink150}`,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Typography style={{ fontSize: 12, color: c.ink700 }}>
                    {t.step2.webhookEndpointLabel.value}:{' '}
                    <code style={{ fontFamily: 'monospace' }}>
                      /api/v1/integrations/google-sheets/update
                    </code>
                    <br />
                    {t.step2.webhookHeaderLabel.value}:{' '}
                    <code style={{ fontFamily: 'monospace' }}>
                      X-Webhook-Token: &lt;{t.step2.webhookTokenHint.value}&gt;
                    </code>
                  </Typography>
                </Box>
              ) : null}
            </Box>
          </Box>
        </Stack>

        <Stack spacing={1.5}>
          <Box
            sx={{
              borderRadius: tokens.radius.lg,
              border: `1px solid ${c.ink150}`,
              bgcolor: 'background.paper',
              p: 2,
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
            }}
            data-tour-id="gs-integration-list"
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1.5,
              }}
            >
              <Typography style={{ fontSize: 16, fontWeight: 600, color: c.ink900 }}>
                {t.list.title}
              </Typography>
              <Typography style={{ fontSize: 12, color: c.ink500 }}>{t.list.subtitle}</Typography>
            </Box>

            {loadingList ? (
              <Stack spacing={1}>
                {[1, 2].map(key => (
                  <Box
                    key={key}
                    sx={{
                      borderRadius: tokens.radius.lg,
                      border: `1px solid ${c.ink100}`,
                      bgcolor: c.ink50,
                      p: 1.5,
                      height: 80,
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                ))}
              </Stack>
            ) : emptyState ? (
              <Box
                sx={{
                  borderRadius: tokens.radius.lg,
                  border: `1px dashed ${c.ink150}`,
                  bgcolor: c.ink50,
                  p: 2,
                }}
              >
                <Typography style={{ fontSize: 14, color: c.ink700 }}>{t.list.empty}</Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {/* eslint-disable-next-line max-lines-per-function, max-params, complexity */}
                {connections.map((item, index) => (
                  <Box
                    key={item.id}
                    sx={{
                      borderRadius: tokens.radius.lg,
                      border: `1px solid ${c.ink150}`,
                      bgcolor: 'background.paper',
                      p: 1.5,
                      boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                    }}
                    data-tour-id={index === 0 ? 'gs-integration-connection-card' : undefined}
                  >
                    <Stack spacing={1.5}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography style={{ fontWeight: 600, color: c.ink900 }}>
                              {item.sheetName}
                            </Typography>
                            {item.oauthConnected === false ? (
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  borderRadius: tokens.radius.sm,
                                  bgcolor: 'var(--color-warning-soft-bg)',
                                  px: 1,
                                  py: 0.25,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: 'var(--color-warning-soft-text)',
                                  border: '1px solid var(--color-warning-soft-border)',
                                }}
                              >
                                <AlertCircle style={{ height: 12, width: 12, marginRight: 4 }} />{' '}
                                {t.list.badges.oauthNeeded}
                              </Box>
                            ) : (
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  borderRadius: tokens.radius.sm,
                                  bgcolor: 'var(--color-success-soft-bg)',
                                  px: 1,
                                  py: 0.25,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: 'var(--color-success-soft-text)',
                                  border: '1px solid var(--color-success-soft-bg)',
                                }}
                              >
                                <CheckCircle2 style={{ height: 12, width: 12, marginRight: 4 }} />{' '}
                                {t.list.badges.active}
                              </Box>
                            )}
                          </Box>
                          <Typography
                            style={{
                              fontSize: 12,
                              color: c.ink500,
                              marginTop: 4,
                              wordBreak: 'break-all',
                            }}
                          >
                            ID: {item.sheetId}
                          </Typography>
                          {item.worksheetName ? (
                            <Typography style={{ fontSize: 12, color: c.ink500 }}>
                              {t.list.fields.worksheetPrefix.value}: {item.worksheetName}
                            </Typography>
                          ) : null}
                          <Typography style={{ fontSize: 12, color: c.ink500 }}>
                            {t.list.fields.lastSyncPrefix.value}:{' '}
                            {item.lastSync
                              ? formatStoredDateTime(
                                  item.lastSync,
                                  locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
                                )
                              : t.list.dash}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {item.oauthConnected === false ? (
                          <button
                            type="button"
                            onClick={startOauth}
                            data-tour-id={index === 0 ? 'gs-integration-authorize' : undefined}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              borderRadius: tokens.radius.md,
                              border: '1px solid var(--color-warning-soft-border)',
                              background: 'var(--color-warning-soft-bg)',
                              padding: '6px 12px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--color-warning-soft-text)',
                              cursor: 'pointer',
                            }}
                          >
                            <Plug style={{ height: 16, width: 16 }} />
                            {t.list.actions.authorize}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleSync(item.id)}
                          disabled={syncingId === item.id || item.oauthConnected === false}
                          data-tour-id={index === 0 ? 'gs-integration-sync' : undefined}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            borderRadius: tokens.radius.md,
                            border: '1px solid var(--color-primary)',
                            background: 'transparent',
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--color-primary)',
                            cursor:
                              syncingId === item.id || item.oauthConnected === false
                                ? 'not-allowed'
                                : 'pointer',
                            opacity:
                              syncingId === item.id || item.oauthConnected === false ? 0.6 : 1,
                          }}
                        >
                          {syncingId === item.id ? (
                            <Spinner size={16} />
                          ) : (
                            <RefreshCcw style={{ height: 16, width: 16 }} />
                          )}
                          {t.list.actions.sync}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          disabled={removingId === item.id}
                          data-tour-id={index === 0 ? 'gs-integration-disconnect' : undefined}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            borderRadius: tokens.radius.md,
                            border: `1px solid ${c.ink150}`,
                            background: 'transparent',
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: c.ink800,
                            cursor: removingId === item.id ? 'not-allowed' : 'pointer',
                            opacity: removingId === item.id ? 0.6 : 1,
                          }}
                        >
                          {removingId === item.id ? (
                            <Spinner size={16} />
                          ) : (
                            <Trash2 style={{ height: 16, width: 16 }} />
                          )}
                          {t.list.actions.disconnect}
                        </button>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
