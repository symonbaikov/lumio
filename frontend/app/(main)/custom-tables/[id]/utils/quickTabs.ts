import type { CustomTableColumn, RowFilter } from './stylingUtils';

export type QuickTab = {
  id: string;
  label: string;
  filter?: RowFilter;
  count?: number;
};

type QuickTabLabels = {
  all: string;
  paid: string;
  unpaid: string;
};

type QuickTabCounts = {
  paid: number | null;
  unpaid: number | null;
};

const PAID_COLUMN_PATTERN = /(paid|unpaid|оплач|оплата|неоплач)/i;

export const findPaidColumnKey = (columns: CustomTableColumn[]): string | null => {
  const paidColumn = columns.find(
    column =>
      column.type === 'boolean' &&
      (PAID_COLUMN_PATTERN.test(column.title) || PAID_COLUMN_PATTERN.test(column.key)),
  );
  return paidColumn?.key ?? null;
};

export const buildQuickTabs = (params: {
  labels: QuickTabLabels;
  paidColKey: string | null;
  tabCounts: QuickTabCounts;
}): QuickTab[] => {
  const { labels, paidColKey, tabCounts } = params;
  const tabs: QuickTab[] = [{ id: 'all', label: labels.all }];
  if (!paidColKey) return tabs;
  if (typeof tabCounts.paid !== 'number' || typeof tabCounts.unpaid !== 'number') return tabs;

  tabs.push(
    {
      id: `${paidColKey}:Yes`,
      label: labels.paid,
      filter: { col: paidColKey, op: 'eq', value: true },
      count: tabCounts.paid,
    },
    {
      id: `${paidColKey}:No`,
      label: labels.unpaid,
      filter: { col: paidColKey, op: 'eq', value: false },
      count: tabCounts.unpaid,
    },
  );

  return tabs;
};

export const normalizeActiveTabId = (
  activeTabId: string,
  quickTabs: QuickTab[],
  columnsTabId: string,
): string => {
  if (activeTabId === columnsTabId) return activeTabId;
  if (activeTabId === 'all') return activeTabId;
  return quickTabs.some(tab => tab.id === activeTabId) ? activeTabId : 'all';
};

export const getActiveTabFilter = (
  activeTabId: string,
  quickTabs: QuickTab[],
  columnsTabId: string,
): RowFilter | null => {
  if (activeTabId === 'all' || activeTabId === columnsTabId) return null;
  return quickTabs.find(tab => tab.id === activeTabId)?.filter ?? null;
};
