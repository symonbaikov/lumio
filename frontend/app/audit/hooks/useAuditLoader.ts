import type { AuditEvent, AuditEventFilter } from '@/lib/api/audit';
import { fetchAuditEvents } from '@/lib/api/audit';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getErrorMessage } from '../helpers/audit-helpers';

export type AuditLoaderResult = {
  events: AuditEvent[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
  filters: AuditEventFilter;
  setPage: (p: number) => void;
  setLimit: (l: number) => void;
  setFilters: Dispatch<SetStateAction<AuditEventFilter>>;
  reload: () => Promise<void>;
};

export function useAuditLoader(): AuditLoaderResult {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditEventFilter>({});
  const params = useMemo(() => ({ ...filters, page, limit }), [filters, page, limit]);

  const loadEvents = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    await (async () => {
      const response = await fetchAuditEvents(params);
      setEvents(response.data || []);
      setTotal(response.total || 0);
    })()
      .catch(async (err: unknown) => {
        setError(getErrorMessage({ error: err, fallback: 'Failed to load audit events' }));
      })
      .finally(async () => {
        setLoading(false);
      });
  }, [params]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  return {
    events,
    total,
    page,
    limit,
    loading,
    error,
    filters,
    setPage,
    setLimit,
    setFilters,
    reload: loadEvents,
  };
}
