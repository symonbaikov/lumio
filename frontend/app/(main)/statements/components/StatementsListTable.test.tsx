// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StatementsListTable } from './StatementsListTable';

vi.mock('@/app/components/DocumentTypeIcon', () => ({
  DocumentTypeIcon: () => <div data-testid="document-type-icon" />,
}));

vi.mock('@/app/components/PDFThumbnail', () => ({
  PDFThumbnail: () => <div data-testid="pdf-thumbnail" />,
}));

const statement = {
  id: 'statement-1',
  source: 'statement',
  fileName: 'Statement.pdf',
  status: 'completed',
  totalDebit: 1200,
  totalCredit: 0,
  createdAt: '2026-02-01T00:00:00Z',
  statementDateFrom: '2026-01-01',
  statementDateTo: '2026-01-31',
  bankName: 'kaspi',
  fileType: 'pdf',
  currency: 'KZT',
};

const renderTable = (columns: React.ComponentProps<typeof StatementsListTable>['columns']) =>
  render(
    <StatementsListTable
      loading={false}
      displayStatements={[statement]}
      paginatedStatements={[statement]}
      gmailSyncSkeletonKeys={[]}
      allVisibleSelected={false}
      selectedCount={0}
      selectedStatementIds={[]}
      dateSortDirection="desc"
      page={1}
      totalPagesCount={1}
      rangeStart={1}
      rangeEnd={1}
      total={1}
      duplicateMetaById={new Map()}
      columns={columns}
      viewLabel="View"
      reviewDuplicateLabel="Review"
      labels={{
        merchant: 'Merchant',
        date: 'Date',
        amount: 'Amount',
        action: 'Action',
        receipt: 'Receipt',
        scanning: 'Scanning...',
        emptyTitle: 'No statements',
        emptyDescription: 'Upload one',
        paginationShown: 'Showing {from}-{to} of {count}',
        paginationPageOf: 'Page {page} of {count}',
      }}
      onToggleSelectAll={vi.fn()}
      onToggleSortDirection={vi.fn()}
      onToggleStatement={vi.fn()}
      onView={vi.fn()}
      onIconClick={vi.fn()}
      onPageChange={vi.fn()}
    />,
  );

describe('StatementsListTable upload skeleton', () => {
  it('shows skeleton rows instead of the empty state while a local file upload is pending', () => {
    render(
      <StatementsListTable
        loading={false}
        displayStatements={[]}
        paginatedStatements={[]}
        gmailSyncSkeletonKeys={['local-upload-123-0']}
        allVisibleSelected={false}
        selectedCount={0}
        selectedStatementIds={[]}
        dateSortDirection="desc"
        page={1}
        totalPagesCount={1}
        rangeStart={0}
        rangeEnd={0}
        total={0}
        duplicateMetaById={new Map()}
        viewLabel="View"
        reviewDuplicateLabel="Review"
        labels={{
          merchant: 'Merchant',
          date: 'Date',
          amount: 'Amount',
          action: 'Action',
          receipt: 'Receipt',
          scanning: 'Scanning...',
          emptyTitle: 'No statements',
          emptyDescription: 'Upload one',
          paginationShown: 'Showing {from}-{to} of {count}',
          paginationPageOf: 'Page {page} of {count}',
        }}
        onToggleSelectAll={vi.fn()}
        onToggleSortDirection={vi.fn()}
        onToggleStatement={vi.fn()}
        onView={vi.fn()}
        onIconClick={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.queryByText('No statements')).toBeNull();
    expect(screen.getAllByTestId('gmail-sync-skeleton-row')).toHaveLength(1);
  });
});

describe('StatementsListTable columns', () => {
  it('renders desktop header and row from visible columns in order', () => {
    const { container } = renderTable([
      { id: 'date', label: 'Date', visible: true, order: 0 },
      { id: 'merchant', label: 'Merchant', visible: true, order: 1 },
      { id: 'amount', label: 'Amount', visible: false, order: 2 },
      { id: 'action', label: 'Action', visible: true, order: 3 },
    ]);

    const header = container.querySelector('.lumio-stmt-list-view__desktop-header');
    const table = container.querySelector('.lumio-stmt-list-view__table') as HTMLDivElement | null;
    const scroller = container.querySelector('.lumio-stmt-list-view__table-scroll');
    expect(header?.textContent).toContain('Date');
    expect(header?.textContent).toContain('Merchant');
    expect(header?.textContent).not.toContain('Amount');
    expect(scroller).toBeTruthy();
    expect(table?.style.minWidth).toMatch(/px$/);
    expect((header?.textContent || '').indexOf('Date')).toBeLessThan(
      (header?.textContent || '').indexOf('Merchant'),
    );

    const desktopRow = screen.getByTestId('statement-item-desktop-statement-1');
    expect(desktopRow.textContent).toContain('Kaspi');
    expect(desktopRow.textContent).not.toContain('1,200.00KZT');
    expect(desktopRow.querySelector('[data-testid="statement-view-icon"]')).toBeTruthy();
  });
});
