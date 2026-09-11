'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';

export interface SplitPartInput {
  amount: number;
  categoryId?: string;
  paymentPurpose?: string;
  comments?: string;
}

export interface UseTransactionSplitResult {
  split: (transactionId: string, parts: SplitPartInput[]) => Promise<void>;
  unsplit: (transactionId: string) => Promise<void>;
  saving: boolean;
}

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
    ?.data?.message;
  if (Array.isArray(message)) {
    return message[0] ?? fallback;
  }
  return message ?? fallback;
}

export function useTransactionSplit(onDone: () => void | Promise<void>): UseTransactionSplitResult {
  const [saving, setSaving] = useState(false);

  // Promise chains rather than try/finally: React Compiler skips hooks that
  // contain a `finally` clause.
  const split = useCallback(
    async (transactionId: string, parts: SplitPartInput[]) => {
      setSaving(true);
      await apiClient
        .post(`/transactions/${transactionId}/split`, { parts })
        .then(async () => {
          toast.success('Transaction split');
          await onDone();
        })
        .catch((error: unknown) => {
          toast.error(errorMessage(error, 'Failed to split transaction'));
        });
      setSaving(false);
    },
    [onDone],
  );

  const unsplit = useCallback(
    async (transactionId: string) => {
      setSaving(true);
      await apiClient
        .post(`/transactions/${transactionId}/unsplit`)
        .then(async () => {
          toast.success('Split undone');
          await onDone();
        })
        .catch((error: unknown) => {
          toast.error(errorMessage(error, 'Failed to undo split'));
        });
      setSaving(false);
    },
    [onDone],
  );

  return { split, unsplit, saving };
}
