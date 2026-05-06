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

export enum BudgetPeriodType {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

@Entity('budgets')
@Unique('UQ_budgets_workspace_category_period', ['workspaceId', 'categoryId', 'periodType'])
@Index('IDX_budgets_workspace_category', ['workspaceId', 'categoryId'])
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'limit_amount', type: 'decimal', precision: 15, scale: 2 })
  limitAmount: number;

  @Column({ default: 'KZT' })
  currency: string;

  @Column({
    name: 'period_type',
    type: 'enum',
    enum: BudgetPeriodType,
  })
  periodType: BudgetPeriodType;

  @Column({ name: 'alert_at_80_sent', default: false })
  alertAt80Sent: boolean;

  @Column({ name: 'alert_at_100_sent', default: false })
  alertAt100Sent: boolean;

  @Column({ name: 'current_period_start', type: 'date' })
  currentPeriodStart: Date;

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
