import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  NotificationCategory,
  NotificationSeverity,
  NotificationType,
} from '../../entities/notification.entity';
import type {
  CategoryChangedEvent,
  DataDeletedEvent,
  ImportCommittedEvent,
  ImportFailedEvent,
  MemberInvitedEvent,
  MemberJoinedEvent,
  ParsingErrorEvent,
  ReceiptUncategorizedEvent,
  StatementUploadedEvent,
  TransactionsUncategorizedEvent,
  WorkspaceUpdatedEvent,
} from './events/notification-events';
import type { NotificationMessageKey } from './notification-translations';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationEventsListener {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('statement.uploaded')
  async onStatementUploaded(event: StatementUploadedEvent): Promise<void> {
    await this.notificationsService.createForWorkspaceMembers({
      workspaceId: event.workspaceId,
      actorId: event.actorId,
      actorName: event.actorName,
      type: NotificationType.STATEMENT_UPLOADED,
      category: NotificationCategory.WORKSPACE_ACTIVITY,
      severity: NotificationSeverity.INFO,
      messageKey: 'statement.uploaded',
      messageParams: { actorName: event.actorName, statementName: event.statementName },
      entityType: 'statement',
      entityId: event.statementId,
      meta: { bankName: event.bankName ?? null },
    });
  }

  @OnEvent('import.committed')
  async onImportCommitted(event: ImportCommittedEvent): Promise<void> {
    await this.notificationsService.createForWorkspaceMembers({
      workspaceId: event.workspaceId,
      actorId: event.actorId,
      actorName: event.actorName,
      type: NotificationType.IMPORT_COMMITTED,
      category: NotificationCategory.WORKSPACE_ACTIVITY,
      severity: NotificationSeverity.INFO,
      messageKey: 'import.committed',
      messageParams: { actorName: event.actorName, transactionCount: event.transactionCount },
      entityType: 'statement',
      entityId: event.statementId,
      meta: { transactionCount: event.transactionCount },
    });
  }

  @OnEvent('category.changed')
  async onCategoryChanged(event: CategoryChangedEvent): Promise<void> {
    const actionConfig: Record<
      CategoryChangedEvent['action'],
      {
        type: NotificationType;
        messageKey: NotificationMessageKey;
        severity: NotificationSeverity;
      }
    > = {
      created: {
        type: NotificationType.CATEGORY_CREATED,
        messageKey: 'category.created',
        severity: NotificationSeverity.INFO,
      },
      updated: {
        type: NotificationType.CATEGORY_UPDATED,
        messageKey: 'category.updated',
        severity: NotificationSeverity.INFO,
      },
      deleted: {
        type: NotificationType.CATEGORY_DELETED,
        messageKey: 'category.deleted',
        severity: NotificationSeverity.WARN,
      },
    };

    const config = actionConfig[event.action];
    await this.notificationsService.createForWorkspaceMembers({
      workspaceId: event.workspaceId,
      actorId: event.actorId,
      actorName: event.actorName,
      type: config.type,
      category: NotificationCategory.WORKSPACE_ACTIVITY,
      severity: config.severity,
      messageKey: config.messageKey,
      messageParams: { actorName: event.actorName, categoryName: event.categoryName },
      entityType: 'category',
      entityId: event.categoryId,
    });
  }

  @OnEvent('member.invited')
  async onMemberInvited(event: MemberInvitedEvent): Promise<void> {
    await this.notificationsService.createForWorkspaceMembers({
      workspaceId: event.workspaceId,
      actorId: event.actorId,
      actorName: event.actorName,
      type: NotificationType.MEMBER_INVITED,
      category: NotificationCategory.WORKSPACE_ACTIVITY,
      severity: NotificationSeverity.INFO,
      messageKey: 'member.invited',
      messageParams: { actorName: event.actorName, invitedEmail: event.invitedEmail },
      meta: {
        invitedEmail: event.invitedEmail,
        role: event.role,
      },
    });
  }

  @OnEvent('member.joined')
  async onMemberJoined(event: MemberJoinedEvent): Promise<void> {
    await this.notificationsService.createForWorkspaceMembers({
      workspaceId: event.workspaceId,
      actorId: event.memberId,
      actorName: event.memberName,
      type: NotificationType.MEMBER_JOINED,
      category: NotificationCategory.WORKSPACE_ACTIVITY,
      severity: NotificationSeverity.INFO,
      messageKey: 'member.joined',
      messageParams: { memberName: event.memberName },
    });
  }

  @OnEvent('data.deleted')
  async onDataDeleted(event: DataDeletedEvent): Promise<void> {
    await this.notificationsService.createForWorkspaceMembers({
      workspaceId: event.workspaceId,
      actorId: event.actorId,
      actorName: event.actorName,
      type: NotificationType.DATA_DELETED,
      category: NotificationCategory.WORKSPACE_ACTIVITY,
      severity: NotificationSeverity.WARN,
      messageKey: 'data.deleted',
      messageParams: { actorName: event.actorName, count: event.count },
      entityType: event.entityType,
      meta: {
        count: event.count,
        entityLabel: event.entityLabel ?? null,
      },
    });
  }

  @OnEvent('workspace.updated')
  async onWorkspaceUpdated(event: WorkspaceUpdatedEvent): Promise<void> {
    await this.notificationsService.createForWorkspaceMembers({
      workspaceId: event.workspaceId,
      actorId: event.actorId,
      actorName: event.actorName,
      type: NotificationType.WORKSPACE_UPDATED,
      category: NotificationCategory.WORKSPACE_ACTIVITY,
      severity: NotificationSeverity.INFO,
      messageKey: 'workspace.updated',
      messageParams: { actorName: event.actorName },
      entityType: 'workspace',
      entityId: event.workspaceId,
      meta: {
        changedFields: event.changedFields,
      },
    });
  }

  @OnEvent('parsing.error')
  async onParsingError(event: ParsingErrorEvent): Promise<void> {
    await this.notificationsService.create({
      recipientId: event.userId,
      workspaceId: event.workspaceId,
      type: NotificationType.PARSING_ERROR,
      category: NotificationCategory.SYSTEM,
      severity: NotificationSeverity.ERROR,
      messageKey: event.statementName ? 'parsing.error.named' : 'parsing.error',
      messageParams: { statementName: event.statementName ?? '' },
      entityType: 'statement',
      entityId: event.statementId ?? null,
      meta: {
        errorMessage: event.errorMessage,
      },
    });
  }

  @OnEvent('import.failed')
  async onImportFailed(event: ImportFailedEvent): Promise<void> {
    await this.notificationsService.create({
      recipientId: event.userId,
      workspaceId: event.workspaceId,
      type: NotificationType.IMPORT_FAILED,
      category: NotificationCategory.SYSTEM,
      severity: NotificationSeverity.ERROR,
      messageKey: event.statementName ? 'import.failed.named' : 'import.failed',
      messageParams: { statementName: event.statementName ?? '' },
      entityType: 'statement',
      entityId: event.statementId ?? null,
      meta: {
        errorMessage: event.errorMessage,
      },
    });
  }

  @OnEvent('transactions.uncategorized')
  async onTransactionsUncategorized(event: TransactionsUncategorizedEvent): Promise<void> {
    await this.notificationsService.create({
      recipientId: event.userId,
      workspaceId: event.workspaceId,
      type: NotificationType.TRANSACTION_UNCATEGORIZED,
      category: NotificationCategory.SYSTEM,
      severity: NotificationSeverity.WARN,
      messageKey: 'transactions.uncategorized',
      messageParams: { count: event.count },
      entityType: 'statement',
      entityId: event.statementId ?? null,
      meta: {
        count: event.count,
      },
    });
  }

  @OnEvent('receipt.uncategorized')
  async onReceiptUncategorized(event: ReceiptUncategorizedEvent): Promise<void> {
    await this.notificationsService.create({
      recipientId: event.userId,
      workspaceId: event.workspaceId,
      type: NotificationType.RECEIPT_UNCATEGORIZED,
      category: NotificationCategory.SYSTEM,
      severity: NotificationSeverity.WARN,
      messageKey: event.receiptName ? 'receipt.uncategorized.named' : 'receipt.uncategorized',
      messageParams: { receiptName: event.receiptName ?? '' },
      entityType: 'receipt',
      entityId: event.receiptId ?? null,
    });
  }
}
