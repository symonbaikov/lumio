'use client';

import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import { Box, Button, Stack, Typography } from '@mui/material';
import type React from 'react';
import type { AgentAction } from '../agent/useAgentChat';

export interface ActionCardProps {
  action: AgentAction;
  /** The model's short reply that accompanied the action proposal. */
  reply: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * One card for the whole action lifecycle. A pending write shows the summary
 * with Confirm/Cancel — the only path to executing a write tool. Read/ui
 * actions reuse the same card in its running/done states.
 */
export function ActionCard({ action, reply, onConfirm, onCancel }: ActionCardProps): React.JSX.Element {
  const t = useIntlayer('chatMode');

  const statusLine = (): React.ReactNode => {
    switch (action.status) {
      case 'running':
        return <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.working}</Typography>;
      case 'done':
        return <Typography sx={{ fontSize: 12, color: 'var(--success, #2e7d32)' }}>{t.actionDone}</Typography>;
      case 'error':
        return (
          <Typography sx={{ fontSize: 12, color: 'var(--error, #d32f2f)' }}>
            {t.actionError}
            {action.errorMessage ? `: ${action.errorMessage}` : ''}
          </Typography>
        );
      case 'cancelled':
        return <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.actionCancelled}</Typography>;
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        alignSelf: 'flex-start',
        maxWidth: '85%',
        border: '1px solid var(--border-color)',
        borderRadius: tokens.radius.lg,
        px: 1.5,
        py: 1,
      }}
    >
      <Stack spacing={0.75}>
        {reply !== '' ? <Typography sx={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{reply}</Typography> : null}
        {action.status === 'pending' ? (
          <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.confirmPrompt}</Typography>
        ) : null}
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{action.summary}</Typography>
        {action.status === 'pending' ? (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={onConfirm}>
              {t.confirm}
            </Button>
            <Button size="small" variant="outlined" onClick={onCancel}>
              {t.cancel}
            </Button>
          </Stack>
        ) : (
          statusLine()
        )}
      </Stack>
    </Box>
  );
}
