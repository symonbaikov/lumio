import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

type JsonObject = Record<string, unknown>;

export enum CustomTableImportJobType {
  GOOGLE_SHEETS = 'google_sheets',
  SHEET_TRANSACTIONS = 'sheet_transactions',
}

export enum CustomTableImportJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  DONE = 'done',
  FAILED = 'failed',
}

@Entity('custom_table_import_jobs')
@Index('IDX_custom_table_import_jobs_user_id', ['userId'])
@Index('IDX_custom_table_import_jobs_status', ['status'])
@Index('IDX_custom_table_import_jobs_created_at', ['createdAt'])
@Index('IDX_custom_table_import_jobs_workspace_id', ['workspaceId'])
export class CustomTableImportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  // Nullable: старые записи созданы до появления скоупинга; новые всегда пишут его.
  @ManyToOne(() => Workspace, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace | null;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string | null;

  @Column({ name: 'type', type: 'varchar' })
  type: CustomTableImportJobType;

  @Column({ name: 'status', type: 'varchar', default: CustomTableImportJobStatus.PENDING })
  status: CustomTableImportJobStatus;

  @Column({ name: 'progress', type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'stage', type: 'varchar', nullable: true })
  stage: string | null;

  @Column({ name: 'payload', type: 'jsonb', default: () => "'{}'::jsonb" })
  payload: JsonObject;

  @Column({ name: 'result', type: 'jsonb', nullable: true })
  result: JsonObject | null;

  @Column({ name: 'error', type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'locked_at', type: 'timestamp', nullable: true })
  lockedAt: Date | null;

  @Column({ name: 'locked_by', type: 'varchar', nullable: true })
  lockedBy: string | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
