import { describe, expect, it } from 'vitest';
import { mapGmailReceiptsToStatements } from './gmail-receipt-mapping';

describe('mapGmailReceiptsToStatements', () => {
  it('skips receipts without amount', () => {
    const result = mapGmailReceiptsToStatements([
      {
        id: 'r-1',
        subject: 'Payment 1',
        sender: 'billing@example.com',
        receivedAt: '2026-02-01T00:00:00.000Z',
        status: 'draft',
        parsedData: {
          vendor: 'Example',
        },
      },
      {
        id: 'r-2',
        subject: 'Payment 2',
        sender: 'billing@example.com',
        receivedAt: '2026-02-01T00:00:00.000Z',
        status: 'draft',
        parsedData: {
          amount: 100,
          currency: 'USD',
          vendor: 'Example',
        },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r-2');
  });
});
