// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import {
  TransactionPreviewTable,
  type TransactionPreviewTableContent,
  type TransactionPreviewTableRow,
} from './TransactionPreviewTable';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

const t: TransactionPreviewTableContent = {
  title: 'Row validation',
  emptyHint: 'Rows will appear after preview',
  filterLabel: { value: 'Filter' },
  filterOptions: { all: 'All', issues: 'Issues only', duplicates: 'Duplicates only' },
  statusChips: { new: 'new', duplicate: 'duplicate', error: 'error', skipped: 'skipped' },
  issueLabels: {
    invalid_date: 'Invalid date',
    invalid_amount: 'Invalid amount',
    zero_amount: 'Zero amount',
    missing_required: 'Missing required field',
    duplicate_in_file: 'Duplicate within file',
    unknown_currency: 'Unknown currency',
  },
  sessionFailedLabel: 'Failed to process row',
  existingTransactionPrefix: 'Existing transaction:',
  columnHeaders: { row: 'Row', details: 'Details', status: 'Status' },
  noRowsForFilter: 'No rows match this filter',
  summaryTemplate: {
    value: '{skipped} rows will be skipped, the remaining {importing} will be imported',
  },
};

const newRow: TransactionPreviewTableRow = {
  rowNumber: 2,
  status: 'ok',
  issues: [],
  sessionStatus: 'new',
  transaction: {
    transactionDate: '2026-01-01',
    counterpartyName: 'Coffee shop',
    debit: 5,
    currency: 'USD',
  },
  raw: ['2026-01-01', '-5', 'Coffee shop'],
};

const duplicateRow: TransactionPreviewTableRow = {
  rowNumber: 3,
  status: 'ok',
  issues: [],
  sessionStatus: 'matched',
  existingTransactionId: 'txn-existing-1',
  transaction: {
    transactionDate: '2026-01-02',
    counterpartyName: 'Landlord',
    debit: 500,
    currency: 'USD',
  },
  raw: ['2026-01-02', '-500', 'Landlord'],
};

const errorRow: TransactionPreviewTableRow = {
  rowNumber: 4,
  status: 'invalid',
  issues: ['invalid_date', 'unknown_currency'],
  raw: ['not-a-date', '-10', 'Mystery'],
};

const skippedRow: TransactionPreviewTableRow = {
  rowNumber: 5,
  status: 'skipped',
  issues: [],
  raw: [null, null, null],
};

const allRows = [newRow, duplicateRow, errorRow, skippedRow];

function baseProps(rows: TransactionPreviewTableRow[] = allRows) {
  return {
    rows,
    summary: { total: 4, ok: 2, invalid: 1, skipped: 1 },
    t,
  };
}

describe('TransactionPreviewTable', () => {
  it('renders a chip for each of the 4 status categories with the correct label', () => {
    render(<TransactionPreviewTable {...baseProps()} />);

    expect(screen.getByText('new')).toBeInTheDocument();
    expect(screen.getByText('duplicate')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText('skipped')).toBeInTheDocument();
  });

  it('shows the actual issues array content for error rows, not a generic label', () => {
    render(<TransactionPreviewTable {...baseProps()} />);

    expect(screen.getByText('Invalid date, Unknown currency')).toBeInTheDocument();
  });

  it('shows the existing transaction id for a duplicate row', () => {
    render(<TransactionPreviewTable {...baseProps()} />);

    expect(screen.getByText('Existing transaction: txn-existing-1')).toBeInTheDocument();
  });

  it('renders the skip/import summary copy from the summary counts', () => {
    render(<TransactionPreviewTable {...baseProps()} />);

    // invalid (1) + skipped (1) = 2 will be skipped, ok (2) will be imported.
    expect(
      screen.getByText('2 rows will be skipped, the remaining 2 will be imported'),
    ).toBeInTheDocument();
  });

  it('keeps rows with issues visible (not hidden) under the "all" filter', () => {
    render(<TransactionPreviewTable {...baseProps()} />);

    const rows = screen.getAllByRole('row');
    // 1 header row + 4 data rows.
    expect(rows).toHaveLength(5);
  });

  it('filters to only error rows when "issues" is selected', () => {
    render(<TransactionPreviewTable {...baseProps()} />);

    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'issues' } });

    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.queryByText('new')).not.toBeInTheDocument();
    expect(screen.queryByText('duplicate')).not.toBeInTheDocument();
    expect(screen.queryByText('skipped')).not.toBeInTheDocument();
  });

  it('filters to only duplicate rows when "duplicates" is selected', () => {
    render(<TransactionPreviewTable {...baseProps()} />);

    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'duplicates' } });

    expect(screen.getByText('duplicate')).toBeInTheDocument();
    expect(screen.queryByText('new')).not.toBeInTheDocument();
    expect(screen.queryByText('error')).not.toBeInTheDocument();
    expect(screen.queryByText('skipped')).not.toBeInTheDocument();
  });

  it('shows all rows again when switching the filter back to "all"', () => {
    render(<TransactionPreviewTable {...baseProps()} />);

    const select = screen.getByLabelText('Filter');
    fireEvent.change(select, { target: { value: 'duplicates' } });
    fireEvent.change(select, { target: { value: 'all' } });

    expect(screen.getByText('new')).toBeInTheDocument();
    expect(screen.getByText('duplicate')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText('skipped')).toBeInTheDocument();
  });

  it('renders the empty hint when there are no rows at all', () => {
    render(<TransactionPreviewTable {...baseProps([])} summary={null} />);

    expect(screen.getByText('Rows will appear after preview')).toBeInTheDocument();
  });

  it('renders a distinct "no rows for filter" message when a filter matches nothing', () => {
    // Only new/skipped rows: the "duplicates" filter matches none of them.
    render(<TransactionPreviewTable {...baseProps([newRow, skippedRow])} />);

    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'duplicates' } });

    expect(screen.getByText('No rows match this filter')).toBeInTheDocument();
  });

  it('handles an all-errors sheet: every row renders as an error with its issues', () => {
    const errorOnly: TransactionPreviewTableRow[] = [
      errorRow,
      {
        rowNumber: 6,
        status: 'invalid',
        issues: ['zero_amount'],
        raw: ['2026-01-03', '0', 'Nothing'],
      },
    ];
    render(
      <TransactionPreviewTable
        {...baseProps(errorOnly)}
        summary={{ total: 2, ok: 0, invalid: 2, skipped: 0 }}
      />,
    );

    expect(screen.getAllByText('error')).toHaveLength(2);
    expect(screen.getByText('Invalid date, Unknown currency')).toBeInTheDocument();
    expect(screen.getByText('Zero amount')).toBeInTheDocument();
    expect(
      screen.getByText('2 rows will be skipped, the remaining 0 will be imported'),
    ).toBeInTheDocument();
  });

  it('maps an ok row whose session classification failed to the error category with the fallback label', () => {
    const failedRow: TransactionPreviewTableRow = {
      rowNumber: 7,
      status: 'ok',
      issues: [],
      sessionStatus: 'failed',
      raw: ['2026-01-04', '-1', 'Broken'],
    };
    render(<TransactionPreviewTable {...baseProps([failedRow])} />);

    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText('Failed to process row')).toBeInTheDocument();
  });
});
