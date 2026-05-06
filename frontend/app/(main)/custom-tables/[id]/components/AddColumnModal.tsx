'use client';

import { ModalShell } from '@/app/components/ui/modal-shell';
import { Box, Typography } from '@mui/material';
import { Save } from '@/app/components/icons';
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
  newColumn: { title: string; type: ColumnType };
  setNewColumn: React.Dispatch<React.SetStateAction<{ title: string; type: ColumnType }>>;
  createColumn: () => Promise<void>;
  columnTypes: ColumnTypeOption[];
}

export function AddColumnModal({
  t,
  isOpen,
  onClose,
  newColumn,
  setNewColumn,
  createColumn,
  columnTypes,
}: AddColumnModalProps) {
  const handleClose = () => {
    onClose();
    setNewColumn({ title: '', type: 'text' });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      title={tx(t, ['addColumn', 'modalTitle'], tx(t, ['addColumn', 'titleLabel'], ''))}
      footer={
        <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box
            component="button"
            type="button"
            onClick={handleClose}
            sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', px: 2, py: 1, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
          >
            {tx(t, ['addColumn', 'cancel'], 'Cancel')}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={createColumn}
            disabled={!newColumn.title.trim()}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: '#fff', px: 2, py: 1, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', '&:hover': { bgcolor: 'primary.dark' }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } }}
          >
            <Save className="h-4 w-4" />
            {tx(t, ['addColumn', 'save'], 'Save')}
          </Box>
        </Box>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '4fr 2fr' }, gap: 2, alignItems: 'flex-end' }}>
        <Box>
          <label
            style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}
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
            style={{ width: '100%', border: '1px solid var(--border-color)', background: 'var(--card-bg)', padding: '12px 16px', fontSize: 14, color: 'var(--foreground)', boxSizing: 'border-box' }}
          />
        </Box>
        <Box>
          <label
            style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}
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
            style={{ width: '100%', border: '1px solid var(--border-color)', background: 'var(--card-bg)', padding: '12px 16px', fontSize: 14, color: 'var(--foreground)' }}
          >
            {columnTypes.map(typeItem => (
              <option key={typeItem.value} value={typeItem.value}>
                {typeItem.label}
              </option>
            ))}
          </select>
        </Box>
      </Box>
    </ModalShell>
  );
}
