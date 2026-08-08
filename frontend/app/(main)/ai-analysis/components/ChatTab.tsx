'use client';

import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import Link from 'next/link';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { type ChatSummary, deleteChat, listChats } from '../chat/chats-api';
import { useChat } from '../chat/useChat';

export interface ChatTabProps {
  engine: MLCEngineInterface;
  modelContextTokens: number;
  modelId: string;
}

export function ChatTab({ engine, modelContextTokens, modelId }: ChatTabProps): React.JSX.Element {
  const t = useIntlayer('aiAnalysisPage');
  const { turns, busy, error, packet, sources, chatId, unsaved, send, stop, startNew, open } =
    useChat(engine, modelContextTokens, modelId);
  const [draft, setDraft] = useState('');
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [turns]);

  const refreshChats = (): void => {
    // The list is a convenience, not part of the conversation: a failure here
    // must not stop the user from asking questions.
    listChats()
      .then(setChats)
      .catch(() => undefined);
  };

  // Refreshed when generation finishes so a new chat appears with its real title.
  useEffect(refreshChats, [busy]);

  const submit = (): void => {
    const question = draft.trim();
    if (question === '' || busy) {
      return;
    }
    setDraft('');
    void send(question);
  };

  const incomplete =
    packet !== null && (packet.droppedSections.length > 0 || packet.trimmedSections.length > 0);

  const removeChat = (id: string): void => {
    deleteChat(id)
      .then(() => {
        if (id === chatId) {
          startNew();
        }
        refreshChats();
      })
      .catch(() => undefined);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Button size="small" variant="outlined" onClick={startNew} disabled={busy}>
          {t.chatTab.newChat}
        </Button>
        {chats.length > 0 ? (
          <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t.chatTab.history}:
          </Typography>
        ) : null}
        {chats.map(chat => (
          <Chip
            key={chat.id}
            size="small"
            label={chat.title}
            variant={chat.id === chatId ? 'filled' : 'outlined'}
            onClick={() => void open(chat.id).catch(() => undefined)}
            onDelete={() => removeChat(chat.id)}
            disabled={busy}
          />
        ))}
      </Stack>

      <Box
        sx={{
          border: '1px solid var(--border-color)',
          borderRadius: tokens.radius.lg,
          p: 2,
          minHeight: 280,
          maxHeight: 480,
          overflowY: 'auto',
        }}
      >
        {turns.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {t.chatTab.placeholder}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {turns.map(turn => (
              <Box
                key={turn.id}
                sx={{
                  alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  bgcolor: turn.role === 'user' ? 'var(--muted)' : 'transparent',
                  border: turn.role === 'user' ? 'none' : '1px solid var(--border-color)',
                  borderRadius: tokens.radius.lg,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Typography sx={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>
                  {turn.content}
                  {turn.streaming && turn.content === '' ? '…' : ''}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
        <div ref={endRef} />
      </Box>

      {error !== null ? (
        <Typography sx={{ fontSize: 13 }}>
          {error === 'context' ? t.chatTab.errorContext : t.chatTab.errorGeneration}
        </Typography>
      ) : null}

      {sources.length > 0 ? (
        <Box>
          <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mb: 0.5 }}>
            {t.chatTab.sources}
          </Typography>
          <Stack spacing={0.25}>
            {sources.map(hit => (
              <Link
                key={hit.transactionId}
                href={`/statements?transaction=${hit.transactionId}`}
                style={{ fontSize: 12 }}
              >
                {hit.transactionDate} · {hit.counterpartyName}
                {hit.amount === null ? '' : ` · ${Math.round(hit.amount)} ${hit.currency}`}
              </Link>
            ))}
          </Stack>
        </Box>
      ) : null}

      {unsaved ? (
        <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {t.chatTab.unsaved}
        </Typography>
      ) : null}

      {incomplete ? (
        <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {t.chatTab.partialData}
        </Typography>
      ) : null}

      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={4}
          value={draft}
          placeholder={String(t.chatTab.placeholder)}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        {busy ? (
          <Button variant="outlined" onClick={stop}>
            {t.chatTab.stop}
          </Button>
        ) : (
          <Button variant="contained" onClick={submit} disabled={draft.trim() === ''}>
            {t.chatTab.send}
          </Button>
        )}
      </Stack>

      <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {t.chatTab.disclaimer}
      </Typography>
    </Stack>
  );
}
