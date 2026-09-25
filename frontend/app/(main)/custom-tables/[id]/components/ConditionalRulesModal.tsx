'use client';

import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { ModalShell } from '@/app/components/ui/modal-shell';
import { Select } from '@/app/components/ui/select';
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

  // Колонки могут прийти позже первого рендера: тогда черновик остался бы с
  // пустой колонкой и кнопка «добавить» молча ничего не делала.
  useEffect(() => {
    if (columns.length === 0 || columns.some(col => col.key === draft.col)) {
      return;
    }
    setDraft(prev => ({ ...prev, col: columns[0].key }));
  }, [columns, draft.col]);

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
          <Select
            size="small"
            inputProps={{ 'aria-label': labels.column }}
            value={draft.col}
            onChange={value => setDraft(prev => ({ ...prev, col: value }))}
            options={columns.map(col => ({ value: col.key, label: col.title }))}
          />
          <Select
            size="small"
            inputProps={{ 'aria-label': labels.condition }}
            value={draft.op}
            onChange={value => setDraft(prev => ({ ...prev, op: value as ConditionalOp }))}
            options={OPS.map(op => ({ value: op, label: labels.ops[op] }))}
          />
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
          <Select
            size="small"
            inputProps={{ 'aria-label': labels.target }}
            value={draft.target}
            onChange={value => setDraft(prev => ({ ...prev, target: value as 'cell' | 'row' }))}
            options={[
              { value: 'cell', label: labels.targetCell },
              { value: 'row', label: labels.targetRow },
            ]}
          />
          <Box
            component="button"
            type="button"
            onClick={addRule}
            disabled={!draft.col}
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
