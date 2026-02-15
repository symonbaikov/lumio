# Notifications System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Реализовать систему in-app уведомлений с real-time доставкой через WebSocket (Socket.io), чтобы пользователи получали уведомления о действиях других участников workspace и о системных событиях (ошибки парсинга, неклассифицированные транзакции).

**Architecture:** Event-driven подход с NestJS EventEmitter для генерации событий внутри бэкенда, сохранение уведомлений в PostgreSQL, и push-доставка через Socket.io Gateway. На фронтенде — dropdown-панель из колокольчика с badge-счётчиком непрочитанных, страница настроек `/settings/notifications` для управления предпочтениями. Поддержка desktop и mobile.

**Tech Stack:** `@nestjs/event-emitter`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `socket.io-client`, TypeORM (PostgreSQL), существующий React/Next.js + Radix UI стек.

---

## Обзор типов уведомлений

### Workspace-действия (от других участников)
| Тип | Описание | Severity |
|-----|----------|----------|
| `statement.uploaded` | Участник загрузил банковскую выписку | info |
| `import.committed` | Участник завершил импорт транзакций | info |
| `category.created` | Создана новая категория | info |
| `category.updated` | Категория изменена | info |
| `category.deleted` | Категория удалена | warn |
| `member.invited` | Приглашён новый участник | info |
| `member.joined` | Новый участник принял приглашение | info |
| `data.deleted` | Удалены транзакции/выписки/данные | warn |
| `workspace.updated` | Изменены настройки workspace | info |

### Системные уведомления
| Тип | Описание | Severity |
|-----|----------|----------|
| `parsing.error` | Ошибка парсинга выписки | error |
| `import.failed` | Импорт транзакций завершился с ошибкой | error |
| `transaction.uncategorized` | Транзакции без категории (массово, после импорта) | warn |
| `receipt.uncategorized` | Чеки без указанной категории | warn |

---

## Task 1: Установка зависимостей

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`

**Step 1: Установить backend-зависимости**

```bash
cd backend && npm install @nestjs/event-emitter @nestjs/websockets @nestjs/platform-socket.io socket.io
```

Пакеты:
- `@nestjs/event-emitter` — внутренний event bus для генерации событий между модулями
- `@nestjs/websockets` + `@nestjs/platform-socket.io` — WebSocket Gateway
- `socket.io` — сервер Socket.io

**Step 2: Установить frontend-зависимость**

```bash
cd frontend && npm install socket.io-client
```

**Step 3: Зарегистрировать EventEmitterModule в AppModule**

В `backend/src/app.module.ts` добавить:

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    // ... остальные imports
  ],
})
```

**Step 4: Commit**

```bash
git add -A && git commit -m "chore(deps): add socket.io and event-emitter packages for notifications"
```

---

## Task 2: Notification Entity и миграция

**Files:**
- Create: `backend/src/entities/notification.entity.ts`
- Create: `backend/src/entities/notification-preference.entity.ts`
- Modify: `backend/src/entities/index.ts`
- Create: `backend/src/migrations/{timestamp}-CreateNotificationTables.ts`

**Step 1: Создать entity Notification**

Файл: `backend/src/entities/notification.entity.ts`

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

export enum NotificationType {
  // Workspace actions
  STATEMENT_UPLOADED = 'statement.uploaded',
  IMPORT_COMMITTED = 'import.committed',
  CATEGORY_CREATED = 'category.created',
  CATEGORY_UPDATED = 'category.updated',
  CATEGORY_DELETED = 'category.deleted',
  MEMBER_INVITED = 'member.invited',
  MEMBER_JOINED = 'member.joined',
  DATA_DELETED = 'data.deleted',
  WORKSPACE_UPDATED = 'workspace.updated',
  // System notifications
  PARSING_ERROR = 'parsing.error',
  IMPORT_FAILED = 'import.failed',
  TRANSACTION_UNCATEGORIZED = 'transaction.uncategorized',
  RECEIPT_UNCATEGORIZED = 'receipt.uncategorized',
}

export enum NotificationSeverity {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export enum NotificationCategory {
  WORKSPACE_ACTIVITY = 'workspace_activity',
  SYSTEM = 'system',
}

@Entity('notifications')
@Index('IDX_notifications_recipient_read', ['recipientId', 'isRead', 'createdAt'])
@Index('IDX_notifications_workspace_created', ['workspaceId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @ManyToOne(() => Workspace, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace | null;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string | null;

  @Column({ name: 'type', type: 'varchar', length: 64 })
  type: NotificationType;

  @Column({ name: 'category', type: 'varchar', length: 32 })
  category: NotificationCategory;

  @Column({ name: 'severity', type: 'varchar', length: 16, default: 'info' })
  severity: NotificationSeverity;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_name', type: 'varchar', length: 255, nullable: true })
  actorName: string | null;

  @Column({ name: 'entity_type', type: 'varchar', length: 64, nullable: true })
  entityType: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ name: 'meta', type: 'jsonb', nullable: true })
  meta: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

**Step 2: Создать entity NotificationPreference**

Файл: `backend/src/entities/notification-preference.entity.ts`

```typescript
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notification_preferences')
@Unique('UQ_notification_preferences_user', ['userId'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  // Workspace activity toggles
  @Column({ name: 'statement_uploaded', type: 'boolean', default: true })
  statementUploaded: boolean;

  @Column({ name: 'import_committed', type: 'boolean', default: true })
  importCommitted: boolean;

  @Column({ name: 'category_changes', type: 'boolean', default: true })
  categoryChanges: boolean;

  @Column({ name: 'member_activity', type: 'boolean', default: true })
  memberActivity: boolean;

  @Column({ name: 'data_deleted', type: 'boolean', default: true })
  dataDeleted: boolean;

  @Column({ name: 'workspace_updated', type: 'boolean', default: true })
  workspaceUpdated: boolean;

  // System notification toggles
  @Column({ name: 'parsing_errors', type: 'boolean', default: true })
  parsingErrors: boolean;

  @Column({ name: 'import_failures', type: 'boolean', default: true })
  importFailures: boolean;

  @Column({ name: 'uncategorized_items', type: 'boolean', default: true })
  uncategorizedItems: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Step 3: Экспортировать из index.ts**

В `backend/src/entities/index.ts` добавить:
```typescript
export * from './notification.entity';
export * from './notification-preference.entity';
```

**Step 4: Создать миграцию**

Файл: `backend/src/migrations/{timestamp}-CreateNotificationTables.ts`

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTables{TIMESTAMP} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
        "recipient_id" uuid NOT NULL,
        "workspace_id" uuid,
        "type" varchar(64) NOT NULL,
        "category" varchar(32) NOT NULL,
        "severity" varchar(16) NOT NULL DEFAULT 'info',
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "actor_id" uuid,
        "actor_name" varchar(255),
        "entity_type" varchar(64),
        "entity_id" uuid,
        "meta" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_recipient_read" ON "notifications" ("recipient_id", "is_read", "created_at" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_workspace_created" ON "notifications" ("workspace_id", "created_at" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
        "user_id" uuid NOT NULL,
        "statement_uploaded" boolean NOT NULL DEFAULT true,
        "import_committed" boolean NOT NULL DEFAULT true,
        "category_changes" boolean NOT NULL DEFAULT true,
        "member_activity" boolean NOT NULL DEFAULT true,
        "data_deleted" boolean NOT NULL DEFAULT true,
        "workspace_updated" boolean NOT NULL DEFAULT true,
        "parsing_errors" boolean NOT NULL DEFAULT true,
        "import_failures" boolean NOT NULL DEFAULT true,
        "uncategorized_items" boolean NOT NULL DEFAULT true,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_preferences_user" UNIQUE ("user_id"),
        CONSTRAINT "FK_notification_preferences_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_preferences";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
  }
}
```

**Step 5: Запустить миграцию**

```bash
cd backend && npm run migration:run
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat(notifications): add Notification and NotificationPreference entities with migration"
```

---

## Task 3: Notifications Backend Module (Service + Controller)

**Files:**
- Create: `backend/src/modules/notifications/notifications.module.ts`
- Create: `backend/src/modules/notifications/notifications.service.ts`
- Create: `backend/src/modules/notifications/notifications.controller.ts`
- Create: `backend/src/modules/notifications/dto/notification.dto.ts`
- Modify: `backend/src/app.module.ts` — добавить NotificationsModule

**Step 1: Создать DTOs**

Файл: `backend/src/modules/notifications/dto/notification.dto.ts`

```typescript
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class MarkReadDto {
  @IsUUID('4', { each: true })
  ids: string[];
}

export class UpdatePreferencesDto {
  @IsOptional() @IsBoolean() statementUploaded?: boolean;
  @IsOptional() @IsBoolean() importCommitted?: boolean;
  @IsOptional() @IsBoolean() categoryChanges?: boolean;
  @IsOptional() @IsBoolean() memberActivity?: boolean;
  @IsOptional() @IsBoolean() dataDeleted?: boolean;
  @IsOptional() @IsBoolean() workspaceUpdated?: boolean;
  @IsOptional() @IsBoolean() parsingErrors?: boolean;
  @IsOptional() @IsBoolean() importFailures?: boolean;
  @IsOptional() @IsBoolean() uncategorizedItems?: boolean;
}
```

**Step 2: Создать NotificationsService**

Файл: `backend/src/modules/notifications/notifications.service.ts`

Основные методы:
- `create(data)` — создать уведомление, проверить preferences, emit WebSocket event
- `findByUser(userId, workspaceId, options)` — получить список уведомлений пользователя (пагинация, сортировка)
- `getUnreadCount(userId, workspaceId)` — количество непрочитанных
- `markAsRead(userId, ids)` — отметить как прочитанные
- `markAllAsRead(userId, workspaceId)` — отметить все как прочитанные
- `deleteOld(olderThanDays)` — cleanup старых уведомлений (cron)
- `getPreferences(userId)` — получить настройки (find-or-create)
- `updatePreferences(userId, dto)` — обновить настройки
- `shouldNotify(userId, type)` — проверить, включён ли этот тип уведомлений для пользователя

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import {
  Notification,
  NotificationCategory,
  NotificationSeverity,
  NotificationType,
} from '../../entities/notification.entity';
import { NotificationPreference } from '../../entities/notification-preference.entity';
import type { UpdatePreferencesDto } from './dto/notification.dto';

export interface CreateNotificationPayload {
  recipientId: string;
  workspaceId?: string;
  type: NotificationType;
  category: NotificationCategory;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  actorId?: string;
  actorName?: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, any>;
}

// Маппинг NotificationType -> поле в NotificationPreference
const TYPE_TO_PREFERENCE: Record<NotificationType, keyof NotificationPreference> = {
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
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepo: Repository<NotificationPreference>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(payload: CreateNotificationPayload): Promise<Notification | null> {
    // Проверяем preferences пользователя
    const shouldNotify = await this.shouldNotify(payload.recipientId, payload.type);
    if (!shouldNotify) return null;

    const notification = this.notificationRepo.create({
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

    const saved = await this.notificationRepo.save(notification);

    // Emit event для WebSocket push
    this.eventEmitter.emit('notification.created', saved);

    return saved;
  }

  /** Создать уведомления для всех участников workspace, кроме actor */
  async notifyWorkspaceMembers(
    workspaceId: string,
    actorId: string,
    memberIds: string[],
    payload: Omit<CreateNotificationPayload, 'recipientId' | 'workspaceId'>,
  ): Promise<void> {
    const recipients = memberIds.filter(id => id !== actorId);
    await Promise.all(
      recipients.map(recipientId =>
        this.create({ ...payload, recipientId, workspaceId }).catch(err =>
          this.logger.error(`Failed to create notification for ${recipientId}`, err.stack),
        ),
      ),
    );
  }

  async findByUser(
    userId: string,
    workspaceId: string | null,
    options: { limit?: number; offset?: number } = {},
  ) {
    const { limit = 30, offset = 0 } = options;
    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.recipient_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC')
      .take(limit)
      .skip(offset);

    if (workspaceId) {
      qb.andWhere('(n.workspace_id = :workspaceId OR n.workspace_id IS NULL)', { workspaceId });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getUnreadCount(userId: string, workspaceId: string | null): Promise<number> {
    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.recipient_id = :userId', { userId })
      .andWhere('n.is_read = false');

    if (workspaceId) {
      qb.andWhere('(n.workspace_id = :workspaceId OR n.workspace_id IS NULL)', { workspaceId });
    }

    return qb.getCount();
  }

  async markAsRead(userId: string, ids: string[]): Promise<void> {
    await this.notificationRepo
      .createQueryBuilder()
      .update()
      .set({ isRead: true })
      .where('recipient_id = :userId', { userId })
      .andWhereInIds(ids)
      .execute();
  }

  async markAllAsRead(userId: string, workspaceId: string | null): Promise<void> {
    const qb = this.notificationRepo
      .createQueryBuilder()
      .update()
      .set({ isRead: true })
      .where('recipient_id = :userId', { userId })
      .andWhere('is_read = false');

    if (workspaceId) {
      qb.andWhere('(workspace_id = :workspaceId OR workspace_id IS NULL)', { workspaceId });
    }

    await qb.execute();
  }

  async getPreferences(userId: string): Promise<NotificationPreference> {
    let prefs = await this.preferenceRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.preferenceRepo.create({ userId });
      prefs = await this.preferenceRepo.save(prefs);
    }
    return prefs;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<NotificationPreference> {
    let prefs = await this.getPreferences(userId);
    Object.assign(prefs, dto);
    return this.preferenceRepo.save(prefs);
  }

  async shouldNotify(userId: string, type: NotificationType): Promise<boolean> {
    const prefKey = TYPE_TO_PREFERENCE[type];
    if (!prefKey) return true;
    const prefs = await this.getPreferences(userId);
    return prefs[prefKey] as boolean;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldNotifications(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 дней
    const result = await this.notificationRepo.delete({
      createdAt: LessThan(cutoffDate),
    });
    if (result.affected) {
      this.logger.log(`Cleaned up ${result.affected} old notifications`);
    }
  }
}
```

**Step 3: Создать NotificationsController**

Файл: `backend/src/modules/notifications/notifications.controller.ts`

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { MarkReadDto, UpdatePreferencesDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() user: User,
    @Query('workspaceId') workspaceId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationsService.findByUser(user.id, workspaceId ?? null, {
      limit: limit ? parseInt(limit, 10) : 30,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('unread-count')
  async unreadCount(
    @CurrentUser() user: User,
    @Query('workspaceId') workspaceId?: string,
  ) {
    const count = await this.notificationsService.getUnreadCount(user.id, workspaceId ?? null);
    return { count };
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  async markRead(@CurrentUser() user: User, @Body() dto: MarkReadDto) {
    await this.notificationsService.markAsRead(user.id, dto.ids);
    return { message: 'Marked as read' };
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllRead(
    @CurrentUser() user: User,
    @Query('workspaceId') workspaceId?: string,
  ) {
    await this.notificationsService.markAllAsRead(user.id, workspaceId ?? null);
    return { message: 'All marked as read' };
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: User) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('preferences')
  async updatePreferences(@CurrentUser() user: User, @Body() dto: UpdatePreferencesDto) {
    return this.notificationsService.updatePreferences(user.id, dto);
  }
}
```

**Step 4: Создать NotificationsModule**

Файл: `backend/src/modules/notifications/notifications.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../entities/notification.entity';
import { NotificationPreference } from '../../entities/notification-preference.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationEventsListener } from './notification-events.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference, WorkspaceMember]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, NotificationEventsListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

**Step 5: Зарегистрировать в AppModule**

В `backend/src/app.module.ts`:
- Добавить import `NotificationsModule` из `./modules/notifications/notifications.module`
- Добавить `Notification`, `NotificationPreference` в `TypeOrmModule.forFeature([...])`
- Добавить `NotificationsModule` в `imports: [...]`

**Step 6: Commit**

```bash
git add -A && git commit -m "feat(notifications): add notifications module with service, controller, and DTOs"
```

---

## Task 4: WebSocket Gateway (Socket.io)

**Files:**
- Create: `backend/src/modules/notifications/notifications.gateway.ts`

**Step 1: Создать NotificationsGateway**

Файл: `backend/src/modules/notifications/notifications.gateway.ts`

```typescript
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Notification } from '../../entities/notification.entity';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // userId -> Set<socketId>
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Socket ${client.id} rejected: no token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // Track socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user-specific room
      client.join(`user:${userId}`);

      this.logger.log(`Socket ${client.id} connected for user ${userId}`);
    } catch (error) {
      this.logger.warn(`Socket ${client.id} auth failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data.userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Socket ${client.id} disconnected`);
  }

  @SubscribeMessage('join-workspace')
  handleJoinWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ): void {
    if (data.workspaceId) {
      client.join(`workspace:${data.workspaceId}`);
    }
  }

  @SubscribeMessage('leave-workspace')
  handleLeaveWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ): void {
    if (data.workspaceId) {
      client.leave(`workspace:${data.workspaceId}`);
    }
  }

  /** Push notification to specific user via event-emitter */
  @OnEvent('notification.created')
  handleNotificationCreated(notification: Notification): void {
    this.server
      .to(`user:${notification.recipientId}`)
      .emit('notification', notification);
  }
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(notifications): add WebSocket gateway with JWT auth and room management"
```

---

## Task 5: Event Listeners — генерация уведомлений из бизнес-событий

**Files:**
- Create: `backend/src/modules/notifications/notification-events.listener.ts`
- Create: `backend/src/modules/notifications/events/notification-events.ts`
- Modify: `backend/src/modules/statements/statements.service.ts` — emit event после загрузки
- Modify: `backend/src/modules/import/services/import-session.service.ts` — emit event после commit/fail
- Modify: `backend/src/modules/categories/categories.service.ts` — emit event после CRUD
- Modify: `backend/src/modules/workspaces/workspaces.service.ts` — emit event после invite/join/update
- Modify: `backend/src/modules/transactions/transactions.service.ts` — emit event после delete
- Modify: `backend/src/modules/parsing/services/statement-processing.service.ts` — emit event при ошибке парсинга

**Step 1: Определить события**

Файл: `backend/src/modules/notifications/events/notification-events.ts`

```typescript
export class StatementUploadedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly actorId: string,
    public readonly actorName: string,
    public readonly statementId: string,
    public readonly statementName: string,
    public readonly bankName?: string,
  ) {}
}

export class ImportCommittedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly actorId: string,
    public readonly actorName: string,
    public readonly statementId: string,
    public readonly transactionCount: number,
  ) {}
}

export class ImportFailedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly statementId: string,
    public readonly statementName: string,
    public readonly errorMessage: string,
  ) {}
}

export class CategoryChangedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly actorId: string,
    public readonly actorName: string,
    public readonly action: 'created' | 'updated' | 'deleted',
    public readonly categoryId: string,
    public readonly categoryName: string,
  ) {}
}

export class MemberInvitedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly actorId: string,
    public readonly actorName: string,
    public readonly invitedEmail: string,
    public readonly role: string,
  ) {}
}

export class MemberJoinedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly memberId: string,
    public readonly memberName: string,
  ) {}
}

export class DataDeletedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly actorId: string,
    public readonly actorName: string,
    public readonly entityType: string,
    public readonly entityName: string,
    public readonly count: number,
  ) {}
}

export class WorkspaceUpdatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly actorId: string,
    public readonly actorName: string,
    public readonly changes: string[], // ['name', 'currency', ...]
  ) {}
}

export class ParsingErrorEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly statementId: string,
    public readonly statementName: string,
    public readonly errorMessage: string,
  ) {}
}

export class TransactionsUncategorizedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly statementId: string,
    public readonly count: number,
  ) {}
}

export class ReceiptUncategorizedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly receiptId: string,
    public readonly receiptSubject: string,
  ) {}
}
```

**Step 2: Создать NotificationEventsListener**

Файл: `backend/src/modules/notifications/notification-events.listener.ts`

Этот listener слушает все бизнес-события через `@OnEvent()` и вызывает `NotificationsService.notifyWorkspaceMembers()` или `NotificationsService.create()`.

Полная реализация описана ниже — каждый обработчик:
- Для workspace-событий: загружает memberIds, вызывает `notifyWorkspaceMembers()` (исключая актора)
- Для системных событий: вызывает `create()` напрямую для конкретного пользователя

**Обработчики:**
- `@OnEvent('statement.uploaded')` -> `NotificationType.STATEMENT_UPLOADED`
- `@OnEvent('import.committed')` -> `NotificationType.IMPORT_COMMITTED`
- `@OnEvent('import.failed')` -> `NotificationType.IMPORT_FAILED` (только инициатору)
- `@OnEvent('category.changed')` -> `NotificationType.CATEGORY_CREATED/UPDATED/DELETED`
- `@OnEvent('member.invited')` -> `NotificationType.MEMBER_INVITED`
- `@OnEvent('member.joined')` -> `NotificationType.MEMBER_JOINED`
- `@OnEvent('data.deleted')` -> `NotificationType.DATA_DELETED`
- `@OnEvent('workspace.updated')` -> `NotificationType.WORKSPACE_UPDATED`
- `@OnEvent('parsing.error')` -> `NotificationType.PARSING_ERROR` (только инициатору)
- `@OnEvent('transactions.uncategorized')` -> `NotificationType.TRANSACTION_UNCATEGORIZED` (только инициатору)
- `@OnEvent('receipt.uncategorized')` -> `NotificationType.RECEIPT_UNCATEGORIZED` (только инициатору)

**Step 3: Добавить emit событий в существующие сервисы**

Во всех сервисах:
1. Inject `EventEmitter2` через конструктор
2. Emit соответствующее событие после успешного действия (fire-and-forget)

**Точки интеграции (точные файлы):**

a) **`backend/src/modules/statements/statements.service.ts`** — после `this.statementRepository.save()` в методе `create()`:
```typescript
this.eventEmitter.emit('statement.uploaded', new StatementUploadedEvent(
  workspaceId, user.id, user.name, statement.id, statement.originalName, statement.bankName,
));
```

b) **`backend/src/modules/import/services/import-session.service.ts`** — после успешного commit:
```typescript
this.eventEmitter.emit('import.committed', new ImportCommittedEvent(
  session.workspaceId, userId, userName, session.statementId, committedCount,
));
```
И при ошибке:
```typescript
this.eventEmitter.emit('import.failed', new ImportFailedEvent(
  session.workspaceId, userId, session.statementId, statementName, error.message,
));
```

c) **`backend/src/modules/categories/categories.service.ts`** — после create/update/delete:
```typescript
this.eventEmitter.emit('category.changed', new CategoryChangedEvent(
  workspaceId, user.id, user.name, 'created', category.id, category.name,
));
```

d) **`backend/src/modules/workspaces/workspaces.service.ts`**:
- После `inviteMember()`: emit `member.invited`
- После `acceptInvitation()`: emit `member.joined`
- После `update()`: emit `workspace.updated`

e) **`backend/src/modules/transactions/transactions.service.ts`**:
- После delete/bulk delete: emit `data.deleted`

f) **`backend/src/modules/parsing/services/statement-processing.service.ts`**:
- В catch блоке при ошибке парсинга: emit `parsing.error`

**Важно:** Каждый emit делается fire-and-forget (не await), чтобы не блокировать основной flow.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(notifications): add event listeners and emit events from business services"
```

---

## Task 6: Frontend — Socket.io клиент и контекст уведомлений

**Files:**
- Create: `frontend/app/lib/socket.ts`
- Create: `frontend/app/contexts/NotificationContext.tsx`
- Modify: `frontend/app/providers.tsx` — обернуть в NotificationProvider

**Step 1: Создать Socket.io клиент**

Файл: `frontend/app/lib/socket.ts`

```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('access_token');
  if (!token) throw new Error('No auth token');

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

  socket = io(`${baseUrl}/notifications`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
```

**Step 2: Создать NotificationContext**

Файл: `frontend/app/contexts/NotificationContext.tsx`

Контекст предоставляет:
- `notifications: Notification[]` — список последних уведомлений
- `unreadCount: number` — количество непрочитанных
- `loading: boolean` — загрузка
- `markAsRead(ids)` — отметить как прочитанные
- `markAllAsRead()` — отметить все как прочитанные
- `refresh()` — перезагрузить список

Логика:
1. При монтировании: `GET /notifications` + `GET /notifications/unread-count`
2. Подключение WebSocket: `connectSocket()`, слушаем `notification` event
3. При получении нового уведомления: prepend в `notifications`, increment `unreadCount`
4. При смене workspace: `leave-workspace` старого, `join-workspace` нового, `refresh()`
5. При размонтировании: `disconnectSocket()`

**Step 3: Обернуть приложение в NotificationProvider**

В `frontend/app/providers.tsx` добавить `<NotificationProvider>` внутри `<WorkspaceProvider>`:

```tsx
import { NotificationProvider } from '@/app/contexts/NotificationContext';

// В render:
<WorkspaceProvider>
  <NotificationProvider>
    {children}
  </NotificationProvider>
</WorkspaceProvider>
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(notifications): add socket.io client, notification context and provider"
```

---

## Task 7: Frontend — Notification Dropdown компонент (Desktop + Mobile)

**Files:**
- Create: `frontend/app/components/NotificationDropdown.tsx`
- Modify: `frontend/app/components/Navigation.tsx` — заменить placeholder bell на dropdown

**Step 1: Создать NotificationDropdown**

Файл: `frontend/app/components/NotificationDropdown.tsx`

Компонент включает:
- **Trigger:** кнопка с `<NotificationsNone />` иконкой + абсолютно-позиционированный badge (красный кружок с числом) при `unreadCount > 0`
- **Content:** Radix Popover (или DropdownMenu) шириной ~380px, max-height ~400px с overflow-y scroll
- **Header:** "Уведомления" + кнопка "Прочитать все" (если есть непрочитанные)
- **Список:** каждый элемент содержит:
  - Иконка severity слева (Info=синий, Warn=жёлтый, Error=красный)
  - Title (bold) + message (muted text) + relative time
  - Синяя точка для непрочитанных
  - onClick: markAsRead + навигация к entityType (опционально)
- **Empty state:** "Нет уведомлений" с иконкой

Стили:
- Использовать CSS переменные из `globals.css`
- Непрочитанные: `bg-primary/5` фон + синяя точка
- Hover: `hover:bg-muted`
- Relative time: простая функция (1м, 5м, 1ч, 2д, ...)

**Step 2: Интегрировать в Navigation.tsx**

- Desktop (строки 309-314): заменить `<button>...<NotificationsNone />...</button>` на `<NotificationDropdown />`
- Mobile: добавить `<NotificationDropdown />` в мобильный header (рядом с hamburger меню или внутри drawer header)

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(notifications): add notification dropdown with badge, severity icons, and mark-as-read"
```

---

## Task 8: Frontend — Страница настроек уведомлений

**Files:**
- Create: `frontend/app/settings/notifications/page.tsx`
- Modify навигацию в настройках если есть sidebar/tabs

**Step 1: Создать страницу настроек**

Файл: `frontend/app/settings/notifications/page.tsx`

Страница включает 2 секции (использовать Card компоненты):

**Секция 1: Активность workspace**
| Настройка | Default | Описание |
|-----------|---------|----------|
| Загрузка выписок | ON | Участник загрузил выписку |
| Импорт транзакций | ON | Участник завершил импорт |
| Изменение категорий | ON | Создание/изменение/удаление категорий |
| Активность участников | ON | Приглашения и вступления |
| Удаление данных | ON | Удаление транзакций и выписок |
| Изменение настроек | ON | Настройки workspace изменены |

**Секция 2: Системные уведомления**
| Настройка | Default | Описание |
|-----------|---------|----------|
| Ошибки парсинга | ON | Ошибки при обработке выписок |
| Ошибки импорта | ON | Импорт завершился с ошибкой |
| Без категории | ON | Транзакции и чеки без категории |

Использовать:
- `Card`, `CardHeader`, `CardContent` из `components/ui/`
- Toggle switch (стилизованный через Tailwind или MUI Switch)
- Fetch `GET /notifications/preferences` при mount
- `PATCH /notifications/preferences` при toggle
- Layout аналогичный `settings/profile/page.tsx`

**Step 2: Добавить навигацию к новой странице**

Если в settings есть sidebar/tabs — добавить пункт "Уведомления" со ссылкой на `/settings/notifications`.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(notifications): add notification preferences settings page"
```

---

## Task 9: Тесты

**Files:**
- Create: `backend/@tests/unit/notifications/notifications.service.spec.ts`
- Create: `backend/@tests/unit/notifications/notifications.gateway.spec.ts`
- Create: `backend/@tests/unit/notifications/notification-events.listener.spec.ts`

**Step 1: Unit-тесты для NotificationsService**

Тест-кейсы:
- `create()` — создаёт уведомление и emit event
- `create()` — не создаёт если preference отключен
- `findByUser()` — возвращает уведомления с пагинацией
- `getUnreadCount()` — считает только непрочитанные
- `markAsRead()` — обновляет isRead
- `markAllAsRead()` — обновляет все непрочитанные
- `getPreferences()` — создаёт default при первом вызове
- `updatePreferences()` — обновляет нужные поля
- `shouldNotify()` — проверяет маппинг type -> preference

**Step 2: Unit-тесты для NotificationsGateway**

- Успешное подключение с валидным JWT
- Отклонение подключения без токена
- Отклонение подключения с невалидным токеном
- join/leave workspace rooms
- Push уведомления в правильный room

**Step 3: Unit-тесты для NotificationEventsListener**

- Каждый event handler создаёт уведомления для правильных получателей
- Actor исключается из получателей workspace-уведомлений
- Системные уведомления отправляются только инициатору

**Step 4: Commit**

```bash
git add -A && git commit -m "test(notifications): add unit tests for service, gateway, and event listener"
```

---

## Task 10: Интеграция и финальная проверка

**Step 1: Запустить все тесты**

```bash
cd backend && npm run test
cd frontend && npm run build
```

**Step 2: Lint и format**

```bash
make lint && make format
```

**Step 3: Ручное тестирование**

1. Запустить `make dev`
2. Открыть два браузера с разными пользователями в одном workspace
3. Пользователь A загружает выписку -> Пользователь B видит уведомление в real-time
4. Проверить badge-счётчик, mark as read, mark all as read
5. Проверить настройки: отключить тип -> убедиться что уведомления не приходят
6. Проверить мобильную версию (dropdown в drawer)
7. Проверить системные уведомления (ошибка парсинга, uncategorized)

**Step 4: Финальный commit**

```bash
git add -A && git commit -m "feat(notifications): complete notifications system integration"
```

---

## Диаграмма архитектуры

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend                               │
│                                                               │
│  Navigation.tsx ──> NotificationDropdown                      │
│       │                    │                                  │
│       │              NotificationContext                       │
│       │              /           \                             │
│       │     REST API (fetch)   Socket.io client               │
│       │         │                    │                         │
└───────┼─────────┼────────────────────┼────────────────────────┘
        │         │                    │
        │    HTTP/REST            WebSocket
        │         │                    │
┌───────┼─────────┼────────────────────┼────────────────────────┐
│       │     Backend                  │                         │
│       │         │                    │                         │
│       │  NotificationsController   NotificationsGateway        │
│       │         │                    │                         │
│       │  NotificationsService ───────┘                         │
│       │     │         │                                        │
│       │     │    EventEmitter2                                 │
│       │     │         │                                        │
│       │     │  NotificationEventsListener                      │
│       │     │         │                                        │
│       │     │    @OnEvent('statement.uploaded')                │
│       │     │    @OnEvent('import.committed')                  │
│       │     │    @OnEvent('parsing.error')                     │
│       │     │    @OnEvent('category.changed')                  │
│       │     │    @OnEvent('member.invited')   ...              │
│       │     │                                                  │
│       │   PostgreSQL                                           │
│       │   ┌──────────────┐  ┌─────────────────────────┐       │
│       │   │ notifications │  │ notification_preferences │       │
│       │   └──────────────┘  └─────────────────────────┘       │
│       │                                                        │
│  Existing services emit events:                                │
│    StatementsService.emit('statement.uploaded')                │
│    ImportSessionService.emit('import.committed')               │
│    CategoriesService.emit('category.changed')                  │
│    WorkspacesService.emit('member.invited')                    │
│    ...                                                         │
└────────────────────────────────────────────────────────────────┘
```

---

## Оценка времени

| Task | Описание | Оценка |
|------|----------|--------|
| 1 | Установка зависимостей | 10 мин |
| 2 | Entity + миграция | 30 мин |
| 3 | Service + Controller + Module | 45 мин |
| 4 | WebSocket Gateway | 30 мин |
| 5 | Event listeners + emit в сервисах | 60 мин |
| 6 | Frontend socket + context | 40 мин |
| 7 | Notification dropdown UI | 60 мин |
| 8 | Settings page | 40 мин |
| 9 | Тесты | 60 мин |
| 10 | Интеграция и проверка | 30 мин |
| **Итого** | | **~6-7 часов** |
