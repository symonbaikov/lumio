// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => vi.fn());
const apiGet = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, loading: false }),
}));

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    header: {
      title: { value: 'Tables' },
      subtitle: { value: 'Export and manage structured tables.' },
    },
    searchPlaceholder: { value: 'Search tables...' },
    sources: {
      label: { value: 'Source' },
      manual: { value: 'Manual' },
      googleSheets: { value: 'Google Sheets' },
    },
    filters: {
      all: { value: 'All' },
      fromStatement: { value: 'From statement' },
      sortUpdated: { value: 'Recent updates' },
      sortName: { value: 'By name' },
      filters: { value: 'Filters' },
      sort: { value: 'Sort' },
      apply: { value: 'Apply' },
      reset: { value: 'Reset' },
      resetFilters: { value: 'Reset filters' },
      viewResults: { value: 'View results' },
      saveSearch: { value: 'Save search' },
      any: { value: 'Any' },
      drawerTitle: { value: 'Filters' },
      drawerGeneral: { value: 'General' },
    },
    actions: {
      open: { value: 'Open' },
      create: { value: 'Create' },
      createExportTable: { value: 'Create export table' },
      createFirstExportTable: { value: 'Create your first export table' },
      createBlankTable: { value: 'Create blank table' },
      export: { value: 'Export' },
      exportCsv: { value: 'CSV' },
      exportXlsx: { value: 'XLSX' },
      updateData: { value: 'Update data' },
      importGoogleSheets: { value: 'Import from Google Sheets' },
      cancel: { value: 'Cancel' },
      delete: { value: 'Delete' },
    },
    fromLabel: { value: 'From' },
    growthHint: { value: 'Growth hint' },
    namingHint: { value: 'Naming hint' },
    ctaDescription: { value: 'CTA description' },
    pagination: {
      shown: { value: 'Showing {from}-{to} of {count}' },
      previous: { value: 'Previous' },
      next: { value: 'Next' },
      pageOf: { value: 'Page {page} of {count}' },
    },
    columns: {
      name: { value: 'Name' },
      purpose: { value: 'Purpose / Type' },
      source: { value: 'Source' },
      rows: { value: 'Rows' },
      updatedAt: { value: 'Last updated' },
      actions: { value: 'Actions' },
    },
    empty: {
      title: { value: 'No export tables yet' },
      description: { value: 'Create a table for accounting exports.' },
      step1: { value: 'Step 1' },
      step2: { value: 'Step 2' },
      step3: { value: 'Step 3' },
      step4: { value: 'Step 4' },
    },
    create: {
      title: 'New table',
      name: 'Name',
      namePlaceholder: { value: 'Table name' },
      description: 'Description',
      descriptionPlaceholder: { value: 'Description' },
      category: 'Category',
      noCategory: 'No category',
      creating: { value: 'Creating...' },
    },
    confirmDelete: {
      title: { value: 'Delete table' },
      messageWithNamePrefix: { value: 'Delete ' },
      messageWithNameSuffix: { value: '?' },
      messageNoName: { value: 'Delete this table?' },
      confirm: { value: 'Delete' },
      cancel: { value: 'Cancel' },
    },
    toasts: {
      loadTablesFailed: { value: 'Failed to load tables' },
      loadStatementsFailed: { value: 'Failed to load statements' },
      created: { value: 'Created' },
      createFailed: { value: 'Create failed' },
      createdFromStatement: { value: 'Created from statement' },
      createFromStatementFailed: { value: 'Create from statement failed' },
      selectAtLeastOneStatement: { value: 'Select at least one statement' },
      deleting: { value: 'Deleting' },
      deleted: { value: 'Deleted' },
      deleteFailed: { value: 'Delete failed' },
    },
  }),
}));

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiGet,
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock('@/app/components/ui/dropdown-menu', () => {
  const ReactModule = React;
  const DropdownContext = ReactModule.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
  } | null>(null);

  return {
    DropdownMenu: ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => {
      const [internalOpen, setInternalOpen] = ReactModule.useState(false);
      const isControlled = typeof open === 'boolean';
      const resolvedOpen = isControlled ? open : internalOpen;
      const setOpen = (next: boolean) => {
        if (!isControlled) {
          setInternalOpen(next);
        }
        onOpenChange?.(next);
      };

      return (
        <DropdownContext.Provider value={{ open: resolvedOpen, setOpen }}>
          <div>{children}</div>
        </DropdownContext.Provider>
      );
    },
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => {
      const context = ReactModule.useContext(DropdownContext);
      if (!ReactModule.isValidElement(children)) return <>{children}</>;

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
      if (!context?.open) return null;
      return <div>{children}</div>;
    },
    DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => {
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

vi.mock('@heroui/modal', () => ({
  Modal: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ModalBody: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ModalContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ModalFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ModalHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

describe('CustomTablesPage', () => {
  it('opens create menu with blank table and Google Sheets import actions', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    apiGet.mockImplementation(() => Promise.resolve({ data: { data: [] } }));

    const { default: CustomTablesPage } = await import('./page');

    act(() => {
      render(<CustomTablesPage />);
    });

    const createButton = screen.getByRole('button', { name: 'Create' });
    act(() => {
      fireEvent.click(createButton);
    });

    expect(await screen.findByText('Import from Google Sheets')).toBeInTheDocument();
    expect(screen.getByText('Create blank table')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByText('Import from Google Sheets'));
    });

    expect(push).toHaveBeenCalledWith('/custom-tables/import/google-sheets');
  });
});
