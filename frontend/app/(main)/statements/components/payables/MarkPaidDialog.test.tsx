// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Payable } from '@/app/lib/payables-api';
import { renderWithQuery } from '@/app/test/query-wrapper';
import { MarkPaidDialog } from './MarkPaidDialog';

const apiMocks = vi.hoisted(() => ({
  paymentCandidates: vi.fn(),
  apiQuery: vi.fn(),
}));

vi.mock('@/app/lib/payables-api', () => ({
  payablesApi: { paymentCandidates: apiMocks.paymentCandidates },
}));

vi.mock('@/app/lib/query-fn', () => ({
  apiQuery: apiMocks.apiQuery,
}));

vi.mock('@/app/hooks/useWorkspaceId', () => ({
  useWorkspaceId: () => 'workspace-1',
}));

// Every label reads as its own key, so the test finds controls by key.
vi.mock('@/app/i18n', () => ({
  useIntlayer: () =>
    new Proxy({}, { get: (_target, key) => ({ value: String(key) }) }) as Record<
      string,
      { value: string }
    >,
  useLocale: () => ({ locale: 'en' }),
}));

const payable = {
  id: 'payable-1',
  direction: 'payable',
  vendor: 'Acme',
  amount: '120.00',
  currency: 'eur',
} as Payable;

const candidate = (id: string, vendorMatch = false) => ({
  id,
  transactionDate: '2026-09-20',
  amount: '120.00',
  currency: 'EUR',
  counterpartyName: `Payee ${id}`,
  paymentPurpose: 'Invoice',
  vendorMatch,
});

function renderDialog() {
  const onConfirm = vi.fn();
  renderWithQuery(
    <MarkPaidDialog payable={payable} submitting={false} onClose={vi.fn()} onConfirm={onConfirm} />,
  );
  return onConfirm;
}

describe('MarkPaidDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.apiQuery.mockImplementation(async ({ url }: { url: string }) =>
      url === '/wallets'
        ? [
            { id: 'wallet-usd', name: 'Dollars', currency: 'USD' },
            { id: 'wallet-eur', name: 'Till', currency: 'EUR' },
          ]
        : [
            { id: 'cat-in', name: 'Sales', type: 'income' },
            { id: 'cat-out', name: 'Services', type: 'expense' },
          ],
    );
  });

  it('opens on the matching bank transactions and links the chosen one', async () => {
    apiMocks.paymentCandidates.mockResolvedValue([candidate('tx-1', true), candidate('tx-2')]);
    const onConfirm = renderDialog();

    expect(await screen.findByText('Payee tx-1 — Invoice')).toBeInTheDocument();
    expect(screen.getByText('vendorMatch')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Payee tx-2/));
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

    expect(onConfirm).toHaveBeenCalledWith(payable, { linkedTransactionId: 'tx-2' });
  });

  it('records a cash payment from a wallet in the bill currency', async () => {
    apiMocks.paymentCandidates.mockResolvedValue([]);
    const onConfirm = renderDialog();

    fireEvent.click(await screen.findByRole('button', { name: 'modeCash' }));
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Till' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('option', { name: 'Dollars' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Sales' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('noCategory'), { target: { value: 'cat-out' } });
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

    expect(onConfirm).toHaveBeenCalledWith(payable, {
      payFromWalletId: 'wallet-eur',
      paidOn: new Date().toISOString().slice(0, 10),
      categoryId: 'cat-out',
    });
  });

  it('falls back to a plain status change when nothing matches', async () => {
    apiMocks.paymentCandidates.mockResolvedValue([]);
    const onConfirm = renderDialog();

    expect(await screen.findByText('plainHint')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

    expect(onConfirm).toHaveBeenCalledWith(payable, {});
  });
});
