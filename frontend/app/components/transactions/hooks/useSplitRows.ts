'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SplitPartInput } from './useTransactionSplit';

export const MAX_SPLIT_PARTS = 20;
export const MIN_SPLIT_PARTS = 2;
export const SPLIT_TOLERANCE = 0.01;

export interface SplitPartRow {
  amount: string;
  categoryId: string;
}

export interface UseSplitRowsResult {
  rows: SplitPartRow[];
  remaining: number;
  balanced: boolean;
  canSave: boolean;
  updateRow: (index: number, field: keyof SplitPartRow, value: string) => void;
  addRow: () => void;
  removeRow: (index: number) => void;
  distributeEvenly: () => void;
  buildParts: () => SplitPartInput[];
}

const emptyRow = (): SplitPartRow => ({ amount: '', categoryId: '' });
const emptyRows = (): SplitPartRow[] => [emptyRow(), emptyRow()];
const round2 = (value: number): number => Math.round(value * 100) / 100;
const parseAmount = (value: string): number => Number.parseFloat(value) || 0;

/** Even split with the rounding remainder absorbed by the last row. */
export function distributeEvenAmounts(total: number, count: number): string[] {
  const base = Math.floor((total * 100) / count) / 100;
  const values = Array.from({ length: count }, () => base.toFixed(2));
  values[count - 1] = round2(total - base * (count - 1)).toFixed(2);
  return values;
}

export function useSplitRows(open: boolean, totalAmount: number): UseSplitRowsResult {
  const [rows, setRows] = useState<SplitPartRow[]>(emptyRows);

  useEffect(() => {
    if (open) {
      setRows(emptyRows());
    }
  }, [open]);

  const amounts = useMemo(() => rows.map(row => parseAmount(row.amount)), [rows]);
  const remaining = round2(totalAmount - amounts.reduce((sum, value) => sum + value, 0));
  const balanced = Math.abs(remaining) <= SPLIT_TOLERANCE;

  const updateRow = useCallback((index: number, field: keyof SplitPartRow, value: string) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }, []);

  const addRow = useCallback(() => {
    setRows(prev => (prev.length >= MAX_SPLIT_PARTS ? prev : [...prev, emptyRow()]));
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows(prev => (prev.length <= MIN_SPLIT_PARTS ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const distributeEvenly = useCallback(() => {
    setRows(prev => {
      const values = distributeEvenAmounts(totalAmount, prev.length);
      return prev.map((row, i) => ({ ...row, amount: values[i] ?? '' }));
    });
  }, [totalAmount]);

  const buildParts = useCallback(
    (): SplitPartInput[] =>
      rows.map(row => ({
        amount: parseAmount(row.amount),
        ...(row.categoryId ? { categoryId: row.categoryId } : {}),
      })),
    [rows],
  );

  return {
    rows,
    remaining,
    balanced,
    canSave: balanced && amounts.length >= MIN_SPLIT_PARTS && amounts.every(a => a > 0),
    updateRow,
    addRow,
    removeRow,
    distributeEvenly,
    buildParts,
  };
}
