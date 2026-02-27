import type {
  AuditAction,
  AuditEventDiff,
  AuditEventMeta,
  ActorType,
  EntityType,
  Severity,
} from '../../../entities/audit-event.entity';

export interface CreateAuditEventDto {
  workspaceId?: string | null;
  actorType: ActorType;
  actorId?: string | null;
  actorLabel?: string | null;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  diff?: AuditEventDiff | null;
  meta?: AuditEventMeta | null;
  batchId?: string | null;
  severity?: Severity;
  isUndoable?: boolean;
}

export interface AuditEventFilter {
  workspaceId?: string | null;
  entityType?: EntityType;
  entityId?: string;
  actorType?: ActorType;
  actorId?: string;
  action?: AuditAction;
  actorLabel?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  batchId?: string;
  severity?: Severity;
  page?: number;
  limit?: number;
}

export interface AuditEventGroup {
  batchId: string;
  count: number;
  events: Array<{ id: string; entityType: EntityType; action: AuditAction }>;
}

export interface RollbackResult {
  success: boolean;
  message?: string;
  eventId?: string;
}
