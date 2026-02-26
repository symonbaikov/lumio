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

export enum ActorType {
  USER = 'user',
  SYSTEM = 'system',
  INTEGRATION = 'integration',
}

export enum EntityType {
  TRANSACTION = 'transaction',
  STATEMENT = 'statement',
  RECEIPT = 'receipt',
  PAYABLE = 'payable',
  CATEGORY = 'category',
  RULE = 'rule',
  WORKSPACE = 'workspace',
  INTEGRATION = 'integration',
  TABLE_ROW = 'table_row',
  TABLE_CELL = 'table_cell',
  BRANCH = 'branch',
  WALLET = 'wallet',
  CUSTOM_TABLE = 'custom_table',
  CUSTOM_TABLE_COLUMN = 'custom_table_column',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  IMPORT = 'import',
  LINK = 'link',
  UNLINK = 'unlink',
  MATCH = 'match',
  UNMATCH = 'unmatch',
  APPLY_RULE = 'apply_rule',
  ROLLBACK = 'rollback',
  EXPORT = 'export',
}

export enum Severity {
  INFO = 'info',
  WARN = 'warn',
  CRITICAL = 'critical',
}

export type BeforeAfterDiff<T = Record<string, any>> = {
  before: T | null;
  after: T | null;
};

export type PatchOperation = {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
};

export type AuditEventDiff = BeforeAfterDiff | PatchOperation[];

export interface AuditEventMeta {
  reason?: string;
  source?: string;
  confidence?: number;
  ruleId?: string;
  provider?: string;
  fileId?: string;
  rowsCount?: number;
  sheetId?: string;
  spreadsheetId?: string;
  cell?: {
    row?: number;
    column?: string;
    a1?: string;
  };
  rollbackOf?: string;
  originalAction?: AuditAction;
  [key: string]: any;
}

@Entity('audit_events')
@Index('IDX_audit_events_created_at', ['createdAt'])
@Index('IDX_audit_events_workspace_created_at', ['workspaceId', 'createdAt'])
@Index('IDX_audit_events_entity_created_at', ['entityType', 'entityId', 'createdAt'])
@Index('IDX_audit_events_actor_created_at', ['actorType', 'actorId', 'createdAt'])
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { nullable: true })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace | null;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'actor_type', type: 'enum', enum: ActorType })
  actorType: ActorType;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_label', type: 'varchar', length: 255 })
  actorLabel: string;

  @Column({ name: 'entity_type', type: 'enum', enum: EntityType })
  entityType: EntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ name: 'action', type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ name: 'diff', type: 'jsonb', nullable: true })
  diff: AuditEventDiff | null;

  @Column({ name: 'meta', type: 'jsonb', nullable: true })
  meta: AuditEventMeta | null;

  @Index('IDX_audit_events_batch_id')
  @Column({ name: 'batch_id', type: 'uuid', nullable: true })
  batchId: string | null;

  @Column({ name: 'severity', type: 'enum', enum: Severity, default: Severity.INFO })
  severity: Severity;

  @Column({ name: 'is_undoable', type: 'boolean', default: false })
  isUndoable: boolean;
}
