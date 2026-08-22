import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebhookEvent } from '../../entities/webhook-subscription.entity';
import type {
  ImportCommittedEvent,
  ReceiptApprovedEvent,
  TransactionCreatedEvent,
} from '../notifications/events/notification-events';
import { WebhookDispatcherService } from './services/webhook-dispatcher.service';

@Injectable()
export class WebhookEventsListener {
  private readonly logger = new Logger(WebhookEventsListener.name);

  constructor(private readonly dispatcher: WebhookDispatcherService) {}

  @OnEvent('import.committed')
  async onImportCommitted(event: ImportCommittedEvent): Promise<void> {
    try {
      await this.dispatcher.dispatch(event.workspaceId, WebhookEvent.STATEMENT_PROCESSED, {
        event: WebhookEvent.STATEMENT_PROCESSED,
        workspaceId: event.workspaceId,
        statementId: event.statementId,
        transactionCount: event.transactionCount,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error('Failed to dispatch statement.processed webhook', err);
    }
  }

  @OnEvent('receipt.approved')
  async onReceiptApproved(event: ReceiptApprovedEvent): Promise<void> {
    try {
      await this.dispatcher.dispatch(event.workspaceId, WebhookEvent.RECEIPT_APPROVED, {
        event: WebhookEvent.RECEIPT_APPROVED,
        workspaceId: event.workspaceId,
        receiptId: event.receiptId,
        transactionId: event.transactionId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error('Failed to dispatch receipt.approved webhook', err);
    }
  }

  @OnEvent('transaction.created')
  async onTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    try {
      await this.dispatcher.dispatch(event.workspaceId, WebhookEvent.TRANSACTION_CREATED, {
        event: WebhookEvent.TRANSACTION_CREATED,
        workspaceId: event.workspaceId,
        transactionId: event.transactionId,
        amount: event.amount,
        currency: event.currency,
        transactionDate: event.transactionDate,
        counterpartyName: event.counterpartyName,
        transactionType: event.transactionType,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error('Failed to dispatch transaction.created webhook', err);
    }
  }
}
