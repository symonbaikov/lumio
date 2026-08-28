'use client';

import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { Box } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface RowComment {
  id: string;
  body: string;
  resolvedAt: string | null;
  createdAt: string;
  author: { id: string; name: string } | null;
}

interface RowCommentsProps {
  tableId: string;
  rowId: string;
}

/** Обсуждение конкретной строки — рядом с историей её изменений. */
export function RowComments({ tableId, rowId }: RowCommentsProps) {
  const t = useIntlayer('rowComments');
  const [comments, setComments] = useState<RowComment[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await apiClient.get(`/custom-tables/${tableId}/rows/${rowId}/comments`);
      const root = (response.data ?? {}) as Record<string, unknown>;
      const nested = (root.data ?? {}) as Record<string, unknown>;
      const items = root.items ?? nested.items ?? [];
      setComments(Array.isArray(items) ? (items as RowComment[]) : []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  }, [tableId, rowId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (): Promise<void> => {
    const body = draft.trim();
    if (!body) {
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(`/custom-tables/${tableId}/rows/${rowId}/comments`, { body });
      setDraft('');
      await load();
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error(t.addFailed.value);
    } finally {
      setBusy(false);
    }
  };

  const toggleResolved = async (comment: RowComment): Promise<void> => {
    try {
      await apiClient.patch(`/custom-tables/${tableId}/comments/${comment.id}`, {
        resolved: !comment.resolvedAt,
      });
      await load();
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Box
          component="textarea"
          value={draft}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
          rows={2}
          placeholder={t.placeholder.value}
          sx={{
            flex: 1,
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            color: 'var(--foreground)',
            p: 1,
            fontSize: 13,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <Box
          component="button"
          type="button"
          disabled={busy || !draft.trim()}
          onClick={() => void submit()}
          sx={{
            alignSelf: 'flex-start',
            border: '1px solid var(--border-color)',
            bgcolor: 'var(--card-bg)',
            px: 2,
            py: 1,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            color: 'var(--foreground)',
            '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
          }}
        >
          {t.submit.value}
        </Box>
      </Box>

      {comments.length === 0 && (
        <Box sx={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{t.empty.value}</Box>
      )}

      {comments.map(comment => (
        <Box
          key={comment.id}
          sx={{
            border: '1px solid var(--border-color)',
            p: 1.5,
            fontSize: 13,
            // Решённые уходят на второй план, но остаются видимыми.
            opacity: comment.resolvedAt ? 0.6 : 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1,
              color: 'var(--muted-foreground)',
              fontSize: 12,
              mb: 0.5,
            }}
          >
            <span>{comment.author?.name ?? '—'}</span>
            <span>{new Date(comment.createdAt).toLocaleString()}</span>
          </Box>
          <Box sx={{ whiteSpace: 'pre-wrap' }}>{comment.body}</Box>
          <Box
            component="button"
            type="button"
            onClick={() => void toggleResolved(comment)}
            sx={{
              mt: 1,
              border: 'none',
              background: 'none',
              p: 0,
              fontSize: 12,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            {comment.resolvedAt ? t.reopen.value : t.markResolved.value}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
