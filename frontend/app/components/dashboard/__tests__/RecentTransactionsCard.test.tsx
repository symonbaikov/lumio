// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../test-setup';
import { RecentTransactionsCard } from '../RecentTransactionsCard';

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
    title: value('Recent transactions'),
    viewAll: value('All transactions'),
    empty: value('No transactions this period'),
    uncategorized: value('Uncategorized'),
  }),
  useLocale: () => ({ locale: 'en' }),
}));

describe('RecentTransactionsCard', () => {
  it('shows the empty state and still renders the deep link when there are no transactions', () => {
    render(
      <RecentTransactionsCard
        transactions={[]}
        formatAmount={v => `$${v}`}
        viewAllHref="/statements/transactions?startDate=2026-03-01&endDate=2026-03-31"
      />,
    );

    expect(screen.getByText('No transactions this period')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /all transactions/i });
    expect(link.getAttribute('href')).toBe(
      '/statements/transactions?startDate=2026-03-01&endDate=2026-03-31',
    );
  });

  it('shows a signed amount and date/account line for each transaction', () => {
    render(
      <RecentTransactionsCard
        transactions={[
          {
            id: 'tx-1',
            description: 'Salary',
            amount: 150000,
            currency: 'KZT',
            date: '2026-03-10',
            account: 'Kaspi •••• 4821',
            categoryId: 'cat-1',
            categoryName: 'Salary',
            categoryColor: '#10b981',
            categoryIcon: null,
          },
          {
            id: 'tx-2',
            description: 'Grocery Store',
            amount: -5000,
            currency: 'KZT',
            date: '2026-03-09',
            account: 'Bank',
            categoryId: null,
            categoryName: null,
            categoryColor: '#898781',
            categoryIcon: null,
          },
        ]}
        formatAmount={v => (v < 0 ? `-$${Math.abs(v)}` : `$${v}`)}
        viewAllHref="/statements/transactions"
      />,
    );

    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('+$150000')).toBeInTheDocument();
    expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    expect(screen.getByText('-$5000')).toBeInTheDocument();
    expect(screen.getByText(/Kaspi •••• 4821/)).toBeInTheDocument();
  });
});
