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
      title: 'Загружена выписка',
      message: `${event.actorName} загрузил(а) выписку "${event.statementName}"`,
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
      title: 'Импорт завершен',
      message: `${event.actorName} импортировал(а) ${event.transactionCount} транзакций`,
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
        title: string;
        verb: string;
        severity: NotificationSeverity;
      }
    > = {
      created: {
        type: NotificationType.CATEGORY_CREATED,
        title: 'Создана категория',
        verb: 'создал(а)',
        severity: NotificationSeverity.INFO,
      },
      updated: {
        type: NotificationType.CATEGORY_UPDATED,
        title: 'Изменена категория',
        verb: 'изменил(а)',
        severity: NotificationSeverity.INFO,
      },
      deleted: {
        type: NotificationType.CATEGORY_DELETED,
        title: 'Удалена категория',
        verb: 'удалил(а)',
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
      title: config.title,
      message: `${event.actorName} ${config.verb} категорию "${event.categoryName}"`,
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
      title: 'Приглашен новый участник',
      message: `${event.actorName} пригласил(а) ${event.invitedEmail}`,
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
      title: 'Участник присоединился',
      message: `${event.memberName} присоединился(ась) к workspace`,
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
      title: 'Удалены данные',
      message: `${event.actorName} удалил(а) ${event.count} записей`,
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
      title: 'Изменены настройки workspace',
      message: `${event.actorName} обновил(а) настройки workspace`,
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
      title: 'Ошибка парсинга выписки',
      message: event.statementName
        ? `Не удалось обработать выписку "${event.statementName}"`
        : 'Не удалось обработать выписку',
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
      title: 'Ошибка импорта',
      message: event.statementName
        ? `Импорт выписки "${event.statementName}" завершился с ошибкой`
        : 'Импорт завершился с ошибкой',
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
      title: 'Транзакции без категории',
      message: `${event.count} транзакций требуют выбора категории`,
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
      title: 'Чек без категории',
      message: event.receiptName
        ? `Чек "${event.receiptName}" не имеет категории`
        : 'Найден чек без категории',
      entityType: 'receipt',
      entityId: event.receiptId ?? null,
    });
  }
}
