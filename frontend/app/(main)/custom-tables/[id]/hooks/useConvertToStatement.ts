'use client';

import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { tx } from '../utils/tableHelpers';

type RouterLike = { push: (href: string) => void };

type ConvertResponse = {
  statementId?: string;
  importedRows?: number;
  skippedRows?: number;
};

export function useConvertToStatement({
  tableId,
  router,
  t,
}: {
  tableId: string | null;
  router: RouterLike;
  t: unknown;
}): {
  convertingToStatement: boolean;
  convertToStatement: () => Promise<void>;
} {
  const [convertingToStatement, setConvertingToStatement] = useState(false);

  const convertToStatement = useCallback(async (): Promise<void> => {
    if (!tableId || convertingToStatement) {
      return;
    }
    setConvertingToStatement(true);
    const toastId = toast.loading(
      tx(t, ['toasts', 'convertingToStatement'], 'Converting table to statement...'),
    );

    try {
      const response = await apiClient.post(`/custom-tables/${tableId}/convert-to-statement`);
      const payload: ConvertResponse = response.data?.data || response.data || {};
      const importedRows = Number(payload.importedRows || 0);
      const skippedRows = Number(payload.skippedRows || 0);
      const statementId = typeof payload.statementId === 'string' ? payload.statementId : '';
      const successMessage =
        skippedRows > 0
          ? `Imported ${importedRows} row(s), skipped ${skippedRows}`
          : `Imported ${importedRows} row(s)`;

      toast.success(successMessage, { id: toastId });
      router.push(statementId ? `/statements?statementId=${statementId}` : '/statements');
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          tx(t, ['toasts', 'convertToStatementFailed'], 'Failed to convert table'),
        ),
        { id: toastId },
      );
    } finally {
      setConvertingToStatement(false);
    }
  }, [convertingToStatement, router, t, tableId]);

  return { convertingToStatement, convertToStatement };
}
