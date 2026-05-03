import { WebhookEventsListener } from '../../../../src/modules/webhooks/webhook-events.listener';
import { WebhookEvent } from '../../../../src/entities/webhook-subscription.entity';

describe('WebhookEventsListener', () => {
  let listener: WebhookEventsListener;
  const mockDispatcher = { dispatch: jest.fn() };
  const mockLogger = { error: jest.fn() };

  beforeEach(() => {
    listener = new WebhookEventsListener(mockDispatcher as any);
    (listener as any).logger = mockLogger;
    mockDispatcher.dispatch.mockResolvedValue(undefined);
    jest.clearAllMocks();
  });

  it('maps import.committed to statement.processed', async () => {
    await listener.onImportCommitted({
      workspaceId: 'ws-1',
      actorId: 'u-1',
      actorName: 'Alice',
      transactionCount: 5,
    });
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
      'ws-1',
      WebhookEvent.STATEMENT_PROCESSED,
      expect.objectContaining({
        event: WebhookEvent.STATEMENT_PROCESSED,
        transactionCount: 5,
      }),
    );
  });

  it('maps receipt.approved to receipt.approved event', async () => {
    await listener.onReceiptApproved({ workspaceId: 'ws-1', receiptId: 'r-1', transactionId: 't-1' });
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
      'ws-1',
      WebhookEvent.RECEIPT_APPROVED,
      expect.objectContaining({ receiptId: 'r-1' }),
    );
  });

  it('maps transaction.created to transaction.created event', async () => {
    await listener.onTransactionCreated({
      workspaceId: 'ws-1',
      transactionId: 'tx-1',
      amount: 100,
      currency: 'USD',
      transactionDate: new Date('2024-01-01'),
      counterpartyName: 'ACME',
      transactionType: 'expense',
    });
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
      'ws-1',
      WebhookEvent.TRANSACTION_CREATED,
      expect.objectContaining({ transactionId: 'tx-1', amount: 100 }),
    );
  });

  it('catches and logs errors instead of rethrowing', async () => {
    mockDispatcher.dispatch.mockRejectedValue(new Error('DB down'));
    await expect(
      listener.onImportCommitted({ workspaceId: 'ws-1', actorId: 'u-1', actorName: 'Alice', transactionCount: 1 }),
    ).resolves.not.toThrow();
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
