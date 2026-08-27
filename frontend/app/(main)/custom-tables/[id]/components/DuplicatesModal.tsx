'use client';

import { ModalShell } from '@/app/components/ui/modal-shell';
import { Box } from '@mui/material';
import { useState } from 'react';
import type { DuplicateGroup } from '../hooks/useTableDuplicates';

interface DuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Array<{ key: string; title: string }>;
  groups: DuplicateGroup[];
  loading: boolean;
  searched: boolean;
  onSearch: (keys: string[]) => void | Promise<void>;
  /** Выделяет найденные строки в гриде, чтобы их можно было разом удалить. */
  onSelectRows: (rowIds: string[]) => void;
  labels: {
    title: string;
    hint: string;
    search: string;
    searching: string;
    empty: string;
    notSearched: string;
    rows: string;
    select: string;
    selectExtra: string;
  };
}

export function DuplicatesModal({
  isOpen,
  onClose,
  columns,
  groups,
  loading,
  searched,
  onSearch,
  onSelectRows,
  labels,
}: DuplicatesModalProps) {
  const [keys, setKeys] = useState<string[]>([]);

  const toggleKey = (key: string): void => {
    setKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} size="xl" title={labels.title}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{labels.hint}</Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {columns.map(col => (
            <label
              key={col.key}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <input
                type="checkbox"
                checked={keys.includes(col.key)}
                onChange={() => toggleKey(col.key)}
              />
              {col.title}
            </label>
          ))}
        </Box>

        <Box
          component="button"
          type="button"
          disabled={loading || keys.length === 0}
          onClick={() => void onSearch(keys)}
          sx={{
            alignSelf: 'flex-start',
            border: '1px solid var(--border-color)',
            bgcolor: 'var(--card-bg)',
            px: 2,
            py: 1,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--foreground)',
            cursor: 'pointer',
            '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
          }}
        >
          {loading ? labels.searching : labels.search}
        </Box>

        {!(loading || searched) && (
          <Box sx={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{labels.notSearched}</Box>
        )}
        {!loading && searched && groups.length === 0 && (
          <Box sx={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{labels.empty}</Box>
        )}

        {groups.map(group => (
          <Box
            key={group.key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              border: '1px solid var(--border-color)',
              px: 1.5,
              py: 1,
              fontSize: 13,
            }}
          >
            <Box sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {group.key}
              <Box component="span" sx={{ ml: 1, color: 'var(--muted-foreground)' }}>
                {labels.rows}: {group.count} (#{group.rowNumbers.join(', #')})
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Box
                component="button"
                type="button"
                onClick={() => onSelectRows(group.rowIds)}
                sx={{
                  border: '1px solid var(--border-color)',
                  bgcolor: 'transparent',
                  px: 1,
                  py: 0.5,
                  fontSize: 12,
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                {labels.select}
              </Box>
              <Box
                component="button"
                type="button"
                // Оставляем первую строку, выделяем остальные — типичный сценарий чистки.
                onClick={() => onSelectRows(group.rowIds.slice(1))}
                sx={{
                  border: '1px solid var(--border-color)',
                  bgcolor: 'transparent',
                  px: 1,
                  py: 0.5,
                  fontSize: 12,
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                {labels.selectExtra}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </ModalShell>
  );
}
