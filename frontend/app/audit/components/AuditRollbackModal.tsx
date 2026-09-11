'use client';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ConfirmModal from '@/app/components/ConfirmModal';
import type { RollbackState } from '../hooks/useAuditRollback';

type MsgProps = {
  rollbackTarget: NonNullable<RollbackState['rollbackTarget']>;
  rollbackError: string | null;
};
function RollbackMessage({ rollbackTarget, rollbackError }: MsgProps): React.JSX.Element {
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" style={{ color: 'var(--text-secondary)' }}>
        This will attempt to rollback:{' '}
        {rollbackTarget.description || `${rollbackTarget.entityType} ${rollbackTarget.entityId}`}.
      </Typography>
      {rollbackTarget.diff && (
        <Alert severity="warning" sx={{ fontSize: 12 }}>
          Rollback is based on stored diff data. Review changes before continuing.
        </Alert>
      )}
      {rollbackError && (
        <Typography variant="body2" style={{ color: 'var(--destructive)' }}>
          {rollbackError}
        </Typography>
      )}
    </Stack>
  );
}

export function AuditRollbackModal({ rollback }: { rollback: RollbackState }): React.JSX.Element {
  return (
    <ConfirmModal
      isOpen={Boolean(rollback.rollbackTarget)}
      onClose={rollback.cancelRollback}
      onConfirm={rollback.confirmRollback}
      title="Confirm rollback"
      message={
        rollback.rollbackTarget && (
          <RollbackMessage
            rollbackTarget={rollback.rollbackTarget}
            rollbackError={rollback.rollbackError}
          />
        )
      }
      confirmText={rollback.rollbackLoading ? 'Rolling back...' : 'Rollback'}
      cancelText="Cancel"
      isDestructive
      isLoading={rollback.rollbackLoading}
      manualClose
    />
  );
}
