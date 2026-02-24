import { describe, expect, it } from 'vitest';
import {
  buildQuickTabs,
  findPaidColumnKey,
  getActiveTabFilter,
  normalizeActiveTabId,
} from './quickTabs';
import type { CustomTableColumn } from './stylingUtils';

const column = (overrides: Partial<CustomTableColumn>): CustomTableColumn => ({
  id: 'col-1',
  key: 'status',
  title: 'Status',
  type: 'text',
  position: 0,
  config: null,
  ...overrides,
});

describe('quickTabs helpers', () => {
  it('finds paid column by boolean type and title', () => {
    const result = findPaidColumnKey([
      column({ key: 'title', title: 'Title', type: 'text' }),
      column({ key: 'isPaid', title: 'Paid', type: 'boolean' }),
    ]);

    expect(result).toBe('isPaid');
  });

  it('ignores paid-like names for non-boolean columns', () => {
    const result = findPaidColumnKey([
      column({ key: 'paid_status', title: 'Paid status', type: 'text' }),
    ]);

    expect(result).toBeNull();
  });

  it('returns only all tab when paid counters are unavailable', () => {
    const tabs = buildQuickTabs({
      labels: { all: 'All', paid: 'Paid', unpaid: 'Unpaid' },
      paidColKey: 'isPaid',
      tabCounts: { paid: null, unpaid: null },
    });

    expect(tabs).toEqual([{ id: 'all', label: 'All' }]);
  });

  it('returns all, paid, unpaid tabs with counts when available', () => {
    const tabs = buildQuickTabs({
      labels: { all: 'All', paid: 'Paid', unpaid: 'Unpaid' },
      paidColKey: 'isPaid',
      tabCounts: { paid: 3, unpaid: 7 },
    });

    expect(tabs).toEqual([
      { id: 'all', label: 'All' },
      {
        id: 'isPaid:Yes',
        label: 'Paid',
        filter: { col: 'isPaid', op: 'eq', value: true },
        count: 3,
      },
      {
        id: 'isPaid:No',
        label: 'Unpaid',
        filter: { col: 'isPaid', op: 'eq', value: false },
        count: 7,
      },
    ]);
  });

  it('falls back to all when active tab is missing', () => {
    const quickTabs = buildQuickTabs({
      labels: { all: 'All', paid: 'Paid', unpaid: 'Unpaid' },
      paidColKey: 'isPaid',
      tabCounts: { paid: 3, unpaid: 7 },
    });

    expect(normalizeActiveTabId('missing-tab', quickTabs, '__columns__')).toBe('all');
  });

  it('keeps columns tab id untouched', () => {
    const quickTabs = buildQuickTabs({
      labels: { all: 'All', paid: 'Paid', unpaid: 'Unpaid' },
      paidColKey: 'isPaid',
      tabCounts: { paid: 3, unpaid: 7 },
    });

    expect(normalizeActiveTabId('__columns__', quickTabs, '__columns__')).toBe('__columns__');
  });

  it('returns expected filter for active paid tab', () => {
    const quickTabs = buildQuickTabs({
      labels: { all: 'All', paid: 'Paid', unpaid: 'Unpaid' },
      paidColKey: 'isPaid',
      tabCounts: { paid: 3, unpaid: 7 },
    });

    expect(getActiveTabFilter('isPaid:Yes', quickTabs, '__columns__')).toEqual({
      col: 'isPaid',
      op: 'eq',
      value: true,
    });
    expect(getActiveTabFilter('all', quickTabs, '__columns__')).toBeNull();
    expect(getActiveTabFilter('__columns__', quickTabs, '__columns__')).toBeNull();
  });
});
