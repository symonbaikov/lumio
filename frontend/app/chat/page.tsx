'use client';

import { useLocalModel } from '@/app/(main)/ai-analysis/llm/useLocalModel';
import { RECOMMENDED_MODEL_ID, resolveCatalog } from '@/app/(main)/ai-analysis/model-catalog';
import { Sparkles } from '@/app/components/icons';
import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import { Box, Button, Chip, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAgentChat } from './agent/useAgentChat';
import { createWebLlmAgentEngine } from './agent/webllm-engine';
import { setChatModePreferred } from './chat-mode-preference';
import { ActionCard } from './components/ActionCard';

export default function ChatModePage(): React.JSX.Element {
  const t = useIntlayer('chatMode');
  const router = useRouter();
  const { load, engine, ...modelState } = useLocalModel();

  const activeModel = resolveCatalog().find(entry => entry.modelId === modelState.activeModelId);
  const ready = modelState.status === 'ready' && engine !== null && activeModel !== undefined;

  const agentEngine = useMemo(() => (engine ? createWebLlmAgentEngine(engine) : null), [engine]);
  const { turns, busy, send, stop, confirmAction, cancelAction, startNew } = useAgentChat(
    agentEngine,
    activeModel?.modelId ?? RECOMMENDED_MODEL_ID,
  );

  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [turns]);

  // Entering the page opts the device into chat mode; the exit button opts out.
  useEffect(() => {
    setChatModePreferred(true);
  }, []);

  const exitMode = (): void => {
    setChatModePreferred(false);
    router.push('/dashboard');
  };

  const submit = (text?: string): void => {
    const question = (text ?? draft).trim();
    if (question === '' || busy || !ready) {
      return;
    }
    setDraft('');
    void send(question);
  };

  return (
    <Box
      sx={{
        maxWidth: 720,
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: 3,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: tokens.radius.full,
            bgcolor: 'rgba(var(--color-primary-rgb), 0.1)',
            display: 'flex',
          }}
        >
          <Sparkles size={20} />
        </Box>
        <Typography component="h1" sx={{ fontSize: 20, fontWeight: 600, flexGrow: 1 }}>
          {t.title}
        </Typography>
        <Button size="small" variant="text" onClick={startNew} disabled={busy}>
          {t.newChat}
        </Button>
        <Button size="small" variant="outlined" onClick={exitMode}>
          {t.exitMode}
        </Button>
      </Stack>

      {!ready ? (
        <Stack spacing={2} sx={{ my: 'auto', alignItems: 'flex-start' }}>
          <Typography sx={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {t.modelNeeded}
          </Typography>
          {modelState.status === 'downloading' ? (
            <Box sx={{ width: '100%' }}>
              <LinearProgress
                variant={modelState.progress === null ? 'indeterminate' : 'determinate'}
                value={(modelState.progress ?? 0) * 100}
              />
              {modelState.progressText ? (
                <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mt: 0.5 }}>
                  {modelState.progressText}
                </Typography>
              ) : null}
            </Box>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={() => void load(RECOMMENDED_MODEL_ID)}>
                {t.loadModel}
              </Button>
              <Button variant="outlined" component={Link} href="/ai-analysis">
                {t.manageModels}
              </Button>
            </Stack>
          )}
        </Stack>
      ) : (
        <>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
            {turns.length === 0 ? (
              <Stack spacing={2} sx={{ mt: 4 }}>
                <Typography sx={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  {t.welcome}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={t.chipExpense} onClick={() => submit(String(t.chipExpense))} />
                  <Chip label={t.chipUpload} onClick={() => submit(String(t.chipUpload))} />
                  <Chip label={t.chipSpend} onClick={() => submit(String(t.chipSpend))} />
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                {turns.map(turn =>
                  turn.role === 'tool' && turn.action ? (
                    <ActionCard
                      key={turn.id}
                      action={turn.action}
                      reply={turn.content}
                      onConfirm={() => void confirmAction(turn.id)}
                      onCancel={() => cancelAction(turn.id)}
                    />
                  ) : (
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
                      </Typography>
                    </Box>
                  ),
                )}
                {busy ? (
                  <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>…</Typography>
                ) : null}
              </Stack>
            )}
            <div ref={endRef} />
          </Box>

          <Stack direction="row" spacing={1} alignItems="flex-end">
            <TextField
              fullWidth
              size="small"
              multiline
              maxRows={4}
              value={draft}
              placeholder={String(t.placeholder)}
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
                {t.stop}
              </Button>
            ) : (
              <Button variant="contained" onClick={() => submit()} disabled={draft.trim() === ''}>
                {t.send}
              </Button>
            )}
          </Stack>
        </>
      )}
    </Box>
  );
}
