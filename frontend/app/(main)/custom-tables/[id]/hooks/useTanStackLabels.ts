import { useMemo } from 'react';
import type { ColumnMenuLabels } from '../components/headers/ColumnHeaderMenu';
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
  draftRowHint: string;
  columnMenuLabels: ColumnMenuLabels;
}

export interface CommonLabels {
  addRowLabel: string;
  draftRowHint: string;
  emptyTitle: string;
  emptySubtitle: string;
  loadingMore: string;
  aggregateNone: string;
  aggregateLabels: Record<'sum' | 'avg' | 'min' | 'max' | 'count', string>;
}

export interface TanStackLabels {
  columnLabels: ColumnLabels;
  commonLabels: CommonLabels;
}

const COLUMN_MENU_FALLBACKS: Record<keyof ColumnMenuLabels, [string[], string]> = {
  menu: [['columnMenu', 'menu'], 'Column menu'],
  rename: [['columnMenu', 'rename'], 'Rename'],
  edit: [['columnMenu', 'edit'], 'Edit column…'],
  headerColor: [['columnMenu', 'headerColor'], 'Header colour'],
  columnColor: [['columnMenu', 'columnColor'], 'Column colour'],
  custom: [['columnMenu', 'custom'], 'Custom…'],
  clear: [['columnMenu', 'clear'], 'Clear'],
  pin: [['columnMenu', 'pin'], 'Pin'],
  unpin: [['columnMenu', 'unpin'], 'Unpin'],
  hide: [['columnMenu', 'hide'], 'Hide'],
  sortAsc: [['grid', 'sortAsc'], 'Sort ascending'],
  sortDesc: [['grid', 'sortDesc'], 'Sort descending'],
  sortClear: [['grid', 'sortClear'], 'Clear sorting'],
  delete: [['columnMenu', 'delete'], 'Delete column'],
};

function buildColumnMenuLabels(t: TanStackT): ColumnMenuLabels {
  const result = {} as ColumnMenuLabels;
  for (const key of Object.keys(COLUMN_MENU_FALLBACKS) as Array<keyof ColumnMenuLabels>) {
    const [path, fallback] = COLUMN_MENU_FALLBACKS[key];
    result[key] = getTranslationValue({ root: t, path, fallback });
  }
  return result;
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
      draftRowHint: getTranslationValue({
        root: t,
        path: ['grid', 'draftRowHint'],
        fallback: 'Draft: the row is saved once the required fields are filled in',
      }),
      columnMenuLabels: buildColumnMenuLabels(t),
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
      draftRowHint: getTranslationValue({
        root: t,
        path: ['grid', 'draftRowHint'],
        fallback: 'Draft: the row is saved once the required fields are filled in',
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
        count: getTranslationValue({
          root: t,
          path: ['grid', 'aggregateCount'],
          fallback: 'Count',
        }),
      },
    }),
    [t],
  );

  return { columnLabels, commonLabels };
}
