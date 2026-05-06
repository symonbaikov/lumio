import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

export enum SubscriptionFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

export enum SubscriptionStatus {
  DETECTED = 'detected',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

@Entity('subscriptions')
@Unique('UQ_subscriptions_workspace_vendor_frequency', ['workspaceId', 'vendorName', 'frequency'])
@Index('IDX_subscriptions_workspace_status', ['workspaceId', 'status'])
@Index('IDX_subscriptions_workspace_next_charge', ['workspaceId', 'nextChargeDate'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @Column({ name: 'vendor_name', length: 255 })
  vendorName: string;

  @Column({ name: 'vendor_raw', length: 255, nullable: true })
  vendorRaw: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ default: 'KZT' })
  currency: string;

  @Column({ type: 'enum', enum: SubscriptionFrequency })
  frequency: SubscriptionFrequency;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.DETECTED })
  status: SubscriptionStatus;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidence: number | null;

  @Column({ name: 'next_charge_date', type: 'date', nullable: true })
  nextChargeDate: Date | null;

  @Column({ name: 'last_charge_date', type: 'date', nullable: true })
  lastChargeDate: Date | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string | null;

  @Column({ name: 'detection_meta', type: 'jsonb', nullable: true })
  detectionMeta: Record<string, unknown> | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ name: 'created_by_id', nullable: true })
  createdById: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
