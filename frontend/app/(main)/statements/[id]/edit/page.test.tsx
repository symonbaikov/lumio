// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiGet = vi.hoisted(() => vi.fn());
const apiPatch = vi.hoisted(() => vi.fn());
const apiPost = vi.hoisted(() => vi.fn());
const apiDelete = vi.hoisted(() => vi.fn());

const push = vi.hoisted(() => vi.fn());
const back = vi.hoisted(() => vi.fn());
const authUser = vi.hoisted(() => ({ id: 'user-1' }));

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiGet,
    patch: apiPatch,
    post: apiPost,
    delete: apiDelete,
  },
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({ user: authUser }),
}));

vi.mock('@/app/hooks/useAutoSave', () => ({
  useAutoSave: () => undefined,
}));

vi.mock('@/app/i18n', () => {
  const token = (value: string) => ({ value });

  const content = {
    labels: {
      back: 'Back',
      transactionsCount: token('transactions'),
      parsingDetails: token('Parsing details'),
      exportButton: token('Export to table'),
      exportConfirmTitle: token('Confirm export'),
      exportConfirmBody: token('Confirm export body'),
      exportConfirmConfirm: token('Export'),
      cancel: token('Cancel'),
      categoryButton: token('Category'),
      categoryDrawerTitle: token('Category'),
      categorySearchPlaceholder: token('Search'),
      categoryAllOption: token('All'),
      categoryNoResults: token('No categories found'),
      notSelected: 'Not selected',
      balanceStart: token('Opening balance'),
      balanceEnd: token('Closing balance'),
      period: token('Period'),
      expenses: token('Expenses'),
      income: token('Income'),
      startDate: token('Start date'),
      endDate: token('End date'),
      notSpecified: token('Not specified'),
      openingBalance: token('Opening balance'),
      enterOpeningBalance: token('Enter opening balance'),
      selectedTransactions: token('Selected: {count} transactions'),
      save: token('Save'),
      delete: token('Delete'),
      assignCategory: token('Assign category'),
      assignCategoryForTransactions: token('Assign category for {count} transactions'),
      apply: token('Apply'),
      noCategoryOption: token('No category'),
      submitForApproval: token('Submit'),
      submitBlockedTooltip: token('Assign categories to all transactions before submitting'),
      alertReviewTitle: token('Review statement before submit'),
      alertParsingWarnings: token(
        '{count} parsing warnings found. It is recommended to review flagged rows.',
      ),
      confirmDeleteOne: token('Delete transaction?'),
      confirmDeleteMany: token('Delete {count} transactions?'),
      changesSaved: 'Changes saved successfully!',
      exportLoading: token('Exporting to table...'),
      exportFailure: token('Failed to export to table'),
      exportSuccess: token('Table created successfully'),
      categoryUpdated: token('Statement category updated'),
      categoryUpdateFailed: token('Failed to update statement category'),
      alertNeedsFixTitle: token('Fix required before submit'),
      alertReadyTitle: token('Statement is ready to submit'),
      alertStatementCategoryMissing: token('Statement category is not selected.'),
      alertStatementCategoryDisabled: token(
        'Selected statement category is disabled. Choose an active category.',
      ),
      alertTransactionsCategoryMissing: token(
        '{count} transactions require a category. Assign categories for all rows.',
      ),
      alertParsingErrors: token(
        '{count} parsing errors found. Review parsing details and statement data.',
      ),
      alertNoTransactions: token(
        'No transactions found in this statement. Check file or import settings.',
      ),
      bankDetectedBy: token('Detected by'),
      otherBankMentions: token('Other bank mentions'),
      warnings: token('Warnings'),
      processedLines: token('Lines processed'),
      unapprove: token('Unapprove'),
      pay: token('Pay'),
      rollbackToApprove: token('Return to approve'),
      submitSuccess: token('Statement submitted for approval'),
      unapproveSuccess: token('Statement moved back to submit'),
      paySuccess: token('Statement moved to pay'),
      rollbackToApproveSuccess: token('Statement moved back to approve'),
    },
    columns: {
      date: token('Date'),
      counterparty: token('Counterparty'),
      paymentPurposeShort: token('Payment purpose'),
      expense: token('Expense'),
      income: token('Income'),
      category: token('Category'),
      actions: token('Actions'),
    },
  };

  return {
    useIntlayer: () => content,
    useLocale: () => ({ locale: 'en' }),
  };
});

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'statement-1' }),
  useRouter: () => ({ push, back }),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock('./ParsingWarningsPanel', () => ({
  ParsingWarningsPanel: ({
    onResolveWarning,
  }: {
    onResolveWarning?: (warning: string, index: number) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onResolveWarning?.('Balance mismatch: expected 1000.00 got 800.00 (diff 200.00)', 0)
      }
    >
      Resolve balance warning
    </button>
  ),
  formatDroppedSample: (value: unknown) => String(value),
}));

vi.mock('./StatementCategoryDrawer', () => ({
  default: () => null,
}));

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('EditStatementPage locale', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    apiGet.mockReset();
    apiPatch.mockReset();
    apiPost.mockReset();
    apiDelete.mockReset();
    push.mockReset();
    back.mockReset();

    apiGet.mockImplementation((url: string) => {
      if (url === '/statements/statement-1') {
        return Promise.resolve({
          data: {
            id: 'statement-1',
            fileName: 'statement.pdf',
            status: 'completed',
            totalTransactions: 1,
            categoryId: 'cat-1',
            category: { id: 'cat-1', name: 'Services', isEnabled: true },
            statementDateFrom: '2026-03-01',
            statementDateTo: '2026-03-17',
            balanceStart: 100,
            balanceEnd: 200,
            parsingDetails: {
              warnings: ['Balance mismatch: expected 1000.00 got 800.00 (diff 200.00)'],
              errors: [],
            },
          },
        });
      }

      if (url === '/transactions?statement_id=statement-1&limit=1000') {
        return Promise.resolve({
          data: [
            {
              id: 'tx-1',
              transactionDate: '2026-03-17T00:00:00.000Z',
              counterpartyName: 'Test counterparty',
              paymentPurpose: 'Payment for services',
              debit: 125,
              credit: 0,
              transactionType: 'expense',
              categoryId: 'cat-1',
              category: { id: 'cat-1', name: 'Services', isEnabled: true },
            },
          ],
        });
      }

      if (url === '/categories') {
        return Promise.resolve({
          data: [{ id: 'cat-1', name: 'Services', isEnabled: true }],
        });
      }

      if (url === '/branches' || url === '/wallets') {
        return Promise.resolve({ data: [] });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders transaction table headers in English when locale is en', async () => {
    const { default: EditStatementPage } = await import('./page');

    await act(async () => {
      root.render(<EditStatementPage />);
    });

    await act(async () => {
      await flushPromises();
    });

    expect(container.textContent).toContain('Date');
    expect(container.textContent).toContain('Counterparty');
    expect(container.textContent).toContain('Payment purpose');
    expect(container.textContent).toContain('Expense');
    expect(container.textContent).toContain('Income');
    expect(container.textContent).toContain('Category');
    expect(container.textContent).toContain('Actions');

    expect(container.textContent).not.toContain('ДАТА');
    expect(container.textContent).not.toContain('КОНТРАГЕНТ');
    expect(container.textContent).not.toContain('НАЗНАЧЕНИЕ ПЛАТЕЖА');
  });

  it('focuses closing balance input when resolving balance mismatch warning', async () => {
    const { default: EditStatementPage } = await import('./page');

    await act(async () => {
      root.render(<EditStatementPage />);
    });

    await act(async () => {
      await flushPromises();
    });

    const resolveButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Resolve balance warning'),
    ) as HTMLButtonElement | undefined;

    expect(resolveButton).toBeTruthy();

    await act(async () => {
      resolveButton?.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      await flushPromises();
    });

    const closingBalanceInput = Array.from(container.querySelectorAll('input')).find(input =>
      (input.value || '').includes('200'),
    ) as HTMLInputElement | undefined;

    expect(closingBalanceInput).toBeTruthy();
    expect(document.activeElement).toBe(closingBalanceInput);
  });

  it('renders start and end date fields in the same metadata shell as balance fields', async () => {
    const { default: EditStatementPage } = await import('./page');

    await act(async () => {
      root.render(<EditStatementPage />);
    });

    await act(async () => {
      await flushPromises();
    });

    const metadataShells = Array.from(
      container.querySelectorAll('[data-testid^="statement-metadata-field-"]'),
    );

    expect(
      container.querySelector('[data-testid="statement-metadata-field-start-date"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="statement-metadata-field-end-date"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="statement-metadata-field-opening-balance"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="statement-metadata-field-closing-balance"]'),
    ).toBeTruthy();
    expect(metadataShells).toHaveLength(4);
  });
});
