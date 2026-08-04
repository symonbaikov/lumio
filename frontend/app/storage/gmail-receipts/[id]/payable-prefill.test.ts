import { describe, expect, it } from 'vitest';

import { DEFAULT_CURRENCY } from '@/app/lib/format-money';
import { buildPayablePrefillFromReceipt } from './payable-prefill';

describe('buildPayablePrefillFromReceipt', () => {
  it('builds an invoice payable draft from edited receipt values', () => {
    const result = buildPayablePrefillFromReceipt({
      receipt: {
        subject: 'GitHub Receipt',
        receivedAt: '2026-02-27T00:00:00Z',
        parsedData: {
          amount: 17.61,
          currency: 'USD',
          vendor: 'GitHub',
          date: '2026-02-27',
          transactionType: 'expense',
        },
      },
      editedData: {
        amount: 22.5,
        currency: 'EUR',
        vendor: 'GitHub BV',
        date: '2026-02-28',
        lineItems: [
          { id: 'line-1', description: 'Subscription', amount: 10 },
          { id: 'line-2', description: 'Tax', amount: 12.5 },
        ],
      },
    });

    expect(result).toEqual({
      vendor: 'GitHub BV',
      amount: 22.5,
      currency: 'EUR',
      dueDate: '2026-02-28',
      source: 'invoice',
      comment: 'Created from Gmail receipt GitHub Receipt',
    });
  });

  it('falls back to receipt values and returns null for non-expense receipts', () => {
    expect(
      buildPayablePrefillFromReceipt({
        receipt: {
          subject: 'Stripe payout',
          receivedAt: '2026-02-27T00:00:00Z',
          parsedData: {
            amount: 100,
            currency: 'USD',
            vendor: 'Stripe',
            date: '2026-02-27',
            transactionType: 'income',
          },
        },
        editedData: { lineItems: [] },
      }),
    ).toBeNull();

    expect(
      buildPayablePrefillFromReceipt({
        receipt: {
          subject: 'OpenAI Invoice',
          receivedAt: '2026-03-01T15:30:00Z',
          parsedData: {
            amount: 49,
            currency: 'USD',
            vendor: 'OpenAI',
          },
        },
        editedData: { lineItems: [] },
      }),
    ).toEqual({
      vendor: 'OpenAI',
      amount: 49,
      currency: 'USD',
      dueDate: '2026-03-01',
      source: 'invoice',
      comment: 'Created from Gmail receipt OpenAI Invoice',
    });
  });

  it('uses the supplied workspace currency when neither the form nor the receipt has one', () => {
    const result = buildPayablePrefillFromReceipt({
      receipt: {
        subject: 'Unlabelled Invoice',
        receivedAt: '2026-03-05T09:00:00Z',
        parsedData: {
          amount: 75,
          vendor: 'Acme',
          transactionType: 'expense',
        },
      },
      editedData: { lineItems: [] },
      fallbackCurrency: 'GBP',
    });

    expect(result?.currency).toBe('GBP');
  });

  it('falls back to the default currency when no workspace currency is supplied', () => {
    const result = buildPayablePrefillFromReceipt({
      receipt: {
        subject: 'Unlabelled Invoice',
        receivedAt: '2026-03-05T09:00:00Z',
        parsedData: {
          amount: 75,
          vendor: 'Acme',
          transactionType: 'expense',
        },
      },
      editedData: { lineItems: [] },
    });

    expect(result?.currency).toBe(DEFAULT_CURRENCY);
  });
});
