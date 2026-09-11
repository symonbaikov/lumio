'use client';

import { Box, Typography } from '@mui/material';
import type React from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { tx } from '../utils/tableHelpers';

interface InsertSuccessToastContentProps {
  visible: boolean;
  createdCount: number;
  tOps: unknown;
  onUndoClick: () => void;
}
function InsertSuccessToastContent({
  visible,
  createdCount,
  tOps,
  onUndoClick,
}: InsertSuccessToastContentProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        border: '1px solid var(--border-color)',
        bgcolor: 'background.paper',
        px: 2,
        py: 1.5,
        boxShadow: 3,
        opacity: visible ? 1 : 0,
      }}
    >
      <Typography style={{ fontSize: 14, color: 'var(--foreground)' }}>
        {tx(tOps, ['paste', 'addedPrefix'], 'Added ')}
        {createdCount}
        {tx(tOps, ['paste', 'addedSuffix'], ' rows')}
      </Typography>
      <Box
        component="button"
        type="button"
        onClick={onUndoClick}
        sx={{
          fontSize: 14,
          fontWeight: 600,
          color: 'primary.main',
          bgcolor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          '&:hover': { color: 'primary.dark' },
        }}
      >
        {tx(tOps, ['paste', 'undo'], 'Undo')}
      </Box>
    </Box>
  );
}

interface UseInsertSuccessToastParams {
  tOps: unknown;
}
export function useInsertSuccessToast({
  tOps,
}: UseInsertSuccessToastParams): (p: { createdCount: number; onUndo: () => void }) => void {
  return useCallback(
    ({ createdCount, onUndo }: { createdCount: number; onUndo: () => void }): void => {
      const undoWindowMs = 8000;
      let undoExpired = false;
      const timeoutId = window.setTimeout((): void => {
        undoExpired = true;
      }, undoWindowMs);
      let toastId = '';
      const onUndoClick = (): void => {
        if (undoExpired) {
          return;
        }
        undoExpired = true;
        window.clearTimeout(timeoutId);
        toast.dismiss(toastId);
        onUndo();
      };
      toastId = toast.custom(
        p => (
          <InsertSuccessToastContent
            visible={p.visible}
            createdCount={createdCount}
            tOps={tOps}
            onUndoClick={onUndoClick}
          />
        ),
        { duration: undoWindowMs },
      );
    },
    [tOps],
  );
}
