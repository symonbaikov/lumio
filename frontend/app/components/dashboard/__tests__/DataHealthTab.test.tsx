// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../test-setup';
import { DataHealthTab } from '../DataHealthTab';

type DataHealthTabData = React.ComponentProps<typeof DataHealthTab>['data'];

describe('DataHealthTab', () => {
  it('renders data quality metric cards without legacy translucent panel classes', () => {
    render(
      <DataHealthTab
        data={{
          dataHealth: {
            uncategorizedTransactions: 2,
            statementsWithErrors: 1,
            statementsPendingReview: 3,
            statementsPendingSubmit: 2,
            receiptsPendingReview: 4,
            unapprovedCash: 0,
            lastUploadDate: '2025-05-31T00:00:00.000Z',
            parsingWarnings: 1,
          },
        } as DataHealthTabData}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    const heading = screen.getByText('DATA QUALITY METRICS');
    const metricsSection = heading.parentElement;

    expect(screen.getByText('UNCATEGORIZED')).toBeInTheDocument();
    expect(screen.getByText('STATEMENT ERRORS')).toBeInTheDocument();
    expect(screen.getByText('RECEIPTS PENDING')).toBeInTheDocument();
    expect(metricsSection?.innerHTML).not.toContain('bg-white/40');
    expect(metricsSection?.innerHTML).not.toContain('border-white/60');
  });

  it('renders receipts pending metric and action link', () => {
    render(
      <DataHealthTab
        data={{
          dataHealth: {
            uncategorizedTransactions: 0,
            statementsWithErrors: 0,
            statementsPendingReview: 0,
            statementsPendingSubmit: 0,
            receiptsPendingReview: 2,
            unapprovedCash: 0,
            lastUploadDate: '2025-05-31T00:00:00.000Z',
            parsingWarnings: 0,
          },
        } as DataHealthTabData}
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    expect(screen.getByText('RECEIPTS PENDING')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review 2 receipts/i })).toBeInTheDocument();
  });
});
