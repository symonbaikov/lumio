import { useMemo } from 'react';
import { getTranslationValue } from '../utils/translationUtils';

interface TanStackT {
  fill?: { colorTooltip?: { value?: string } };
  grid?: { loadingMore?: { value?: string } };
}

export interface ColumnLabels {
  actionsHeaderLabel: string;
  colorTooltipLabel: string;
  deleteLabel: string;
  addRowLabel: string;
}

export interface CommonLabels {
  addRowLabel: string;
  emptyTitle: string;
  emptySubtitle: string;
  loadingMore: string;
  sortAscLabel: string;
  sortDescLabel: string;
  sortClearLabel: string;
  aggregateNone: string;
  aggregateLabels: Record<'sum' | 'avg' | 'min' | 'max' | 'count', string>;
}

export interface TanStackLabels {
  columnLabels: ColumnLabels;
  commonLabels: CommonLabels;
}

export function useTanStackLabels(t: TanStackT): TanStackLabels {
  const columnLabels = useMemo(
    (): ColumnLabels => ({
      actionsHeaderLabel: getTranslationValue({
        root: t,
        path: ['actions', 'actionsHeader'],
        fallback: 'Actions',
      }),
      colorTooltipLabel: String(t.fill?.colorTooltip?.value ?? ''),
      deleteLabel: getTranslationValue({
        root: t,
        path: ['actions', 'delete'],
        fallback: 'Delete',
      }),
      addRowLabel: getTranslationValue({
        root: t,
        path: ['grid', 'addRowLabel'],
        fallback: 'Add row',
      }),
    }),
    [t],
  );

  const commonLabels = useMemo(
    (): CommonLabels => ({
      addRowLabel: getTranslationValue({
        root: t,
        path: ['grid', 'addRowLabel'],
        fallback: 'Add row',
      }),
      emptyTitle: getTranslationValue({
        root: t,
        path: ['grid', 'emptyTitle'],
        fallback: 'No rows yet',
      }),
      emptySubtitle: getTranslationValue({
        root: t,
        path: ['grid', 'emptySubtitle'],
        fallback: '',
      }),
      loadingMore: String(t.grid?.loadingMore?.value ?? 'Loading...'),
      sortAscLabel: getTranslationValue({
        root: t,
        path: ['grid', 'sortAsc'],
        fallback: 'Sort ascending',
      }),
      sortDescLabel: getTranslationValue({
        root: t,
        path: ['grid', 'sortDesc'],
        fallback: 'Sort descending',
      }),
      sortClearLabel: getTranslationValue({
        root: t,
        path: ['grid', 'sortClear'],
        fallback: 'Clear sorting',
      }),
      aggregateNone: getTranslationValue({
        root: t,
        path: ['grid', 'aggregateNone'],
        fallback: 'No total',
      }),
      aggregateLabels: {
        sum: getTranslationValue({ root: t, path: ['grid', 'aggregateSum'], fallback: 'Sum' }),
        avg: getTranslationValue({ root: t, path: ['grid', 'aggregateAvg'], fallback: 'Average' }),
        min: getTranslationValue({ root: t, path: ['grid', 'aggregateMin'], fallback: 'Min' }),
        max: getTranslationValue({ root: t, path: ['grid', 'aggregateMax'], fallback: 'Max' }),
        count: getTranslationValue({ root: t, path: ['grid', 'aggregateCount'], fallback: 'Count' }),
      },
    }),
    [t],
  );

  return { columnLabels, commonLabels };
}
