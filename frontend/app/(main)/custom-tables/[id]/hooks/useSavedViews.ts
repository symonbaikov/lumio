'use client';

import apiClient from '@/app/lib/api';
import type { SortingState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { ColumnFilterState } from './useColumnConfig';
import type { AggregateSelection } from './useTableAggregates';

export type ColumnFilterMap = Record<string, ColumnFilterState>;

export interface SavedView {
  id: string;
  name: string;
  /** Приходит из jsonb, поэтому здесь тип широкий; сужается при применении. */
  columnFilters?: Record<string, unknown>;
  sort?: { col: string; dir: 'asc' | 'desc' } | null;
  columnOrder?: string[];
  hiddenColumnKeys?: string[];
  aggregates?: AggregateSelection;
}

interface UseSavedViewsParams {
  tableId: string | null;
  /** Виды приходят вместе с таблицей, отдельного запроса не нужно. */
  storedViews: SavedView[] | undefined;
  storedActiveViewId: string | null | undefined;
  current: {
    columnFilters: ColumnFilterMap;
    sorting: SortingState;
    columnOrder: string[];
    hiddenColumnKeys: string[];
    aggregates: AggregateSelection;
  };
  apply: {
    setColumnFilters: (filters: ColumnFilterMap) => void;
    setSorting: (sorting: SortingState) => void;
    setColumnOrder: (order: string[]) => void;
    setHiddenColumnKeys: (keys: string[]) => void;
    setAggregateSelection: (selection: AggregateSelection) => void;
  };
  messages: { saveFailed: string; saved: string; deleted: string };
}

export interface UseSavedViewsReturn {
  views: SavedView[];
  activeViewId: string | null;
  applyView: (viewId: string) => void;
  saveCurrentAsView: (name: string) => Promise<void>;
  deleteView: (viewId: string) => Promise<void>;
  saving: boolean;
}

function buildViewId(name: string, existing: SavedView[]): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9а-я]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'view';
  if (!existing.some(v => v.id === base)) {
    return base;
  }
  // Имена могут повторяться, идентификаторы — нет.
  let suffix = 2;
  while (existing.some(v => v.id === `${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

export function useSavedViews({
  tableId,
  storedViews,
  storedActiveViewId,
  current,
  apply,
  messages,
}: UseSavedViewsParams): UseSavedViewsReturn {
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setViews(Array.isArray(storedViews) ? storedViews : []);
    setActiveViewId(storedActiveViewId ?? null);
  }, [storedViews, storedActiveViewId]);

  const persist = useCallback(
    async (nextViews: SavedView[], nextActiveId: string | null): Promise<void> => {
      if (!tableId) {
        return;
      }
      await apiClient.patch(`/custom-tables/${tableId}/view-settings/views`, {
        views: nextViews,
        activeViewId: nextActiveId,
      });
    },
    [tableId],
  );

  const applyView = useCallback(
    (viewId: string) => {
      const view = views.find(v => v.id === viewId);
      if (!view) {
        return;
      }
      setActiveViewId(viewId);
      apply.setColumnFilters((view.columnFilters ?? {}) as ColumnFilterMap);
      apply.setSorting(view.sort ? [{ id: view.sort.col, desc: view.sort.dir === 'desc' }] : []);
      apply.setColumnOrder(view.columnOrder ?? []);
      apply.setHiddenColumnKeys(view.hiddenColumnKeys ?? []);
      apply.setAggregateSelection(view.aggregates ?? {});
      // Активный вид запоминаем молча: пользователь просто переключил пресет.
      void persist(views, viewId).catch(error => {
        console.error('Failed to persist active view:', error);
      });
    },
    [views, apply, persist],
  );

  const saveCurrentAsView = useCallback(
    async (name: string): Promise<void> => {
      const trimmed = name.trim();
      if (!(tableId && trimmed)) {
        return;
      }
      setSaving(true);
      const first = current.sorting[0];
      const view: SavedView = {
        id: buildViewId(trimmed, views),
        name: trimmed,
        columnFilters: current.columnFilters,
        sort: first ? { col: first.id, dir: first.desc ? 'desc' : 'asc' } : null,
        columnOrder: current.columnOrder,
        hiddenColumnKeys: current.hiddenColumnKeys,
        aggregates: current.aggregates,
      };
      const nextViews = [...views, view];
      try {
        await persist(nextViews, view.id);
        setViews(nextViews);
        setActiveViewId(view.id);
        toast.success(messages.saved);
      } catch (error) {
        console.error('Failed to save view:', error);
        toast.error(messages.saveFailed);
      } finally {
        setSaving(false);
      }
    },
    [tableId, views, current, persist, messages],
  );

  const deleteView = useCallback(
    async (viewId: string): Promise<void> => {
      const nextViews = views.filter(v => v.id !== viewId);
      const nextActive = activeViewId === viewId ? null : activeViewId;
      try {
        await persist(nextViews, nextActive);
        setViews(nextViews);
        setActiveViewId(nextActive);
        toast.success(messages.deleted);
      } catch (error) {
        console.error('Failed to delete view:', error);
        toast.error(messages.saveFailed);
      }
    },
    [views, activeViewId, persist, messages],
  );

  return { views, activeViewId, applyView, saveCurrentAsView, deleteView, saving };
}
