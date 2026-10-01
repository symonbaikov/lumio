'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { mapApiRecordToTransaction, type TransactionApiRecord } from '../helpers/transactionMapper';
import type { Transaction } from '../types';

export interface UseTransferLinkResult {
  /** Counterparts the user may link by hand; null until `loadCandidates` ran. */
  candidates: Transaction[] | null;
  loadCandidates: (transactionId: string) => Promise<void>;
  clearCandidates: () => void;
  link: (transactionId: string, otherId: string) => Promise<void>;
  unlink: (transactionId: string) => Promise<void>;
  loading: boolean;
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

export function useTransferLink(onDone: () => void | Promise<void>): UseTransferLinkResult {
  const [candidates, setCandidates] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const t = useIntlayer('transactionsDrawer');
  const linkedText = t.transfer.toasts.linked.value;
  const unlinkedText = t.transfer.toasts.unlinked.value;
  const failedText = t.transfer.toasts.failed.value;

  // Promise chains rather than try/finally: React Compiler skips hooks that
  // contain a `finally` clause.
  const loadCandidates = useCallback(
    async (transactionId: string) => {
      setLoading(true);
      await apiClient
        .get<{ data: TransactionApiRecord[] }>(`/transactions/${transactionId}/transfer-candidates`)
        .then(response => {
          setCandidates((response.data?.data ?? []).map(mapApiRecordToTransaction));
        })
        .catch((error: unknown) => {
          toast.error(errorMessage(error, failedText));
        });
      setLoading(false);
    },
    [failedText],
  );

  const clearCandidates = useCallback(() => setCandidates(null), []);

  const link = useCallback(
    async (transactionId: string, otherId: string) => {
      setSaving(true);
      await apiClient
        .post(`/transactions/${transactionId}/link-transfer`, { otherId })
        .then(async () => {
          toast.success(linkedText);
          setCandidates(null);
          await onDone();
        })
        .catch((error: unknown) => {
          toast.error(errorMessage(error, failedText));
        });
      setSaving(false);
    },
    [onDone, linkedText, failedText],
  );

  const unlink = useCallback(
    async (transactionId: string) => {
      setSaving(true);
      await apiClient
        .post(`/transactions/${transactionId}/unlink-transfer`)
        .then(async () => {
          toast.success(unlinkedText);
          await onDone();
        })
        .catch((error: unknown) => {
          toast.error(errorMessage(error, failedText));
        });
      setSaving(false);
    },
    [onDone, unlinkedText, failedText],
  );

  return { candidates, loadCandidates, clearCandidates, link, unlink, loading, saving };
}
