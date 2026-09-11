'use client';

import { Box, Typography } from '@mui/material';
import React from 'react';
import { getColumnOptions } from '../helpers/rowDrawerHelpers';
import type {
  CustomTableColumn,
  CustomTableGridRow,
  CustomTableRowPatch,
} from '../utils/stylingUtils';
import { RowDrawerActions } from './RowDrawerActions';
import { RowDrawerFieldEditor } from './RowDrawerFieldEditor';
import { RowDrawerMetaBox } from './RowDrawerMetaBox';

type DrawerMode = 'view' | 'edit';
type SaveIntent = 'save' | 'close' | 'next';

interface RowDrawerDetailsProps {
  row: CustomTableGridRow;
  mode: DrawerMode;
  orderedColumns: CustomTableColumn[];
  draft: CustomTableRowPatch;
  saving: boolean;
  isDirty: boolean;
  onModeChange: ((mode: DrawerMode) => void) | undefined;
  onCancelEdit: () => void;
  onDraftChange: (updater: (prev: CustomTableRowPatch) => CustomTableRowPatch) => void;
  onApplySave: (intent: SaveIntent) => void;
}

const TOGGLE_SX = {
  border: '1px solid var(--border-color)',
  bgcolor: 'background.paper',
  px: 1.5,
  py: 0.75,
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--foreground)',
  cursor: 'pointer',
  '&:hover': { bgcolor: 'action.hover' },
};

interface ModeToggleProps {
  mode: DrawerMode;
  onModeChange: ((mode: DrawerMode) => void) | undefined;
  onCancelEdit: () => void;
}

function ModeToggleButton({
  mode,
  onModeChange,
  onCancelEdit,
}: ModeToggleProps): React.JSX.Element {
  if (mode === 'view') {
    return (
      <Box component="button" type="button" onClick={() => onModeChange?.('edit')} sx={TOGGLE_SX}>
        Edit
      </Box>
    );
  }
  return (
    <Box component="button" type="button" onClick={onCancelEdit} sx={TOGGLE_SX}>
      Cancel
    </Box>
  );
}

interface FieldListProps {
  row: CustomTableGridRow;
  mode: DrawerMode;
  orderedColumns: CustomTableColumn[];
  draft: CustomTableRowPatch;
  onDraftChange: (updater: (prev: CustomTableRowPatch) => CustomTableRowPatch) => void;
}

function FieldList({
  row,
  mode,
  orderedColumns,
  draft,
  onDraftChange,
}: FieldListProps): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {orderedColumns.map(col => {
        const value = mode === 'edit' ? draft[col.key] : row.data?.[col.key];
        return (
          <RowDrawerFieldEditor
            key={col.key}
            col={col}
            value={value}
            options={getColumnOptions(col)}
            mode={mode}
            onDraftChange={onDraftChange}
          />
        );
      })}
    </Box>
  );
}

export function RowDrawerDetails({
  row,
  mode,
  orderedColumns,
  draft,
  saving,
  isDirty,
  onModeChange,
  onCancelEdit,
  onDraftChange,
  onApplySave,
}: RowDrawerDetailsProps): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <RowDrawerMetaBox row={row} />
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}
      >
        <Typography style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
          {mode === 'edit' ? 'Edit fields' : 'Fields'}
        </Typography>
        <ModeToggleButton mode={mode} onModeChange={onModeChange} onCancelEdit={onCancelEdit} />
      </Box>
      <FieldList
        row={row}
        mode={mode}
        orderedColumns={orderedColumns}
        draft={draft}
        onDraftChange={onDraftChange}
      />
      {mode === 'edit' && (
        <RowDrawerActions saving={saving} isDirty={isDirty} onApplySave={onApplySave} />
      )}
    </Box>
  );
}
