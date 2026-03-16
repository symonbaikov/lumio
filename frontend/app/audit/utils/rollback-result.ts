import type { RollbackResponse } from '@/lib/api/audit';

export const assertRollbackSucceeded = (result: RollbackResponse) => {
  if (!result.success) {
    throw new Error(result.message || 'Rollback failed');
  }
};
