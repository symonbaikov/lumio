'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';

type EditingScope = 'name' | 'description' | 'both';

// Minimal interface — the real CustomTable satisfies this structurally
interface TableMetaSource {
  id: string;
  name: string;
  description: string | null;
}

export interface UseTableMetaReturn {
  editingMeta: boolean;
  metaDraft: { name: string; description: string };
  savingMeta: boolean;
  editingScope: EditingScope | null;
  setEditingMeta: (v: boolean) => void;
  setMetaDraft: (v: { name: string; description: string }) => void;
  setEditingScope: (v: EditingScope | null) => void;
  cancelEditMeta: () => void;
  saveMeta: () => Promise<void>;
}

interface UseTableMetaParams {
  tableId: string | null;
  table: TableMetaSource | null;
  loadTable: () => Promise<void>;
  messages: {
    nameRequired: string;
    saved: string;
    saveFailed: string;
  };
}

export function useTableMeta({
  tableId,
  table,
  loadTable,
  messages,
}: UseTableMetaParams): UseTableMetaReturn {
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaDraft, setMetaDraft] = useState<{ name: string; description: string }>({
    name: '',
    description: '',
  });
  const [savingMeta, setSavingMeta] = useState(false);
  const [editingScope, setEditingScope] = useState<EditingScope | null>('both');

  // Keep draft in sync with table data whenever it changes (outside edit mode)
  useEffect(() => {
    if (!table || editingMeta) {
      return;
    }
    setMetaDraft({
      name: table.name || '',
      description: table.description || '',
    });
  }, [table?.id, table?.name, table?.description, editingMeta]);

  const cancelEditMeta = () => {
    setEditingMeta(false);
    setMetaDraft({
      name: table?.name || '',
      description: table?.description || '',
    });
    setEditingScope(null);
  };

  const buildMetaPayload = (scope: EditingScope): Record<string, unknown> | null => {
    const payload: Record<string, unknown> = {};
    if (scope !== 'description') {
      const name = metaDraft.name.trim();
      if (!name) {
        toast.error(messages.nameRequired);
        return null;
      }
      payload.name = name;
    }
    if (scope !== 'name') {
      const description = metaDraft.description.trim();
      payload.description = description || null;
    }
    return Object.keys(payload).length ? payload : {};
  };

  const saveMeta = async () => {
    if (!tableId) {
      return;
    }
    const scope: EditingScope = editingScope ?? 'both';
    const payload = buildMetaPayload(scope);
    if (payload === null) {
      return;
    }
    if (!Object.keys(payload).length) {
      setEditingMeta(false);
      setEditingScope(null);
      return;
    }
    setSavingMeta(true);

    await (async () => {
      await apiClient.patch(`/custom-tables/${tableId}`, payload);
      setEditingMeta(false);
      setEditingScope(null);
      await loadTable();
      toast.success(messages.saved);
    })()
      .catch(async error => {
        console.error('Failed to update table meta:', error);
        toast.error(messages.saveFailed);
      })
      .finally(async () => {
        setSavingMeta(false);
      });
  };

  return {
    editingMeta,
    metaDraft,
    savingMeta,
    editingScope,
    setEditingMeta,
    setMetaDraft,
    setEditingScope,
    cancelEditMeta,
    saveMeta,
  };
}
