import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  NotificationCategory,
  NotificationSeverity,
  NotificationType,
} from '../../entities/notification.entity';
import { EntityType } from '../../entities/audit-event.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PayablesService } from './payables.service';

@Injectable()
export class PayablesScheduler {
  private readonly logger = new Logger(PayablesScheduler.name);

  constructor(
    private readonly payablesService: PayablesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async processDailyPayables(): Promise<void> {
    try {
      const overduePayables = await this.payablesService.markOverduePayables();
      for (const payable of overduePayables) {
        try {
          await this.notificationsService.createForWorkspaceMembers({
            workspaceId: payable.workspaceId,
            type: NotificationType.PAYABLE_OVERDUE,
            category: NotificationCategory.WORKSPACE_ACTIVITY,
            severity: NotificationSeverity.WARN,
            messageKey: 'payable.overdue',
            messageParams: { vendor: payable.vendor },
            entityType: EntityType.PAYABLE,
            entityId: payable.id,
            meta: { payableId: payable.id },
          });
        } catch (error) {
          this.logger.error(
            `Failed overdue notification for payable ${payable.id}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      const dueSoonPayables = await this.payablesService.findDueSoonPayables(3);
      for (const payable of dueSoonPayables) {
        try {
          await this.notificationsService.createForWorkspaceMembers({
            workspaceId: payable.workspaceId,
            type: NotificationType.PAYABLE_DUE_SOON,
            category: NotificationCategory.WORKSPACE_ACTIVITY,
            severity: NotificationSeverity.INFO,
            messageKey: 'payable.due_soon',
            messageParams: { vendor: payable.vendor },
            entityType: EntityType.PAYABLE,
            entityId: payable.id,
            meta: { payableId: payable.id },
          });
          await this.payablesService.markDueSoonNotified(payable.id);
        } catch (error) {
          this.logger.error(
            `Failed due-soon notification for payable ${payable.id}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to process payables scheduler', error instanceof Error ? error.stack : undefined);
    }
  }
}
