'use client';

import { Save } from '@/app/components/icons';
import { ModalShell } from '@/app/components/ui/modal-shell';
import { Box } from '@mui/material';
import { DEFAULT_COLUMN_CURRENCY, type NewColumnDraft } from '../hooks/useColumnManagement';
import type { ColumnType } from '../utils/stylingUtils';
import { tx } from '../utils/tableHelpers';

interface ColumnTypeOption {
  value: ColumnType;
  label: string;
}

interface AddColumnModalProps {
  t: unknown;
  isOpen: boolean;
  onClose: () => void;
  newColumn: NewColumnDraft;
  setNewColumn: React.Dispatch<React.SetStateAction<NewColumnDraft>>;
  createColumn: () => Promise<void>;
  columnTypes: ColumnTypeOption[];
  /** Таблицы того же воркспейса — цели для колонки-связи. */
  relationTargets?: Array<{ id: string; name: string }>;
}

export function AddColumnModal({
  t,
  isOpen,
  onClose,
  newColumn,
  setNewColumn,
  createColumn,
  columnTypes,
  relationTargets,
}: AddColumnModalProps) {
  const handleClose = () => {
    onClose();
    setNewColumn({
      title: '',
      type: 'text',
      currency: DEFAULT_COLUMN_CURRENCY,
      expression: '',
      isRequired: false,
      isUnique: false,
      targetTableId: '',
      prompt: '',
    });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      title={tx(t, ['addColumn', 'modalTitle'], tx(t, ['addColumn', 'titleLabel'], ''))}
      footer={
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={handleClose}
            sx={{
              border: '1px solid var(--border-color)',
              bgcolor: 'background.paper',
              px: 2,
              py: 1,
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {tx(t, ['addColumn', 'cancel'], 'Cancel')}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={createColumn}
            disabled={!newColumn.title.trim()}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'var(--primary-fill)',
              color: '#fff',
              px: 2,
              py: 1,
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'primary.dark' },
              '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
            }}
          >
            <Save className="h-4 w-4" />
            {tx(t, ['addColumn', 'save'], 'Save')}
          </Box>
        </Box>
      }
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '4fr 2fr' },
          gap: 2,
          alignItems: 'flex-end',
        }}
      >
        <Box>
          <label
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--foreground)',
              marginBottom: 8,
            }}
            htmlFor="new-column-title"
          >
            {tx(t, ['addColumn', 'titleLabel'], 'Column title')}
          </label>
          <input
            id="new-column-title"
            value={newColumn.title}
            onChange={e => setNewColumn(prev => ({ ...prev, title: e.target.value }))}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (newColumn.title.trim()) createColumn();
              }
            }}
            placeholder={tx(t, ['addColumn', 'titlePlaceholder'], '')}
            style={{
              width: '100%',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              padding: '12px 16px',
              fontSize: 14,
              color: 'var(--foreground)',
              boxSizing: 'border-box',
            }}
          />
        </Box>
        <Box>
          <label
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--foreground)',
              marginBottom: 8,
            }}
            htmlFor="new-column-type"
          >
            {tx(t, ['addColumn', 'typeLabel'], 'Type')}
          </label>
          <select
            id="new-column-type"
            value={newColumn.type}
            onChange={e =>
              setNewColumn(prev => ({
                ...prev,
                type: e.target.value as ColumnType,
              }))
            }
            style={{
              width: '100%',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              padding: '12px 16px',
              fontSize: 14,
              color: 'var(--foreground)',
            }}
          >
            {columnTypes.map(typeItem => (
              <option key={typeItem.value} value={typeItem.value}>
                {typeItem.label}
              </option>
            ))}
          </select>
        </Box>
        {newColumn.type === 'currency' && (
          <Box>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--foreground)',
                marginBottom: 8,
              }}
              htmlFor="new-column-currency"
            >
              {tx(t, ['addColumn', 'currencyLabel'], 'Currency')}
            </label>
            <input
              id="new-column-currency"
              value={newColumn.currency}
              maxLength={3}
              placeholder={DEFAULT_COLUMN_CURRENCY}
              onChange={e =>
                setNewColumn(prev => ({ ...prev, currency: e.target.value.toUpperCase() }))
              }
              style={{
                width: '100%',
                border: '1px solid var(--border-color)',
                background: 'var(--card-bg)',
                padding: '12px 16px',
                fontSize: 14,
                color: 'var(--foreground)',
              }}
            />
          </Box>
        )}
        {newColumn.type === 'formula' && (
          <Box>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--foreground)',
                marginBottom: 8,
              }}
              htmlFor="new-column-formula"
            >
              {tx(t, ['addColumn', 'formulaLabel'], 'Formula')}
            </label>
            <input
              id="new-column-formula"
              value={newColumn.expression}
              placeholder="[a] * [b] + 10"
              onChange={e => setNewColumn(prev => ({ ...prev, expression: e.target.value }))}
              style={{
                width: '100%',
                border: '1px solid var(--border-color)',
                background: 'var(--card-bg)',
                padding: '12px 16px',
                fontSize: 14,
                color: 'var(--foreground)',
              }}
            />
            <p style={{ marginTop: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
              {tx(
                t,
                ['addColumn', 'formulaHint'],
                'Reference columns as [key]. Supported: + - * / ( )',
              )}
            </p>
          </Box>
        )}
        {newColumn.type === 'relation' && (
          <Box>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--foreground)',
                marginBottom: 8,
              }}
              htmlFor="new-column-target"
            >
              {tx(t, ['addColumn', 'targetTableLabel'], 'Target table')}
            </label>
            <select
              id="new-column-target"
              value={newColumn.targetTableId}
              onChange={e => setNewColumn(prev => ({ ...prev, targetTableId: e.target.value }))}
              style={{
                width: '100%',
                border: '1px solid var(--border-color)',
                background: 'var(--card-bg)',
                padding: '12px 16px',
                fontSize: 14,
                color: 'var(--foreground)',
              }}
            >
              <option value="">—</option>
              {(relationTargets ?? []).map(target => (
                <option key={target.id} value={target.id}>
                  {target.name}
                </option>
              ))}
            </select>
          </Box>
        )}
        {newColumn.type === 'ai' && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--foreground)',
                marginBottom: 8,
              }}
              htmlFor="new-column-prompt"
            >
              {tx(t, ['addColumn', 'promptLabel'], 'Instruction for the model')}
            </label>
            <textarea
              id="new-column-prompt"
              value={newColumn.prompt}
              rows={2}
              placeholder={tx(
                t,
                ['addColumn', 'promptPlaceholder'],
                'For example: determine the expense category',
              )}
              onChange={e => setNewColumn(prev => ({ ...prev, prompt: e.target.value }))}
              style={{
                width: '100%',
                border: '1px solid var(--border-color)',
                background: 'var(--card-bg)',
                padding: '12px 16px',
                fontSize: 14,
                color: 'var(--foreground)',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', gridColumn: '1 / -1' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={newColumn.isRequired}
              onChange={e => setNewColumn(prev => ({ ...prev, isRequired: e.target.checked }))}
            />
            {tx(t, ['addColumn', 'requiredLabel'], 'Required')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={newColumn.isUnique}
              onChange={e => setNewColumn(prev => ({ ...prev, isUnique: e.target.checked }))}
            />
            {tx(t, ['addColumn', 'uniqueLabel'], 'Unique')}
          </label>
        </Box>
      </Box>
    </ModalShell>
  );
}
