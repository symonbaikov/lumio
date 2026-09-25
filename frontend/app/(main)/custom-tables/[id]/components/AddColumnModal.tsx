'use client';

import { Box } from '@mui/material';
import { Save } from '@/app/components/icons';
import { ModalShell } from '@/app/components/ui/modal-shell';
import { emptyColumnDraft, type NewColumnDraft } from '../hooks/useColumnManagement';
import { tx } from '../utils/tableHelpers';
import { ColumnFieldsForm, type ColumnTypeOption } from './ColumnFieldsForm';

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
  defaultCurrency?: string;
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
  defaultCurrency,
}: AddColumnModalProps) {
  const handleClose = () => {
    onClose();
    setNewColumn(emptyColumnDraft(defaultCurrency));
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
      <ColumnFieldsForm
        t={t}
        draft={newColumn}
        setDraft={setNewColumn}
        columnTypes={columnTypes}
        relationTargets={relationTargets}
        onSubmit={() => void createColumn()}
        idPrefix="new-column"
      />
    </ModalShell>
  );
}
