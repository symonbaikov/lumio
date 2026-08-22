// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();

vi.mock('@/app/lib/api', () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { TaxReturnView } from './TaxReturnView';

const TOTALS = {
  outputTax: 1200,
  inputTax: 500,
  netPayable: 700,
  currency: 'KZT',
  lines: [
    {
      transactionId: 'a',
      date: '2026-02-10',
      counterparty: 'Magnum',
      direction: 'input' as const,
      currency: 'KZT',
      taxAmount: 500,
      netAmount: 4500,
      exchangeRate: 1,
      taxAmountConverted: 500,
    },
    {
      transactionId: 'b',
      date: '2026-02-11',
      counterparty: 'Polish supplier',
      direction: 'reverse_charge' as const,
      currency: 'EUR',
      taxAmount: 190,
      netAmount: 1000,
      exchangeRate: 500,
      taxAmountConverted: 95000,
    },
  ],
};

function mockApi({ status = 'draft', totals = TOTALS, threshold = null as unknown } = {}) {
  get.mockImplementation(async (url: string) => {
    if (url.startsWith('/tax/returns/period')) {
      return { data: { id: 'ret-1', status, currency: 'KZT' } };
    }
    if (url.startsWith('/tax/returns/preview')) {
      return { data: totals };
    }
    if (url === '/tax/settings/threshold') {
      return { data: threshold };
    }
    throw new Error(`unexpected ${url}`);
  });
}

describe('TaxReturnView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockResolvedValue({ data: {} });
  });

  it('shows the three headline figures', async () => {
    mockApi();
    render(<TaxReturnView />);

    expect(await screen.findByText('Output tax')).toBeInTheDocument();
    expect(screen.getByText('Input tax')).toBeInTheDocument();
    expect(screen.getByText('Payable')).toBeInTheDocument();
  });

  it('labels a negative net as reclaimable rather than owed', async () => {
    mockApi({ totals: { ...TOTALS, netPayable: -300 } });
    render(<TaxReturnView />);

    expect(await screen.findByText('Reclaimable')).toBeInTheDocument();
    expect(screen.queryByText('Payable')).not.toBeInTheDocument();
  });

  it('lists the transactions behind the figures', async () => {
    mockApi();
    render(<TaxReturnView />);

    expect(await screen.findByText('Magnum')).toBeInTheDocument();
    // A reverse-charge line is named as such, since it appears on both sides.
    expect(screen.getByText('Reverse charge')).toBeInTheDocument();
  });

  it('files the period and reloads', async () => {
    mockApi();
    render(<TaxReturnView />);

    await userEvent.click(await screen.findByRole('button', { name: 'File and lock' }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/tax/returns/file', {
        periodStart: expect.any(String),
        periodEnd: expect.any(String),
      }),
    );
  });

  it('offers reopening once filed, and says the rows are locked', async () => {
    mockApi({ status: 'filed' });
    render(<TaxReturnView />);

    expect(await screen.findByRole('button', { name: 'Reopen period' })).toBeInTheDocument();
    expect(screen.getByText(/transactions behind it are locked/)).toBeInTheDocument();
  });

  it('reopens the period', async () => {
    mockApi({ status: 'filed' });
    render(<TaxReturnView />);

    await userEvent.click(await screen.findByRole('button', { name: 'Reopen period' }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/tax/returns/reopen', expect.any(Object)),
    );
  });

  it('points at the missing setup step when the return cannot be built', async () => {
    get.mockRejectedValue(new Error('no jurisdiction'));
    render(<TaxReturnView />);

    expect(await screen.findByText(/tax jurisdiction/)).toBeInTheDocument();
  });

  it('shows the threshold gauge only when there is a threshold', async () => {
    mockApi({
      threshold: {
        threshold: 90000,
        turnover: 72000,
        currency: 'GBP',
        percentUsed: 80,
        periodStart: '2025-06-16',
        periodEnd: '2026-06-15',
      },
    });
    render(<TaxReturnView />);

    expect(await screen.findByText('Registration threshold')).toBeInTheDocument();
    expect(screen.getByText(/80%/)).toBeInTheDocument();
  });

  it('omits the gauge when the jurisdiction publishes none', async () => {
    mockApi({ threshold: { threshold: null, turnover: 0, currency: 'KZT', percentUsed: 0 } });
    render(<TaxReturnView />);

    await screen.findByText('Output tax');
    expect(screen.queryByText('Registration threshold')).not.toBeInTheDocument();
  });

  it('says so when nothing in the period was taxed', async () => {
    mockApi({ totals: { ...TOTALS, lines: [] } });
    render(<TaxReturnView />);

    expect(await screen.findByText(/No taxed transactions/)).toBeInTheDocument();
  });

  it('always carries the advice disclaimer', async () => {
    mockApi();
    render(<TaxReturnView />);

    expect(await screen.findByText(/not a substitute for advice/)).toBeInTheDocument();
  });
});
