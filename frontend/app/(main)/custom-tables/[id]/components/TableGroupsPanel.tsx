'use client';

import { Box } from '@mui/material';
import type React from 'react';
import type { TableGroup } from '../hooks/useTableGroups';

interface TableGroupsPanelProps {
  groups: TableGroup[];
  loading: boolean;
  /** Заголовок колонки, по которой сгруппировано. */
  groupByTitle: string;
  columnTitles: Record<string, string>;
  aggregateLabels: Record<string, string>;
  labels: { heading: string; count: string; empty: string; loading: string; noValue: string };
}

function formatValue(value: number | string | null): string {
  if (value === null) {
    return '—';
  }
  if (typeof value === 'number') {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  }
  return value;
}

export function TableGroupsPanel({
  groups,
  loading,
  groupByTitle,
  columnTitles,
  aggregateLabels,
  labels,
}: TableGroupsPanelProps): React.JSX.Element {
  return (
    <Box
      sx={{
        border: '1px solid var(--border-color)',
        bgcolor: 'var(--card-bg)',
        mb: 1.5,
        maxHeight: 260,
        overflowY: 'auto',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {labels.heading}: {groupByTitle}
      </Box>
      {loading && (
        <Box sx={{ px: 2, py: 1.5, fontSize: 13, color: 'var(--muted-foreground)' }}>
          {labels.loading}
        </Box>
      )}
      {!loading && groups.length === 0 && (
        <Box sx={{ px: 2, py: 1.5, fontSize: 13, color: 'var(--muted-foreground)' }}>
          {labels.empty}
        </Box>
      )}
      {!loading &&
        groups.map(group => (
          <Box
            key={group.key ?? '__empty__'}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              px: 2,
              py: 1,
              fontSize: 13,
              borderBottom: '1px solid var(--border-color)',
              '&:last-of-type': { borderBottom: 'none' },
            }}
          >
            <Box
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: group.key === null ? 'var(--muted-foreground)' : 'var(--foreground)',
              }}
            >
              {group.key === null || group.key === '' ? labels.noValue : group.key}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              {group.aggregates.map(agg => (
                <Box key={`${agg.col}:${agg.fn}`} sx={{ color: 'var(--text-secondary)' }}>
                  <Box component="span" sx={{ color: 'var(--muted-foreground)', mr: 0.5 }}>
                    {columnTitles[agg.col] ?? agg.col} · {aggregateLabels[agg.fn] ?? agg.fn}
                  </Box>
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    {formatValue(agg.value)}
                  </Box>
                </Box>
              ))}
              <Box sx={{ color: 'var(--muted-foreground)' }}>
                {labels.count}: <strong>{group.count}</strong>
              </Box>
            </Box>
          </Box>
        ))}
    </Box>
  );
}
