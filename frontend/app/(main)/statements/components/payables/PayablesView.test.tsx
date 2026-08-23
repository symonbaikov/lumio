import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigationState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
}));

const authState = vi.hoisted(() => ({
  user: { id: 'user-1' },
  loading: false,
}));

const workspaceState = vi.hoisted(() => ({
  currentWorkspace: { id: 'workspace-1', currency: 'KZT' },
  loading: false,
}));

const apiMocks = vi.hoisted(() => ({
  list: vi.fn(),
  getOne: vi.fn(),
  getSummary: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  markAsPaid: vi.fn(),
  archive: vi.fn(),
  delete: vi.fn(),
  exportList: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/app/contexts/WorkspaceContext', () => ({
  useWorkspace: () => workspaceState,
}));

vi.mock('@/app/i18n', () => ({
  useLocale: () => ({ locale: 'en' }),
  useIntlayer: () => ({
    payables: {
      title: { value: 'Payables' },
      subtitle: { value: 'Track upcoming payments.' },
      add: { value: 'Add payable' },
      exportCsv: { value: 'Export CSV' },
      exportXlsx: { value: 'Export XLSX' },
      refresh: { value: 'Refresh' },
      searchPlaceholder: { value: 'Search vendor or comment' },
      summary: {
        toPay: { value: 'To Pay' },
        overdue: { value: 'Overdue' },
        dueThisWeek: { value: 'Due This Week' },
        paidThisMonth: { value: 'Paid' },
        itemsSuffix: { value: 'items' },
      },
      filters: {
        status: { value: 'Status' },
        source: { value: 'Source' },
        dueFrom: { value: 'Due from' },
        dueTo: { value: 'Due to' },
        sort: { value: 'Sort' },
        reset: { value: 'Reset' },
        allStatuses: { value: 'All statuses' },
        allSources: { value: 'All sources' },
      },
      status: {
        toPay: { value: 'To pay' },
        scheduled: { value: 'Scheduled' },
        paid: { value: 'Paid' },
        overdue: { value: 'Overdue' },
        archived: { value: 'Archived' },
      },
      sources: {
        manual: { value: 'Manual' },
        invoice: { value: 'Invoice' },
        statement: { value: 'Statement' },
      },
      sort: {
        dueDateAsc: { value: 'Due date (earliest)' },
        dueDateDesc: { value: 'Due date (latest)' },
        amountDesc: { value: 'Amount (highest)' },
        vendorAsc: { value: 'Vendor (A-Z)' },
      },
      list: {
        vendor: { value: 'Vendor' },
        dueDate: { value: 'Due date' },
        amount: { value: 'Amount' },
        source: { value: 'Source' },
        status: { value: 'Status' },
        actions: { value: 'Actions' },
      },
      drawer: {
        createTitle: { value: 'Create payable' },
        editTitle: { value: 'Edit payable' },
        vendor: { value: 'Vendor' },
        amount: { value: 'Amount' },
        currency: { value: 'Currency' },
        dueDate: { value: 'Due date' },
        source: { value: 'Source' },
        status: { value: 'Status' },
        comment: { value: 'Comment' },
        save: { value: 'Save' },
        saving: { value: 'Saving...' },
        cancel: { value: 'Cancel' },
      },
      actions: {
        markPaid: { value: 'Mark paid' },
        edit: { value: 'Edit' },
        archive: { value: 'Archive' },
        delete: { value: 'Delete' },
      },
      empty: {
        title: { value: 'No payables found' },
        description: { value: 'Try changing filters.' },
      },
      toasts: {
        loadFailed: { value: 'Failed to load payables' },
        createSuccess: { value: 'Payable created' },
        createFailed: { value: 'Failed to create payable' },
        updateSuccess: { value: 'Payable updated' },
        updateFailed: { value: 'Failed to update payable' },
        markPaidSuccess: { value: 'Marked as paid' },
        markPaidFailed: { value: 'Failed to mark payable as paid' },
        archiveSuccess: { value: 'Payable archived' },
        archiveFailed: { value: 'Failed to archive payable' },
        deleteSuccess: { value: 'Payable deleted' },
        deleteFailed: { value: 'Failed to delete payable' },
        deleteConfirm: { value: 'Delete {vendor}?' },
        exportSuccess: { value: 'Export started' },
        exportFailed: { value: 'Failed to export payables' },
      },
    },
    pagination: {
      shown: { value: 'Showing {from}–{to} of {count}' },
      previous: { value: 'Previous' },
      next: { value: 'Next' },
      pageOf: { value: 'Page {page} of {count}' },
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => navigationState.searchParams,
}));

vi.mock('@mui/x-date-pickers/DatePicker', async () => {
  const ReactModule = await import('react');
  return {
    DatePicker: ({ label }: { label: string }) =>
      ReactModule.createElement('input', { 'aria-label': label, readOnly: true }),
  };
});

vi.mock('@/app/lib/payables-api', () => ({
  __esModule: true,
  default: apiMocks,
  payablesApi: apiMocks,
}));

vi.mock('react-hot-toast', () => ({
  default: toastMock,
}));

vi.mock('@/app/components/ui/dropdown-menu', () => {
  const ReactModule = React;
  const DropdownContext = ReactModule.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
  } | null>(null);

  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => {
      const [open, setOpen] = ReactModule.useState(false);
      return (
        <DropdownContext.Provider value={{ open, setOpen }}>{children}</DropdownContext.Provider>
      );
    },
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => {
      const context = ReactModule.useContext(DropdownContext);
      if (!ReactModule.isValidElement(children)) {
        return <>{children}</>;
      }

      const child = children as React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>;

      return ReactModule.cloneElement(child, {
        onClick: (event: React.MouseEvent) => {
          child.props.onClick?.(event);
          context?.setOpen(!context.open);
        },
      });
    },
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => {
      const context = ReactModule.useContext(DropdownContext);
      if (!context?.open) {
        return null;
      }
      return <div>{children}</div>;
    },
    DropdownMenuItem: ({
      children,
      onClick,
    }: { children: React.ReactNode; onClick?: () => void }) => {
      const context = ReactModule.useContext(DropdownContext);
      return (
        <button
          type="button"
          onClick={() => {
            onClick?.();
            context?.setOpen(false);
          }}
        >
          {children}
        </button>
      );
    },
  };
});

describe('PayablesView', () => {
  beforeEach(() => {
    navigationState.searchParams = new URLSearchParams();
    Object.values(apiMocks).forEach(mockFn => mockFn.mockReset());
    toastMock.success.mockReset();
    toastMock.error.mockReset();

    apiMocks.getSummary.mockResolvedValue({
      toPay: 1200,
      overdue: 300,
      dueThisWeek: 450,
      paidThisMonth: 800,
      paidTotal: 1800,
      toPayCount: 2,
      overdueCount: 1,
      paidTotalCount: 2,
    });
    apiMocks.list.mockResolvedValue({
      data: [
        {
          id: 'payable-1',
          vendor: 'ACME LLC',
          amount: 1200,
          currency: 'KZT',
          dueDate: '2026-03-28',
          status: 'to_pay',
          linkedTransactionId: null,
          source: 'manual',
          isRecurring: false,
          comment: 'Office supplies',
          statementId: null,
          paidAt: null,
          dueSoonNotifiedAt: null,
          createdAt: '2026-03-20T00:00:00.000Z',
          updatedAt: '2026-03-20T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    apiMocks.markAsPaid.mockResolvedValue({});
    apiMocks.exportList.mockResolvedValue({
      blob: new Blob(['csv'], { type: 'text/csv' }),
      fileName: 'payables.csv',
      contentType: 'text/csv',
    });
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('loads summary and list data', async () => {
    const createObjectUrl = vi.fn(() => 'blob:payables');
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: createObjectUrl,
      writable: true,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: revokeObjectUrl,
      writable: true,
    });

    const { PayablesView } = await import('./PayablesView');
    render(<PayablesView />);

    expect(await screen.findByText('Payables')).toBeInTheDocument();
    expect(await screen.findByText('ACME LLC')).toBeInTheDocument();
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0);
    expect(screen.getByText('KZT 1,800.00')).toBeInTheDocument();
    expect(screen.queryByText('Sort')).not.toBeInTheDocument();
    expect(apiMocks.getSummary).toHaveBeenCalledTimes(1);
    expect(apiMocks.list).toHaveBeenCalledTimes(1);
  });

  it('marks a payable as paid from the list action', async () => {
    const { PayablesView } = await import('./PayablesView');
    render(<PayablesView />);

    const button = await screen.findByRole('button', { name: 'Mark paid' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiMocks.markAsPaid).toHaveBeenCalledWith('payable-1');
    });
    expect(toastMock.success).toHaveBeenCalledWith('Marked as paid');
  });

  it('opens currency drawer from the payable form currency field', async () => {
    const { PayablesView } = await import('./PayablesView');
    render(<PayablesView />);

    await screen.findByText('ACME LLC');
    fireEvent.click(screen.getByRole('button', { name: 'Add payable' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Currency' }));

    expect(await screen.findByText('Select a currency')).toBeInTheDocument();
    const usdOption = screen.getAllByText(/^USD -/)[0].closest('button');
    expect(usdOption).not.toBeNull();
    fireEvent.click(usdOption as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Currency' })).toHaveTextContent('USD');
    });
  });

  it('exports all filtered rows without page params and keeps the default sort', async () => {
    const createObjectUrl = vi.fn(() => 'blob:payables');
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: createObjectUrl,
      writable: true,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: revokeObjectUrl,
      writable: true,
    });

    const { PayablesView } = await import('./PayablesView');
    render(<PayablesView />);

    await screen.findByText('ACME LLC');
    const selects = screen.getAllByRole('combobox');

    await act(async () => {
      fireEvent.change(selects[0] as HTMLSelectElement, { target: { value: 'paid' } });
    });

    await waitFor(() => {
      expect(apiMocks.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'paid', sort: 'dueDateAsc' }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => {
      expect(apiMocks.exportList).toHaveBeenCalledWith({
        direction: 'payable',
        search: undefined,
        status: 'paid',
        source: undefined,
        dueDateFrom: undefined,
        dueDateTo: undefined,
        sort: 'dueDateAsc',
        format: 'csv',
      });
    });
  });

  it('does not offer mark paid for archived rows', async () => {
    apiMocks.list.mockResolvedValueOnce({
      data: [
        {
          id: 'payable-archived',
          vendor: 'Archived Vendor',
          amount: 100,
          currency: 'KZT',
          dueDate: '2026-03-28',
          status: 'archived',
          linkedTransactionId: null,
          source: 'manual',
          isRecurring: false,
          comment: null,
          statementId: null,
          paidAt: null,
          dueSoonNotifiedAt: null,
          createdAt: '2026-03-20T00:00:00.000Z',
          updatedAt: '2026-03-20T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const { PayablesView } = await import('./PayablesView');
    render(<PayablesView />);

    expect(await screen.findByText('Archived Vendor')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark paid' })).not.toBeInTheDocument();
  });

  it('asks for confirmation before deleting', async () => {
    (window.confirm as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { PayablesView } = await import('./PayablesView');
    render(<PayablesView />);

    await screen.findByText('ACME LLC');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    });

    fireEvent.click(await screen.findByText('Delete'));

    expect(window.confirm).toHaveBeenCalledWith('Delete ACME LLC?');
    expect(apiMocks.delete).not.toHaveBeenCalled();
  });

  it('corrects to the last available page after filtered results shrink', async () => {
    apiMocks.list
      .mockResolvedValueOnce({
        data: [
          {
            id: 'payable-41',
            vendor: 'Page Two Vendor',
            amount: 10,
            currency: 'KZT',
            dueDate: '2026-03-28',
            status: 'to_pay',
            linkedTransactionId: null,
            source: 'manual',
            isRecurring: false,
            comment: null,
            statementId: null,
            paidAt: null,
            dueSoonNotifiedAt: null,
            createdAt: '2026-03-20T00:00:00.000Z',
            updatedAt: '2026-03-20T00:00:00.000Z',
          },
        ],
        total: 21,
        page: 2,
        limit: 20,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        data: [],
        total: 20,
        page: 2,
        limit: 20,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'payable-1',
            vendor: 'Page One Vendor',
            amount: 10,
            currency: 'KZT',
            dueDate: '2026-03-28',
            status: 'to_pay',
            linkedTransactionId: null,
            source: 'manual',
            isRecurring: false,
            comment: null,
            statementId: null,
            paidAt: null,
            dueSoonNotifiedAt: null,
            createdAt: '2026-03-20T00:00:00.000Z',
            updatedAt: '2026-03-20T00:00:00.000Z',
          },
        ],
        total: 20,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

    const { PayablesView } = await import('./PayablesView');
    render(<PayablesView />);

    await screen.findByText('Page Two Vendor');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    });

    await screen.findByText('Page One Vendor');
    expect(screen.getByText('Showing 1–20 of 20')).toBeInTheDocument();
  });

  it('applies status filter from search params on first load', async () => {
    navigationState.searchParams = new URLSearchParams('status=overdue');

    const { PayablesView } = await import('./PayablesView');
    render(<PayablesView />);

    await screen.findByText('ACME LLC');

    await waitFor(() => {
      expect(apiMocks.list).toHaveBeenCalledWith(expect.objectContaining({ status: 'overdue' }));
    });
  });
});
