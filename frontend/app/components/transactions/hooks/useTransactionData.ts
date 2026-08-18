'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import api from '@/app/lib/api';

import { type TransactionApiRecord, mapApiRecordToTransaction } from '../helpers/transactionMapper';
import type { Category, Transaction } from '../types';

export interface UseTransactionDataOptions {
  showConverted: boolean;
  workspaceCurrency: string;
  currencyFilter: string | null;
  /** YYYY-MM-DD, inclusive. */
  startDate?: string | null;
  /** YYYY-MM-DD, inclusive. */
  endDate?: string | null;
}

export interface UseTransactionDataResult {
  transactions: Transaction[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTransactionData({
  showConverted,
  workspaceCurrency,
  currencyFilter,
  startDate,
  endDate,
}: UseTransactionDataOptions): UseTransactionDataResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracks whether the current component is still mounted and whether the
  // latest in-flight request still matches the active option set. This guards
  // against a slow earlier response overwriting results from a faster
  // subsequent request.
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number> = { limit: 500 };
      if (showConverted) params.convert_to = workspaceCurrency;
      if (currencyFilter) params.currency = currencyFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [txResponse, catResponse] = await Promise.all([
        api.get('/transactions', { params }),
        api.get('/categories'),
      ]);

      if (!isMountedRef.current || requestId !== requestIdRef.current) return;

      const rawTransactions =
        (txResponse.data.data as TransactionApiRecord[] | undefined) ??
        (txResponse.data.items as TransactionApiRecord[] | undefined) ??
        [];
      setTransactions(rawTransactions.map(mapApiRecordToTransaction));
      setCategories((catResponse.data as Category[] | undefined) || []);
    } catch (err) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
      toast.error('Failed to load transactions');
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [showConverted, workspaceCurrency, currencyFilter, startDate, endDate]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  return { transactions, categories, loading, error, refetch: fetchData };
}
