import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  ActorType,
  AuditAction,
  AuditEvent,
  type AuditEventDiff,
  EntityType,
  Severity,
} from '../../entities/audit-event.entity';
import { User } from '../../entities/user.entity';
import { Workspace } from '../../entities/workspace.entity';
import type {
  AuditEventFilter,
  CreateAuditEventDto,
  RollbackResult,
} from './interfaces/audit-event.interface';
import { RollbackService } from './rollback/rollback.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditEventRepository: Repository<AuditEvent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly rollbackService: RollbackService,
  ) {}

  async createEvent(dto: CreateAuditEventDto): Promise<AuditEvent> {
    if (!dto.entityId) {
      throw new BadRequestException('Audit event requires entityId');
    }

    if (dto.workspaceId) {
      const workspace = await this.workspaceRepository.findOne({
        where: { id: dto.workspaceId },
        select: ['id'],
      });
      if (!workspace) {
        throw new BadRequestException('Workspace not found for audit event');
      }
    }

    const actorLabel = await this.resolveActorLabel(dto);
    const isUndoable = dto.isUndoable ?? this.isUndoable(dto.action, dto.entityType);

    const event = this.auditEventRepository.create({
      workspaceId: dto.workspaceId ?? null,
      actorType: dto.actorType,
      actorId: dto.actorId ?? null,
      actorLabel,
      entityType: dto.entityType,
      entityId: dto.entityId,
      action: dto.action,
      diff: dto.diff ?? null,
      meta: dto.meta ?? null,
      batchId: dto.batchId ?? null,
      severity: dto.severity ?? Severity.INFO,
      isUndoable,
    });

    return this.auditEventRepository.save(event);
  }

  async createBatchEvents(
    events: CreateAuditEventDto[],
    batchId?: string,
  ): Promise<{ batchId: string; events: AuditEvent[] }> {
    const resolvedBatchId = batchId || uuidv4();
    const created: AuditEvent[] = [];

    for (const event of events) {
      // Audit: persist each event under a shared batch id.
      const saved = await this.createEvent({
        ...event,
        batchId: resolvedBatchId,
      });
      created.push(saved);
    }

    return { batchId: resolvedBatchId, events: created };
  }

  async findEvents(filter: AuditEventFilter): Promise<{
    data: AuditEvent[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(Number(filter.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filter.limit ?? 50), 1), 200);

    const qb = this.auditEventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.actor', 'actor')
      .orderBy('event.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filter.workspaceId) {
      qb.andWhere('event.workspaceId = :workspaceId', { workspaceId: filter.workspaceId });
    }

    if (filter.entityType) {
      qb.andWhere('event.entityType = :entityType', { entityType: filter.entityType });
    }

    if (filter.entityId) {
      qb.andWhere('event.entityId = :entityId', { entityId: filter.entityId });
    }

    if (filter.actorType) {
      qb.andWhere('event.actorType = :actorType', { actorType: filter.actorType });
    }

    if (filter.actorId) {
      qb.andWhere('event.actorId = :actorId', { actorId: filter.actorId });
    }

    if (filter.action) {
      qb.andWhere('event.action = :action', { action: filter.action });
    }

    if (filter.actorLabel) {
      qb.andWhere('event.actorLabel ILIKE :actorLabel', {
        actorLabel: `%${filter.actorLabel}%`,
      });
    }

    if (filter.batchId) {
      qb.andWhere('event.batchId = :batchId', { batchId: filter.batchId });
    }

    if (filter.severity) {
      qb.andWhere('event.severity = :severity', { severity: filter.severity });
    }

    if (filter.dateFrom) {
      qb.andWhere('event.createdAt >= :dateFrom', {
        dateFrom: new Date(filter.dateFrom),
      });
    }

    if (filter.dateTo) {
      qb.andWhere('event.createdAt <= :dateTo', { dateTo: new Date(filter.dateTo) });
    }

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findEventById(id: string, workspaceId?: string): Promise<AuditEvent | null> {
    const qb = this.auditEventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.actor', 'actor')
      .where('event.id = :id', { id });

    if (workspaceId) {
      qb.andWhere('event.workspaceId = :workspaceId', { workspaceId });
    }

    const event = await qb.getOne();

    if (workspaceId && event && event.workspaceId !== workspaceId) {
      throw new BadRequestException('Audit event is outside workspace scope');
    }

    return event;
  }

  async findEventsByEntity(
    entityType: EntityType,
    entityId: string,
    workspaceId?: string,
  ): Promise<AuditEvent[]> {
    const qb = this.auditEventRepository
      .createQueryBuilder('event')
      .where('event.entityType = :entityType', { entityType })
      .andWhere('event.entityId = :entityId', { entityId })
      .orderBy('event.createdAt', 'DESC');

    if (workspaceId) {
      qb.andWhere('event.workspaceId = :workspaceId', { workspaceId });
    }

    return qb.getMany();
  }

  async findEventsByBatch(batchId: string, workspaceId?: string): Promise<AuditEvent[]> {
    const qb = this.auditEventRepository
      .createQueryBuilder('event')
      .where('event.batchId = :batchId', { batchId })
      .orderBy('event.createdAt', 'DESC');

    if (workspaceId) {
      qb.andWhere('event.workspaceId = :workspaceId', { workspaceId });
    }

    return qb.getMany();
  }

  async rollback(eventId: string, userId: string, workspaceId?: string): Promise<RollbackResult> {
    const event = await this.auditEventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Audit event not found');
    }

    if (workspaceId && event.workspaceId && event.workspaceId !== workspaceId) {
      throw new BadRequestException('Audit event is outside workspace scope');
    }

    if (!event.isUndoable) {
      throw new BadRequestException('Audit event is not undoable');
    }

    const rollbackResult = await this.rollbackService.rollback(event);

    if (!rollbackResult.success) {
      return rollbackResult;
    }

    const rollbackDiff = this.buildRollbackDiff(event.diff);

    // Audit: record rollback action referencing the original event.
    const rollbackEvent = await this.createEvent({
      workspaceId: event.workspaceId,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: event.entityType,
      entityId: event.entityId,
      action: AuditAction.ROLLBACK,
      diff: rollbackDiff,
      meta: {
        rollbackOf: event.id,
        originalAction: event.action,
      },
      severity: Severity.INFO,
      isUndoable: false,
    });

    return {
      success: true,
      message: rollbackResult.message,
      eventId: rollbackEvent.id,
    };
  }

  private async resolveActorLabel(dto: CreateAuditEventDto): Promise<string> {
    if (dto.actorLabel && dto.actorLabel.trim()) {
      return dto.actorLabel.trim();
    }

    if (dto.actorType === ActorType.USER && dto.actorId) {
      const user = await this.userRepository.findOne({
        where: { id: dto.actorId },
        select: ['id', 'email', 'name'],
      });
      if (user?.email) return user.email;
      if (user?.name) return user.name;
      return 'User';
    }

    if (dto.actorType === ActorType.INTEGRATION) {
      return 'Integration';
    }

    return 'System';
  }

  private isUndoable(action: AuditAction, entityType: EntityType): boolean {
    if (action === AuditAction.ROLLBACK) return false;
    if (action === AuditAction.UPDATE || action === AuditAction.DELETE) return true;
    if (action === AuditAction.CREATE) {
      return [EntityType.TABLE_ROW, EntityType.TABLE_CELL].includes(entityType);
    }
    return false;
  }

  private buildRollbackDiff(diff: AuditEventDiff | null | undefined): AuditEventDiff | null {
    if (!diff || Array.isArray(diff)) {
      return diff ?? null;
    }

    return {
      before: diff.after ?? null,
      after: diff.before ?? null,
    };
  }
}
