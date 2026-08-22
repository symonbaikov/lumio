'use client';
import { formatStoredDateTime } from '@/app/lib/user-format-store';

import { AlertCircle, CheckCircle2, Plug, RefreshCcw, Trash2 } from '@/app/components/icons';
import { Spinner } from '@/app/components/ui/spinner';
import { tokens } from '@/lib/theme-tokens';
import { Box, Stack, Typography } from '@mui/material';
import type React from 'react';
import type { GoogleSheetConnection } from '../useGoogleSheetsPage';

interface ConnectionCardTexts {
  list: {
    badges: { oauthNeeded: React.ReactNode; active: React.ReactNode };
    fields: { worksheetPrefix: { value: string }; lastSyncPrefix: { value: string } };
    actions: { authorize: React.ReactNode; sync: React.ReactNode; disconnect: React.ReactNode };
    dash: React.ReactNode;
  };
}

interface ConnectionCardProps {
  item: GoogleSheetConnection;
  index: number;
  syncingId: string | null;
  removingId: string | null;
  locale: string;
  t: ConnectionCardTexts;
  onAuthorize: () => void;
  onSync: (id: string) => void;
  onRemove: (id: string) => void;
}

const LOCALE_MAP: Record<string, string> = { kk: 'kk-KZ', ru: 'ru-RU', en: 'en-US' };

function formatLastSync({
  lastSync,
  locale,
}: { lastSync: string | null | undefined; locale: string }): string {
  if (!lastSync) return '';
  return formatStoredDateTime(lastSync, LOCALE_MAP[locale] ?? 'en-US');
}

function ConnectionStatus({
  oauthConnected,
  t,
}: { oauthConnected: boolean | undefined; t: ConnectionCardTexts }): React.JSX.Element {
  if (oauthConnected === false) {
    return (
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
    );
  }
  return (
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
      <CheckCircle2 style={{ height: 12, width: 12, marginRight: 4 }} /> {t.list.badges.active}
    </Box>
  );
}

// eslint-disable-next-line max-lines-per-function, complexity
export function ConnectionCard({
  item,
  index,
  syncingId,
  removingId,
  locale,
  t,
  onAuthorize,
  onSync,
  onRemove,
}: ConnectionCardProps): React.JSX.Element {
  const isSyncing = syncingId === item.id;
  const isRemoving = removingId === item.id;
  const isDisabled = isSyncing || item.oauthConnected === false;
  const lastSyncText = item.lastSync
    ? formatLastSync({ lastSync: item.lastSync, locale })
    : String(t.list.dash ?? '-');

  return (
    <Box
      sx={{
        borderRadius: tokens.radius.lg,
        border: '1px solid var(--border-color)',
        bgcolor: 'background.paper',
        p: 1.5,
        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
      }}
      data-tour-id={index === 0 ? 'gs-integration-connection-card' : undefined}
    >
      <Stack spacing={1.5}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography style={{ fontWeight: 600, color: 'var(--foreground)' }}>
              {item.sheetName}
            </Typography>
            <ConnectionStatus oauthConnected={item.oauthConnected} t={t} />
          </Box>
          <Typography
            style={{
              fontSize: 12,
              color: 'var(--muted-foreground)',
              marginTop: 4,
              wordBreak: 'break-all',
            }}
          >
            ID: {item.sheetId}
          </Typography>
          {item.worksheetName && (
            <Typography style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
              {t.list.fields.worksheetPrefix.value}: {item.worksheetName}
            </Typography>
          )}
          <Typography style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
            {t.list.fields.lastSyncPrefix.value}: {lastSyncText}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {item.oauthConnected === false && (
            <button
              type="button"
              onClick={onAuthorize}
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
          )}
          <button
            type="button"
            onClick={(): void => onSync(item.id)}
            disabled={isDisabled}
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
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.6 : 1,
            }}
          >
            {isSyncing ? <Spinner size={16} /> : <RefreshCcw style={{ height: 16, width: 16 }} />}
            {t.list.actions.sync}
          </button>
          <button
            type="button"
            onClick={(): void => onRemove(item.id)}
            disabled={isRemoving}
            data-tour-id={index === 0 ? 'gs-integration-disconnect' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: tokens.radius.md,
              border: '1px solid var(--border-color)',
              background: 'transparent',
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--foreground)',
              cursor: isRemoving ? 'not-allowed' : 'pointer',
              opacity: isRemoving ? 0.6 : 1,
            }}
          >
            {isRemoving ? <Spinner size={16} /> : <Trash2 style={{ height: 16, width: 16 }} />}
            {t.list.actions.disconnect}
          </button>
        </Box>
      </Stack>
    </Box>
  );
}
