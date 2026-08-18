'use client';

import React from 'react';

import { Box } from '@mui/material';

type SaveIntent = 'save' | 'close' | 'next';

interface RowDrawerActionsProps {
  saving: boolean;
  isDirty: boolean;
  onApplySave: (intent: SaveIntent) => void;
}

const PRIMARY_SX = {
  bgcolor: 'var(--primary-fill)',
  color: '#fff',
  px: 2,
  py: 1,
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  '&:hover': { bgcolor: 'primary.dark' },
  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
};

const SECONDARY_SX = {
  border: '1px solid var(--border-color)',
  bgcolor: 'background.paper',
  color: 'var(--foreground)',
  px: 2,
  py: 1,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  '&:hover': { bgcolor: 'action.hover' },
  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
};

interface ActionButtonProps {
  onClick: () => void;
  disabled: boolean;
  label: string;
  primary?: boolean;
}

function ActionButton({ onClick, disabled, label, primary }: ActionButtonProps): React.JSX.Element {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={primary ? PRIMARY_SX : SECONDARY_SX}
    >
      {label}
    </Box>
  );
}

export function RowDrawerActions({
  saving,
  isDirty,
  onApplySave,
}: RowDrawerActionsProps): React.JSX.Element {
  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        mx: -3,
        mb: -3,
        borderTop: '1px solid var(--border-color)',
        bgcolor: 'background.paper',
        px: 3,
        py: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        <ActionButton
          onClick={() => onApplySave('save')}
          disabled={saving || !isDirty}
          label={saving ? 'Saving…' : 'Save'}
          primary
        />
        <ActionButton onClick={() => onApplySave('close')} disabled={saving} label="Save & close" />
        <ActionButton onClick={() => onApplySave('next')} disabled={saving} label="Apply & next" />
      </Box>
    </Box>
  );
}
