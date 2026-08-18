// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../test-setup';
import { DataHealthTab } from '../DataHealthTab';

type DataHealthTabData = React.ComponentProps<typeof DataHealthTab>['data'];

// Mirrors react-intlayer's renderIntlayerNode: a Proxy over a rendered
// Fragment whose `.value` is intercepted to return the plain string, so the
// mock is usable both as a JSX child and via `.value` string access.
const value = (v: string) =>
  // biome-ignore lint/complexity/noUselessFragments: Proxy needs an object target — a bare string can't be proxied
  new Proxy(<>{v}</>, {
    get(target, prop, receiver) {
      if (prop === 'value') return v;
      return Reflect.get(target, prop, receiver);
    },
  });

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    uploadParse: value('Upload / Parse'),
    reviewQueue: value('Review Queue ({count})'),
    exportButton: value('Export'),
    dataQualityMetrics: value('DATA QUALITY METRICS'),
    uncategorizedLabel: value('Uncategorized'),
    statementErrorsLabel: value('Statement errors'),
    pendingReviewLabel: value('Pending review'),
    receiptsPendingLabel: value('Receipts pending'),
    parsingWarningsLabel: value('Parsing warnings'),
    allGood: value('All good'),
    metricNeedsAttention: value('{value} need attention'),
    lastUpload: value('Last upload'),
    relativeToday: value('Today'),
    relativeYesterday: value('Yesterday'),
    relativeDaysAgo: value('{n} days ago'),
    relativeOneWeekAgo: value('1 week ago'),
    relativeWeeksAgo: value('{n} weeks ago'),
    relativeOneMonthAgo: value('1 month ago'),
    relativeMonthsAgo: value('{n} months ago'),
    noDataYet: value('No data yet'),
    uploadFirstStatement: value('Upload your first statement →'),
    unapprovedCash: value('Unapproved cash'),
    allCashApproved: value('ALL CASH APPROVED'),
    reviewApproveCash: value('Review & approve cash →'),
    actionRequired: value('Action required'),
    quickLinkUncategorized: value('Review {count} uncategorized transactions'),
    quickLinkStatementErrors: value('Fix {count} statement errors'),
    quickLinkPendingStatements: value('Review {count} pending statements'),
    quickLinkReceipts: value('Review {count} receipts'),
  }),
  useLocale: () => ({ locale: 'en' }),
}));

describe('DataHealthTab', () => {
  it('uses dark-safe metric card surfaces instead of translucent white panels', () => {
    render(
      <DataHealthTab
        data={
          {
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
          } as DataHealthTabData
        }
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    const heading = screen.getByText('DATA QUALITY METRICS');
    const metricCard = heading.parentElement?.querySelector('[class*="dark:bg-card"]');

    expect(metricCard).toBeInTheDocument();
    expect(metricCard?.className).toContain('dark:bg-card');
    expect(metricCard?.className).toContain('dark:border-border');
    expect(metricCard?.className).not.toContain('bg-white/40');
    expect(metricCard?.className).not.toContain('border-white/60');
  });

  it('renders receipts pending metric and action link', () => {
    render(
      <DataHealthTab
        data={
          {
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
          } as DataHealthTabData
        }
        formatAmount={value => String(value)}
        range="30d"
        isLoading={false}
      />,
    );

    expect(screen.getByText(/receipts pending/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review 2 receipts/i })).toBeInTheDocument();
  });
});
