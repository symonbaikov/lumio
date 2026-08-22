'use client';

import { GoogleSheetsPickerButton } from '@/app/components/GoogleSheetsPickerButton';
import { ExternalLink, FileSpreadsheet } from '@/app/components/icons';
import { Spinner } from '@/app/components/ui/spinner';
import type { SpreadsheetSelection, WorksheetOption } from '@/app/lib/googleSheetsSelection';
import { tokens } from '@/lib/theme-tokens';
import { Box, Stack, Typography } from '@mui/material';
import type React from 'react';
import toast from 'react-hot-toast';
import type { AuthStatus } from '../useGoogleSheetsPage';
import type { GoogleSheetsPageHandlers as PickerStateType } from '../useGoogleSheetsPage';

interface Step1Texts {
  step1: {
    label: React.ReactNode;
    title: React.ReactNode;
    worksheetLabel: React.ReactNode;
    nameLabel: React.ReactNode;
    namePlaceholder: { value: string };
    nameHelp: React.ReactNode;
    connectButton: React.ReactNode;
    successText: React.ReactNode;
  };
}

interface Step1CopyTexts {
  step1: {
    accountLabel: string;
    accountHelp: string;
    connectedAs: string;
    connectAccountButton: string;
    reconnectButton: string;
    spreadsheetLabel: string;
    spreadsheetHelp: string;
    chooseSpreadsheetButton: string;
    chooseSpreadsheetLoading: string;
    openSpreadsheet: string;
    loadingWorksheets: string;
    selectWorksheet: string;
  };
}

interface Step1ConnectProps {
  authStatus: AuthStatus;
  pickerAccessToken: string;
  pickerApiKey: string;
  pickerState: { canOpen: boolean; reason?: string };
  selectedSpreadsheet: SpreadsheetSelection | null;
  worksheets: WorksheetOption[];
  worksheetName: string;
  sheetName: string;
  connectingAccount: boolean;
  loadingWorksheets: boolean;
  submitting: boolean;
  t: Step1Texts;
  copy: Step1CopyTexts;
  setError: (msg: string) => void;
  setWorksheetName: (v: string) => void;
  setSheetName: (v: string) => void;
  onStartOauth: () => void;
  onSpreadsheetPick: (selection: SpreadsheetSelection) => void;
  onConnect: () => void;
}

function PickerReasonMessage({ reason }: { reason?: string }): React.JSX.Element {
  const message =
    reason === 'missing_api_key'
      ? 'Google Picker API key is missing. Add NEXT_PUBLIC_GOOGLE_API_KEY to your frontend env and restart the frontend.'
      : reason === 'missing_access_token'
        ? 'Google Picker access token is missing. Reconnect Google account or reload the page after backend restart.'
        : 'Connect a Google account first.';
  return (
    <Typography style={{ marginTop: 8, fontSize: 12, color: 'var(--color-warning-soft-text)' }}>
      {message}
    </Typography>
  );
}

// eslint-disable-next-line max-lines-per-function, complexity
export function Step1Connect({
  authStatus,
  pickerAccessToken,
  pickerApiKey,
  pickerState,
  selectedSpreadsheet,
  worksheets,
  worksheetName,
  sheetName,
  connectingAccount,
  loadingWorksheets,
  submitting,
  t,
  copy,
  setError,
  setWorksheetName,
  setSheetName,
  onStartOauth,
  onSpreadsheetPick,
  onConnect,
}: Step1ConnectProps): React.JSX.Element {
  const cannotConnect = submitting || !selectedSpreadsheet;

  return (
    <Box
      sx={{
        borderRadius: tokens.radius.lg,
        border: '1px solid var(--border-color)',
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
          <Typography style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
            {t.step1.label}
          </Typography>
          <Typography style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>
            {t.step1.title}
          </Typography>
        </Box>
      </Box>
      <Stack spacing={2}>
        <Box
          sx={{
            borderRadius: tokens.radius.lg,
            border: '1px solid var(--border-color)',
            bgcolor: 'var(--muted)',
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
              <Typography style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>
                {copy.step1.accountLabel}
              </Typography>
              <Typography style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
                {authStatus.connected
                  ? copy.step1.connectedAs.replace('{email}', authStatus.email || 'Google')
                  : copy.step1.accountHelp}
              </Typography>
            </Box>
            <button
              type="button"
              onClick={onStartOauth}
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
                color: '#fff',
                border: 'none',
                cursor: connectingAccount ? 'not-allowed' : 'pointer',
                opacity: connectingAccount ? 0.7 : 1,
              }}
            >
              {connectingAccount ? <Spinner size={16} /> : null}
              {authStatus.connected ? copy.step1.reconnectButton : copy.step1.connectAccountButton}
            </button>
          </Box>
        </Box>
        <Box
          sx={{ borderRadius: tokens.radius.lg, border: '1px solid var(--border-color)', p: 1.5 }}
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
              <Typography style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>
                {copy.step1.spreadsheetLabel}
              </Typography>
              <Typography style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
                {selectedSpreadsheet?.name || copy.step1.spreadsheetHelp}
              </Typography>
            </Box>
            <GoogleSheetsPickerButton
              accessToken={pickerAccessToken}
              apiKey={pickerApiKey}
              disabled={!pickerState.canOpen}
              onPick={onSpreadsheetPick}
              onError={(msg): void => {
                setError(msg);
                toast.error(msg);
              }}
              label={copy.step1.chooseSpreadsheetButton}
              loadingLabel={copy.step1.chooseSpreadsheetLoading}
            />
          </Box>
          {!pickerState.canOpen && <PickerReasonMessage reason={pickerState.reason} />}
          {selectedSpreadsheet?.url && (
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
          )}
        </Box>
        <label style={{ display: 'block' }}>
          <Typography style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>
            {t.step1.worksheetLabel}
          </Typography>
          <select
            value={worksheetName}
            onChange={(e): void => setWorksheetName(e.target.value)}
            data-tour-id="gs-integration-worksheet"
            disabled={!selectedSpreadsheet || loadingWorksheets}
            style={{
              marginTop: 4,
              width: '100%',
              border: '1px solid var(--border-color)',
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
          <Typography style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>
            {t.step1.nameLabel}
          </Typography>
          <input
            type="text"
            style={{
              marginTop: 4,
              width: '100%',
              border: '1px solid var(--border-color)',
              borderRadius: tokens.radius.md,
              background: 'var(--card-bg)',
              padding: '8px 12px',
              fontSize: 14,
            }}
            placeholder={t.step1.namePlaceholder.value}
            value={sheetName}
            onChange={(e): void => setSheetName(e.target.value)}
            data-tour-id="gs-integration-sheet-name"
          />
          <Typography style={{ marginTop: 4, fontSize: 12, color: 'var(--muted-foreground)' }}>
            {t.step1.nameHelp}
          </Typography>
        </label>
        <button
          type="button"
          onClick={onConnect}
          disabled={cannotConnect}
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
            color: '#fff',
            border: 'none',
            cursor: cannotConnect ? 'not-allowed' : 'pointer',
            opacity: cannotConnect ? 0.7 : 1,
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
  );
}

// Needed to satisfy TS but avoid circular - just re-export the type shape
export type { PickerStateType };
