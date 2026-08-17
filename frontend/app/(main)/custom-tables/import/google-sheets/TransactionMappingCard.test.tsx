// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  type SheetColumnRole,
  TransactionMappingCard,
  type TransactionMappingCardColumn,
  type TransactionMappingCardContent,
} from './TransactionMappingCard';

const t: TransactionMappingCardContent = {
  title: 'Column mapping',
  subtitle: 'Assign a role to each column',
  emptyHint: 'Run a preview to see columns',
  columnHeaders: { letter: 'Col', header: 'Header', samples: 'Samples', role: 'Role' },
  roles: {
    ignore: 'Ignore',
    date: 'Date',
    amount: 'Amount',
    debit: 'Debit',
    credit: 'Credit',
    description: 'Description',
    counterparty: 'Counterparty',
    category: 'Category',
    wallet: 'Wallet',
    currency: 'Currency',
    externalId: 'External id',
  },
  defaultCurrencyLabel: 'Default currency',
  createMissingCategoriesLabel: 'Create missing categories',
  walletLabel: 'Target wallet',
  walletNone: 'None',
  summary: { total: 'rows', ok: 'to import', duplicates: 'duplicates', errors: 'with errors' },
};

const columns: TransactionMappingCardColumn[] = [
  {
    index: 0,
    a1: 'A',
    title: 'Date',
    suggestedRole: 'date',
    samples: ['2024-01-01', '2024-01-02'],
  },
  { index: 1, a1: 'B', title: 'Amount', suggestedRole: 'amount', samples: ['10.5', '-3'] },
  { index: 2, a1: 'C', title: 'Note', suggestedRole: 'description', samples: ['coffee'] },
];

function baseProps() {
  return {
    columns,
    roles: ['date', 'amount', 'description'] as SheetColumnRole[],
    onRolesChange: vi.fn(),
    defaultCurrency: 'KZT',
    onDefaultCurrencyChange: vi.fn(),
    createMissingCategories: false,
    onCreateMissingCategoriesChange: vi.fn(),
    wallets: [{ id: 'w1', name: 'Main wallet' }],
    walletName: '',
    onWalletNameChange: vi.fn(),
    summary: null,
    t,
  };
}

describe('TransactionMappingCard', () => {
  it('renders one row per column with the current role selected', () => {
    const { container } = render(<TransactionMappingCard {...baseProps()} />);

    const dataRows = container.querySelectorAll<HTMLTableRowElement>('tbody tr');
    expect(dataRows).toHaveLength(3);
    expect(dataRows[0].cells[1].textContent).toBe('Date');
    expect(dataRows[1].cells[1].textContent).toBe('Amount');
    expect(dataRows[2].cells[1].textContent).toBe('Note');

    const dateSelect = screen.getByLabelText('Role A') as HTMLSelectElement;
    expect(dateSelect.value).toBe('date');
    const amountSelect = screen.getByLabelText('Role B') as HTMLSelectElement;
    expect(amountSelect.value).toBe('amount');
  });

  it('fires onRolesChange with the updated array when a role select changes', () => {
    const props = baseProps();
    render(<TransactionMappingCard {...props} />);

    const noteSelect = screen.getByLabelText('Role C');
    fireEvent.change(noteSelect, { target: { value: 'counterparty' } });

    expect(props.onRolesChange).toHaveBeenCalledTimes(1);
    expect(props.onRolesChange).toHaveBeenCalledWith(['date', 'amount', 'counterparty']);
  });

  it('clears the previous column when a single-slot role is reassigned, in one call', () => {
    const props = baseProps();
    render(<TransactionMappingCard {...props} />);

    // Column A already has 'date'; assign 'date' to column C too.
    const noteSelect = screen.getByLabelText('Role C');
    fireEvent.change(noteSelect, { target: { value: 'date' } });

    expect(props.onRolesChange).toHaveBeenCalledTimes(1);
    expect(props.onRolesChange).toHaveBeenCalledWith(['ignore', 'amount', 'date']);
  });

  it('does not clear other columns when reassigning to "ignore"', () => {
    const props = baseProps();
    render(<TransactionMappingCard {...props} />);

    const dateSelect = screen.getByLabelText('Role A');
    fireEvent.change(dateSelect, { target: { value: 'ignore' } });

    expect(props.onRolesChange).toHaveBeenCalledTimes(1);
    expect(props.onRolesChange).toHaveBeenCalledWith(['ignore', 'amount', 'description']);
  });

  it('renders the counters strip from the summary prop', () => {
    const props = baseProps();
    render(
      <TransactionMappingCard
        {...props}
        summary={{ total: 650, ok: 612, invalid: 14, duplicateCount: 24 }}
      />,
    );

    expect(
      screen.getByText('650 rows · 612 to import · 24 duplicates · 14 with errors'),
    ).toBeInTheDocument();
  });

  it('renders nothing for the summary strip when summary is null', () => {
    const props = baseProps();
    render(<TransactionMappingCard {...props} summary={null} />);

    expect(screen.queryByText(/rows/)).not.toBeInTheDocument();
  });

  it('renders the empty hint when there are no columns', () => {
    const props = baseProps();
    render(<TransactionMappingCard {...props} columns={[]} />);

    expect(screen.getByText('Run a preview to see columns')).toBeInTheDocument();
  });
});
