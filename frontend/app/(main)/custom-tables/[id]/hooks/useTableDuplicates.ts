'use client';

import apiClient from '@/app/lib/api';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

export interface DuplicateGroup {
  key: string;
  count: number;
  rowIds: string[];
  rowNumbers: number[];
}

interface UseTableDuplicatesParams {
  tableId: string | null;
  failedMessage: string;
}

export interface UseTableDuplicatesReturn {
  groups: DuplicateGroup[];
  loading: boolean;
  /** null — поиск ещё не запускали; пустой массив — искали и не нашли. */
  searched: boolean;
  findDuplicates: (keys: string[]) => Promise<void>;
  reset: () => void;
}

export function useTableDuplicates({
  tableId,
  failedMessage,
}: UseTableDuplicatesParams): UseTableDuplicatesReturn {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const findDuplicates = useCallback(
    async (keys: string[]): Promise<void> => {
      if (!(tableId && keys.length)) {
        return;
      }
      setLoading(true);
      try {
        const response = await apiClient.get(`/custom-tables/${tableId}/duplicates`, {
          params: { keys: keys.join(',') },
        });
        const root = (response.data ?? {}) as Record<string, unknown>;
        const nested = (root.data ?? {}) as Record<string, unknown>;
        const items = root.items ?? nested.items ?? [];
        setGroups(Array.isArray(items) ? (items as DuplicateGroup[]) : []);
        setSearched(true);
      } catch (error) {
        console.error('Failed to find duplicates:', error);
        toast.error(failedMessage);
      } finally {
        setLoading(false);
      }
    },
    [tableId, failedMessage],
  );

  const reset = useCallback(() => {
    setGroups([]);
    setSearched(false);
  }, []);

  return { groups, loading, searched, findDuplicates, reset };
}
