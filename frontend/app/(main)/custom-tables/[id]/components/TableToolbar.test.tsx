import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TableToolbar, type TableToolbarProps } from './TableToolbar';

const baseProps: TableToolbarProps = {
  t: {
    actions: {
      columns: { value: 'Columns' },
      convertToStatement: { value: 'Convert to statement' },
      convertingToStatement: { value: 'Converting...' },
      delete: { value: 'Delete' },
      markPaid: { value: 'Mark paid' },
      markUnpaid: { value: 'Mark unpaid' },
      print: { value: 'Print' },
      searchPlaceholder: { value: 'Search' },
    },
    nav: { back: { value: 'Back' } },
  },
  isFullscreen: false,
  isPrintMode: false,
  quickTabs: [{ id: 'all', label: 'All' }],
  normalizedActiveTabId: 'all',
  columnsTabId: '__columns__',
  setActiveTabId: vi.fn(),
  handleBackNavigation: vi.fn(),
  selectedRowIds: [],
  bulkMarking: null,
  markSelectedRowsPaid: vi.fn(),
  convertingToStatement: false,
  onConvertToStatement: vi.fn(),
  handlePrintTable: vi.fn(),
  openBulkDeleteModal: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
  columnOrder: [],
  orderedColumns: [],
  hiddenColumnKeys: [],
  isColumnsDefault: true,
  toggleColumnHidden: vi.fn(),
  resetColumns: vi.fn(),
  newColumnOpen: false,
  setNewColumnOpen: vi.fn(),
  newColumn: { title: '', type: 'text' },
  setNewColumn: vi.fn(),
  createColumn: vi.fn(),
  columnTypes: [],
};

describe('TableToolbar convert action', () => {
  it('renders convert to statement action and calls the handler', () => {
    const onConvertToStatement = vi.fn();

    render(
      <TableToolbar
        {...({
          ...baseProps,
          onConvertToStatement,
          convertingToStatement: false,
        } as TableToolbarProps & {
          onConvertToStatement: () => void;
          convertingToStatement: boolean;
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Convert to statement' }));

    expect(onConvertToStatement).toHaveBeenCalledTimes(1);
  });
});
