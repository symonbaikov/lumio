import { fireEvent, render, screen, waitFor } from '@testing-library/react';
// @vitest-environment jsdom
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => vi.fn());
const apiGet = vi.hoisted(() => vi.fn());
const apiPost = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
// Stable object references: a mock hook that returns fresh literals on every render
// makes any effect depending on that value re-fire forever (this page's auth effect
// depends on `user`), so keep these module-level constants instead of inlining them.
const mockUser = vi.hoisted(() => ({ id: 'user-1' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const { alt = '', ...rest } = props;
    // biome-ignore lint/a11y/useAltText: alt is destructured from props above and always passed through.
    return <img alt={alt} {...rest} />;
  },
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiGet,
    post: apiPost,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastError,
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    auth: { loginRequired: 'Login required' },
    header: { title: 'Import from Google Sheets', subtitle: 'subtitle', back: 'Back' },
    defaults: { tableName: { value: 'Untitled table' } },
    source: {
      title: 'Source',
      oauthNeededSuffix: { value: ' (needs OAuth)' },
      worksheetLabel: 'Worksheet',
      worksheetHelp: 'worksheet help',
      worksheetLoading: 'Loading worksheets...',
      worksheetPlaceholder: 'Select worksheet',
      rangeLabel: 'Range',
      rangePlaceholder: { value: 'e.g. A1:D20' },
      headerOffsetLabel: 'Header offset',
      headerOffsetHelp: 'header offset help',
      layoutLabel: 'Layout',
      layoutAuto: 'Auto',
      layoutFlat: 'Flat',
      layoutMatrix: 'Matrix',
      previewButton: 'Run preview',
      previewButtonLoading: 'Loading...',
      loadingConnections: 'Loading connections...',
    },
    result: {
      title: 'Result',
      tableNameLabel: 'Table name',
      tableNamePlaceholder: { value: 'e.g. Payments' },
      descriptionLabel: 'Description',
      categoryLabel: 'Category',
      noCategory: 'No category',
      categoryHint: 'category hint',
      importDataCheckbox: 'Import data',
      importButton: 'Start import',
      importRunning: 'Importing...',
      progressTitle: 'Progress',
      statusLabel: { value: 'Status' },
      dash: { value: '-' },
      needPreviewHint: 'Run a preview first',
    },
    preview: {
      title: 'Sheet preview',
      subtitle: 'preview subtitle',
      hint: 'preview hint',
      rowHeader: 'Row',
      layoutPrefix: { value: 'Layout' },
    },
    columns: {
      title: 'Columns',
      subtitle: 'columns subtitle',
      enableAll: 'Enable all',
      appearAfterPreview: 'Columns appear after preview',
      tableHeaders: { enabled: 'Enabled', name: 'Name', type: 'Type' },
      types: {
        text: 'Text',
        number: 'Number',
        date: 'Date',
        boolean: 'Boolean',
        select: 'Select',
        multiSelect: 'Multi-select',
      },
    },
    targetSelector: {
      transactionsLabel: 'Транзакции',
      tableLabel: 'Таблица',
      transactionsPlaceholder: 'Transaction import: column mapping will appear here',
    },
    mapping: {
      title: 'Column mapping',
      subtitle: 'Assign a role to each column',
      emptyHint: 'Run a preview to see columns',
      columnHeaders: {
        letter: 'Col',
        header: 'Header',
        samples: 'Samples',
        role: { value: 'Role' },
      },
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
    },
    rowsPreview: {
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
    },
    toasts: {
      loadConnectionsFailed: { value: 'Failed to load connections' },
      oauthRequired: { value: 'OAuth required' },
      previewReady: { value: 'Preview ready' },
      previewFailed: { value: 'Preview failed' },
      importStartFailed: { value: 'Import start failed' },
      importStarted: { value: 'Import started' },
      importFailed: { value: 'Import failed' },
      importDone: { value: 'Import done' },
      importError: { value: 'Import error' },
    },
  }),
}));

const financialPreviewResponse = {
  data: {
    data: {
      spreadsheetId: 'sheet-1',
      worksheetName: 'Sheet1',
      usedRange: { a1: 'A1:C10', rowsCount: 10, colsCount: 3 },
      layoutSuggested: 'flat',
      headerRowIndex: 0,
      columns: [
        { index: 0, a1: 'A', title: 'Date', suggestedType: 'date', include: true },
        { index: 1, a1: 'B', title: 'Amount', suggestedType: 'number', include: true },
        { index: 2, a1: 'C', title: 'Note', suggestedType: 'text', include: true },
      ],
      sampleRows: [{ rowNumber: 2, values: ['2024-01-01', '10.5', 'coffee'] }],
    },
  },
};

const transactionsPreviewResponse = {
  data: {
    data: {
      sessionId: 'session-1',
      suggestedMapping: { roles: ['date', 'amount', 'ignore'], defaultCurrency: 'KZT' },
      columns: [
        { index: 0, a1: 'A', title: 'Date', suggestedRole: 'date', samples: ['2024-01-01'] },
        { index: 1, a1: 'B', title: 'Amount', suggestedRole: 'amount', samples: ['10.5'] },
        { index: 2, a1: 'C', title: 'Note', suggestedRole: 'ignore', samples: ['coffee'] },
      ],
      rows: [],
      summary: {
        total: 10,
        ok: 8,
        invalid: 1,
        skipped: 1,
        newCount: 6,
        duplicateCount: 2,
        warnings: [],
        dateRange: null,
        totals: { debit: 0, credit: 0, currency: 'KZT' },
      },
    },
  },
};

const nonFinancialPreviewResponse = {
  data: {
    data: {
      spreadsheetId: 'sheet-2',
      worksheetName: 'Sheet1',
      usedRange: { a1: 'A1:B10', rowsCount: 10, colsCount: 2 },
      layoutSuggested: 'flat',
      headerRowIndex: 0,
      columns: [
        { index: 0, a1: 'A', title: 'Name', suggestedType: 'text', include: true },
        { index: 1, a1: 'B', title: 'Created', suggestedType: 'date', include: true },
      ],
      sampleRows: [{ rowNumber: 2, values: ['Alice', '2024-01-01'] }],
    },
  },
};

async function renderPage() {
  const { default: GoogleSheetsImportPage } = await import('./page');
  await act(async () => {
    render(<GoogleSheetsImportPage />);
  });
}

function fillSourceUrl() {
  const input = screen.getByPlaceholderText('https://docs.google.com/spreadsheets/d/...');
  fireEvent.change(input, { target: { value: 'https://docs.google.com/spreadsheets/d/abc123' } });
}

async function runPreview() {
  fillSourceUrl();
  const previewButton = screen.getByText('Run preview');
  await act(async () => {
    fireEvent.click(previewButton);
  });
}

describe('GoogleSheetsImportPage target selector', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    push.mockReset();
    toastError.mockReset();
    apiGet.mockImplementation((url: string) => {
      if (url === '/google-sheets') {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === '/categories') {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders both toggle options', async () => {
    await renderPage();
    expect(screen.getByText('Транзакции')).toBeInTheDocument();
    expect(screen.getByText('Таблица')).toBeInTheDocument();
  });

  it('defaults to transactions for a financial preview (date + amount columns)', async () => {
    apiPost.mockImplementation((url: string) => {
      if (url === '/custom-tables/import/google-sheets/preview') {
        return Promise.resolve(financialPreviewResponse);
      }
      if (url === '/import/google-sheets/transactions/preview') {
        return Promise.resolve(transactionsPreviewResponse);
      }
      return Promise.resolve({ data: { data: {} } });
    });

    await renderPage();
    await runPreview();

    await waitFor(() => {
      const transactionsButton = screen.getByText('Транзакции').closest('button');
      expect(transactionsButton).toHaveAttribute('aria-pressed', 'true');
    });
    const tableButton = screen.getByText('Таблица').closest('button');
    expect(tableButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('defaults to table when no amount column was detected', async () => {
    apiPost.mockImplementation((url: string) => {
      if (url === '/custom-tables/import/google-sheets/preview') {
        return Promise.resolve(nonFinancialPreviewResponse);
      }
      return Promise.resolve({ data: { data: {} } });
    });

    await renderPage();
    await runPreview();

    await waitFor(() => {
      const tableButton = screen.getByText('Таблица').closest('button');
      expect(tableButton).toHaveAttribute('aria-pressed', 'true');
    });
    const transactionsButton = screen.getByText('Транзакции').closest('button');
    expect(transactionsButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('switching target changes which submit handler fires', async () => {
    apiPost.mockImplementation((url: string) => {
      if (url === '/custom-tables/import/google-sheets/preview') {
        return Promise.resolve(nonFinancialPreviewResponse);
      }
      if (url === '/custom-tables/import/google-sheets/commit') {
        return Promise.resolve({ data: { data: { jobId: 'job-1' } } });
      }
      if (url === '/import/google-sheets/transactions/preview') {
        return Promise.resolve(transactionsPreviewResponse);
      }
      return Promise.resolve({ data: { data: {} } });
    });

    await renderPage();
    await runPreview();

    // Table is the default target here (no amount column detected).
    const commitButton = screen.getByText('Start import').closest('button') as HTMLButtonElement;
    expect(commitButton).not.toBeNull();
    await act(async () => {
      fireEvent.click(commitButton);
    });

    expect(apiPost).toHaveBeenCalledWith(
      '/custom-tables/import/google-sheets/commit',
      expect.anything(),
    );

    apiPost.mockClear();

    // Switch to the transactions target.
    const transactionsButton = screen
      .getByText('Транзакции')
      .closest('button') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(transactionsButton);
    });

    // No commit-equivalent surface is wired up for the transactions target yet (Task 12/13).
    expect(screen.queryByText('Start import')).not.toBeInTheDocument();

    // Switching to 'transactions' seeds the mapping card via its own preview call
    // (different endpoint/shape than the table-import preview above).
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        '/import/google-sheets/transactions/preview',
        expect.objectContaining({ defaultCurrency: 'KZT' }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Column mapping')).toBeInTheDocument();
    });
    expect(apiPost).not.toHaveBeenCalledWith(
      '/custom-tables/import/google-sheets/commit',
      expect.anything(),
    );
  });

  it('debounces a role change into exactly one preview call, cancelling a superseded pending call', async () => {
    apiPost.mockImplementation((url: string) => {
      if (url === '/custom-tables/import/google-sheets/preview') {
        return Promise.resolve(financialPreviewResponse);
      }
      if (url === '/import/google-sheets/transactions/preview') {
        return Promise.resolve(transactionsPreviewResponse);
      }
      return Promise.resolve({ data: { data: {} } });
    });

    await renderPage();
    fillSourceUrl();
    await act(async () => {
      fireEvent.click(screen.getByText('Run preview'));
    });

    // Financial preview defaults the target to 'transactions', which triggers the
    // (undebounced) seed call for the mapping card.
    await waitFor(() => {
      expect(screen.getByText('Column mapping')).toBeInTheDocument();
    });

    apiPost.mockClear();

    // Switch to fake timers only for the debounce window itself, so React's own
    // internals (and the async work already settled above) aren't affected.
    vi.useFakeTimers();
    try {
      const roleSelectA = screen.getByLabelText('Role A');
      act(() => {
        fireEvent.change(roleSelectA, { target: { value: 'amount' } });
      });
      // A second, fast change should cancel the first pending debounce timer.
      act(() => {
        fireEvent.change(roleSelectA, { target: { value: 'debit' } });
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });
    } finally {
      vi.useRealTimers();
    }

    const transactionsPreviewCalls = apiPost.mock.calls.filter(
      call => call[0] === '/import/google-sheets/transactions/preview',
    );
    expect(transactionsPreviewCalls).toHaveLength(1);
    expect(transactionsPreviewCalls[0][1]).toEqual(
      expect.objectContaining({ roles: ['debit', 'ignore', 'ignore'] }),
    );
  });

  it('shows an error toast and leaves the mapping card empty when the transactions preview call fails', async () => {
    apiPost.mockImplementation((url: string) => {
      if (url === '/custom-tables/import/google-sheets/preview') {
        return Promise.resolve(financialPreviewResponse);
      }
      if (url === '/import/google-sheets/transactions/preview') {
        return Promise.reject(new Error('network down'));
      }
      return Promise.resolve({ data: { data: {} } });
    });

    await renderPage();
    fillSourceUrl();
    await act(async () => {
      fireEvent.click(screen.getByText('Run preview'));
    });

    // The financial preview defaults the target to 'transactions', which triggers
    // the (rejected) seed call.
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledTimes(1);
    });

    // No columns were seeded, so the mapping card stays in its empty state rather
    // than rendering role selects for data it never received.
    expect(screen.getByText('Run a preview to see columns')).toBeInTheDocument();
    expect(screen.queryByLabelText('Role A')).not.toBeInTheDocument();

    // Loading resets so the page doesn't get stuck showing a spinner forever.
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
