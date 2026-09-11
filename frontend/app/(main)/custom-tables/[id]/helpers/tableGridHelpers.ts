'use client';

import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';
import { isAbortError } from '../utils/pasteUtils';
import type { CustomTableGridRow } from '../utils/stylingUtils';

type Obj = Record<string, unknown>;

function getNestedData(d: Obj): Obj {
  const nested = d.data;
  return typeof nested === 'object' && nested !== null ? (nested as Obj) : {};
}

export function parseRowItems(responseData: unknown): CustomTableGridRow[] {
  const d = (responseData || {}) as Obj;
  const nested = getNestedData(d);
  const items = d.items ?? nested.items ?? [];
  return Array.isArray(items) ? (items as CustomTableGridRow[]) : [];
}

export function getRowIdentity(row: unknown): string {
  if (!row || typeof row !== 'object') {
    return '';
  }
  const record = row as Obj;
  if (typeof record.id === 'string') {
    return record.id;
  }
  if (typeof record.rowNumber === 'number') {
    return String(record.rowNumber);
  }
  return '';
}

export function mergeAndDedupeRows(
  prev: CustomTableGridRow[],
  next: CustomTableGridRow[],
  shouldReset: boolean,
): CustomTableGridRow[] {
  const merged = shouldReset ? next : [...prev, ...next];
  const seen = new Set<string>();
  const out: CustomTableGridRow[] = [];
  for (const row of merged) {
    const id = getRowIdentity(row);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(row);
  }
  return out;
}

export function shouldSkipLoad(
  tableId: string | null,
  shouldReset: boolean,
  loadingRef: { current: boolean },
): boolean {
  return !tableId || (!shouldReset && loadingRef.current);
}

interface LoadRowsOpts {
  reset?: boolean;
  filtersParam?: string;
}

function getLoadCursor(
  shouldReset: boolean,
  rowsRef: { current: CustomTableGridRow[] },
): number | undefined {
  if (shouldReset) {
    return undefined;
  }
  return rowsRef.current[rowsRef.current.length - 1]?.rowNumber;
}

function getLoadFilters(
  opts: LoadRowsOpts | undefined,
  filtersRef: { current: string | undefined },
): string | undefined {
  return opts?.filtersParam ?? filtersRef.current;
}

interface FinalizeLoadArgs {
  requestId: number;
  seqRef: { current: number };
  loadingRef: { current: boolean };
  setLoadingRows: (v: boolean) => void;
  abortRef: { current: AbortController | null };
  controller: AbortController;
}
function finalizeLoad({
  requestId,
  seqRef,
  loadingRef,
  setLoadingRows,
  abortRef,
  controller,
}: FinalizeLoadArgs): void {
  if (requestId === seqRef.current) {
    loadingRef.current = false;
    setLoadingRows(false);
  }
  if (abortRef.current === controller) {
    abortRef.current = null;
  }
}

export interface PerformLoadArgs {
  tableId: string;
  shouldReset: boolean;
  opts: LoadRowsOpts | undefined;
  controller: AbortController;
  requestId: number;
  seqRef: { current: number };
  rowsRef: { current: CustomTableGridRow[] };
  filtersRef: { current: string | undefined };
  loadingRef: { current: boolean };
  abortRef: { current: AbortController | null };
  setLoadingRows: (v: boolean) => void;
  setRows: React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
  setHasMore: (v: boolean) => void;
  loadRowsFailedMessage: string;
}

export async function performLoadRows({
  tableId,
  shouldReset,
  opts,
  controller,
  requestId,
  seqRef,
  rowsRef,
  filtersRef,
  loadingRef,
  abortRef,
  setLoadingRows,
  setRows,
  setHasMore,
  loadRowsFailedMessage,
}: PerformLoadArgs): Promise<void> {
  try {
    const cursor = getLoadCursor(shouldReset, rowsRef);
    const filters = getLoadFilters(opts, filtersRef);
    const response = await apiClient.get(`/custom-tables/${tableId}/rows`, {
      signal: controller.signal,
      params: { cursor, limit: 50, filters },
    });
    if (controller.signal.aborted || requestId !== seqRef.current) {
      return;
    }
    const items = parseRowItems(response.data);
    setRows(prev => mergeAndDedupeRows(prev, items, shouldReset));
    setHasMore(items.length >= 50);
  } catch (error) {
    if (!isAbortError(error)) {
      console.error('Failed to load rows:', error);
      toast.error(loadRowsFailedMessage);
    }
  } finally {
    finalizeLoad({ requestId, seqRef, loadingRef, setLoadingRows, abortRef, controller });
  }
}
