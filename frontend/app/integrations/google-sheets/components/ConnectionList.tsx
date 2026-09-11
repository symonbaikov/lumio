'use client';

import { Box, Stack, Typography } from '@mui/material';
import type React from 'react';
import { tokens } from '@/lib/theme-tokens';
import type { GoogleSheetConnection } from '../useGoogleSheetsPage';
import { ConnectionCard } from './ConnectionCard';

interface ConnectionListTexts {
  list: {
    title: React.ReactNode;
    subtitle: React.ReactNode;
    empty: React.ReactNode;
    badges: { oauthNeeded: React.ReactNode; active: React.ReactNode };
    fields: { worksheetPrefix: { value: string }; lastSyncPrefix: { value: string } };
    actions: { authorize: React.ReactNode; sync: React.ReactNode; disconnect: React.ReactNode };
    dash: React.ReactNode;
  };
}

interface ConnectionListProps {
  connections: GoogleSheetConnection[];
  loadingList: boolean;
  emptyState: boolean;
  syncingId: string | null;
  removingId: string | null;
  locale: string;
  t: ConnectionListTexts;
  onAuthorize: () => void;
  onSync: (id: string) => void;
  onRemove: (id: string) => void;
}

function LoadingSkeleton(): React.JSX.Element {
  return (
    <Stack spacing={1}>
      {[1, 2].map(key => (
        <Box
          key={key}
          sx={{
            borderRadius: tokens.radius.lg,
            border: '1px solid var(--muted)',
            bgcolor: 'var(--muted)',
            p: 1.5,
            height: 80,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      ))}
    </Stack>
  );
}

// eslint-disable-next-line max-lines-per-function
export function ConnectionList({
  connections,
  loadingList,
  emptyState,
  syncingId,
  removingId,
  locale,
  t,
  onAuthorize,
  onSync,
  onRemove,
}: ConnectionListProps): React.JSX.Element {
  return (
    <Box
      sx={{
        borderRadius: tokens.radius.lg,
        border: '1px solid var(--border-color)',
        bgcolor: 'background.paper',
        p: 2,
        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
      }}
      data-tour-id="gs-integration-list"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
          {t.list.title}
        </Typography>
        <Typography style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
          {t.list.subtitle}
        </Typography>
      </Box>
      {loadingList ? (
        <LoadingSkeleton />
      ) : emptyState ? (
        <Box
          sx={{
            borderRadius: tokens.radius.lg,
            border: '1px dashed var(--border-color)',
            bgcolor: 'var(--muted)',
            p: 2,
          }}
        >
          <Typography style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {t.list.empty}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {[...connections.keys()].map(index => (
            <ConnectionCard
              key={connections[index].id}
              item={connections[index]}
              index={index}
              syncingId={syncingId}
              removingId={removingId}
              locale={locale}
              t={t}
              onAuthorize={onAuthorize}
              onSync={onSync}
              onRemove={onRemove}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
