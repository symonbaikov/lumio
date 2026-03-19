// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FiltersDrawer } from './FiltersDrawer';
import { DEFAULT_STATEMENT_FILTERS } from './statement-filters';

vi.mock('@/app/components/ui/drawer-shell', () => ({
  DrawerShell: ({ isOpen, children, title }: any) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <div>{children}</div>
      </div>
    ) : null,
}));

vi.mock('@/app/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('./FilterSection', () => ({
  FilterSection: ({ title, children }: any) => (
    <section data-testid={`section-${String(title).toLowerCase()}`}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('./FilterRow', () => ({
  FilterRow: ({ label, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
}));

vi.mock('./FilterOptionRow', () => ({
  FilterOptionRow: ({ label, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
}));

vi.mock('./FilterAvatarRow', () => ({
  FilterAvatarRow: ({ label, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
}));

const baseProps = {
  open: true,
  onClose: () => undefined,
  filters: DEFAULT_STATEMENT_FILTERS,
  screen: 'root',
  onBack: () => undefined,
  onSelect: () => undefined,
  onUpdateFilters: () => undefined,
  onResetAll: () => undefined,
  onViewResults: () => undefined,
  typeOptions: [{ value: 'pdf', label: 'PDF' }],
  statusOptions: [{ value: 'processing', label: 'Processing' }],
  datePresets: [{ value: 'thisMonth' as const, label: 'This month' }],
  dateModes: [{ value: 'on' as const, label: 'On' }],
  fromOptions: [{ id: 'user:user-1', label: 'Alex' }],
  toOptions: [{ id: 'bank:kaspi', label: 'Kaspi' }],
  groupByOptions: [{ value: 'amount', label: 'Amount' }],
  hasOptions: [{ value: 'errors', label: 'Errors' }],
  currencyOptions: ['KZT'],
  labels: {
    title: 'Filters',
    viewResults: 'View results',
    saveSearch: 'Save search',
    resetFilters: 'Reset filters',
    general: 'General',
    expenses: 'Expenses',
    reports: 'Reports',
    type: 'Type',
    from: 'From',
    groupBy: 'Group by',
    has: 'Has',
    keywords: 'Keywords',
    limit: 'Limit',
    status: 'Status',
    to: 'To',
    amount: 'Amount',
    approved: 'Approved',
    billable: 'Billable',
    currency: 'Currency',
    date: 'Date',
    exported: 'Exported',
    paid: 'Paid',
    any: 'Any',
    yes: 'Yes',
    no: 'No',
  },
  activeCount: 0,
};

describe('FiltersDrawer', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('shows only filter rows allowed by visible columns on root screen', async () => {
    await act(async () => {
      root.render(
        <FiltersDrawer
          {...baseProps}
          visibleScreens={['type', 'status', 'date', 'amount', 'approved', 'keywords']}
        />,
      );
    });

    expect(container.textContent).toContain('Type');
    expect(container.textContent).toContain('Status');
    expect(container.textContent).toContain('Date');
    expect(container.textContent).toContain('Amount');
    expect(container.textContent).toContain('Approved');
    expect(container.textContent).toContain('Keywords');
    expect(container.textContent).not.toContain('From');
    expect(container.textContent).not.toContain('To');
    expect(container.textContent).not.toContain('Billable');
    expect(container.textContent).not.toContain('Currency');
    expect(container.textContent).not.toContain('Exported');
  });
});
