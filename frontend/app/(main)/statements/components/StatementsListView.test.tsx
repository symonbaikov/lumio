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
  StatementsListItem: () => null,
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
});
