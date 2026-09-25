'use client';

import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { Save } from '@/app/components/icons';
import { ModalShell } from '@/app/components/ui/modal-shell';
import {
  draftFromColumn,
  EMPTY_COLUMN_DRAFT,
  type NewColumnDraft,
} from '../hooks/useColumnManagement';
import { tx } from '../utils/tableHelpers';
import type { CustomTablePageColumn } from '../utils/tableTypes';
import { ColumnFieldsForm, type ColumnTypeOption } from './ColumnFieldsForm';

interface EditColumnModalProps {
  t: unknown;
  /** Колонка на редактировании; null — окно закрыто. */
  column: CustomTablePageColumn | null;
  onClose: () => void;
  columnTypes: ColumnTypeOption[];
  relationTargets?: Array<{ id: string; name: string }>;
  onSave: (opts: { columnId: string; draft: NewColumnDraft }) => Promise<void>;
}

export function EditColumnModal({
  t,
  column,
  onClose,
  columnTypes,
  relationTargets,
  onSave,
}: EditColumnModalProps): React.JSX.Element {
  const [draft, setDraft] = useState<NewColumnDraft>(EMPTY_COLUMN_DRAFT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (column) {
      setDraft(draftFromColumn(column));
    }
  }, [column]);

  const handleSave = async (): Promise<void> => {
    if (!(column && draft.title.trim()) || saving) {
      return;
    }
    setSaving(true);
    await onSave({ columnId: column.id, draft })
      .then(() => onClose())
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  return (
    <ModalShell
      isOpen={column !== null}
      onClose={onClose}
      size="xl"
      title={tx(t, ['editColumn', 'title'], 'Edit column')}
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
            onClick={onClose}
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
            {tx(t, ['editColumn', 'cancel'], 'Cancel')}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => void handleSave()}
            disabled={!draft.title.trim() || saving}
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
            {tx(t, ['editColumn', 'save'], 'Save')}
          </Box>
        </Box>
      }
    >
      <ColumnFieldsForm
        t={t}
        draft={draft}
        setDraft={setDraft}
        columnTypes={columnTypes}
        relationTargets={relationTargets}
        onSubmit={() => void handleSave()}
        idPrefix="edit-column"
      />
      {column && draft.type !== column.type && (
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--warning, #b45309)' }}>
          {tx(
            t,
            ['editColumn', 'typeChangeHint'],
            'Changing the type does not convert existing values.',
          )}
        </p>
      )}
    </ModalShell>
  );
}
