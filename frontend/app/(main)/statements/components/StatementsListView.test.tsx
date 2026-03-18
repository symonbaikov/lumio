import { STATEMENTS_GMAIL_SYNC_EVENT } from '@/app/lib/statement-upload-actions';
// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StatementsListView from './StatementsListView';

const apiMocks = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockListReceipts: vi.fn(),
}));

const statementsListItemPropsSpy = vi.hoisted(() => vi.fn());

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiMocks.mockApiGet,
    post: vi.fn(),
  },
  gmailReceiptsApi: {
    listReceipts: apiMocks.mockListReceipts,
  },
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/app/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentWorkspace: { currency: 'KZT' } }),
}));

vi.mock('next-intlayer', () => ({
  useIntlayer: () => ({}),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/app/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/app/hooks/useLockBodyScroll', () => ({
  useLockBodyScroll: () => undefined,
}));

vi.mock('@/app/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    handlers: {},
    pullDistance: 0,
    isRefreshing: false,
    isReadyToRefresh: false,
  }),
}));

vi.mock('@/app/lib/statement-status', () => ({
  getStatementDisplayMerchant: () => 'Merchant',
  getStatementMerchantLabel: () => 'Merchant',
  hasProcessingStatements: () => false,
  isManualExpenseStatement: () => false,
}));

vi.mock('@/app/lib/statement-workflow', () => ({
  getStatementStage: () => 'submit',
}));

vi.mock('@/app/(main)/statements/components/filters/statement-filters', () => ({
  DEFAULT_STATEMENT_FILTERS: {
    type: null,
    statuses: [],
    date: null,
    from: [],
    to: [],
    keywords: '',
    amountMin: null,
    amountMax: null,
    approved: null,
    billable: null,
    groupBy: null,
    has: [],
    currencies: [],
    exported: null,
    paid: null,
    limit: null,
  },
  applyStatementsFilters: (items: unknown[]) => items,
  loadStatementFilters: () => ({
    type: null,
    statuses: [],
    date: null,
    from: [],
    to: [],
    keywords: '',
    amountMin: null,
    amountMax: null,
    approved: null,
    billable: null,
    groupBy: null,
    has: [],
    currencies: [],
    exported: null,
    paid: null,
    limit: null,
  }),
  resetSingleStatementFilter: (filters: unknown) => filters,
  saveStatementFilters: () => undefined,
}));

vi.mock('@/app/components/LoadingAnimation', () => ({
  default: () => null,
}));

vi.mock('@/app/components/PDFPreviewModal', () => ({
  PDFPreviewModal: () => null,
}));

vi.mock('@/app/(main)/statements/components/filters/FiltersDrawer', () => ({
  FiltersDrawer: () => null,
}));

vi.mock('@/app/(main)/statements/components/columns/ColumnsDrawer', () => ({
  ColumnsDrawer: () => null,
}));

vi.mock('@/app/(main)/statements/components/CreateExpenseDrawer', () => ({
  default: () => null,
}));

vi.mock('@/app/components/ui/checkbox', () => ({
  Checkbox: () => null,
}));

vi.mock('@/app/components/ui/filter-chip-button', () => ({
  FilterChipButton: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/app/(main)/statements/components/filters/DateFilterDropdown', () => ({
  DateFilterDropdown: () => null,
}));

vi.mock('@/app/(main)/statements/components/filters/FromFilterDropdown', () => ({
  FromFilterDropdown: () => null,
}));

vi.mock('@/app/(main)/statements/components/filters/StatusFilterDropdown', () => ({
  StatusFilterDropdown: () => null,
}));

vi.mock('@/app/(main)/statements/components/filters/TypeFilterDropdown', () => ({
  TypeFilterDropdown: () => null,
}));

vi.mock('@/app/(main)/statements/components/StatementsListItem', () => ({
  StatementsListItem: (props: any) => {
    statementsListItemPropsSpy(props);
    return null;
  },
}));

vi.mock('@/app/(main)/statements/components/gmail-receipt-mapping', () => ({
  hasGmailReceiptAmount: () => true,
  mapGmailReceiptsToStatements: () => [],
  resolveGmailMerchantLabel: () => 'Merchant',
}));

vi.mock('@/app/components/ui/pagination', () => ({
  AppPagination: () => null,
}));

describe('StatementsListView Gmail sync skeleton', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    sessionStorage.clear();
    apiMocks.mockApiGet.mockReset();
    apiMocks.mockListReceipts.mockReset();
    statementsListItemPropsSpy.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null as unknown as HTMLDivElement;
    sessionStorage.clear();
  });

  it('renders Gmail sync skeleton rows from storage count', () => {
    act(() => {
      root.render(<StatementsListView stage="submit" />);
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(STATEMENTS_GMAIL_SYNC_EVENT, {
          detail: { count: 3, timestamp: Date.now() },
        }),
      );
    });

    const skeletonRows = container.querySelectorAll('[data-testid="gmail-sync-skeleton-row"]');
    expect(skeletonRows).toHaveLength(3);
  });

  it('sorts statements by date when date header clicked', async () => {
    apiMocks.mockApiGet.mockImplementation((url: string) => {
      if (url === '/categories') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/tax-rates') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/statements') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'newer',
                source: 'statement',
                fileName: 'newer.pdf',
                status: 'completed',
                totalTransactions: 1,
                totalDebit: 100,
                totalCredit: 0,
                createdAt: '2026-03-17T00:00:00Z',
                statementDateFrom: '2026-03-16',
                statementDateTo: '2026-03-17',
                bankName: 'kaspi',
                fileType: 'pdf',
                currency: 'KZT',
              },
              {
                id: 'older',
                source: 'statement',
                fileName: 'older.pdf',
                status: 'completed',
                totalTransactions: 1,
                totalDebit: 50,
                totalCredit: 0,
                createdAt: '2026-03-01T00:00:00Z',
                statementDateFrom: '2026-02-28',
                statementDateTo: '2026-03-01',
                bankName: 'kaspi',
                fileType: 'pdf',
                currency: 'KZT',
              },
            ],
            total: 2,
          },
        });
      }

      return Promise.resolve({ data: [] });
    });
    apiMocks.mockListReceipts.mockResolvedValue({ data: { receipts: [] } });

    act(() => {
      root.render(<StatementsListView stage="submit" />);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const initialIds = statementsListItemPropsSpy.mock.calls
      .map(call => call[0]?.statement?.id)
      .filter(Boolean);
    const firstNewerIndex = initialIds.indexOf('newer');
    const firstOlderIndex = initialIds.indexOf('older');
    expect(firstNewerIndex).toBeGreaterThanOrEqual(0);
    expect(firstOlderIndex).toBeGreaterThanOrEqual(0);
    expect(firstNewerIndex).toBeLessThan(firstOlderIndex);

    statementsListItemPropsSpy.mockClear();

    const sortButton = container.querySelector(
      '[data-testid="statements-date-sort"]',
    ) as HTMLButtonElement | null;
    expect(sortButton).toBeTruthy();

    act(() => {
      sortButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const sortedIds = statementsListItemPropsSpy.mock.calls
      .map(call => call[0]?.statement?.id)
      .filter(Boolean);
    const secondNewerIndex = sortedIds.indexOf('newer');
    const secondOlderIndex = sortedIds.indexOf('older');
    expect(secondNewerIndex).toBeGreaterThanOrEqual(0);
    expect(secondOlderIndex).toBeGreaterThanOrEqual(0);
    expect(secondOlderIndex).toBeLessThan(secondNewerIndex);
  });
});
