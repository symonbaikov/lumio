// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CryptoPortfolioCard } from './CryptoPortfolioCard';

const apiGet = vi.hoisted(() => vi.fn());

vi.mock('@/app/lib/api', () => ({ default: { get: apiGet } }));
vi.mock('@/app/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentWorkspace: { id: 'ws-1' } }),
}));
vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({ portfolio: 'Portfolio value' }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const summaryFor = (income: number, expense: number) => ({
  data: {
    currency: 'EUR',
    portfolioValue: 5532,
    income,
    expense,
    walletCount: 1,
    holdings: [{ asset: 'ETH', amount: '1', value: 5532 }],
  },
});

const format = (value: number) => `${value.toFixed(2)} €`;

describe('CryptoPortfolioCard', () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  it('asks for the dashboard month and shows what came in and went out', async () => {
    apiGet.mockResolvedValue(summaryFor(479.84, 18.23));

    render(<CryptoPortfolioCard formatAmount={format} month="2026-08" monthLabel="August 2026" />);

    expect(await screen.findByText('+479.84 €')).toBeTruthy();
    expect(screen.getByText('−18.23 €')).toBeTruthy();
    expect(screen.getByText('5532.00 €')).toBeTruthy();
    expect(apiGet).toHaveBeenCalledWith('/crypto/summary', { params: { month: '2026-08' } });
  });

  it('refetches when the month changes', async () => {
    apiGet.mockResolvedValueOnce(summaryFor(479.84, 18.23));
    apiGet.mockResolvedValueOnce(summaryFor(29.12, 59.88));

    const { rerender } = render(
      <CryptoPortfolioCard formatAmount={format} month="2026-08" monthLabel="August 2026" />,
    );
    await screen.findByText('+479.84 €');

    rerender(<CryptoPortfolioCard formatAmount={format} month="2026-07" monthLabel="July 2026" />);

    expect(await screen.findByText('+29.12 €')).toBeTruthy();
    await waitFor(() =>
      expect(apiGet).toHaveBeenLastCalledWith('/crypto/summary', { params: { month: '2026-07' } }),
    );
  });
});
