'use client';

import { ModalShell } from '@/app/components/ui/modal-shell';
import { Box } from '@mui/material';
import { useState } from 'react';
import type { ConditionalOp, ConditionalRule } from '../utils/conditionalRules';

const OPS: ConditionalOp[] = [
  'eq',
  'neq',
  'contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'isEmpty',
  'isNotEmpty',
];

/** Операторы без значения — поле ввода для них прячем. */
const OPS_WITHOUT_VALUE = new Set<ConditionalOp>(['isEmpty', 'isNotEmpty']);

interface ConditionalRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: ConditionalRule[];
  columns: Array<{ key: string; title: string }>;
  onChange: (rules: ConditionalRule[]) => void | Promise<void>;
  labels: {
    title: string;
    column: string;
    condition: string;
    value: string;
    color: string;
    target: string;
    targetCell: string;
    targetRow: string;
    add: string;
    remove: string;
    empty: string;
    close: string;
    ops: Record<ConditionalOp, string>;
  };
}

const controlStyle = {
  border: '1px solid var(--border-color)',
  background: 'var(--card-bg)',
  color: 'var(--foreground)',
  padding: '8px 10px',
  fontSize: 13,
} as const;

export function ConditionalRulesModal({
  isOpen,
  onClose,
  rules,
  columns,
  onChange,
  labels,
}: ConditionalRulesModalProps) {
  const [draft, setDraft] = useState<Omit<ConditionalRule, 'id'>>({
    col: columns[0]?.key ?? '',
    op: 'gt',
    value: '',
    target: 'cell',
    style: { backgroundColor: '#fee2e2' },
  });

  const addRule = (): void => {
    if (!draft.col) {
      return;
    }
    // Идентификатор нужен только для ключей списка и удаления.
    const id = `${draft.col}-${draft.op}-${rules.length + 1}`;
    void onChange([...rules, { ...draft, id }]);
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} size="xl" title={labels.title}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <select
            aria-label={labels.column}
            value={draft.col}
            onChange={e => setDraft(prev => ({ ...prev, col: e.target.value }))}
            style={controlStyle}
          >
            {columns.map(col => (
              <option key={col.key} value={col.key}>
                {col.title}
              </option>
            ))}
          </select>
          <select
            aria-label={labels.condition}
            value={draft.op}
            onChange={e => setDraft(prev => ({ ...prev, op: e.target.value as ConditionalOp }))}
            style={controlStyle}
          >
            {OPS.map(op => (
              <option key={op} value={op}>
                {labels.ops[op]}
              </option>
            ))}
          </select>
          {!OPS_WITHOUT_VALUE.has(draft.op) && (
            <input
              aria-label={labels.value}
              value={draft.value ?? ''}
              onChange={e => setDraft(prev => ({ ...prev, value: e.target.value }))}
              style={controlStyle}
            />
          )}
          <input
            aria-label={labels.color}
            type="color"
            value={draft.style.backgroundColor ?? '#fee2e2'}
            onChange={e =>
              setDraft(prev => ({ ...prev, style: { backgroundColor: e.target.value } }))
            }
            style={{ ...controlStyle, padding: 2, width: 44 }}
          />
          <select
            aria-label={labels.target}
            value={draft.target}
            onChange={e =>
              setDraft(prev => ({ ...prev, target: e.target.value as 'cell' | 'row' }))
            }
            style={controlStyle}
          >
            <option value="cell">{labels.targetCell}</option>
            <option value="row">{labels.targetRow}</option>
          </select>
          <Box
            component="button"
            type="button"
            onClick={addRule}
            sx={{
              ...controlStyle,
              cursor: 'pointer',
              fontWeight: 600,
              '&:hover': { bgcolor: 'var(--muted)' },
            }}
          >
            {labels.add}
          </Box>
        </Box>

        {rules.length === 0 && (
          <Box sx={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{labels.empty}</Box>
        )}

        {rules.map(rule => (
          <Box
            key={rule.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              border: '1px solid var(--border-color)',
              px: 1.5,
              py: 1,
              fontSize: 13,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  border: '1px solid var(--border-color)',
                  bgcolor: rule.style.backgroundColor,
                }}
              />
              <span>
                {columns.find(c => c.key === rule.col)?.title ?? rule.col} · {labels.ops[rule.op]}
                {OPS_WITHOUT_VALUE.has(rule.op) ? '' : ` ${rule.value ?? ''}`} ·{' '}
                {rule.target === 'row' ? labels.targetRow : labels.targetCell}
              </span>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => void onChange(rules.filter(r => r.id !== rule.id))}
              sx={{
                ...controlStyle,
                cursor: 'pointer',
                color: 'var(--destructive)',
                '&:hover': { bgcolor: 'var(--color-error-soft-bg)' },
              }}
            >
              {labels.remove}
            </Box>
          </Box>
        ))}
      </Box>
    </ModalShell>
  );
}
