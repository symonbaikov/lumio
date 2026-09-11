'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';
import { getRecord } from '@/app/lib/side-panel-utils';
import type { AuditEventDiff } from '@/lib/api/audit';

const TECHNICAL_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'workspaceId', 'userId']);

const FIELD_LABELS: Record<string, string> = {
  backgroundImage: 'Background image',
  color: 'Color',
  name: 'Name',
  description: 'Description',
  title: 'Title',
  position: 'Position',
};

const formatScalarValue = (value: string | number | boolean): string => String(value);

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return formatScalarValue(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

function DiffPatchView({ diff }: { diff: Extract<AuditEventDiff, unknown[]> }): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {diff.map((op, idx) => {
        const key = `${op.op}-${op.path}-${idx}`;
        return (
          <Box
            key={key}
            sx={{
              border: '1px solid var(--border-color)',
              bgcolor: 'var(--muted)',
              p: 1.5,
              fontSize: 14,
            }}
          >
            <Typography variant="body2" fontWeight={600} style={{ color: 'var(--foreground)' }}>
              {op.op.toUpperCase()} {op.path}
            </Typography>
            {op.value !== undefined && (
              <pre
                style={{
                  marginTop: 8,
                  whiteSpace: 'pre-wrap',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  margin: '8px 0 0',
                }}
              >
                {formatValue(op.value)}
              </pre>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function getRowBackground(hadBefore: boolean, hadAfter: boolean, changed: boolean): string {
  if (hadBefore && !hadAfter) {
    return 'var(--color-error-soft-bg)';
  }
  if (!hadBefore && hadAfter) {
    return 'var(--color-success-soft-bg)';
  }
  if (changed) {
    return '#fefce8';
  }
  return 'transparent';
}

function DiffObjectView({
  before,
  after,
  keys,
}: {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  keys: string[];
}): React.JSX.Element {
  return (
    <Box sx={{ overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          bgcolor: 'var(--muted)',
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: 'var(--muted-foreground)',
        }}
      >
        <Box sx={{ px: 1.5, py: 1 }}>Field</Box>
        <Box sx={{ px: 1.5, py: 1 }}>Before</Box>
        <Box sx={{ px: 1.5, py: 1 }}>After</Box>
      </Box>
      <Box>
        {keys.map(key => {
          const beforeValue = getRecord(before)?.[key];
          const afterValue = getRecord(after)?.[key];
          const hadBefore = Object.hasOwn(before, key);
          const hadAfter = Object.hasOwn(after, key);
          const changed = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
          const rowBg = getRowBackground(hadBefore, hadAfter, changed);
          return (
            <Box
              key={key}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                fontSize: 14,
                bgcolor: rowBg,
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <Box sx={{ px: 1.5, py: 1, fontWeight: 500, color: 'var(--foreground)' }}>
                {FIELD_LABELS[key] ?? key}
              </Box>
              <Box sx={{ px: 1.5, py: 1, color: 'var(--text-secondary)' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>
                  {formatValue(beforeValue)}
                </pre>
              </Box>
              <Box sx={{ px: 1.5, py: 1, color: 'var(--text-secondary)' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>
                  {formatValue(afterValue)}
                </pre>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export function DiffViewer({ diff }: { diff: AuditEventDiff | null }): React.JSX.Element {
  if (!diff) {
    return (
      <Typography variant="body2" style={{ color: 'var(--muted-foreground)' }}>
        No diff available.
      </Typography>
    );
  }

  if (Array.isArray(diff)) {
    return <DiffPatchView diff={diff} />;
  }

  const before = diff.before || {};
  const after = diff.after || {};
  const keys = Array.from(
    new Set([...Object.keys(before || {}), ...Object.keys(after || {})]),
  ).filter(key => !TECHNICAL_FIELDS.has(key));

  if (keys.length === 0) {
    return (
      <Typography variant="body2" style={{ color: 'var(--muted-foreground)' }}>
        No user-facing changes available.
      </Typography>
    );
  }

  return <DiffObjectView before={before} after={after} keys={keys} />;
}
