import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, type Repository } from 'typeorm';
import { NotificationPreference } from '../../entities/notification-preference.entity';
import {
  Notification,
  NotificationCategory,
  NotificationSeverity,
  NotificationType,
} from '../../entities/notification.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import type { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

type NotificationPreferenceKey =
  | 'statementUploaded'
  | 'importCommitted'
  | 'categoryChanges'
  | 'memberActivity'
  | 'dataDeleted'
  | 'workspaceUpdated'
  | 'parsingErrors'
  | 'importFailures'
  | 'uncategorizedItems';

const NOTIFICATION_PREFERENCE_MAP: Record<NotificationType, NotificationPreferenceKey> = {
  [NotificationType.STATEMENT_UPLOADED]: 'statementUploaded',
  [NotificationType.IMPORT_COMMITTED]: 'importCommitted',
  [NotificationType.CATEGORY_CREATED]: 'categoryChanges',
  [NotificationType.CATEGORY_UPDATED]: 'categoryChanges',
  [NotificationType.CATEGORY_DELETED]: 'categoryChanges',
  [NotificationType.MEMBER_INVITED]: 'memberActivity',
  [NotificationType.MEMBER_JOINED]: 'memberActivity',
  [NotificationType.DATA_DELETED]: 'dataDeleted',
  [NotificationType.WORKSPACE_UPDATED]: 'workspaceUpdated',
  [NotificationType.PARSING_ERROR]: 'parsingErrors',
  [NotificationType.IMPORT_FAILED]: 'importFailures',
  [NotificationType.TRANSACTION_UNCATEGORIZED]: 'uncategorizedItems',
  [NotificationType.RECEIPT_UNCATEGORIZED]: 'uncategorizedItems',
  [NotificationType.PAYABLE_DUE_SOON]: 'workspaceUpdated',
  [NotificationType.PAYABLE_OVERDUE]: 'workspaceUpdated',
  [NotificationType.PAYABLE_MARKED_PAID]: 'workspaceUpdated',
};

export interface CreateNotificationPayload {
  recipientId: string;
  workspaceId?: string | null;
  type: NotificationType;
  category: NotificationCategory;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  actorId?: string | null;
  actorName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface WorkspaceNotificationPayload {
  workspaceId: string;
  actorId?: string | null;
  type: NotificationType;
  category: NotificationCategory;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  actorName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(payload: CreateNotificationPayload): Promise<Notification | null> {
    const enabled = await this.isTypeEnabled(payload.recipientId, payload.type);
    if (!enabled) {
      return null;
    }

    const notification = this.notificationRepository.create({
      recipientId: payload.recipientId,
      workspaceId: payload.workspaceId ?? null,
      type: payload.type,
      category: payload.category,
      severity: payload.severity ?? NotificationSeverity.INFO,
      title: payload.title,
      message: payload.message,
      actorId: payload.actorId ?? null,
      actorName: payload.actorName ?? null,
      entityType: payload.entityType ?? null,
      entityId: payload.entityId ?? null,
      meta: payload.meta ?? null,
    });

    const saved = await this.notificationRepository.save(notification);
    this.eventEmitter.emit('notification.created', saved);
    return saved;
  }

  async createForWorkspaceMembers(payload: WorkspaceNotificationPayload): Promise<number> {
    const members = await this.workspaceMemberRepository.find({
      where: { workspaceId: payload.workspaceId },
      select: ['userId'],
    });

    const recipientIds = members
      .map(member => member.userId)
      .filter(userId => !payload.actorId || userId !== payload.actorId);

    if (recipientIds.length === 0) {
      return 0;
    }

    const results = await Promise.all(
      recipientIds.map(recipientId =>
        this.create({
          recipientId,
          workspaceId: payload.workspaceId,
          type: payload.type,
          category: payload.category,
          severity: payload.severity,
          title: payload.title,
          message: payload.message,
          actorId: payload.actorId ?? null,
          actorName: payload.actorName ?? null,
          entityType: payload.entityType ?? null,
          entityId: payload.entityId ?? null,
          meta: payload.meta ?? null,
        }).catch(error => {
          this.logger.error(
            `Failed to create notification for user ${recipientId}`,
            error instanceof Error ? error.stack : undefined,
          );
          return null;
        }),
      ),
    );

    return results.filter(Boolean).length;
  }

  async findByRecipient(
    recipientId: string,
    workspaceId?: string,
    limit = 30,
    offset = 0,
  ): Promise<{ items: Notification[]; total: number; limit: number; offset: number }> {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const normalizedOffset = Math.max(offset, 0);

    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.recipientId = :recipientId', { recipientId })
      .orderBy('notification.createdAt', 'DESC')
      .take(normalizedLimit)
      .skip(normalizedOffset);

    if (workspaceId) {
      qb.andWhere('(notification.workspaceId = :workspaceId OR notification.workspaceId IS NULL)', {
        workspaceId,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit: normalizedLimit, offset: normalizedOffset };
  }

  async getUnreadCount(recipientId: string, workspaceId?: string): Promise<number> {
    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.recipientId = :recipientId', { recipientId })
      .andWhere('notification.isRead = false');

    if (workspaceId) {
      qb.andWhere('(notification.workspaceId = :workspaceId OR notification.workspaceId IS NULL)', {
        workspaceId,
      });
    }

    return qb.getCount();
  }

  async markAsRead(recipientId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const result = await this.notificationRepository.update(
      {
        recipientId,
        id: In(ids),
        isRead: false,
      },
      {
        isRead: true,
      },
    );

    return result.affected ?? 0;
  }

  async markAllAsRead(recipientId: string, workspaceId?: string): Promise<number> {
    const qb = this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('recipient_id = :recipientId', { recipientId })
      .andWhere('is_read = false');

    if (workspaceId) {
      qb.andWhere('(workspace_id = :workspaceId OR workspace_id IS NULL)', {
        workspaceId,
      });
    }

    const result = await qb.execute();
    return result.affected ?? 0;
  }

  async getPreferences(userId: string): Promise<NotificationPreference> {
    const existing = await this.preferenceRepository.findOne({ where: { userId } });
    if (existing) {
      return existing;
    }

    const created = this.preferenceRepository.create({ userId });
    return this.preferenceRepository.save(created);
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreference> {
    const preferences = await this.getPreferences(userId);
    Object.assign(preferences, dto);
    return this.preferenceRepository.save(preferences);
  }

  async isTypeEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const preferenceKey = NOTIFICATION_PREFERENCE_MAP[type];
    if (!preferenceKey) {
      return true;
    }

    const preferences = await this.getPreferences(userId);
    return preferences[preferenceKey];
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldNotifications(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const result = await this.notificationRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    if ((result.affected ?? 0) > 0) {
      this.logger.log(`Deleted ${result.affected} old notifications`);
    }
  }
}
