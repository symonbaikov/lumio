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

export enum InsightType {
  RULE_SUGGESTION = 'rule.suggestion',
  PATTERN_DETECTED = 'pattern.detected',
  SPENDING_SPIKE = 'spending.spike',
  UNUSUAL_TRANSACTION = 'transaction.unusual',
  NEW_COUNTERPARTY = 'counterparty.new',
  CATEGORY_DOMINANCE = 'category.dominance',
  UNAPPROVED_COUNT = 'operational.unapproved_count',
  UNCATEGORIZED_COUNT = 'operational.uncategorized_count',
  DUPLICATE_DETECTED = 'operational.duplicate_detected',
  SPENDING_TREND_UP = 'trend.spending_up',
  SPENDING_TREND_DOWN = 'trend.spending_down',
  MONTHLY_FORECAST = 'forecast.monthly',
  UNUSED_RULES = 'workflow.unused_rules',
  CLASSIFICATION_ACCURACY = 'workflow.classification_accuracy',
  WORKFLOW_TIP = 'workflow.tip',
}

export enum InsightCategory {
  PATTERN = 'pattern',
  ANOMALY = 'anomaly',
  OPERATIONAL = 'operational',
  TREND = 'trend',
  WORKFLOW = 'workflow',
}

export enum InsightSeverity {
  INFO = 'info',
  WARN = 'warn',
  CRITICAL = 'critical',
}

@Entity('insights')
@Index('IDX_insights_user_active_created', ['userId', 'isDismissed', 'createdAt'])
@Index('IDX_insights_workspace_created', ['workspaceId', 'createdAt'])
export class Insight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Workspace, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace | null;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string | null;

  @Column({ type: 'varchar', length: 64 })
  type: InsightType;

  @Column({ type: 'varchar', length: 32 })
  category: InsightCategory;

  @Column({ type: 'varchar', length: 16, default: InsightSeverity.INFO })
  severity: InsightSeverity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  actions: Array<Record<string, unknown>> | null;

  @Column({ name: 'is_dismissed', type: 'boolean', default: false })
  isDismissed: boolean;

  @Column({ name: 'is_actioned', type: 'boolean', default: false })
  isActioned: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'deduplication_key', type: 'varchar', length: 255, nullable: true })
  deduplicationKey: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
